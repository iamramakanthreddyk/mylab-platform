import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  WorkspaceSummaryResponse,
  WorkspaceDetailResponse,
  WorkspaceNotFoundError,
  UnauthorizedWorkspaceAccessError
} from './types';

/**
 * Workspace Service - Handles all business logic for workspace operations
 */

export class WorkspaceService {
  /**
   * Get workspace summary with aggregated counts
   */
  static async getWorkspaceSummary(workspaceId: string): Promise<WorkspaceSummaryResponse> {
    try {
      logger.info('Fetching workspace summary', { workspaceId });

      const result = await pool.query(
        `
        SELECT
          o.id,
          o.name,
          o.notes as description,
          o.is_active,
          o.created_at,
          (SELECT COUNT(*) FROM Users WHERE workspace_id = o.id AND deleted_at IS NULL) as user_count,
          (SELECT COUNT(*) FROM Projects WHERE workspace_id = o.id AND deleted_at IS NULL) as project_count,
          (SELECT COUNT(*) FROM Samples WHERE workspace_id = o.id AND deleted_at IS NULL) as sample_count
        FROM Organizations o
        WHERE o.id = $1
        `,
        [workspaceId]
      );

      if (result.rows.length === 0) {
        throw new WorkspaceNotFoundError(workspaceId);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        user_count: parseInt(row.user_count, 10),
        project_count: parseInt(row.project_count, 10),
        sample_count: parseInt(row.sample_count, 10),
        is_active: row.is_active,
        created_at: row.created_at
      } as WorkspaceSummaryResponse;
    } catch (error) {
      logger.error('Failed to get workspace summary', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get workspace details
   */
  static async getWorkspaceDetail(workspaceId: string): Promise<WorkspaceDetailResponse> {
    try {
      logger.info('Fetching workspace detail', { workspaceId });

      const result = await pool.query(
        `
        SELECT id, name, notes as description, is_active, created_at, updated_at
        FROM Organizations
        WHERE id = $1
        `,
        [workspaceId]
      );

      if (result.rows.length === 0) {
        throw new WorkspaceNotFoundError(workspaceId);
      }

      return result.rows[0] as WorkspaceDetailResponse;
    } catch (error) {
      logger.error('Failed to get workspace detail', { workspaceId, error });
      throw error;
    }
  }

  /**
   * List workspaces for user
   */
  static async listUserWorkspaces(userId: string): Promise<WorkspaceSummaryResponse[]> {
    try {
      logger.info('Fetching workspaces for user', { userId });

      const result = await pool.query(
        `
        SELECT
          o.id,
          o.name,
          o.notes as description,
          o.is_active,
          o.created_at,
          (SELECT COUNT(*) FROM Users WHERE workspace_id = o.id AND deleted_at IS NULL) as user_count,
          (SELECT COUNT(*) FROM Projects WHERE workspace_id = o.id AND deleted_at IS NULL) as project_count,
          (SELECT COUNT(*) FROM Samples WHERE workspace_id = o.id AND deleted_at IS NULL) as sample_count
        FROM Organizations o
        JOIN Users u ON u.workspace_id = o.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
        ORDER BY o.name
        `,
        [userId]
      );

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        user_count: parseInt(row.user_count, 10),
        project_count: parseInt(row.project_count, 10),
        sample_count: parseInt(row.sample_count, 10),
        is_active: row.is_active,
        created_at: row.created_at
      }));
    } catch (error) {
      logger.error('Failed to list user workspaces', { userId, error });
      throw error;
    }
  }

  /**
   * Check if user has access to workspace
   */
  static async verifyWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        SELECT 1 FROM Users
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        LIMIT 1
        `,
        [userId, workspaceId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to verify workspace access', { userId, workspaceId, error });
      throw error;
    }
  }
}
