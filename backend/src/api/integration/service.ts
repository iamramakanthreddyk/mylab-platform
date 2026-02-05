import { pool } from '../../db';
import logger from '../../utils/logger';
import { CreateIntegrationRequest, IntegrationResponse, IntegrationNotFoundError, UnsupportedProviderError } from './types';

/**
 * Integration Service - Manages third-party integrations
 */

const SUPPORTED_PROVIDERS = ['slack', 'github', 'jira', 'datadog', 'splunk'];

export class IntegrationService {
  /**
   * Create integration
   */
  static async createIntegration(data: CreateIntegrationRequest): Promise<IntegrationResponse> {
    try {
      logger.info('Creating integration', { workspaceId: data.workspace_id, provider: data.provider });

      // Validate provider
      if (!SUPPORTED_PROVIDERS.includes(data.provider)) {
        throw new UnsupportedProviderError(data.provider);
      }

      const result = await pool.query(
        `
        INSERT INTO Integrations (workspace_id, provider, name, config)
        VALUES ($1, $2, $3, $4)
        RETURNING id, workspace_id, provider, name, is_active, created_at
        `,
        [data.workspace_id, data.provider, data.name, JSON.stringify(data.config || {})]
      );

      logger.info('Integration created', { integrationId: result.rows[0].id });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create integration', { error });
      throw error;
    }
  }

  /**
   * Get integration
   */
  static async getIntegration(workspaceId: string, integrationId: string): Promise<IntegrationResponse> {
    try {
      const result = await pool.query(
        `
        SELECT id, workspace_id, provider, name, is_active, created_at
        FROM Integrations
        WHERE id = $1 AND workspace_id = $2
        `,
        [integrationId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new IntegrationNotFoundError(integrationId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get integration', { integrationId, error });
      throw error;
    }
  }

  /**
   * List integrations for workspace
   */
  static async listIntegrations(workspaceId: string): Promise<IntegrationResponse[]> {
    try {
      logger.info('Listing integrations', { workspaceId });

      const result = await pool.query(
        `
        SELECT id, workspace_id, provider, name, is_active, created_at
        FROM Integrations
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        `,
        [workspaceId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list integrations', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Enable integration
   */
  static async enableIntegration(workspaceId: string, integrationId: string): Promise<IntegrationResponse> {
    try {
      logger.info('Enabling integration', { integrationId, workspaceId });

      const result = await pool.query(
        `
        UPDATE Integrations
        SET is_active = true
        WHERE id = $1 AND workspace_id = $2
        RETURNING id, workspace_id, provider, name, is_active, created_at
        `,
        [integrationId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new IntegrationNotFoundError(integrationId);
      }

      logger.info('Integration enabled', { integrationId });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to enable integration', { integrationId, error });
      throw error;
    }
  }

  /**
   * Disable integration
   */
  static async disableIntegration(workspaceId: string, integrationId: string): Promise<IntegrationResponse> {
    try {
      logger.info('Disabling integration', { integrationId, workspaceId });

      const result = await pool.query(
        `
        UPDATE Integrations
        SET is_active = false
        WHERE id = $1 AND workspace_id = $2
        RETURNING id, workspace_id, provider, name, is_active, created_at
        `,
        [integrationId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new IntegrationNotFoundError(integrationId);
      }

      logger.info('Integration disabled', { integrationId });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to disable integration', { integrationId, error });
      throw error;
    }
  }

  /**
   * Delete integration
   */
  static async deleteIntegration(workspaceId: string, integrationId: string): Promise<void> {
    try {
      logger.info('Deleting integration', { integrationId, workspaceId });

      const result = await pool.query(
        `
        DELETE FROM Integrations
        WHERE id = $1 AND workspace_id = $2
        `,
        [integrationId, workspaceId]
      );

      if (result.rowCount === 0) {
        throw new IntegrationNotFoundError(integrationId);
      }

      logger.info('Integration deleted', { integrationId });
    } catch (error) {
      logger.error('Failed to delete integration', { integrationId, error });
      throw error;
    }
  }
}
