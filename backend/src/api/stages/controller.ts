import { Request, Response } from 'express';
import { StageService } from './service';
import { asyncHandler } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

/**
 * Stage Controller - Handles HTTP requests for project stages
 */

export const stageController = {
  /**
   * GET /api/projects/:projectId/stages
   * List all stages for a project
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    const stages = await StageService.listStages(projectId, workspaceId);

    res.status(200).json({
      success: true,
      data: stages,
      count: stages.length
    });
  }),

  /**
   * GET /api/projects/:projectId/stages/:id
   * Get a specific stage
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    const stage = await StageService.getStage(id, workspaceId);

    res.status(200).json({
      success: true,
      data: stage
    });
  }),

  /**
   * POST /api/projects/:projectId/stages
   * Create a new stage
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }

    const stage = await StageService.createStage(projectId, workspaceId, req.body);

    logger.info('Stage created', { stageId: stage.id, projectId, userId });

    res.status(201).json({
      success: true,
      data: stage
    });
  }),

  /**
   * PUT /api/projects/:projectId/stages/:id
   * Update a stage
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }

    const stage = await StageService.updateStage(id, workspaceId, req.body);

    logger.info('Stage updated', { stageId: id, userId });

    res.status(200).json({
      success: true,
      data: stage
    });
  }),

  /**
   * DELETE /api/projects/:projectId/stages/:id
   * Delete a stage
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }

    await StageService.deleteStage(id, workspaceId);

    logger.info('Stage deleted', { stageId: id, userId });

    res.status(200).json({
      success: true,
      message: 'Stage deleted successfully'
    });
  })
};
