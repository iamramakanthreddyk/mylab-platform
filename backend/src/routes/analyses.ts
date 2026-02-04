import { Router } from 'express';
import { pool } from '../db';
import {
  authenticate,
  requireObjectAccess,
  auditLog,
  validateExternalAPIKey,
  isExternalOrganization
} from '../middleware';

const router = Router();

// GET /api/analyses - List analyses for workspace
router.get('/', authenticate, async (req, res) => {
  try {
    const { batchId, executionMode } = req.query;
    const workspaceId = req.user!.workspaceId;

    let query = `
      SELECT a.*,
             at.name as analysis_type_name,
             at.category as analysis_category,
             o.name as executed_by_org_name,
             so.name as source_org_name,
             u.name as uploaded_by_name,
             b.batch_id as batch_identifier
      FROM Analyses a
      JOIN AnalysisTypes at ON a.analysis_type_id = at.id
      JOIN Organizations o ON a.executed_by_org_id = o.id
      JOIN Organizations so ON a.source_org_id = so.id
      JOIN Users u ON a.uploaded_by = u.id
      JOIN Batches b ON a.batch_id = b.id
      WHERE a.workspace_id = $1 AND a.deleted_at IS NULL
    `;

    const params = [workspaceId];
    let paramIndex = 2;

    if (batchId) {
      query += ` AND a.batch_id = $${paramIndex}`;
      params.push(batchId as string);
      paramIndex++;
    }

    if (executionMode) {
      query += ` AND a.execution_mode = $${paramIndex}`;
      params.push(executionMode as string);
      paramIndex++;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// POST /api/analyses - Create analysis (internal)
router.post('/', authenticate, requireObjectAccess('batch', 'analyzer'), auditLog('create', 'analysis'), async (req, res) => {
  try {
    const {
      batchId,
      analysisTypeId,
      results,
      filePath,
      fileChecksum,
      fileSizeBytes,
      status = 'pending',
      executionMode = 'platform',
      executedByOrgId,
      sourceOrgId,
      externalReference,
      performedAt
    } = req.body;

    const workspaceId = req.user!.workspaceId;
    const uploadedBy = req.user!.id;

    // Validate execution mode and organization relationships
    if (executionMode === 'external' && !externalReference) {
      return res.status(400).json({ error: 'External reference required for external analyses' });
    }

    if (executionMode === 'platform' && externalReference) {
      return res.status(400).json({ error: 'External reference not allowed for platform analyses' });
    }

    // For platform analyses, executed_by_org should be internal
    if (executionMode === 'platform') {
      const orgCheck = await pool.query(`
        SELECT is_platform_workspace FROM Organizations
        WHERE id = $1 AND workspace_id = $2
      `, [executedByOrgId, workspaceId]);

      if (orgCheck.rows.length === 0 || !orgCheck.rows[0].is_platform_workspace) {
        return res.status(400).json({ error: 'Platform analyses must be executed by platform organizations' });
      }
    }

    const result = await pool.query(`
      INSERT INTO Analyses (
        batch_id, workspace_id, analysis_type_id, results, file_path,
        file_checksum, file_size_bytes, status, execution_mode,
        executed_by_org_id, source_org_id, external_reference,
        performed_at, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      batchId, workspaceId, analysisTypeId, results, filePath,
      fileChecksum, fileSizeBytes, status, executionMode,
      executedByOrgId, sourceOrgId, externalReference,
      performedAt, uploadedBy
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Failed to create analysis' });
  }
});

// POST /api/analyses/external - Create external analysis (no auth required, but validated)
router.post('/external', async (req, res) => {
  try {
    const {
      batchId,
      analysisTypeId,
      results,
      filePath,
      fileChecksum,
      fileSizeBytes,
      executedByOrgId,
      sourceOrgId,
      externalReference,
      performedAt,
      apiKey // External labs use API keys for authentication
    } = req.body;

    // Validate API key for external submissions
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required for external submissions' });
    }

    // Validate external organization exists and is external
    const isExternal = await isExternalOrganization(executedByOrgId);
    if (!isExternal) {
      return res.status(400).json({ error: 'Only external organizations can submit external analyses' });
    }

    // Validate API key
    const isValidKey = await validateExternalAPIKey(executedByOrgId, apiKey);
    if (!isValidKey) {
      return res.status(401).json({ error: 'Invalid or expired API key' });
    }

    // Get batch details to determine workspace
    const batchCheck = await pool.query(`
      SELECT workspace_id FROM Batches WHERE id = $1
    `, [batchId]);

    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const workspaceId = batchCheck.rows[0].workspace_id;

    // Validate that the batch allows external analyses
    const batchDetails = await pool.query(`
      SELECT execution_mode FROM Batches WHERE id = $1
    `, [batchId]);

    if (batchDetails.rows[0].execution_mode !== 'external') {
      return res.status(400).json({ error: 'Batch does not allow external analyses' });
    }

    // Create the analysis record
    const result = await pool.query(`
      INSERT INTO Analyses (
        batch_id, workspace_id, analysis_type_id, results, file_path,
        file_checksum, file_size_bytes, status, execution_mode,
        executed_by_org_id, source_org_id, external_reference,
        performed_at, received_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', 'external', $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
      batchId, workspaceId, analysisTypeId, results, filePath,
      fileChecksum, fileSizeBytes, executedByOrgId, sourceOrgId,
      externalReference, performedAt
    ]);

    // Log external submission
    await pool.query(`
      INSERT INTO AuditLog (
        object_type, object_id, action, actor_id, actor_workspace,
        actor_org_id, details, ip_address, user_agent
      )
      VALUES ($1, $2, $3, NULL, NULL, $4, $5, $6, $7)
    `, [
      'analysis', result.rows[0].id, 'external_upload',
      executedByOrgId, JSON.stringify({ externalReference, apiKey: '[REDACTED]' }),
      req.ip, req.get('User-Agent')
    ]);

    res.status(201).json({
      ...result.rows[0],
      message: 'External analysis submitted successfully'
    });
  } catch (error) {
    console.error('Error creating external analysis:', error);
    res.status(500).json({ error: 'Failed to create external analysis' });
  }
});

// GET /api/analyses/:id - Get specific analysis
router.get('/:id', authenticate, requireObjectAccess('analysis'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT a.*,
             at.name as analysis_type_name,
             at.category as analysis_category,
             o.name as executed_by_org_name,
             so.name as source_org_name,
             u.name as uploaded_by_name,
             b.batch_id as batch_identifier
      FROM Analyses a
      JOIN AnalysisTypes at ON a.analysis_type_id = at.id
      JOIN Organizations o ON a.executed_by_org_id = o.id
      JOIN Organizations so ON a.source_org_id = so.id
      LEFT JOIN Users u ON a.uploaded_by = u.id
      JOIN Batches b ON a.batch_id = b.id
      WHERE a.id = $1 AND a.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// PUT /api/analyses/:id - Update analysis
router.put('/:id', authenticate, requireObjectAccess('analysis', 'analyzer'), auditLog('update', 'analysis'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, results, filePath, fileChecksum, fileSizeBytes } = req.body;

    const result = await pool.query(`
      UPDATE Analyses
      SET status = $1, results = $2, file_path = $3, file_checksum = $4,
          file_size_bytes = $5, updated_at = NOW()
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING *
    `, [status, results, filePath, fileChecksum, fileSizeBytes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating analysis:', error);
    res.status(500).json({ error: 'Failed to update analysis' });
  }
});

// DELETE /api/analyses/:id - Delete analysis
router.delete('/:id', authenticate, requireObjectAccess('analysis', 'client'), auditLog('delete', 'analysis'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE Analyses
      SET deleted_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

export default router;