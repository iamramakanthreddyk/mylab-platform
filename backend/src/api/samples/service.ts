import { Pool } from 'pg';
import { pool } from '../../db';
import logger from '../../utils/logger';
import { canDeleteSample } from '../../utils/lineageUtils';
import { validateStageForSampleCreation, canMoveSampleToStage } from '../../utils/stageUtils';
import {
  SampleResponse,
  CreateSampleRequest,
  UpdateSampleRequest,
  SampleNotFoundError,
  InvalidSampleDataError,
  SampleHasDerivedError,
  UnauthorizedCascadeDeleteError
} from './types';

/**
 * Sample Service - Handles all business logic for samples
 */

export class SampleService {
  /**
   * List samples for a specific project
   */
  static async listSamples(projectId: string, workspaceId: string): Promise<SampleResponse[]> {
    try {
      logger.info('Fetching samples for project', { projectId, workspaceId });

      const result = await pool.query(
        `
        SELECT s.*, p.name as project_name
        FROM Samples s
        JOIN Projects p ON s.project_id = p.id
        WHERE s.project_id = $1 AND s.workspace_id = $2 AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        `,
        [projectId, workspaceId]
      );

      return result.rows as SampleResponse[];
    } catch (error) {
      logger.error('Failed to list samples for project', { projectId, workspaceId, error });
      throw error;
    }
  }

