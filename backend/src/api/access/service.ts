import { pool } from '../../db';
import logger from '../../utils/logger';
import { GrantAccessRequest, AccessResponse, AccessNotFoundError, AccessAlreadyExistsError } from './types';

/**
 * Access Control Service - Manages object-level access grants
 */

export class AccessService {
  /**
   * Grant access to a resource
   */
  static async grantAccess(data: GrantAccessRequest): Promise<AccessResponse> {
    try {
      logger.info('Granting access', { userId: data.userId, objectType: data.objectType, objectId: data.objectId });

      // Check if access already exists
      const existing = await pool.query(
        `
        SELECT id FROM ObjectAccess
        WHERE user_id = $1 AND object_type = $2 AND object_id = $3
        `,
        [data.userId, data.objectType, data.objectId]
      );

      if (existing.rows.length > 0) {
        throw new AccessAlreadyExistsError();
      }

      const result = await pool.query(
        `
        INSERT INTO ObjectAccess (user_id, object_type, object_id, access_level)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, object_type, object_id, access_level, created_at
        `,
        [data.userId, data.objectType, data.objectId, data.accessLevel]
      );

      logger.info('Access granted', { grantId: result.rows[0].id });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to grant access', { error });
      throw error;
    }
  }

  /**
   * Get user's access to object
   */
  static async getUserObjectAccess(userId: string, objectType: string, objectId: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `
        SELECT access_level FROM ObjectAccess
        WHERE user_id = $1 AND object_type = $2 AND object_id = $3
        `,
        [userId, objectType, objectId]
      );

      return result.rows.length > 0 ? result.rows[0].access_level : null;
    } catch (error) {
      logger.error('Failed to get user access', { userId, objectType, objectId, error });
      throw error;
    }
  }

  /**
   * List access grants for a resource
   */
  static async listObjectAccess(objectType: string, objectId: string): Promise<AccessResponse[]> {
    try {
      logger.info('Listing access grants', { objectType, objectId });

      const result = await pool.query(
        `
        SELECT id, user_id, object_type, object_id, access_level, created_at
        FROM ObjectAccess
        WHERE object_type = $1 AND object_id = $2
        ORDER BY created_at DESC
        `,
        [objectType, objectId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list access grants', { objectType, objectId, error });
      throw error;
    }
  }

  /**
   * Revoke access
   */
  static async revokeAccess(userId: string, objectType: string, objectId: string): Promise<void> {
    try {
      logger.info('Revoking access', { userId, objectType, objectId });

      const result = await pool.query(
        `
        DELETE FROM ObjectAccess
        WHERE user_id = $1 AND object_type = $2 AND object_id = $3
        `,
        [userId, objectType, objectId]
      );

      if (result.rowCount === 0) {
        throw new AccessNotFoundError();
      }

      logger.info('Access revoked', { userId, objectType, objectId });
    } catch (error) {
      logger.error('Failed to revoke access', { error });
      throw error;
    }
  }

  /**
   * Update access level
   */
  static async updateAccessLevel(
    userId: string,
    objectType: string,
    objectId: string,
    accessLevel: string
  ): Promise<AccessResponse> {
    try {
      logger.info('Updating access level', { userId, objectType, objectId, accessLevel });

      const result = await pool.query(
        `
        UPDATE ObjectAccess
        SET access_level = $4
        WHERE user_id = $1 AND object_type = $2 AND object_id = $3
        RETURNING id, user_id, object_type, object_id, access_level, created_at
        `,
        [userId, objectType, objectId, accessLevel]
      );

      if (result.rows.length === 0) {
        throw new AccessNotFoundError();
      }

      logger.info('Access level updated', { userId, accessLevel });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update access level', { error });
      throw error;
    }
  }
}
