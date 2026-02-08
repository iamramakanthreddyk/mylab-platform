import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { DerivedSampleService } from './service';
import { DerivedSampleNotFoundError, ParentSampleNotFoundError } from './types';
import logger from '../../utils/logger';

/**
 * Derived Samples Controller
 */

export const derivedSampleController = {
  /**
   * POST /api/samples/:workspaceId/:parentId/derived - Create derived sample
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, parentId } = req.params;
    const {
      derived_id,
      name,
      description,
      derivation_method,
      execution_mode,
      executed_by_org_id,
      external_reference,
      performed_at,
      metadata
    } = req.body;

    try {
      const sample = await DerivedSampleService.createDerivedSample(
        workspaceId,
        {
          parent_sample_id: parentId,
          derived_id: derived_id || name,
          name,
          description,
          derivation_method,
          execution_mode,
          executed_by_org_id,
          external_reference,
          performed_at,
          metadata
        },
        req.user!.id
      );

      logger.info('Derived sample created via API', { sampleId: sample.id, userId: req.user!.id });

      res.status(201).json({
        success: true,
        data: sample
      });
    } catch (error) {
      if (error instanceof ParentSampleNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/samples/:workspaceId/:parentId/derived - List derived samples
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, parentId } = req.params;

    const samples = await DerivedSampleService.listDerivedSamples(workspaceId, parentId);

    res.status(200).json({
      success: true,
      data: samples,
      count: samples.length
    });
  }),

  /**
   * GET /api/derived-samples/:workspaceId/:id - Get derived sample
   */
  get: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      const sample = await DerivedSampleService.getDerivedSample(workspaceId, id);

      res.status(200).json({
        success: true,
        data: sample
      });
    } catch (error) {
      if (error instanceof DerivedSampleNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * DELETE /api/derived-samples/:workspaceId/:id - Delete derived sample
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, id } = req.params;

    try {
      await DerivedSampleService.deleteDerivedSample(workspaceId, id);

      logger.info('Derived sample deleted via API', { sampleId: id, userId: req.user!.id });

      res.status(200).json({
        success: true,
        message: 'Derived sample deleted successfully'
      });
    } catch (error) {
      if (error instanceof DerivedSampleNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
