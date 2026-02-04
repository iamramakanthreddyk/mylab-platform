import { Router } from 'express';
import { validateStageForSampleCreation, canMoveSampleToStage } from '../utils/stageUtils';
import { pool } from '../db';
import {
  authenticate,
  requireObjectAccess,
  requireResharePermission,
  auditLog,
  grantAccess
} from '../middleware';

const router = Router();

// GET /api/derived-samples - List derived samples accessible to user
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user!.workspaceId;

    // Get samples owned by user's workspace OR accessible via grants
    const result = await pool.query(`
      SELECT ds.*,
             s.name as source_sample_name,
             p.name as project_name,
             o.name as owner_org_name
      FROM DerivedSamples ds
      LEFT JOIN Samples s ON ds.source_sample_id = s.id
      LEFT JOIN Projects p ON ds.project_id = p.id
      LEFT JOIN Organizations o ON ds.owner_workspace_id = o.workspace_id
      WHERE (ds.owner_workspace_id = $1 OR ds.id IN (
        SELECT ag.object_id
        FROM AccessGrants ag
        JOIN Organizations org ON ag.granted_to_org_id = org.id
        WHERE ag.object_type = 'derived_sample'
          AND org.workspace_id = $1
          AND ag.deleted_at IS NULL
          AND (ag.expires_at IS NULL OR ag.expires_at > NOW())
      ))
      AND ds.deleted_at IS NULL
      ORDER BY ds.created_at DESC
    `, [workspaceId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching derived samples:', error);
    res.status(500).json({ error: 'Failed to fetch derived samples' });
  }
});

