import { Pool } from 'pg';
import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  OrganizationResponse,
  OrganizationModel,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationNotFoundError,
  InvalidOrganizationDataError
} from './types';

/**
 * Organization Service - Handles all business logic related to organizations
 * Database queries, validation, and cross-module operations
 */

export class OrganizationService {
  /**
   * List all organizations for a workspace
   */
  static async listOrganizations(workspaceId: string): Promise<OrganizationResponse[]> {
    try {
      logger.info('Fetching organizations for workspace', { workspaceId });

      const result = await pool.query(
        `
        SELECT
          id,
          workspace_id as "workspaceId",
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM Organizations
        WHERE workspace_id = $1 AND deleted_at IS NULL
        ORDER BY name ASC
        `,
        [workspaceId]
      );

      return result.rows as OrganizationResponse[];
    } catch (error) {
      logger.error('Failed to list organizations', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get a single organization by ID with workspace validation
   */
  static async getOrganization(id: string, workspaceId: string): Promise<OrganizationResponse> {
    try {
      logger.info('Fetching organization', { id, workspaceId });

      const result = await pool.query(
        `
        SELECT
          id,
          workspace_id as "workspaceId",
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM Organizations
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `,
        [id, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new OrganizationNotFoundError(id);
      }

      return result.rows[0] as OrganizationResponse;
    } catch (error) {
      if (error instanceof OrganizationNotFoundError) {
        throw error;
      }
      logger.error('Failed to get organization', { id, workspaceId, error });
      throw error;
    }
  }

  /**
   * Create a new organization
   */
  static async createOrganization(
    workspaceId: string,
    userId: string,
    data: CreateOrganizationRequest
  ): Promise<OrganizationResponse> {
    try {
      logger.info('Creating organization', { workspaceId, userId, name: data.name });

      const result = await pool.query(
        `
        INSERT INTO Organizations (
          workspace_id,
          name,
          type,
          contact_info,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING
          id,
          workspace_id as "workspaceId",
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [workspaceId, data.name, data.type, data.contactInfo || {}]
      );

      return result.rows[0] as OrganizationResponse;
    } catch (error) {
      logger.error('Failed to create organization', { workspaceId, userId, data, error });
      throw error;
    }
  }

  /**
   * Update an organization
   */
  static async updateOrganization(
    id: string,
    workspaceId: string,
    data: UpdateOrganizationRequest
  ): Promise<OrganizationResponse> {
    try {
      logger.info('Updating organization', { id, workspaceId, data });

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.type !== undefined) {
        updates.push(`type = $${paramCount++}`);
        values.push(data.type);
      }
      if (data.contactInfo !== undefined) {
        updates.push(`contact_info = $${paramCount++}`);
        values.push(data.contactInfo);
      }

      if (updates.length === 0) {
        throw new InvalidOrganizationDataError('No valid update fields provided');
      }

      updates.push(`updated_at = NOW()`);

      const result = await pool.query(
        `
        UPDATE Organizations
        SET ${updates.join(', ')}
        WHERE id = $${paramCount++} AND workspace_id = $${paramCount++} AND deleted_at IS NULL
        RETURNING
          id,
          workspace_id as "workspaceId",
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [...values, id, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new OrganizationNotFoundError(id);
      }

      return result.rows[0] as OrganizationResponse;
    } catch (error) {
      if (error instanceof OrganizationNotFoundError || error instanceof InvalidOrganizationDataError) {
        throw error;
      }
      logger.error('Failed to update organization', { id, workspaceId, data, error });
      throw error;
    }
  }

  /**
   * Soft delete an organization
   */
  static async deleteOrganization(id: string, workspaceId: string): Promise<void> {
    try {
      logger.info('Deleting organization', { id, workspaceId });

      const result = await pool.query(
        `
        UPDATE Organizations
        SET deleted_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `,
        [id, workspaceId]
      );

      if (result.rowCount === 0) {
        throw new OrganizationNotFoundError(id);
      }
    } catch (error) {
      if (error instanceof OrganizationNotFoundError) {
        throw error;
      }
      logger.error('Failed to delete organization', { id, workspaceId, error });
      throw error;
    }
  }
}