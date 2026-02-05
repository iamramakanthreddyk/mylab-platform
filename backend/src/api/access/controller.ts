import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AccessService } from './service';
import { AccessNotFoundError, AccessAlreadyExistsError } from './types';
import logger from '../../utils/logger';

/**
 * Access Control Controller
 */

export const accessController = {
  /**
   * POST /api/access/grant - Grant access to resource
   */
  grant: asyncHandler(async (req: Request, res: Response) => {
    const { userId, objectType, objectId, accessLevel } = req.body;

    try {
      const access = await AccessService.grantAccess({
        userId,
        objectType,
        objectId,
        accessLevel
      });

      logger.info('Access granted via API', { targetUserId: userId, grantedBy: req.user!.id });

      res.status(201).json({
        success: true,
        data: access
      });
    } catch (error) {
      if (error instanceof AccessAlreadyExistsError) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/access/:objectType/:objectId - List access grants for resource
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { objectType, objectId } = req.params;

    const grants = await AccessService.listObjectAccess(objectType, objectId);

    res.status(200).json({
      success: true,
      data: grants,
      count: grants.length
    });
  }),

  /**
   * DELETE /api/access/:userId/:objectType/:objectId - Revoke access
   */
  revoke: asyncHandler(async (req: Request, res: Response) => {
    const { userId, objectType, objectId } = req.params;

    try {
      await AccessService.revokeAccess(userId, objectType, objectId);

      logger.info('Access revoked via API', { targetUserId: userId, revokedBy: req.user!.id });

      res.status(200).json({
        success: true,
        message: 'Access revoked successfully'
      });
    } catch (error) {
      if (error instanceof AccessNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
