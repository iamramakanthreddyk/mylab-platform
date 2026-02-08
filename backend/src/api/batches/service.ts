import { Pool } from 'pg';
import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  BatchResponse,
  CreateBatchRequest,
  UpdateBatchRequest,
  BatchNotFoundError,
  InvalidBatchDataError
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Batch Service - Handles all business logic related to batches
 * A batch groups derived samples for processing and analysis
 */

export class BatchService {
  /**
   * List all batches for a workspace
   */
  static async listBatches(
    workspaceId: string,
    filters?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ data: BatchResponse[]; total: number }> {
    try {
      logger.info('Fetching batches for workspace', { workspaceId, filters });

      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      // Build query
      let whereClause = 'b.workspace_id = $1 AND b.deleted_at IS NULL';
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (filters?.status) {
        whereClause += ` AND b.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM Batches b WHERE ${whereClause}`,
        params
      );

      const result = await pool.query(
        `
        SELECT
          b.id,
          b.batch_id as "batchId",
          b.workspace_id as "workspaceId",
          b.original_workspace_id as "originalWorkspaceId",
          b.parameters,
          b.status,
          b.execution_mode as "executionMode",
          b.created_at as "createdAt",
          b.updated_at as "updatedAt",
          COUNT(DISTINCT bi.id) as "sampleCount"
        FROM Batches b
        LEFT JOIN BatchItems bi ON b.id = bi.batch_id
        WHERE ${whereClause}
        GROUP BY b.id
        ORDER BY b.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        [...params, limit, offset]
      );

      return {
        data: result.rows as BatchResponse[],
        total: parseInt(countResult.rows[0].count)
      };
    } catch (error) {
      logger.error('Failed to list batches', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get a specific batch
   */
  static async getBatch(batchId: string, workspaceId: string): Promise<BatchResponse> {
    try {
      logger.info('Fetching batch', { batchId, workspaceId });

      const result = await pool.query(
        `
        SELECT
          b.id,
          b.batch_id as "batchId",
          b.workspace_id as "workspaceId",
          b.original_workspace_id as "originalWorkspaceId",
          b.parameters,
          b.status,
          b.execution_mode as "executionMode",
          b.created_at as "createdAt",
          b.updated_at as "updatedAt",
          COUNT(DISTINCT bi.id) as "sampleCount"
        FROM Batches b
        LEFT JOIN BatchItems bi ON b.id = bi.batch_id
        WHERE b.id = $1 AND b.workspace_id = $2 AND b.deleted_at IS NULL
        GROUP BY b.id
        `,
        [batchId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new BatchNotFoundError(batchId);
      }

      return result.rows[0] as BatchResponse;
    } catch (error) {
      logger.error('Failed to get batch', { batchId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new batch
   * Note: executedByOrgId and createdBy are required in the database but passed via user context
   */
  static async createBatch(
    workspaceId: string,
    userId: string,
    organizationId: string,
    data: CreateBatchRequest
  ): Promise<BatchResponse> {
    try {
      logger.info('Creating batch', { workspaceId, userId, sampleCount: data.sampleIds?.length || 0 });

      // Generate batch ID (numeric format for compatibility)
      const numericBatchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create batch - note: execution_mode and some fields hardcoded for internal batches
      const batchResult = await pool.query(
        `
        INSERT INTO Batches (
          batch_id, workspace_id, original_workspace_id, parameters, status,
          execution_mode, created_by, executed_by_org_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING
          id,
          batch_id as "batchId",
          workspace_id as "workspaceId",
          original_workspace_id as "originalWorkspaceId",
          parameters,
          status,
          execution_mode as "executionMode",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [
          numericBatchId,
          workspaceId,
          workspaceId,
          data.parameters || {},
          'created',
          'platform',
          userId,
          organizationId
        ]
      );

      const batch = batchResult.rows[0];

      // Add derived samples to batch if provided
      // Note: sampleIds are actually derivedSampleIds that reference DerivedSamples table
      if (data.sampleIds && data.sampleIds.length > 0) {
        const derivedSampleIds = data.sampleIds;
        
        for (let i = 0; i < derivedSampleIds.length; i++) {
          try {
            await pool.query(
              `
              INSERT INTO BatchItems (batch_id, derived_id, sequence, created_at)
              VALUES ($1, $2, $3, NOW())
              `,
              [batch.id, derivedSampleIds[i], i]
            );
          } catch (itemError: any) {
            logger.warn('Failed to add derived sample to batch', { 
              batchId: batch.id, 
              derivedSampleId: derivedSampleIds[i],
              error: itemError.message 
            });
            // Continue adding other samples if one fails
          }
        }

        logger.info('Added derived samples to batch', { batchId: batch.id, sampleCount: derivedSampleIds.length });
      }

      // Get final batch with sample count
      return this.getBatch(batch.id, workspaceId);
    } catch (error) {
      logger.error('Failed to create batch', { workspaceId, userId, error });
      throw error;
    }
  }

  /**
   * Update batch
   */
  static async updateBatch(
    batchId: string,
    workspaceId: string,
    data: UpdateBatchRequest
  ): Promise<BatchResponse> {
    try {
      logger.info('Updating batch', { batchId, workspaceId, data });

      // Verify batch exists
      await this.getBatch(batchId, workspaceId);

      // Build update query
      const updates: string[] = [];
      const values: any[] = [batchId, workspaceId];
      let paramIndex = 3;

      if (data.status) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (data.parameters) {
        updates.push(`parameters = $${paramIndex}`);
        values.push(JSON.stringify(data.parameters));
        paramIndex++;
      }

      if (updates.length === 0) {
        return this.getBatch(batchId, workspaceId);
      }

      await pool.query(
        `
        UPDATE Batches
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `,
        values
      );

      return this.getBatch(batchId, workspaceId);
    } catch (error) {
      logger.error('Failed to update batch', { batchId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Delete (soft delete) a batch
   */
  static async deleteBatch(batchId: string, workspaceId: string): Promise<void> {
    try {
      logger.info('Deleting batch', { batchId, workspaceId });

      // Verify batch exists
      await this.getBatch(batchId, workspaceId);

      await pool.query(
        `
        UPDATE Batches
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND workspace_id = $2
        `,
        [batchId, workspaceId]
      );

      logger.info('Batch deleted', { batchId, workspaceId });
    } catch (error) {
      logger.error('Failed to delete batch', { batchId, workspaceId, error });
      throw error;
    }
  }
}
