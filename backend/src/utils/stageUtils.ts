import { pool } from '../db';

/**
 * Stage validation utilities for MyLab platform
 * Enforces stage-based workflow progression and sample creation rules
 */

export interface StageInfo {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  status: 'planned' | 'active' | 'completed';
}

/**
 * Get stage information by ID
 */
export async function getStageInfo(stageId: string): Promise<StageInfo | null> {
  try {
    const result = await pool.query(`
      SELECT id, project_id, name, order_index, status
      FROM ProjectStages
      WHERE id = $1
    `, [stageId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      orderIndex: row.order_index,
      status: row.status
    };
  } catch (error) {
    console.error('Error getting stage info:', error);
    return null;
  }
}

/**
 * Get all stages for a project, ordered by sequence
 */
export async function getProjectStages(projectId: string): Promise<StageInfo[]> {
  try {
    const result = await pool.query(`
      SELECT id, project_id, name, order_index, status
      FROM ProjectStages
      WHERE project_id = $1
      ORDER BY order_index ASC
    `, [projectId]);

    return result.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      orderIndex: row.order_index,
      status: row.status
    }));
  } catch (error) {
    console.error('Error getting project stages:', error);
    return [];
  }
}

/**
 * Validate if a stage is available for sample creation
 * Rules:
 * - Stage must exist
 * - Stage must belong to the project
 * - Stage must be in 'active' status
 * - Stage cannot be 'planned' or 'completed'
 */
export async function validateStageForSampleCreation(
  stageId: string,
  projectId: string
): Promise<{ valid: boolean; error?: string; stage?: StageInfo }> {
  try {
    const stage = await getStageInfo(stageId);

    if (!stage) {
      return { valid: false, error: 'Stage not found' };
    }

    if (stage.projectId !== projectId) {
      return { valid: false, error: 'Stage does not belong to this project' };
    }

    if (stage.status === 'planned') {
      return {
        valid: false,
        error: 'Cannot create samples in a planned stage. Activate the stage first.'
      };
    }

    if (stage.status === 'completed') {
      return {
        valid: false,
        error: 'Cannot create samples in a completed stage. Use an active stage instead.'
      };
    }

    if (stage.status !== 'active') {
      return {
        valid: false,
        error: `Stage is in ${stage.status} status. Only active stages accept new samples.`
      };
    }

    return { valid: true, stage };
  } catch (error) {
    console.error('Error validating stage for sample creation:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Get the current stage of a sample
 */
export async function getSampleStage(sampleId: string): Promise<StageInfo | null> {
  try {
    const result = await pool.query(`
      SELECT ps.id, ps.project_id, ps.name, ps.order_index, ps.status
      FROM ProjectStages ps
      JOIN Samples s ON ps.id = s.stage_id
      WHERE s.id = $1
    `, [sampleId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      orderIndex: row.order_index,
      status: row.status
    };
  } catch (error) {
    console.error('Error getting sample stage:', error);
    return null;
  }
}

/**
 * Prevent backward stage movement
 * Once a sample is in a stage, it cannot move to an earlier stage
 */
export async function canMoveSampleToStage(
  sampleId: string,
  targetStageId: string,
  projectId: string
): Promise<{ canMove: boolean; error?: string }> {
  try {
    const currentStage = await getSampleStage(sampleId);
    const targetStage = await getStageInfo(targetStageId);

    if (!targetStage) {
      return { canMove: false, error: 'Target stage not found' };
    }

    if (targetStage.projectId !== projectId) {
      return { canMove: false, error: 'Target stage does not belong to this project' };
    }

    if (currentStage) {
      // Sample is already in a stage
      if (targetStage.orderIndex < currentStage.orderIndex) {
        return {
          canMove: false,
          error: `Cannot move sample backward. Current stage: ${currentStage.name} (order ${currentStage.orderIndex}), Target: ${targetStage.name} (order ${targetStage.orderIndex})`
        };
      }
    }

    // Validate target stage status
    const validation = await validateStageForSampleCreation(targetStageId, projectId);
    if (!validation.valid) {
      return { canMove: false, error: validation.error };
    }

    return { canMove: true };
  } catch (error) {
    console.error('Error checking stage movement:', error);
    return { canMove: false, error: 'Movement validation failed' };
  }
}

/**
 * When a stage is completed, log/warn about samples in that stage
 * Does NOT automatically move samples to prevent data loss
 */
export async function getSamplesInStage(stageId: string): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT id FROM Samples
      WHERE stage_id = $1 AND deleted_at IS NULL
    `, [stageId]);

    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error getting samples in stage:', error);
    return [];
  }
}

/**
 * Get derived samples in a stage
 */
export async function getDerivedSamplesInStage(stageId: string): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT id FROM DerivedSamples
      WHERE stage_id = $1 AND deleted_at IS NULL
    `, [stageId]);

    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error getting derived samples in stage:', error);
    return [];
  }
}
