import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  CreateTrialRequest,
  UpdateTrialRequest,
  TrialResponse,
  TrialNotFoundError
} from './types';

/**
 * Trial Service - Handles trial CRUD for experiment-driven workflows
 */

export class TrialService {
  static async listTrials(projectId: string, workspaceId: string): Promise<TrialResponse[]> {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM Trials
        WHERE project_id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        ORDER BY created_at DESC
        `,
        [projectId, workspaceId]
      );

      return result.rows as TrialResponse[];
    } catch (error) {
      logger.error('Failed to list trials', { projectId, workspaceId, error });
      throw error;
    }
  }

  static async getTrial(
    trialId: string,
    projectId: string,
    workspaceId: string
  ): Promise<TrialResponse> {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM Trials
        WHERE id = $1 AND project_id = $2 AND workspace_id = $3 AND deleted_at IS NULL
        `,
        [trialId, projectId, workspaceId]
      );

      if (result.rows.length === 0) {
        throw new TrialNotFoundError(trialId);
      }

      return result.rows[0] as TrialResponse;
    } catch (error) {
      logger.error('Failed to get trial', { trialId, projectId, workspaceId, error });
      throw error;
    }
  }

  static async createTrial(
    projectId: string,
    workspaceId: string,
    userId: string,
    data: CreateTrialRequest
  ): Promise<TrialResponse> {
    try {
      const result = await pool.query(
        `
        INSERT INTO Trials (
          project_id, workspace_id, name, objective, parameters, parameters_json, equipment, notes,
          status, performed_at, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `,
        [
          projectId,
          workspaceId,
          data.name,
          data.objective || null,
          data.parameters || null,
          data.measurements ? JSON.stringify(data.measurements) : null,
          data.equipment || null,
          data.notes || null,
          data.status || 'planned',
          data.performedAt || null,
          userId
        ]
      );

      return result.rows[0] as TrialResponse;
    } catch (error) {
      logger.error('Failed to create trial', { projectId, workspaceId, error });
      throw error;
    }
  }

  static async createTrialsBulk(
    projectId: string,
    workspaceId: string,
    userId: string,
    trials: CreateTrialRequest[]
  ): Promise<TrialResponse[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const created: TrialResponse[] = [];

      for (const trial of trials) {
        const result = await client.query(
          `
          INSERT INTO trials (
            project_id, workspace_id, name, objective, parameters, parameters_json, equipment, notes,
            status, performed_at, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
          `,
          [
            projectId,
            workspaceId,
            trial.name,
            trial.objective || null,
            trial.parameters || null,
            trial.measurements ? JSON.stringify(trial.measurements) : null,
            trial.equipment || null,
            trial.notes || null,
            trial.status || 'planned',
            trial.performedAt || null,
            userId
          ]
        );
        created.push(result.rows[0] as TrialResponse);
      }

      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to bulk create trials', { projectId, workspaceId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateTrial(
    trialId: string,
    projectId: string,
    workspaceId: string,
    data: UpdateTrialRequest
  ): Promise<TrialResponse> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }

      if (data.objective !== undefined) {
        updates.push(`objective = $${paramIndex++}`);
        values.push(data.objective || null);
      }

      if (data.parameters !== undefined) {
        updates.push(`parameters = $${paramIndex++}`);
        values.push(data.parameters || null);
      }

      if (data.measurements !== undefined) {
        updates.push(`parameters_json = $${paramIndex++}`);
        values.push(data.measurements ? JSON.stringify(data.measurements) : null);
      }

      if (data.equipment !== undefined) {
        updates.push(`equipment = $${paramIndex++}`);
        values.push(data.equipment || null);
      }

      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        values.push(data.notes || null);
      }

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(data.status);
      }

      if (data.performedAt !== undefined) {
        updates.push(`performed_at = $${paramIndex++}`);
        values.push(data.performedAt || null);
      }

      if (updates.length === 0) {
        throw new TrialNotFoundError(trialId);
      }

      updates.push('updated_at = NOW()');

      values.push(trialId, projectId, workspaceId);

      const result = await pool.query(
        `
        UPDATE Trials
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND project_id = $${paramIndex++} AND workspace_id = $${paramIndex++} AND deleted_at IS NULL
        RETURNING *
        `,
        values
      );

      if (result.rows.length === 0) {
        throw new TrialNotFoundError(trialId);
      }

      return result.rows[0] as TrialResponse;
    } catch (error) {
      logger.error('Failed to update trial', { trialId, projectId, workspaceId, error });
      throw error;
    }
  }

  static async listTrialSamples(
    trialId: string,
    projectId: string,
    workspaceId: string
  ): Promise<any[]> {
    try {
      const result = await pool.query(
        `
        SELECT s.*, p.name as project_name
        FROM samples s
        JOIN projects p ON s.project_id = p.id
        WHERE s.trial_id = $1 AND s.project_id = $2 AND s.workspace_id = $3 AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        `,
        [trialId, projectId, workspaceId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list trial samples', { trialId, projectId, workspaceId, error });
      throw error;
    }
  }

  static async getParameterTemplate(
    projectId: string,
    workspaceId: string
  ): Promise<string[]> {
    try {
      const result = await pool.query(
        `
        SELECT columns
        FROM trial_parameter_templates
        WHERE project_id = $1 AND workspace_id = $2
        `,
        [projectId, workspaceId]
      );

      if (result.rows.length === 0) {
        return [];
      }

      return result.rows[0].columns || [];
    } catch (error) {
      logger.error('Failed to get trial parameter template', { projectId, workspaceId, error });
      throw error;
    }
  }

  static async upsertParameterTemplate(
    projectId: string,
    workspaceId: string,
    userId: string,
    columns: string[]
  ): Promise<string[]> {
    try {
      const result = await pool.query(
        `
        INSERT INTO trial_parameter_templates (
          project_id, workspace_id, columns, created_by
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (project_id, workspace_id)
        DO UPDATE SET columns = EXCLUDED.columns, updated_at = NOW()
        RETURNING columns
        `,
        [projectId, workspaceId, JSON.stringify(columns), userId]
      );

      return result.rows[0].columns || [];
    } catch (error) {
      logger.error('Failed to save trial parameter template', { projectId, workspaceId, error });
      throw error;
    }
  }
}
