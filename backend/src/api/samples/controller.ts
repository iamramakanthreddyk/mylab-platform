import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { SampleService } from './service';
import {
  SampleNotFoundError,
  InvalidSampleDataError,
  SampleHasDerivedError,
  UnauthorizedCascadeDeleteError
} from './types';
import logger from '../../utils/logger';

/**
 * Sample Controller - Handles HTTP requests for sample endpoints
 */

export const sampleController = {
  /**
   * GET /api/samples - List samples for project or all samples for workspace
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.query;
    const workspaceId = req.user!.workspaceId;

    let samples;
    if (projectId) {
      samples = await SampleService.listSamples(String(projectId), workspaceId);
    } else {
      samples = await SampleService.listAllSamples(workspaceId);
    }

    res.status(200).json({
      success: true,
      data: samples,
      count: samples.length
    });
  }),

  /**
   * GET /api/samples/:id - Get specific sample
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const sample = await SampleService.getSample(id, workspaceId);

    res.status(200).json({
      success: true,
      data: sample
    });
  }),

  /**
   * POST /api/samples - Create new sample
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;
    const { projectId, stageId, sampleId, description, type, metadata } = req.body;

    const sample = await SampleService.createSample(workspaceId, userId, {
      projectId,
      stageId,
      sampleId,
      description,
      type,
      metadata
    });

    logger.info('Sample created via API', { sampleId: sample.id, userId });

    res.status(201).json({
      success: true,
      data: sample,
      message: 'Sample created successfully'
    });
  }),

  /**
   * PUT /api/samples/:id - Update sample
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;
    const { projectId, sampleId, description, type, status, metadata, stageId } = req.body;

    const sample = await SampleService.updateSample(id, workspaceId, projectId, {
      sampleId,
      description,
      type,
      status,
      metadata,
      stageId
    });

    logger.info('Sample updated via API', { sampleId: id, userId: req.user!.id });

    res.status(200).json({
      success: true,
      data: sample,
      message: 'Sample updated successfully'
    });
  }),

  /**
   * DELETE /api/samples/:id - Delete sample (with lineage protection)
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    try {
      await SampleService.deleteSample(id, workspaceId);

      logger.info('Sample deleted via API', { sampleId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        message: 'Sample deleted successfully'
      });
    } catch (error) {
      if (error instanceof SampleHasDerivedError) {
        return res.status(409).json({
          success: false,
          error: error.message,
          details: 'Delete derived samples first or use cascade delete if authorized'
        });
      }
      throw error;
    }
  }),

  /**
   * DELETE /api/samples/:id/cascade - Cascade delete (admin only)
   */
  cascadeDelete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userRole = req.user!.role;

    try {
      const deletedCount = await SampleService.cascadeDeleteSample(id, userRole);

      logger.info('Sample cascade deleted via API', { sampleId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        message: 'Sample and derived samples deleted successfully',
        deletedCount
      });
    } catch (error) {
      if (error instanceof UnauthorizedCascadeDeleteError) {
        return res.status(403).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
