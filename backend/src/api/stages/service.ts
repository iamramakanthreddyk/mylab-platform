import { Pool } from 'pg';
import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  StageResponse,
  CreateStageRequest,
  UpdateStageRequest,
  StageNotFoundError,
  InvalidStageDataError
} from './types';

/**
 * Stage Service - Handles project stages business logic
 */

export class StageService {
  /**
   * List all stages for a project
   */
  static async listStages(projectId: string, workspaceId: string): Promise<StageResponse[]> {
    try {
      logger.info('Fetching stages for project', { projectId, workspaceId });

      const result = await pool.query(
        `
        SELECT
          id,
          project_id as "projectId",
          name,
          order_index as "orderIndex",
          status,
          owner_workspace_id as "ownerWorkspaceId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM projectstages
        WHERE project_id = $1 AND owner_workspace_id = $2
        ORDER BY order_index ASC
        `,
        [projectId, workspaceId]
      );

      return result.rows as StageResponse[];
    } catch (error) {
      logger.error('Failed to list stages', { projectId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Get a single stage
   */
  static async getStage(stageId: string, workspaceId: string): Promise<StageResponse> {
    try {
      logger.info('Fetching stage', { stageId, workspaceId });

      const result = await pool.query(
        `
        SELECT
          id,
          project_id as "projectId",
          name,
          order_index as "orderIndex",
          status,
          owner_workspace_id as "ownerWorkspaceId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM projectstages
        WHERE id = $1 AND owner_workspace_id = $2
        `,
        [stageId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new StageNotFoundError(stageId);
      }

      return result.rows[0] as StageResponse;
    } catch (error) {
      logger.error('Failed to get stage', { stageId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new stage
   */
  static async createStage(
    projectId: string,
    workspaceId: string,
    data: CreateStageRequest
  ): Promise<StageResponse> {
    try {
      logger.info('Creating stage', { projectId, workspaceId, data });

      // Verify project exists and user has access
      const projectCheck = await pool.query(
        `SELECT id FROM projects WHERE id = $1 AND workspace_id = $2`,
        [projectId, workspaceId]
      );

      if (projectCheck.rows.length === 0) {
        throw new InvalidStageDataError('Project not found or access denied');
      }

      const result = await pool.query(
        `
        INSERT INTO projectstages (
          project_id, owner_workspace_id, name, order_index, status
        )
        VALUES ($1, $2, $3, $4, 'planned')
        RETURNING
          id,
          project_id as "projectId",
          name,
          order_index as "orderIndex",
          status,
          owner_workspace_id as "ownerWorkspaceId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [projectId, workspaceId, data.name, data.orderIndex]
      );

      logger.info('Stage created successfully', { stageId: result.rows[0].id });
      return result.rows[0] as StageResponse;
    } catch (error) {
      logger.error('Failed to create stage', { projectId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Update a stage
   */
  static async updateStage(
    stageId: string,
    workspaceId: string,
    data: UpdateStageRequest
  ): Promise<StageResponse> {
    try {
      logger.info('Updating stage', { stageId, workspaceId, data });

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.orderIndex !== undefined) {
        updates.push(`order_index = $${paramIndex++}`);
        values.push(data.orderIndex);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (updates.length === 0) {
        throw new InvalidStageDataError('No updates provided');
      }

      updates.push(`updated_at = NOW()`);
      values.push(stageId);
      values.push(workspaceId);

      const result = await pool.query(
        `
        UPDATE projectstages
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND owner_workspace_id = $${paramIndex++}
        RETURNING
          id,
          project_id as "projectId",
          name,
          order_index as "orderIndex",
          status,
          owner_workspace_id as "ownerWorkspaceId",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        values
      );

      if (result.rows.length === 0) {
        throw new StageNotFoundError(stageId);
      }

      logger.info('Stage updated successfully', { stageId });
      return result.rows[0] as StageResponse;
    } catch (error) {
      logger.error('Failed to update stage', { stageId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Delete a stage
   */
  static async deleteStage(stageId: string, workspaceId: string): Promise<void> {
    try {
      logger.info('Deleting stage', { stageId, workspaceId });

      // Check if stage has samples
      const samplesCheck = await pool.query(
        `SELECT COUNT(*) as count FROM samples WHERE stage_id = $1`,
        [stageId]
      );

      if (parseInt(samplesCheck.rows[0].count) > 0) {
        throw new InvalidStageDataError('Cannot delete stage with existing samples');
      }

      const result = await pool.query(
        `DELETE FROM projectstages WHERE id = $1 AND owner_workspace_id = $2 RETURNING id`,
        [stageId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new StageNotFoundError(stageId);
      }

      logger.info('Stage deleted successfully', { stageId });
    } catch (error) {
      logger.error('Failed to delete stage', { stageId, workspaceId, error });
      throw error;
    }
  }
}
