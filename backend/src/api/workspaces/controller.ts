import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { WorkspaceService } from './service';
import { WorkspaceNotFoundError, UnauthorizedWorkspaceAccessError } from './types';
import logger from '../../utils/logger';

/**
 * Workspace Controller - Handles HTTP requests for workspace endpoints
 */

export const workspaceController = {
  /**
   * GET /api/workspaces - List user's workspaces
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const workspaces = await WorkspaceService.listUserWorkspaces(userId);

    logger.info('Workspaces listed for user', { userId, count: workspaces.length });

    res.status(200).json({
      success: true,
      data: workspaces,
      count: workspaces.length
    });
  }),

  /**
   * GET /api/workspaces/:id - Get workspace summary
   */
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const { id: workspaceId } = req.params;
    const userId = req.user!.id;

    // Verify user has access
    const hasAccess = await WorkspaceService.verifyWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }

    try {
      const summary = await WorkspaceService.getWorkspaceSummary(workspaceId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/workspaces/:id/detail - Get all workspace details
   */
  getDetail: asyncHandler(async (req: Request, res: Response) => {
    const { id: workspaceId } = req.params;
    const userId = req.user!.id;

    // Verify user has access
    const hasAccess = await WorkspaceService.verifyWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this workspace'
      });
    }

    try {
      const detail = await WorkspaceService.getWorkspaceDetail(workspaceId);

      res.status(200).json({
        success: true,
        data: detail
      });
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
