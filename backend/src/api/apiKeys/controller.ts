import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ApiKeyService } from './service';
import { ApiKeyNotFoundError } from './types';
import logger from '../../utils/logger';

/**
 * API Keys Controller
 */

export const apiKeyController = {
  /**
   * POST /api/workspaces/:workspaceId/api-keys - Create API key
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { name, description, expiresAt } = req.body;

    const key = await ApiKeyService.createApiKey(workspaceId, {
      name,
      description,
      expiresAt
    });

    logger.info('API key created via API', { keyId: key.id, workspaceId });

    res.status(201).json({
      success: true,
      data: key
    });
  }),

  /**
   * GET /api/workspaces/:workspaceId/api-keys - List API keys
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    const keys = await ApiKeyService.listApiKeys(workspaceId);

    res.status(200).json({
      success: true,
      data: keys,
      count: keys.length
    });
  }),

  /**
   * GET /api/workspaces/:workspaceId/api-keys/:id - Get API key
   */
  get: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      const key = await ApiKeyService.getApiKey(workspaceId, id);

      res.status(200).json({
        success: true,
        data: key
      });
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * DELETE /api/workspaces/:workspaceId/api-keys/:id - Delete API key
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      await ApiKeyService.deleteApiKey(workspaceId, id);

      logger.info('API key deleted via API', { keyId: id, workspaceId });

      res.status(200).json({
        success: true,
        message: 'API key deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiKeyNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
