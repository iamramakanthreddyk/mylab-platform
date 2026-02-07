import { Router } from 'express';
import { canDeleteSample } from '../utils/lineageUtils';
import { validateStageForSampleCreation, canMoveSampleToStage } from '../utils/stageUtils';
import { pool } from '../db';
import {
  authenticate,
  requireObjectAccess,
  auditLog
} from '../middleware';
import { validate, sampleSchemas } from '../middleware/validation';

const router = Router();

// GET /api/samples - List samples for project
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }

    // Verify user has access to the project
    const projectAccess = await requireObjectAccess('project')(req, res, () => {});
    if (res.headersSent) return; // Access check failed

    const result = await pool.query(`
      SELECT s.*, p.name as project_name
      FROM Samples s
      JOIN Projects p ON s.project_id = p.id
      WHERE s.project_id = $1 AND s.deleted_at IS NULL
      ORDER BY s.created_at DESC
    `, [projectId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Failed to fetch samples' });
  }
});

// POST /api/samples - Create sample with optional stage assignment
router.post('/', authenticate, validate(sampleSchemas.create), auditLog('create', 'sample'), async (req, res) => {
  try {
    const { projectId, stageId, sampleId, type, description, metadata } = req.body;
    const workspaceId = req.user!.workspaceId;
    const createdBy = req.user!.id;

    // Verify user has access to the project
    req.params.id = projectId;
    const projectAccess = await requireObjectAccess('project', 'processor')(req, res, () => {});
    if (res.headersSent) return; // Access check failed

    // If stage_id provided, validate it
    if (stageId) {
      const stageValidation = await validateStageForSampleCreation(stageId, projectId);
      if (!stageValidation.valid) {
        return res.status(400).json({
          error: 'Invalid stage for sample creation',
          message: stageValidation.error,
          stage: stageValidation.stage
        });
      }
    }

    const result = await pool.query(`
      INSERT INTO Samples (workspace_id, project_id, stage_id, sample_id, type, description, metadata, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [workspaceId, projectId, stageId || null, sampleId, type, description, metadata ? JSON.stringify(metadata) : null, createdBy]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating sample:', error);
    res.status(500).json({ error: 'Failed to create sample' });
  }
});

// GET /api/samples/:id - Get specific sample
router.get('/:id', authenticate, requireObjectAccess('sample'), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      SELECT s.*, p.name as project_name
      FROM Samples s
      JOIN Projects p ON s.project_id = p.id
      WHERE s.id = $1 AND s.workspace_id = $2 AND s.deleted_at IS NULL
    `, [id, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sample:', error);
    res.status(500).json({ error: 'Failed to fetch sample' });
  }
});

// PUT /api/samples/:id - Update sample (with optional stage progression)
router.put('/:id', authenticate, validate(sampleSchemas.update), requireObjectAccess('sample', 'processor'), auditLog('update', 'sample'), async (req, res) => {
  try {
    const { id } = req.params;
    const { sampleId, description, status, type, stageId, metadata } = req.body;
    const projectId = req.query.projectId as string;

    // If stage_id provided, validate progression rules
    if (stageId && projectId) {
      const canMove = await canMoveSampleToStage(id, stageId, projectId);
      if (!canMove.canMove) {
        return res.status(400).json({
          error: 'Cannot move sample to this stage',
          message: canMove.error
        });
      }
    }

    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      UPDATE Samples
      SET sample_id = COALESCE($1, sample_id), type = COALESCE($2, type), description = COALESCE($3, description), status = COALESCE($4, status), metadata = COALESCE($5, metadata), stage_id = COALESCE($6, stage_id), updated_at = NOW()
      WHERE id = $7 AND workspace_id = $8 AND deleted_at IS NULL
      RETURNING *
    `, [sampleId || null, type || null, description || null, status || null, metadata ? JSON.stringify(metadata) : null, stageId || null, id, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating sample:', error);
    res.status(500).json({ error: 'Failed to update sample' });
  }
});

// DELETE /api/samples/:id - Delete sample (with lineage protection)
router.delete('/:id', authenticate, requireObjectAccess('sample', 'client'), auditLog('delete', 'sample'), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    // Check if sample has derived samples using utility function
    const { canDelete, derivedCount } = await canDeleteSample(id);

    if (!canDelete) {
      return res.status(409).json({
        error: 'Cannot delete sample with derived samples',
        message: `This sample has ${derivedCount} derived sample(s). Delete derived samples first or use cascade delete if authorized.`,
        derivedCount
      });
    }

    const result = await pool.query(`
      UPDATE Samples
      SET deleted_at = NOW()
      WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [id, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting sample:', error);
    res.status(500).json({ error: 'Failed to delete sample' });
  }
});

// DELETE /api/samples/:id/cascade - Cascade delete sample and all derived samples (admin only)
router.delete('/:id/cascade', authenticate, requireObjectAccess('sample', 'client'), auditLog('cascade_delete', 'sample'), async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;

    // Only admins can perform cascade deletes
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Cascade delete requires admin privileges',
        message: 'Only administrators can delete samples with derived samples'
      });
    }

    // Get count of derived samples for audit
    const derivedCheck = await pool.query(`
      SELECT COUNT(*) as derived_count FROM DerivedSamples
      WHERE root_sample_id = $1 AND deleted_at IS NULL
    `, [id]);

    const derivedCount = derivedCheck.rows[0].derived_count;

    // Perform cascade delete using database foreign keys
    // First soft delete derived samples
    await pool.query(`
      UPDATE DerivedSamples
      SET deleted_at = NOW()
      WHERE root_sample_id = $1 AND deleted_at IS NULL
    `, [id]);

    // Then soft delete the root sample
    const result = await pool.query(`
      UPDATE Samples
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    res.json({
      message: 'Sample and derived samples deleted successfully',
      deletedSamples: derivedCount + 1, // +1 for root sample
      rootSampleId: id
    });
  } catch (error) {
    console.error('Error cascade deleting sample:', error);
    res.status(500).json({ error: 'Failed to cascade delete sample' });
  }
});

export default router;