  /**
   * List all samples for a workspace
   */
  static async listAllSamples(workspaceId: string): Promise<SampleResponse[]> {
    try {
      logger.info('Fetching all samples for workspace', { workspaceId });

      const result = await pool.query(
        `
        SELECT s.*, p.name as project_name
        FROM Samples s
        JOIN Projects p ON s.project_id = p.id
        WHERE s.workspace_id = $1 AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        `,
        [workspaceId]
      );

      return result.rows as SampleResponse[];
    } catch (error) {
      logger.error('Failed to list all samples', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get a single sample
   */
  static async getSample(sampleId: string, workspaceId: string): Promise<SampleResponse> {
    try {
      logger.info('Fetching sample', { sampleId, workspaceId });

      const result = await pool.query(
        `
        SELECT s.*, p.name as project_name
        FROM Samples s
        JOIN Projects p ON s.project_id = p.id
        WHERE s.id = $1 AND s.workspace_id = $2 AND s.deleted_at IS NULL
        `,
        [sampleId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new SampleNotFoundError(sampleId);
      }

      return result.rows[0] as SampleResponse;
    } catch (error) {
      logger.error('Failed to get sample', { sampleId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new sample
   */
  static async createSample(
    workspaceId: string,
    userId: string,
    data: CreateSampleRequest
  ): Promise<SampleResponse> {
    try {
      logger.info('Creating sample', { workspaceId, userId, projectId: data.projectId });

      // Validate stage if provided
      if (data.stageId) {
        const stageValidation = await validateStageForSampleCreation(data.stageId, data.projectId);
        if (!stageValidation.valid) {
          throw new InvalidSampleDataError(stageValidation.error || 'Invalid stage for sample creation');
        }
      }

      const result = await pool.query(
        `
        INSERT INTO Samples (
          workspace_id, project_id, trial_id, stage_id, sample_id, type,
          description, metadata, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          workspaceId,
          data.projectId,
          data.trialId || null,
          data.stageId || null,
          data.sampleId,
          data.type || null,
          data.description,
          data.metadata ? JSON.stringify(data.metadata) : null,
          userId
        ]
      );

      // Fetch with project name
      const fullResult = await pool.query(
        `
        SELECT s.*, p.name as project_name
        FROM Samples s
        JOIN Projects p ON s.project_id = p.id
        WHERE s.id = $1
        `,
        [result.rows[0].id]
      );

      logger.info('Sample created successfully', { sampleId: result.rows[0].id, userId });
      return fullResult.rows[0] as SampleResponse;
    } catch (error) {
      logger.error('Failed to create sample', { workspaceId, userId, error });
      throw error;
    }
  }

  /**
   * Update a sample
   */
  static async updateSample(
    sampleId: string,
    workspaceId: string,
    projectId: string,
    data: UpdateSampleRequest
  ): Promise<SampleResponse> {
    try {
      logger.info('Updating sample', { sampleId, workspaceId });

      // Validate stage progression if provided
      if (data.stageId && projectId) {
        const canMove = await canMoveSampleToStage(sampleId, data.stageId, projectId);
        if (!canMove.canMove) {
          throw new InvalidSampleDataError(canMove.error || 'Cannot move sample to this stage');
        }
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.sampleId !== undefined) {
        updates.push(`sample_id = $${paramIndex++}`);
        values.push(data.sampleId);
      }

      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }

      if (data.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(data.type);
      }

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(data.metadata ? JSON.stringify(data.metadata) : null);
      }

      if (data.stageId !== undefined) {
        updates.push(`stage_id = $${paramIndex++}`);
        values.push(data.stageId || null);
      }

      if (data.trialId !== undefined) {
        updates.push(`trial_id = $${paramIndex++}`);
        values.push(data.trialId || null);
      }

      if (updates.length === 0) {
        throw new InvalidSampleDataError('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      values.push(sampleId);
      values.push(workspaceId);

      const result = await pool.query(
        `
        UPDATE Samples
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex + 1} AND workspace_id = $${paramIndex + 2} AND deleted_at IS NULL
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        throw new SampleNotFoundError(sampleId);
      }

      // Fetch with project name
      const fullResult = await pool.query(
        `
        SELECT s.*, p.name as project_name
        FROM Samples s
        JOIN Projects p ON s.project_id = p.id
        WHERE s.id = $1
        `,
        [sampleId]
      );

      logger.info('Sample updated successfully', { sampleId });
      return fullResult.rows[0] as SampleResponse;
    } catch (error) {
      logger.error('Failed to update sample', { sampleId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Delete a sample (with lineage protection)
   */
  static async deleteSample(sampleId: string, workspaceId: string): Promise<void> {
    try {
      logger.info('Deleting sample', { sampleId, workspaceId });

      // Check if sample has derived samples
      const { canDelete, derivedCount } = await canDeleteSample(sampleId);

      if (!canDelete) {
        throw new SampleHasDerivedError(derivedCount);
      }

      const result = await pool.query(
        `
        UPDATE Samples
        SET deleted_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        RETURNING id
        `,
        [sampleId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new SampleNotFoundError(sampleId);
      }

      logger.info('Sample deleted successfully', { sampleId });
    } catch (error) {
      logger.error('Failed to delete sample', { sampleId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Cascade delete sample and all derived samples (admin only)
   */
  static async cascadeDeleteSample(sampleId: string, userRole: string): Promise<number> {
    try {
      if (userRole !== 'admin') {
        throw new UnauthorizedCascadeDeleteError();
      }

      logger.info('Cascade deleting sample', { sampleId, userRole });

      // Get count of derived samples
      const derivedCheck = await pool.query(
        `
        SELECT COUNT(*) as derived_count FROM DerivedSamples
        WHERE root_sample_id = $1 AND deleted_at IS NULL
        `,
        [sampleId]
      );

      const derivedCount = parseInt(derivedCheck.rows[0].derived_count, 10);

      // Soft delete derived samples
      await pool.query(
        `
        UPDATE DerivedSamples
        SET deleted_at = NOW()
        WHERE root_sample_id = $1 AND deleted_at IS NULL
        `,
        [sampleId]
      );

      // Soft delete root sample
      const result = await pool.query(
        `
        UPDATE Samples
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id
        `,
        [sampleId]
      );

      if (result.rows.length === 0) {
        throw new SampleNotFoundError(sampleId);
      }

      logger.info('Sample cascade deleted successfully', { sampleId, deletedCount: derivedCount + 1 });
      return derivedCount + 1; // +1 for root sample
    } catch (error) {
      logger.error('Failed to cascade delete sample', { sampleId, error });
      throw error;
    }
  }
}
