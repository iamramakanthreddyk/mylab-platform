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

/**
 * Generate URL-safe slug from organization name
 */
function toSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40) || 'org';
  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export class OrganizationService {
  /**
   * List all organizations accessible to the user
   */
  static async listOrganizations(userOrgId: string): Promise<OrganizationResponse[]> {
    try {
      logger.info('Fetching organizations', { userOrgId });

      const result = await pool.query(
        `
        SELECT
          id,
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM Organizations
        WHERE deleted_at IS NULL
        ORDER BY name ASC
        `
      );

      return result.rows as OrganizationResponse[];
    } catch (error) {
      logger.error('Failed to list organizations', { error });
      throw error;
    }
  }

  /**
   * Get a single organization by ID
   */
  static async getOrganization(id: string, userOrgId: string): Promise<OrganizationResponse> {
    try {
      logger.info('Fetching organization', { id, userOrgId });

      const result = await pool.query(
        `
        SELECT
          id,
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM Organizations
        WHERE id = $1 AND deleted_at IS NULL
        `,
        [id]
      );

      if (result.rows.length === 0) {
        throw new OrganizationNotFoundError(id);
      }

      return result.rows[0] as OrganizationResponse;
    } catch (error) {
      if (error instanceof OrganizationNotFoundError) {
        throw error;
      }
      logger.error('Failed to get organization', { id, userOrgId, error });
      throw error;
    }
  }

  /**
   * Create a new organization
   */
  static async createOrganization(
    userOrgId: string,
    userId: string,
    data: CreateOrganizationRequest
  ): Promise<OrganizationResponse> {
    try {
      logger.info('Creating organization', { userOrgId, userId, name: data.name });

      const slug = toSlug(data.name);

      const result = await pool.query(
        `
        INSERT INTO Organizations (
          name,
          slug,
          type,
          contact_info,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
        RETURNING
          id,
          name,
          type,
          contact_info as "contactInfo",
          created_at as "createdAt",
          updated_at as "updatedAt"
        `,
        [data.name, slug, data.type, data.contactInfo || {}]
      );

      return result.rows[0] as OrganizationResponse;
    } catch (error) {
      logger.error('Failed to create organization', { userOrgId, userId, data, error });
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