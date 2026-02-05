import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AdminService } from './service';
import logger from '../../utils/logger';

/**
 * Admin Controller - Handles administrative endpoints
 */

export const adminController = {
  /**
   * GET /api/admin/stats - Get system statistics
   */
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = await AdminService.getSystemStats();

    logger.info('System statistics retrieved', { adminId: req.user!.id });

    res.status(200).json({
      success: true,
      data: stats
    });
  }),

  /**
   * GET /api/admin/users - List all users
   */
  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { limit, offset } = req.query;

    const result = await AdminService.listAllUsers(
      limit ? parseInt(limit as string) : 50,
      offset ? parseInt(offset as string) : 0
    );

    logger.info('Users listed', { adminId: req.user!.id, count: result.data.length });

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
   * PATCH /api/admin/users/:id/deactivate - Deactivate user
   */
  deactivateUser: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const { id } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    await AdminService.deactivateUser(id);

    logger.info('User deactivated via admin', { targetUserId: id, adminId: req.user!.id });

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  }),

  /**
   * GET /api/admin/audit-log - Get audit log
   */
  getAuditLog: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const { limit } = req.query;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const logs = await AdminService.getAuditLog(limit ? parseInt(limit as string) : 100);

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length
    });
  })
};
