import { pool } from '../../db';
import logger from '../../utils/logger';
import { CreateNotificationRequest, NotificationResponse, NotificationNotFoundError } from './types';

/**
 * Notifications Service - Manages user and workspace notifications
 */

export class NotificationService {
  /**
   * Create notification
   */
  static async createNotification(data: CreateNotificationRequest): Promise<NotificationResponse> {
    try {
      logger.info('Creating notification', { workspaceId: data.workspace_id, type: data.type });

      const result = await pool.query(
        `
        INSERT INTO Notifications (workspace_id, user_id, type, title, message, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, workspace_id, user_id, type, title, message, metadata, read_at, created_at
        `,
        [
          data.workspace_id,
          data.user_id || null,
          data.type,
          data.title,
          data.message,
          JSON.stringify(data.data || {})
        ]
      );

      logger.info('Notification created', { notificationId: result.rows[0].id });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create notification', { error });
      throw error;
    }
  }

  /**
   * Get notification
   */
  static async getNotification(notificationId: string): Promise<NotificationResponse> {
    try {
      const result = await pool.query(
        `
        SELECT id, workspace_id, user_id, type, title, message, metadata, read_at, created_at
        FROM Notifications
        WHERE id = $1
        `,
        [notificationId]
      );

      if (result.rows.length === 0) {
        throw new NotificationNotFoundError(notificationId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get notification', { notificationId, error });
      throw error;
    }
  }

  /**
   * List user notifications
   */
  static async listUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ data: NotificationResponse[]; total: number }> {
    try {
      logger.info('Listing user notifications', { userId });

      const result = await pool.query(
        `
        SELECT id, workspace_id, user_id, type, title, message, metadata, read_at, created_at
        FROM Notifications
        WHERE user_id = $1 OR workspace_id IN (
          SELECT workspace_id FROM WorkspaceUsers WHERE user_id = $1
        )
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [userId, Math.min(limit, 1000), offset]
      );

      const countResult = await pool.query(
        `
        SELECT COUNT(*) as total FROM Notifications
        WHERE user_id = $1 OR workspace_id IN (
          SELECT workspace_id FROM WorkspaceUsers WHERE user_id = $1
        )
        `,
        [userId]
      );

      return {
        data: result.rows,
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error) {
      logger.error('Failed to list notifications', { userId, error });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<NotificationResponse> {
    try {
      logger.info('Marking notification as read', { notificationId });

      const result = await pool.query(
        `
        UPDATE Notifications
        SET read_at = NOW()
        WHERE id = $1
        RETURNING id, workspace_id, user_id, type, title, message, metadata, read_at, created_at
        `,
        [notificationId]
      );

      if (result.rows.length === 0) {
        throw new NotificationNotFoundError(notificationId);
      }

      logger.info('Notification marked as read', { notificationId });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to mark notification as read', { notificationId, error });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      logger.info('Deleting notification', { notificationId });

      const result = await pool.query('DELETE FROM Notifications WHERE id = $1', [notificationId]);

      if (result.rowCount === 0) {
        throw new NotificationNotFoundError(notificationId);
      }

      logger.info('Notification deleted', { notificationId });
    } catch (error) {
      logger.error('Failed to delete notification', { notificationId, error });
      throw error;
    }
  }
}
