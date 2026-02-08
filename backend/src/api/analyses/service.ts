import { Pool } from 'pg';
import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  AnalysisResponse,
  CreateAnalysisRequest,
  UpdateAnalysisRequest,
  AnalysisNotFoundError,
  BatchNotFoundError,
  InvalidAnalysisDataError,
  ConflictingAnalysisError
} from './types';

/**
 * Analysis Service - Handles all business logic for analyses
 */

export class AnalysisService {
  /**
   * List analyses with pagination
   */
  static async listAnalyses(
    workspaceId: string,
    filters: {
      batchId?: string;
      executionMode?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: AnalysisResponse[]; pagination: { limit: number; offset: number; total: number } }> {
    try {
      logger.info('Fetching analyses', { workspaceId, ...filters });

      const limit = Math.min(filters.limit || 50, 1000);
      const offset = filters.offset || 0;

      let query = `
        SELECT a.*,
               at.name as analysis_type_name,
               at.category as analysis_category,
               o.name as executed_by_org_name,
               so.name as source_org_name,
               u.name as uploaded_by_name,
               u_edited.email as edited_by_name
        FROM Analyses a
        JOIN AnalysisTypes at ON a.analysis_type_id = at.id
        JOIN Organizations o ON a.executed_by_org_id = o.id
        JOIN Organizations so ON a.source_org_id = so.id
        JOIN Users u ON a.uploaded_by = u.id
        LEFT JOIN Users u_edited ON a.edited_by = u_edited.id
        WHERE a.workspace_id = $1 AND a.deleted_at IS NULL
      `;

      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (filters.batchId) {
        query += ` AND a.batch_id = $${paramIndex}`;
        params.push(filters.batchId);
        paramIndex++;
      }

      if (filters.executionMode) {
        query += ` AND a.execution_mode = $${paramIndex}`;
        params.push(filters.executionMode);
        paramIndex++;
      }

      query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit);
      params.push(offset);

      const result = await pool.query(query, params);

      return {
        data: result.rows as AnalysisResponse[],
        pagination: { limit, offset, total: result.rows.length }
      };
    } catch (error) {
      logger.error('Failed to list analyses', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get single analysis
   */
  static async getAnalysis(analysisId: string, workspaceId: string): Promise<AnalysisResponse> {
    try {
      logger.info('Fetching analysis', { analysisId, workspaceId });

      const result = await pool.query(
        `
        SELECT a.*,
               at.name as analysis_type_name,
               at.category as analysis_category,
               u_edited.email as edited_by_name
        FROM Analyses a
        JOIN AnalysisTypes at ON a.analysis_type_id = at.id
        LEFT JOIN Users u_edited ON a.edited_by = u_edited.id
        WHERE a.id = $1 AND a.workspace_id = $2 AND a.deleted_at IS NULL
        `,
        [analysisId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new AnalysisNotFoundError(analysisId);
      }

      return result.rows[0] as AnalysisResponse;
    } catch (error) {
      logger.error('Failed to get analysis', { analysisId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new analysis
   */
  static async createAnalysis(
    workspaceId: string,
    userId: string,
    data: CreateAnalysisRequest
  ): Promise<AnalysisResponse> {
    try {
      logger.info('Creating analysis', { workspaceId, userId, batchId: data.batchId });

      // Verify batch exists and belongs to workspace
      const batchCheck = await pool.query(
        `
        SELECT workspace_id, status, executed_by_org_id
        FROM Batches
        WHERE id = $1 AND deleted_at IS NULL
        `,
        [data.batchId]
      );

      if (batchCheck.rows.length === 0) {
        throw new BatchNotFoundError(data.batchId);
      }

      const batch = batchCheck.rows[0];

      if (batch.workspace_id !== workspaceId) {
        throw new InvalidAnalysisDataError('Batch belongs to different workspace');
      }

      if (!['created', 'in_progress', 'ready'].includes(batch.status)) {
        throw new InvalidAnalysisDataError(`Cannot upload to batch in status: ${batch.status}`);
      }

      // Verify analysis type exists
      const analysisTypeCheck = await pool.query(
        `
        SELECT id FROM AnalysisTypes WHERE id = $1 AND is_active = true
        `,
        [data.analysisTypeId]
      );

      if (analysisTypeCheck.rows.length === 0) {
        throw new InvalidAnalysisDataError('Analysis type not found or inactive');
      }

      // Check for existing authoritative analysis
      const existingAnalysis = await pool.query(
        `
        SELECT id FROM Analyses
        WHERE batch_id = $1 AND status = 'completed' AND is_authoritative = true AND deleted_at IS NULL
        LIMIT 1
        `,
        [data.batchId]
      );

      if (existingAnalysis.rows.length > 0) {
        throw new ConflictingAnalysisError('Authoritative result already exists for batch');
      }

      let executedByOrgId = data.executedByOrgId;
      let sourceOrgId = data.sourceOrgId;

      if (!executedByOrgId || executedByOrgId === workspaceId) {
        executedByOrgId = batch.executed_by_org_id || null;
      }

      if (!sourceOrgId || sourceOrgId === workspaceId) {
        sourceOrgId = executedByOrgId;
      }

      if (!executedByOrgId) {
        const orgResult = await pool.query(
          `SELECT id FROM Organizations WHERE workspace_id = $1 LIMIT 1`,
          [workspaceId]
        );

        if (orgResult.rows.length === 0) {
          const createOrgResult = await pool.query(
            `
            INSERT INTO Organizations (workspace_id, name, type)
            VALUES ($1, $2, $3::org_type)
            RETURNING id
            `,
            [workspaceId, 'Default Internal Lab', 'analyzer']
          );

          if (createOrgResult.rows.length === 0) {
            throw new InvalidAnalysisDataError('Unable to resolve execution organization');
          }

          executedByOrgId = createOrgResult.rows[0].id;
        } else {
          executedByOrgId = orgResult.rows[0].id;
        }
      }

      if (!sourceOrgId) {
        sourceOrgId = executedByOrgId;
      }

      const result = await pool.query(
        `
        INSERT INTO Analyses (
          workspace_id, batch_id, analysis_type_id, status, results,
          execution_mode, uploaded_by, file_path, file_checksum, file_size_bytes,
          executed_by_org_id, source_org_id, external_reference, performed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
        `,
        [
          workspaceId,
          data.batchId,
          data.analysisTypeId,
          data.status || 'pending',
          JSON.stringify(data.results),
          data.executionMode || 'platform',
          userId,
          data.filePath,
          data.fileChecksum,
          data.fileSizeBytes,
          executedByOrgId,
          sourceOrgId,
          data.externalReference || null,
          data.performedAt || null
        ]
      );

      logger.info('Analysis created successfully', { analysisId: result.rows[0].id, userId });
      return result.rows[0] as AnalysisResponse;
    } catch (error) {
      logger.error('Failed to create analysis', { workspaceId, userId, error });
      throw error;
    }
  }

  /**
   * Update analysis
   */
  static async updateAnalysis(
    analysisId: string,
    workspaceId: string,
    userId: string,
    data: UpdateAnalysisRequest
  ): Promise<AnalysisResponse> {
    try {
      logger.info('Updating analysis', { analysisId, workspaceId, userId });

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.results !== undefined) {
        updates.push(`results = $${paramIndex++}`);
        values.push(JSON.stringify(data.results));
      }

      if (data.filePath !== undefined) {
        updates.push(`file_path = $${paramIndex++}`);
        values.push(data.filePath);
      }

      if (data.fileChecksum !== undefined) {
        updates.push(`file_checksum = $${paramIndex++}`);
        values.push(data.fileChecksum);
      }

      if (data.fileSizeBytes !== undefined) {
        updates.push(`file_size_bytes = $${paramIndex++}`);
        values.push(data.fileSizeBytes);
      }

      if (data.performedAt !== undefined) {
        updates.push(`performed_at = $${paramIndex++}`);
        values.push(data.performedAt);
      }

      if (data.externalReference !== undefined) {
        updates.push(`external_reference = $${paramIndex++}`);
        values.push(data.externalReference);
      }

      if (updates.length === 0) {
        throw new InvalidAnalysisDataError('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      updates.push(`edited_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`edited_at = NOW()`);
      updates.push(`revision_number = COALESCE(revision_number, 1) + 1`);
      
      // Add WHERE clause parameters - paramIndex is already at the next available index
      const idParamIndex = paramIndex;
      const workspaceParamIndex = paramIndex + 1;
      
      values.push(analysisId);
      values.push(workspaceId);

      const result = await pool.query(
        `
        UPDATE Analyses
        SET ${updates.join(', ')}
        WHERE id = $${idParamIndex} AND workspace_id = $${workspaceParamIndex} AND deleted_at IS NULL
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        throw new AnalysisNotFoundError(analysisId);
      }

      logger.info('Analysis updated successfully', { analysisId });
      return result.rows[0] as AnalysisResponse;
    } catch (error) {
      logger.error('Failed to update analysis', { analysisId, workspaceId, error });
      throw error;
    }
  }
}
