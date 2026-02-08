import { Pool, PoolClient } from 'pg';
import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  ProjectResponse,
  ProjectModel,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectNotFoundError,
  InvalidProjectDataError
} from './types';

/**
 * Project Service - Handles all business logic related to projects
 * Database queries, validation, and cross-module operations
 */

export class ProjectService {
  /**
   * List all projects for a workspace
   */
  static async listProjects(workspaceId: string): Promise<ProjectResponse[]> {
    try {
      logger.info('Fetching projects for workspace', { workspaceId });

      const result = await pool.query(
        `
        SELECT
          p.id,
          p.workspace_id as "workspaceId",
          p.name,
          p.description,
          p.client_org_id as "clientOrgId",
          p.executing_org_id as "executingOrgId",
          p.status,
          p.workflow_mode as "workflowMode",
          p.created_by as "createdBy",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          o.name as "clientOrgName",
          o2.name as "executingOrgName"
        FROM projects p
        JOIN organizations o ON p.client_org_id = o.id
        JOIN organizations o2 ON p.executing_org_id = o2.id
        WHERE p.workspace_id = $1 AND p.deleted_at IS NULL
        ORDER BY p.created_at DESC
        `,
        [workspaceId]
      );

      return result.rows as ProjectResponse[];
    } catch (error) {
      logger.error('Failed to list projects', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get a single project by ID with workspace validation
   */
  static async getProject(projectId: string, workspaceId: string): Promise<ProjectResponse> {
    try {
      logger.info('Fetching project', { projectId, workspaceId });

      const result = await pool.query(
        `
        SELECT
          p.id,
          p.workspace_id as "workspaceId",
          p.name,
          p.description,
          p.client_org_id as "clientOrgId",
          p.executing_org_id as "executingOrgId",
          p.status,
          p.workflow_mode as "workflowMode",
          p.created_by as "createdBy",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          o.name as "clientOrgName",
          o2.name as "executingOrgName"
        FROM projects p
        JOIN organizations o ON p.client_org_id = o.id
        JOIN organizations o2 ON p.executing_org_id = o2.id
        WHERE p.id = $1 AND p.workspace_id = $2 AND p.deleted_at IS NULL
        `,
        [projectId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new ProjectNotFoundError(projectId);
      }

      return result.rows[0] as ProjectResponse;
    } catch (error) {
      logger.error('Failed to get project', { projectId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new project
   */
  static async createProject(
    workspaceId: string,
    userId: string,
    data: CreateProjectRequest
  ): Promise<ProjectResponse> {
    let client: PoolClient | null = null;

    try {
      logger.info('Creating project', { workspaceId, userId, data });

      // Validate that organizations exist and belong to workspace
      const orgCheck = await pool.query(
        `
        SELECT id FROM organizations 
        WHERE (id = $1 OR id = $2) AND workspace_id = $3
        `,
        [data.clientOrgId, data.executingOrgId, workspaceId]
      );

      if (orgCheck.rows.length !== 2) {
        throw new InvalidProjectDataError('One or both organizations do not exist in this workspace');
      }

      // Use transaction for atomic insert
      client = await pool.connect();
      await client.query('BEGIN');

      const result = await client.query(
        `
        INSERT INTO projects (
          workspace_id, name, description, 
          client_org_id, executing_org_id, workflow_mode, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          workspaceId,
          data.name,
          data.description || null,
          data.clientOrgId,
          data.executingOrgId,
          data.workflowMode || 'trial_first',
          userId
        ]
      );

      const newProject = result.rows[0] as ProjectModel;

      // Fetch with org names
      const fullResult = await client.query(
        `
        SELECT
          p.id,
          p.workspace_id as "workspaceId",
          p.name,
          p.description,
          p.client_org_id as "clientOrgId",
          p.executing_org_id as "executingOrgId",
          p.status,
          p.workflow_mode as "workflowMode",
          p.created_by as "createdBy",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          o.name as "clientOrgName",
          o2.name as "executingOrgName"
        FROM projects p
        JOIN organizations o ON p.client_org_id = o.id
        JOIN organizations o2 ON p.executing_org_id = o2.id
        WHERE p.id = $1
        `,
        [newProject.id]
      );

      await client.query('COMMIT');

      logger.info('Project created successfully', { projectId: newProject.id, userId });
      return fullResult.rows[0] as ProjectResponse;
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      logger.error('Failed to create project', { workspaceId, userId, error });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Update a project
   */
  static async updateProject(
    projectId: string,
    workspaceId: string,
    data: UpdateProjectRequest
  ): Promise<ProjectResponse> {
    try {
      logger.info('Updating project', { projectId, workspaceId, data });

      // Build dynamic update query
      const updates: string[] = [];
      const values: (string | undefined)[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }

      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.workflowMode !== undefined) {
        updates.push(`workflow_mode = $${paramIndex++}`);
        values.push(data.workflowMode);
      }

      if (updates.length === 0) {
        throw new InvalidProjectDataError('No fields to update');
      }

      updates.push(`updated_at = NOW()`);
      
      // Add WHERE clause parameters - paramIndex is already at the next available index
      const idParamIndex = paramIndex;
      const workspaceParamIndex = paramIndex + 1;

      values.push(projectId);
      values.push(workspaceId);

      const result = await pool.query(
        `
        UPDATE projects
        SET ${updates.join(', ')}
        WHERE id = $${idParamIndex} AND workspace_id = $${workspaceParamIndex} AND deleted_at IS NULL
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        throw new ProjectNotFoundError(projectId);
      }

      // Fetch with org names
      const fullResult = await pool.query(
        `
        SELECT
          p.id,
          p.workspace_id as "workspaceId",
          p.name,
          p.description,
          p.client_org_id as "clientOrgId",
          p.executing_org_id as "executingOrgId",
          p.status,
          p.workflow_mode as "workflowMode",
          p.created_by as "createdBy",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          o.name as "clientOrgName",
          o2.name as "executingOrgName"
        FROM projects p
        JOIN organizations o ON p.client_org_id = o.id
        JOIN organizations o2 ON p.executing_org_id = o2.id
        WHERE p.id = $1
        `,
        [projectId]
      );

      logger.info('Project updated successfully', { projectId });
      return fullResult.rows[0] as ProjectResponse;
    } catch (error) {
      logger.error('Failed to update project', { projectId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Soft delete a project (mark as deleted)
   */
  static async deleteProject(projectId: string, workspaceId: string): Promise<void> {
    try {
      logger.info('Deleting project', { projectId, workspaceId });

      const result = await pool.query(
        `
        UPDATE projects
        SET deleted_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        RETURNING id
        `,
        [projectId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new ProjectNotFoundError(projectId);
      }

      logger.info('Project deleted successfully', { projectId });
    } catch (error) {
      logger.error('Failed to delete project', { projectId, workspaceId, error });
      throw error;
    }
  }

  /**
   * Count projects in a workspace
   */
  static async countProjects(workspaceId: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*) as count FROM projects 
        WHERE workspace_id = $1 AND deleted_at IS NULL
        `,
        [workspaceId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Failed to count projects', { workspaceId, error });
      throw error;
    }
  }
}