// POST /api/derived-samples - Create derived sample with optional stage assignment
router.post('/', authenticate, auditLog('create', 'derived_sample'), async (req, res) => {
  try {
    const {
      sourceSampleId,
      parentDerivedSampleId,
      projectId,
      stageId, // Optional: assign to a project stage
      name,
      description,
      derivedType,
      processingMethod,
      quantity,
      unit
    } = req.body;
    const ownerWorkspaceId = req.user!.workspaceId;
    const createdBy = req.user!.id;

    // Determine root sample and calculate depth
    let rootSampleId: string;
    let depth: number;

    if (parentDerivedSampleId) {
      // This is a derived sample from another derived sample
      const parentCheck = await pool.query(`
        SELECT root_sample_id, depth, owner_workspace_id
        FROM DerivedSamples
        WHERE id = $1 AND deleted_at IS NULL
      `, [parentDerivedSampleId]);

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent derived sample not found' });
      }

      const parent = parentCheck.rows[0];
      rootSampleId = parent.root_sample_id;
      depth = parent.depth + 1;

      // Verify user has access to parent derived sample
      req.params.id = parentDerivedSampleId;
      const parentAccess = await requireObjectAccess('derived_sample')(req, res, () => {});
      if (res.headersSent) return; // Access check failed

      // Check depth limit (max 3 levels total, so depth <= 2)
      if (depth > 2) {
        return res.status(400).json({
          error: 'Maximum derivation depth exceeded',
          message: 'MyLab platform supports maximum 3 levels of sample derivation (original + 2 derived levels)',
          currentDepth: depth,
          maxDepth: 2
        });
      }

      // Prevent circular references
      if (sourceSampleId === rootSampleId) {
        return res.status(400).json({
          error: 'Circular reference detected',
          message: 'Cannot create derived sample from the same root sample lineage'
        });
      }

    } else {
      // This is a derived sample directly from an original sample
      rootSampleId = sourceSampleId;
      depth = 0;

      // Verify user has access to source sample
      req.params.id = sourceSampleId;
      const sourceAccess = await requireObjectAccess('sample')(req, res, () => {});
      if (res.headersSent) return; // Access check failed
    }

    // If projectId provided, verify access to project
    if (projectId) {
      req.params.id = projectId;
      const projectAccess = await requireObjectAccess('project')(req, res, () => {});
      if (res.headersSent) return; // Access check failed
    }

    // If stage_id provided, validate stage progression
    if (stageId && projectId) {
      const stageValidation = await validateStageForSampleCreation(stageId, projectId);
      if (!stageValidation.valid) {
        return res.status(400).json({
          error: 'Invalid stage for derived sample creation',
          message: stageValidation.error,
          stage: stageValidation.stage
        });
      }
    }

    const result = await pool.query(`
      INSERT INTO DerivedSamples (
        owner_workspace_id, root_sample_id, parent_id, project_id, stage_id, name, description,
        derived_type, processing_method, quantity, unit, depth, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      ownerWorkspaceId, rootSampleId, parentDerivedSampleId || null, projectId, stageId || null,
      name, description, derivedType, processingMethod, quantity, unit, depth, createdBy
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating derived sample:', error);
    res.status(500).json({ error: 'Failed to create derived sample' });
  }
});

// GET /api/derived-samples/:id - Get specific derived sample
router.get('/:id', authenticate, requireObjectAccess('derived_sample'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT ds.*,
             s.name as source_sample_name,
             p.name as project_name,
             o.name as owner_org_name
      FROM DerivedSamples ds
      LEFT JOIN Samples s ON ds.source_sample_id = s.id
      LEFT JOIN Projects p ON ds.project_id = p.id
      LEFT JOIN Organizations o ON ds.owner_workspace_id = o.workspace_id
      WHERE ds.id = $1 AND ds.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Derived sample not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching derived sample:', error);
    res.status(500).json({ error: 'Failed to fetch derived sample' });
  }
});

// PUT /api/derived-samples/:id - Update derived sample (with optional stage progression)
router.put('/:id', authenticate, requireObjectAccess('derived_sample', 'processor'), auditLog('update', 'derived_sample'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, quantity, unit, stageId } = req.body;
    const projectId = req.query.projectId as string;

    // Validate that lineage-critical fields cannot be modified
    const allowedFields = ['name', 'description', 'status', 'quantity', 'unit', 'stageId'];
    const providedFields = Object.keys(req.body);

    const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid fields for update',
        message: 'Lineage-critical fields cannot be modified after creation (derived_type, processing_method, root_sample_id, parent_id, depth)',
        invalidFields,
        allowedFields
      });
    }

    // If stage_id provided, validate stage progression
    if (stageId && projectId) {
      const canMove = await canMoveSampleToStage(id, stageId, projectId);
      if (!canMove.canMove) {
        return res.status(400).json({
          error: 'Cannot move derived sample to this stage',
          message: canMove.error
        });
      }
    }

    // For scientific data integrity, prevent status changes that could compromise lineage
    if (status && !['active', 'archived', 'consumed', 'discarded'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value',
        message: 'Status must be one of: active, archived, consumed, discarded',
        providedStatus: status
      });
    }

    // Prevent negative quantities
    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({
        error: 'Invalid quantity',
        message: 'Quantity cannot be negative',
        providedQuantity: quantity
      });
    }

    const result = await pool.query(`
      UPDATE DerivedSamples
      SET name = $1, description = $2, status = $3, quantity = $4, unit = $5, stage_id = $6, updated_at = NOW()
      WHERE id = $7 AND deleted_at IS NULL
      RETURNING *
    `, [name, description, status, quantity, unit, stageId || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Derived sample not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating derived sample:', error);
    res.status(500).json({ error: 'Failed to update derived sample' });
  }
});

// POST /api/derived-samples/:id/share - Share derived sample
router.post('/:id/share', authenticate, requireObjectAccess('derived_sample'), requireResharePermission, auditLog('share', 'derived_sample'), async (req, res) => {
  try {
    const { id } = req.params;
    const { grantedToOrgId, grantedRole, canReshare, expiresAt } = req.body;
    const grantedBy = req.user!.orgId;

    if (!grantedBy) {
      return res.status(400).json({ error: 'User must belong to an organization to share' });
    }

    const grantId = await grantAccess('derived_sample', id, grantedToOrgId, grantedRole, canReshare, grantedBy, expiresAt);

    res.status(201).json({ grantId, message: 'Access granted successfully' });
  } catch (error) {
    console.error('Error sharing derived sample:', error);
    res.status(500).json({ error: 'Failed to share derived sample' });
  }
});

// DELETE /api/derived-samples/:id - Delete derived sample
router.delete('/:id', authenticate, requireObjectAccess('derived_sample', 'client'), auditLog('delete', 'derived_sample'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE DerivedSamples
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Derived sample not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting derived sample:', error);
    res.status(500).json({ error: 'Failed to delete derived sample' });
  }
});

export default router;