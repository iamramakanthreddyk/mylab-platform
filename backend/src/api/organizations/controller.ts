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
   * GET /api/organizations - List all organizations accessible to user
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    // Platform admins don't need organizationId - they see all
    const isPlatformAdmin = req.user?.role === 'platform_admin';
    const organizationId = req.user?.organizationId || req.user?.workspaceId || null;
    
    if (!isPlatformAdmin && !organizationId) {
      return res.status(401).json({ success: false, error: 'Organization not found for user' });
    }

    const organizations = await OrganizationService.listOrganizations(organizationId!);

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
    const organizationId = req.user?.organizationId || req.user?.workspaceId;
    if (!organizationId) {
      return res.status(401).json({ success: false, error: 'Organization not found for user' });
    }

    const organization = await OrganizationService.getOrganization(id, organizationId);

    res.status(200).json({
      success: true,
      data: organization
    });
  }),

  /**
   * POST /api/organizations - Create new organization
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    // Platform admins don't need organizationId - they create standalone orgs
    const isPlatformAdmin = req.user?.role === 'platform_admin';
    const organizationId = req.user?.organizationId || req.user?.workspaceId;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    // For non-platform-admins, organizationId is required
    if (!isPlatformAdmin && !organizationId) {
      return res.status(401).json({ success: false, error: 'Organization not found' });
    }
    
    const { name, type, contactInfo } = req.body;

    const organization = await OrganizationService.createOrganization(organizationId!, userId, {
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
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }
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
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    await OrganizationService.deleteOrganization(id, workspaceId);

    res.status(200).json({
      success: true,
      message: 'Organization deleted successfully'
    });
  }),
};