import { pool } from '../db';

/**
 * Lineage validation utilities for MyLab platform
 * Ensures data integrity in sample derivation chains
 */

export interface LineageInfo {
  rootSampleId: string;
  depth: number;
  parentChain: string[];
  hasCircularReference: boolean;
}

/**
 * Get complete lineage information for a derived sample
 */
export async function getLineageInfo(derivedSampleId: string): Promise<LineageInfo | null> {
  try {
    const result = await pool.query(`
      SELECT root_sample_id, depth, parent_id
      FROM DerivedSamples
      WHERE id = $1 AND deleted_at IS NULL
    `, [derivedSampleId]);

    if (result.rows.length === 0) {
      return null;
    }

    const { root_sample_id, depth, parent_id } = result.rows[0];

    // Build parent chain
    const parentChain: string[] = [];
    let currentParentId = parent_id;

    while (currentParentId) {
      parentChain.push(currentParentId);
      const parentResult = await pool.query(`
        SELECT parent_id FROM DerivedSamples
        WHERE id = $1 AND deleted_at IS NULL
      `, [currentParentId]);

      if (parentResult.rows.length === 0) break;
      currentParentId = parentResult.rows[0].parent_id;
    }

    // Check for circular references (though this shouldn't happen with proper creation logic)
    const hasCircularReference = parentChain.includes(derivedSampleId);

    return {
      rootSampleId: root_sample_id,
      depth,
      parentChain,
      hasCircularReference
    };
  } catch (error) {
    console.error('Error getting lineage info:', error);
    return null;
  }
}

/**
 * Validate if a new derived sample can be created without violating lineage rules
 */
export async function validateDerivation(
  sourceSampleId: string,
  parentDerivedSampleId?: string
): Promise<{ valid: boolean; error?: string; depth?: number }> {
  try {
    let rootSampleId: string;
    let depth: number;

    if (parentDerivedSampleId) {
      // Deriving from another derived sample
      const parentInfo = await getLineageInfo(parentDerivedSampleId);
      if (!parentInfo) {
        return { valid: false, error: 'Parent derived sample not found' };
      }

      rootSampleId = parentInfo.rootSampleId;
      depth = parentInfo.depth + 1;

      // Check depth limit
      if (depth > 2) {
        return {
          valid: false,
          error: 'Maximum derivation depth exceeded (max 3 levels total)',
          depth
        };
      }

      // Check for circular reference
      if (sourceSampleId === rootSampleId) {
        return { valid: false, error: 'Circular reference detected' };
      }

    } else {
      // Deriving directly from original sample
      rootSampleId = sourceSampleId;
      depth = 0;
    }

    return { valid: true, depth };
  } catch (error) {
    console.error('Error validating derivation:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Check if a sample can be safely deleted (no derived samples exist)
 */
export async function canDeleteSample(sampleId: string): Promise<{ canDelete: boolean; derivedCount: number }> {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as derived_count
      FROM DerivedSamples
      WHERE (source_sample_id = $1 OR root_sample_id = $1)
        AND deleted_at IS NULL
    `, [sampleId]);

    const derivedCount = parseInt(result.rows[0].derived_count);
    return {
      canDelete: derivedCount === 0,
      derivedCount
    };
  } catch (error) {
    console.error('Error checking sample deletion safety:', error);
    return { canDelete: false, derivedCount: -1 };
  }
}

/**
 * Get all derived samples in a lineage chain
 */
export async function getLineageChain(rootSampleId: string): Promise<string[]> {
  try {
    const result = await pool.query(`
      WITH RECURSIVE lineage AS (
        -- Base case: direct derived samples
        SELECT id, parent_id, depth
        FROM DerivedSamples
        WHERE root_sample_id = $1 AND deleted_at IS NULL

        UNION ALL

        -- Recursive case: derived samples from derived samples
        SELECT ds.id, ds.parent_id, ds.depth
        FROM DerivedSamples ds
        INNER JOIN lineage l ON ds.parent_id = l.id
        WHERE ds.deleted_at IS NULL
      )
      SELECT id FROM lineage ORDER BY depth, id
    `, [rootSampleId]);

    return result.rows.map(row => row.id);
  } catch (error) {
    console.error('Error getting lineage chain:', error);
    return [];
  }
}