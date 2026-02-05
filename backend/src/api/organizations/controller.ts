import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { OrganizationService } from './service';
import { OrganizationNotFoundError, InvalidOrganizationDataError } from './types';
import logger from '../../utils/logger';

/**
 * Organization Controller - Handles HTTP requests/responses for organization endpoints
 * Delegates business logic to OrganizationService
 */

export const organizationController = {
  /**
   * GET /api/organizations - List all organizations for user's workspace
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user!.workspaceId;

    const organizations = await OrganizationService.listOrganizations(workspaceId);

    res.status(200).json({
      success: true,
      data: organizations,
      count: organizations.length
    });
  }),

  /**
   * GET /api/organizations/:id - Get specific organization
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const organization = await OrganizationService.getOrganization(id, workspaceId);

    res.status(200).json({
      success: true,
      data: organization
    });
  }),

  /**
   * POST /api/organizations - Create new organization
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;
    const { name, type, contactInfo } = req.body;

    const organization = await OrganizationService.createOrganization(workspaceId, userId, {
      name,
      type,
      contactInfo
    });

    res.status(201).json({
      success: true,
      data: organization
    });
  }),

  /**
   * PUT /api/organizations/:id - Update organization
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;
    const { name, type, contactInfo } = req.body;

    const organization = await OrganizationService.updateOrganization(id, workspaceId, {
      name,
      type,
      contactInfo
    });

    res.status(200).json({
      success: true,
      data: organization
    });
  }),

  /**
   * DELETE /api/organizations/:id - Delete organization
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    await OrganizationService.deleteOrganization(id, workspaceId);

    res.status(200).json({
      success: true,
      message: 'Organization deleted successfully'
    });
  }),
};