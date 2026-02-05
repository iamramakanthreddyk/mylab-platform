import { pool } from '../../db';
import logger from '../../utils/logger';
import { SystemStatsResponse, AdminAccessDeniedError } from './types';

/**
 * Admin Service - Handles administrative operations
 */

export class AdminService {
  /**
   * Get system statistics
   */
  static async getSystemStats(): Promise<SystemStatsResponse> {
    try {
      logger.info('Fetching system statistics');

      const [
        usersResult,
        activeUsersResult,
        workspacesResult,
        projectsResult,
        samplesResult,
        analysesResult,
        onboardingsResult,
        paymentsResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM Users'),
        pool.query('SELECT COUNT(*) as count FROM Users WHERE is_active = true'),
        pool.query('SELECT COUNT(*) as count FROM Workspaces'),
        pool.query('SELECT COUNT(*) as count FROM Projects WHERE deleted_at IS NULL'),
        pool.query('SELECT COUNT(*) as count FROM Samples WHERE deleted_at IS NULL'),
        pool.query('SELECT COUNT(*) as count FROM Analyses WHERE deleted_at IS NULL'),
        pool.query("SELECT COUNT(*) as count FROM CompanyOnboardingRequests WHERE status = 'pending'"),
        pool.query(
          `SELECT COUNT(*) as count FROM CompanyPayments 
           WHERE status = 'pending' AND due_date <= NOW() + INTERVAL '7 days'`
        )
      ]);

      return {
        totalUsers: parseInt(usersResult.rows[0].count, 10),
        activeUsers: parseInt(activeUsersResult.rows[0].count, 10),
        totalWorkspaces: parseInt(workspacesResult.rows[0].count, 10),
        totalProjects: parseInt(projectsResult.rows[0].count, 10),
        totalSamples: parseInt(samplesResult.rows[0].count, 10),
        totalAnalyses: parseInt(analysesResult.rows[0].count, 10),
        pendingOnboardings: parseInt(onboardingsResult.rows[0].count, 10),
        upcomingPayments: parseInt(paymentsResult.rows[0].count, 10)
      };
    } catch (error) {
      logger.error('Failed to get system statistics', { error });
      throw error;
    }
  }

  /**
   * List all users
   */
  static async listAllUsers(limit: number = 50, offset: number = 0) {
    try {
      logger.info('Listing all users', { limit, offset });

      const result = await pool.query(
        `
        SELECT id, email, full_name, role, is_active, created_at
        FROM Users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        `,
        [Math.min(limit, 1000), offset]
      );

      const countResult = await pool.query('SELECT COUNT(*) as total FROM Users');

      return {
        data: result.rows,
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error) {
      logger.error('Failed to list users', { error });
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(userId: string): Promise<void> {
    try {
      logger.info('Deactivating user', { userId });

      await pool.query('UPDATE Users SET is_active = false WHERE id = $1', [userId]);

      logger.info('User deactivated', { userId });
    } catch (error) {
      logger.error('Failed to deactivate user', { userId, error });
      throw error;
    }
  }

  /**
   * Get activity audit log (last 100 entries)
   */
  static async getAuditLog(limit: number = 100): Promise<any[]> {
    try {
      logger.info('Fetching audit log', { limit });

      const result = await pool.query(
        `
        SELECT id, type, object_type, object_id, user_id, details, created_at
        FROM AuditLog
        ORDER BY created_at DESC
        LIMIT $1
        `,
        [Math.min(limit, 1000)]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get audit log', { error });
      throw error;
    }
  }
}
