import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  CreateDerivedSampleRequest,
  DerivedSampleResponse,
  DerivedSampleNotFoundError,
  ParentSampleNotFoundError
} from './types';

/**
 * Derived Samples Service - Manages samples derived from other samples
 */

export class DerivedSampleService {
  /**
   * Create derived sample
   */
  static async createDerivedSample(
    workspaceId: string,
    data: CreateDerivedSampleRequest
  ): Promise<DerivedSampleResponse> {
    try {
      logger.info('Creating derived sample', {
        workspaceId,
        parentSampleId: data.parent_sample_id,
        name: data.name
      });

      // Verify parent sample exists in workspace
      const parentResult = await pool.query(
        `
        SELECT id FROM Samples
        WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `,
        [data.parent_sample_id, workspaceId]
      );

      if (parentResult.rows.length === 0) {
        throw new ParentSampleNotFoundError(data.parent_sample_id);
      }

      // Create derived sample
      const result = await pool.query(
        `
        INSERT INTO DerivedSamples (
          workspace_id, parent_sample_id, name, description, derivation_method
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, parent_sample_id, workspace_id, name, description, derivation_method, created_at
        `,
        [workspaceId, data.parent_sample_id, data.name, data.description || null, data.derivation_method]
      );

      logger.info('Derived sample created', { derivedSampleId: result.rows[0].id });

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create derived sample', { error });
      throw error;
    }
  }

  /**
   * Get derived sample
   */
  static async getDerivedSample(workspaceId: string, sampleId: string): Promise<DerivedSampleResponse> {
    try {
      const result = await pool.query(
        `
        SELECT id, parent_sample_id, workspace_id, name, description, derivation_method, created_at
        FROM DerivedSamples
        WHERE id = $1 AND workspace_id = $2
        `,
        [sampleId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new DerivedSampleNotFoundError(sampleId);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get derived sample', { sampleId, workspaceId, error });
      throw error;
    }
  }

  /**
   * List derived samples for a parent sample
   */
  static async listDerivedSamples(
    workspaceId: string,
    parentSampleId: string
  ): Promise<DerivedSampleResponse[]> {
    try {
      logger.info('Listing derived samples', { workspaceId, parentSampleId });

      const result = await pool.query(
        `
        SELECT id, parent_sample_id, workspace_id, name, description, derivation_method, created_at
        FROM DerivedSamples
        WHERE workspace_id = $1 AND parent_sample_id = $2
        ORDER BY created_at DESC
        `,
        [workspaceId, parentSampleId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list derived samples', { workspaceId, parentSampleId, error });
      throw error;
    }
  }

  /**
   * Delete derived sample
   */
  static async deleteDerivedSample(workspaceId: string, sampleId: string): Promise<void> {
    try {
      logger.info('Deleting derived sample', { workspaceId, sampleId });

      const result = await pool.query(
        `
        DELETE FROM DerivedSamples
        WHERE id = $1 AND workspace_id = $2
        `,
        [sampleId, workspaceId]
      );

      if (result.rowCount === 0) {
        throw new DerivedSampleNotFoundError(sampleId);
      }

      logger.info('Derived sample deleted', { sampleId });
    } catch (error) {
      logger.error('Failed to delete derived sample', { sampleId, error });
      throw error;
    }
  }
}
