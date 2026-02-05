import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { IntegrationService } from './service';
import { IntegrationNotFoundError, UnsupportedProviderError } from './types';
import logger from '../../utils/logger';

/**
 * Integration Controller
 */

export const integrationController = {
  /**
   * POST /api/integrations/:workspaceId - Create integration
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { provider, name, config } = req.body;

    try {
      const integration = await IntegrationService.createIntegration({
        workspace_id: workspaceId,
        provider,
        name,
        config
      });

      logger.info('Integration created via API', { integrationId: integration.id, userId: req.user!.id });

      res.status(201).json({
        success: true,
        data: integration
      });
    } catch (error) {
      if (error instanceof UnsupportedProviderError) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/integrations/:workspaceId - List integrations
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;

    const integrations = await IntegrationService.listIntegrations(workspaceId);

    res.status(200).json({
      success: true,
      data: integrations,
      count: integrations.length
    });
  }),

  /**
   * GET /api/integrations/:workspaceId/:id - Get integration
   */
  get: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      const integration = await IntegrationService.getIntegration(workspaceId, id);

      res.status(200).json({
        success: true,
        data: integration
      });
    } catch (error) {
      if (error instanceof IntegrationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * PATCH /api/integrations/:workspaceId/:id/enable - Enable integration
   */
  enable: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      const integration = await IntegrationService.enableIntegration(workspaceId, id);

      logger.info('Integration enabled via API', { integrationId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        data: integration
      });
    } catch (error) {
      if (error instanceof IntegrationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * PATCH /api/integrations/:workspaceId/:id/disable - Disable integration
   */
  disable: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      const integration = await IntegrationService.disableIntegration(workspaceId, id);

      logger.info('Integration disabled via API', { integrationId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        data: integration
      });
    } catch (error) {
      if (error instanceof IntegrationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * DELETE /api/integrations/:workspaceId/:id - Delete integration
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      await IntegrationService.deleteIntegration(workspaceId, id);

      logger.info('Integration deleted via API', { integrationId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        message: 'Integration deleted successfully'
      });
    } catch (error) {
      if (error instanceof IntegrationNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
