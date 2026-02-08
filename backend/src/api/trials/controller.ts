import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { TrialService } from './service';
import { TrialNotFoundError } from './types';
import logger from '../../utils/logger';

/**
 * Trial Controller - Handles trial endpoints
 */

export const trialController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;

    const trials = await TrialService.listTrials(projectId, workspaceId);

    res.status(200).json({
      success: true,
      data: trials,
      count: trials.length
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, trialId } = req.params;
    const workspaceId = req.user!.workspaceId;

    try {
      const trial = await TrialService.getTrial(trialId, projectId, workspaceId);

      res.status(200).json({
        success: true,
        data: trial
      });
    } catch (error) {
      if (error instanceof TrialNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    const trial = await TrialService.createTrial(projectId, workspaceId, userId, req.body);

    logger.info('Trial created via API', { trialId: trial.id, userId });

    res.status(201).json({
      success: true,
      data: trial,
      message: 'Trial created successfully'
    });
  }),

  bulkCreate: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;
    const { trials } = req.body;

    const created = await TrialService.createTrialsBulk(projectId, workspaceId, userId, trials);

    logger.info('Trials bulk created via API', { count: created.length, userId });

    res.status(201).json({
      success: true,
      data: created,
      count: created.length,
      message: 'Trials created successfully'
    });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, trialId } = req.params;
    const workspaceId = req.user!.workspaceId;

    const trial = await TrialService.updateTrial(trialId, projectId, workspaceId, req.body);

    logger.info('Trial updated via API', { trialId, userId: req.user!.id });

    res.status(200).json({
      success: true,
      data: trial,
      message: 'Trial updated successfully'
    });
  }),

  listSamples: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, trialId } = req.params;
    const workspaceId = req.user!.workspaceId;

    const samples = await TrialService.listTrialSamples(trialId, projectId, workspaceId);

    res.status(200).json({
      success: true,
      data: samples,
      count: samples.length
    });
  }),

  getParameterTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;

    const columns = await TrialService.getParameterTemplate(projectId, workspaceId);

    res.status(200).json({
      success: true,
      data: { columns }
    });
  }),

  updateParameterTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;
    const { columns } = req.body;

    const savedColumns = await TrialService.upsertParameterTemplate(projectId, workspaceId, userId, columns);

    res.status(200).json({
      success: true,
      data: { columns: savedColumns },
      message: 'Trial parameter template saved'
    });
  })
};
