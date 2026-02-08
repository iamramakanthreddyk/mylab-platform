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
    data: CreateDerivedSampleRequest,
    createdBy: string
  ): Promise<DerivedSampleResponse> {
    try {
      logger.info('Creating derived sample', {
        workspaceId,
        parentSampleId: data.parent_sample_id,
        name: data.name || data.derived_id
      });

      // Verify parent sample exists in workspace
      const parentResult = await pool.query(
        `
        SELECT s.id, s.project_id, p.executing_org_id
        FROM Samples s
        LEFT JOIN Projects p ON s.project_id = p.id
        WHERE s.id = $1 AND s.workspace_id = $2 AND s.deleted_at IS NULL
        `,
        [data.parent_sample_id, workspaceId]
      );

      if (parentResult.rows.length === 0) {
        throw new ParentSampleNotFoundError(data.parent_sample_id);
      }

      const parent = parentResult.rows[0];
      const derivedId = (data.derived_id || data.name || '').trim();
      if (!derivedId) {
        throw new Error('Derived sample ID is required');
      }

      const executedByOrgId = data.executed_by_org_id || parent.executing_org_id;
      if (!executedByOrgId) {
        throw new Error('Executed by organization is required');
      }

      const metadata = {
        ...(data.metadata || {}),
        derivation_method: data.derivation_method || data.metadata?.derivation_method || null
      };

      // Create derived sample
      const result = await pool.query(
        `
        INSERT INTO DerivedSamples (
          owner_workspace_id,
          root_sample_id,
          parent_id,
          stage_id,
          derived_id,
          process_notes,
          metadata,
          depth,
          execution_mode,
          executed_by_org_id,
          external_reference,
          performed_at,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING
          id,
          root_sample_id AS parent_sample_id,
          owner_workspace_id AS workspace_id,
          derived_id AS name,
          derived_id,
          process_notes AS description,
          metadata,
          metadata->>'derivation_method' AS derivation_method,
          execution_mode,
          executed_by_org_id,
          external_reference,
          performed_at,
          created_at
        `,
        [
          workspaceId,
          data.parent_sample_id,
          null,
          null,
          derivedId,
          data.description || null,
          Object.values(metadata).some(value => value !== null && value !== undefined && value !== '')
            ? metadata
            : null,
          0,
          data.execution_mode || 'platform',
          executedByOrgId,
          data.external_reference || null,
          data.performed_at || null,
          createdBy
        ]
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
        SELECT
          id,
          root_sample_id AS parent_sample_id,
          owner_workspace_id AS workspace_id,
          derived_id AS name,
          derived_id,
          process_notes AS description,
          metadata,
          metadata->>'derivation_method' AS derivation_method,
          execution_mode,
          executed_by_org_id,
          external_reference,
          performed_at,
          created_at
        FROM DerivedSamples
        WHERE id = $1 AND owner_workspace_id = $2 AND deleted_at IS NULL
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
        SELECT
          id,
          root_sample_id AS parent_sample_id,
          owner_workspace_id AS workspace_id,
          derived_id AS name,
          derived_id,
          process_notes AS description,
          metadata,
          metadata->>'derivation_method' AS derivation_method,
          execution_mode,
          executed_by_org_id,
          external_reference,
          performed_at,
          created_at
        FROM DerivedSamples
        WHERE owner_workspace_id = $1 AND root_sample_id = $2 AND deleted_at IS NULL
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
        WHERE id = $1 AND owner_workspace_id = $2
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
