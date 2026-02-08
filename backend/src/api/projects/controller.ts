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
    const workspaceId = req.user!.workspaceId;

    const projects = await ProjectService.listProjects(workspaceId);

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
    const workspaceId = req.user!.workspaceId;

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
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;
    const { name, description, clientOrgId, executingOrgId, workflowMode } = req.body;

    const project = await ProjectService.createProject(workspaceId, userId, {
      name,
      description,
      clientOrgId,
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
    const workspaceId = req.user!.workspaceId;
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
    const workspaceId = req.user!.workspaceId;

    await ProjectService.deleteProject(id, workspaceId);

    logger.info('Project deleted via API', { projectId: id, userId: req.user!.id });

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  })
};
