import Joi from 'joi';

/**
 * Project request/response types and validation schemas
 */

// ============ Request DTOs ============

export interface ListProjectsRequest {
  // Uses authenticated user's workspaceId from token
  workspaceId?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  clientOrgId: string;
  executingOrgId: string;
  workflowMode?: 'analysis_first' | 'trial_first';
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
  workflowMode?: 'analysis_first' | 'trial_first';
}

export interface GetProjectRequest {
  id: string;
  workspaceId?: string; // From authenticated user
}

// ============ Response DTOs ============

export interface ProjectResponse {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  clientOrgId: string;
  clientOrgName: string;
  executingOrgId: string;
  executingOrgName: string;
  status: string;
  workflowMode?: 'analysis_first' | 'trial_first';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ListProjectsResponse {
  success: boolean;
  data: ProjectResponse[];
  count: number;
}

export interface CreateProjectResponse {
  success: boolean;
  data: ProjectResponse;
  message: string;
}

export interface UpdateProjectResponse {
  success: boolean;
  data: ProjectResponse;
  message: string;
}

export interface DeleteProjectResponse {
  success: boolean;
  message: string;
}

// ============ Validation Schemas ============

export const createProjectSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .max(255)
    .messages({
      'string.empty': 'Project name cannot be empty',
      'string.max': 'Project name cannot exceed 255 characters'
    }),
  description: Joi.string()
    .optional()
    .trim()
    .max(2000)
    .messages({
      'string.max': 'Description cannot exceed 2000 characters'
    }),
  clientOrgId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Client organization ID must be a valid UUID'
    }),
  executingOrgId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Executing organization ID must be a valid UUID'
    }),
  workflowMode: Joi.string()
    .optional()
    .valid('analysis_first', 'trial_first')
    .messages({
      'any.only': 'Workflow mode must be analysis_first or trial_first'
    })
});

export const updateProjectSchema = Joi.object({
  name: Joi.string()
    .optional()
    .trim()
    .max(255),
  description: Joi.string()
    .optional()
    .trim()
    .max(2000),
  status: Joi.string()
    .optional()
    .valid('active', 'completed', 'archived')
    .messages({
      'any.only': 'Status must be one of: active, completed, or archived'
    }),
  workflowMode: Joi.string()
    .optional()
    .valid('analysis_first', 'trial_first')
    .messages({
      'any.only': 'Workflow mode must be analysis_first or trial_first'
    })
});

// ============ Database Models ============

export interface ProjectModel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  client_org_id: string;
  executing_org_id: string;
  status: string;
  workflow_mode?: 'analysis_first' | 'trial_first';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============ Service Error Types ============

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project ${projectId} not found`);
    this.name = 'ProjectNotFoundError';
  }
}

export class InvalidProjectDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProjectDataError';
  }
}
