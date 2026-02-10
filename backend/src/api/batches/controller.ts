import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { BatchService } from './service';
import { BatchNotFoundError, InvalidBatchDataError } from './types';
import logger from '../../utils/logger';

/**
 * Batch Controller - Handles HTTP requests for batch endpoints
 */

export const batchController = {
  /**
   * GET /api/batches - List batches with pagination
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }
    const { status, limit, offset } = req.query;

    const result = await BatchService.listBatches(workspaceId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: (limit ? parseInt(limit as string) : 50),
        offset: (offset ? parseInt(offset as string) : 0)
      }
    });
  }),

  /**
   * GET /api/batches/:id - Get specific batch
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    const batch = await BatchService.getBatch(id, workspaceId);

    res.status(200).json({
      success: true,
      data: batch
    });
  }),

  /**
   * POST /api/batches - Create new batch
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    const organizationId = req.user?.orgId || req.user?.workspaceId; // Fallback to workspace if org not available
    if (!workspaceId || !userId || !organizationId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }
    const {
      batchId,
      description,
      parameters,
      status,
      executionMode,
      executedByOrgId,
      externalReference,
      performedAt,
      sampleIds
    } = req.body;

    const batch = await BatchService.createBatch(workspaceId, userId, organizationId, {
      batchId,
      description,
      parameters,
      status,
      executionMode,
      executedByOrgId,
      externalReference,
      performedAt,
      sampleIds: sampleIds || []
    });

    logger.info('Batch created via API', { batchId: batch.id, userId });

    res.status(201).json({
      success: true,
      data: batch,
      message: 'Batch created successfully'
    });
  }),

  /**
   * PUT /api/batches/:id - Update batch
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }
    const { status, parameters } = req.body;

    const batch = await BatchService.updateBatch(id, workspaceId, {
      status,
      parameters
    });

    logger.info('Batch updated via API', { batchId: id, userId });

    res.status(200).json({
      success: true,
      data: batch,
      message: 'Batch updated successfully'
    });
  }),

  /**
   * DELETE /api/batches/:id - Delete batch
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    await BatchService.deleteBatch(id, workspaceId);

    logger.info('Batch deleted via API', { batchId: id, userId });

    res.status(200).json({
      success: true,
      message: 'Batch deleted successfully'
    });
  })
};
