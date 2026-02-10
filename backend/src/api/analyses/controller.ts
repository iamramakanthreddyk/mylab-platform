import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AnalysisService } from './service';
import {
  AnalysisNotFoundError,
  BatchNotFoundError,
  InvalidAnalysisDataError,
  ConflictingAnalysisError
} from './types';
import logger from '../../utils/logger';

/**
 * Analysis Controller - Handles HTTP requests for analysis endpoints
 */

export const analysisController = {
  /**
   * GET /api/analyses - List analyses with pagination
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }
    const { batchId, executionMode, limit, offset } = req.query;

    const result = await AnalysisService.listAnalyses(workspaceId, {
      batchId: batchId as string | undefined,
      executionMode: executionMode as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  }),

  /**
   * GET /api/analyses/:id - Get specific analysis
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    const analysis = await AnalysisService.getAnalysis(id, workspaceId);

    res.status(200).json({
      success: true,
      data: analysis
    });
  }),

  /**
   * POST /api/analyses - Create new analysis
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }
    const {
      batchId,
      analysisTypeId,
      results,
      filePath,
      fileChecksum,
      fileSizeBytes,
      status,
      executionMode,
      executedByOrgId,
      sourceOrgId,
      externalReference,
      performedAt
    } = req.body;

    try {
      const analysis = await AnalysisService.createAnalysis(workspaceId, userId, {
        batchId,
        analysisTypeId,
        results,
        filePath,
        fileChecksum,
        fileSizeBytes,
        status,
        executionMode,
        executedByOrgId,
        sourceOrgId,
        externalReference,
        performedAt
      });

      logger.info('Analysis created via API', { analysisId: analysis.id, userId });

      res.status(201).json({
        success: true,
        data: analysis,
        message: 'Analysis created successfully'
      });
    } catch (error) {
      if (error instanceof ConflictingAnalysisError) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * PUT /api/analyses/:id - Update analysis
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }
    const { status, results, filePath, fileChecksum, fileSizeBytes, performedAt, externalReference } = req.body;

    const analysis = await AnalysisService.updateAnalysis(id, workspaceId, userId, {
      status,
      results,
      filePath,
      fileChecksum,
      fileSizeBytes,
      performedAt,
      externalReference
    });

    logger.info('Analysis updated via API', { analysisId: id, userId: req.user!.id });

    res.status(200).json({
      success: true,
      data: analysis,
      message: 'Analysis updated successfully'
    });
  })
};
