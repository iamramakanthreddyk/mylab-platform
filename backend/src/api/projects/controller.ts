import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { ProjectService } from './service';
import { ProjectNotFoundError, InvalidProjectDataError } from './types';
import logger from '../../utils/logger';

/**
 * Project Controller - Handles HTTP requests/responses for project endpoints
 * Delegates business logic to ProjectService
 */

export const projectController = {
  /**
   * GET /api/projects - List all projects for user's workspace
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const projects = isAdmin
      ? await ProjectService.listProjects(workspaceId)
      : await ProjectService.listProjectsForUser(workspaceId, userId);

    res.status(200).json({
      success: true,
      data: projects,
      count: projects.length
    });
  }),

  /**
   * GET /api/projects/:id - Get specific project
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    if (req.user?.role !== 'admin') {
      const hasAssignment = await ProjectService.userHasProjectAssignment(id, workspaceId, userId);
      if (!hasAssignment) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const project = await ProjectService.getProject(id, workspaceId);

    res.status(200).json({
      success: true,
      data: project
    });
  }),

  /**
   * POST /api/projects - Create new project
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;
    if (!workspaceId || !userId) {
      return res.status(401).json({ success: false, error: 'Workspace or user not found' });
    }
    const { name, description, clientOrgId, externalClientName, executingOrgId, workflowMode } = req.body;

    const project = await ProjectService.createProject(workspaceId, userId, {
      name,
      description,
      clientOrgId,
      externalClientName,
      executingOrgId,
      workflowMode
    });

    logger.info('Project created via API', { projectId: project.id, userId });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  }),

  /**
   * PUT /api/projects/:id - Update project
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }
    const { name, description, status, workflowMode } = req.body;

    const project = await ProjectService.updateProject(id, workspaceId, {
      name,
      description,
      status,
      workflowMode
    });

    logger.info('Project updated via API', { projectId: id, userId: req.user!.id });

    res.status(200).json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  }),

  /**
   * DELETE /api/projects/:id - Delete (soft delete) project
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ success: false, error: 'Workspace not found for user' });
    }

    await ProjectService.deleteProject(id, workspaceId);

    logger.info('Project deleted via API', { projectId: id, userId: req.user!.id });

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  })
};
