import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { NotificationService } from './service';
import { NotificationNotFoundError } from './types';
import logger from '../../utils/logger';

/**
 * Notifications Controller
 */

export const notificationController = {
  /**
   * GET /api/notifications - List user's notifications
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { limit, offset } = req.query;

    const result = await NotificationService.listUserNotifications(
      userId,
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: Math.min(parseInt(limit as string) || 50, 1000),
        offset: parseInt(offset as string) || 0
      }
    });
  }),

  /**
   * GET /api/notifications/:id - Get notification
   */
  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const notification = await NotificationService.getNotification(id);

      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * PATCH /api/notifications/:id/read - Mark as read
   */
  markAsRead: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const notification = await NotificationService.markAsRead(id);

      logger.info('Notification marked as read via API', { notificationId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * DELETE /api/notifications/:id - Delete notification
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await NotificationService.deleteNotification(id);

      logger.info('Notification deleted via API', { notificationId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      if (error instanceof NotificationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
