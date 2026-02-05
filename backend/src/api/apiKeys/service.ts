import { pool } from '../../db';
import logger from '../../utils/logger';
import { CreateApiKeyRequest, ApiKeyResponse, ApiKeyNotFoundError } from './types';
import crypto from 'crypto';

/**
 * API Keys Service - Manages API keys for workspace programmatic access
 */

export class ApiKeyService {
  /**
   * Generate a random API key
   */
  private static generateKey(): string {
    return 'sk_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create new API key
   */
  static async createApiKey(workspaceId: string, data: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    try {
      logger.info('Creating API key', { workspaceId, name: data.name });

      const key = this.generateKey();

      const result = await pool.query(
        `
        INSERT INTO ApiKeys (workspace_id, name, description, key, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, workspace_id, name, description, key, created_at, expires_at
        `,
        [
          workspaceId,
          data.name,
          data.description || null,
          key,
          data.expiresAt || null
        ]
      );

      logger.info('API key created', { keyId: result.rows[0].id, workspaceId });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create API key', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Get API key by ID
   */
  static async getApiKey(workspaceId: string, keyId: string): Promise<ApiKeyResponse> {
    try {
      const result = await pool.query(
        `
        SELECT id, workspace_id, name, description, key, created_at, expires_at, last_used_at
        FROM ApiKeys
        WHERE id = $1 AND workspace_id = $2
        `,
        [keyId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new ApiKeyNotFoundError(keyId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get API key', { keyId, workspaceId, error });
      throw error;
    }
  }

  /**
   * List API keys for workspace
   */
  static async listApiKeys(workspaceId: string): Promise<ApiKeyResponse[]> {
    try {
      logger.info('Listing API keys', { workspaceId });

      const result = await pool.query(
        `
        SELECT id, workspace_id, name, description, created_at, expires_at, last_used_at
        FROM ApiKeys
        WHERE workspace_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        `,
        [workspaceId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list API keys', { workspaceId, error });
      throw error;
    }
  }

  /**
   * Delete API key
   */
  static async deleteApiKey(workspaceId: string, keyId: string): Promise<void> {
    try {
      logger.info('Deleting API key', { keyId, workspaceId });

      const result = await pool.query(
        `
        UPDATE ApiKeys
        SET deleted_at = NOW()
        WHERE id = $1 AND workspace_id = $2
        `,
        [keyId, workspaceId]
      );

      if (result.rowCount === 0) {
        throw new ApiKeyNotFoundError(keyId);
      }

      logger.info('API key deleted', { keyId });
    } catch (error) {
      logger.error('Failed to delete API key', { keyId, error });
      throw error;
    }
  }

  /**
   * Validate and get key details (used for authenticating API requests)
   */
  static async validateApiKey(key: string): Promise<{ workspaceId: string; keyId: string }> {
    try {
      const result = await pool.query(
        `
        SELECT id, workspace_id FROM ApiKeys
        WHERE key = $1 AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
        `,
        [key]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid API key');
      }

      const row = result.rows[0];

      // Update last used timestamp
      await pool.query('UPDATE ApiKeys SET last_used_at = NOW() WHERE id = $1', [row.id]);

      return {
        keyId: row.id,
        workspaceId: row.workspace_id
      };
    } catch (error) {
      logger.error('API key validation failed', { error });
      throw error;
    }
  }
}
