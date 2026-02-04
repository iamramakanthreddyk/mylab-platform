import { Router } from 'express';
import { pool } from '../db';
import {
  authenticate,
  requireWorkspaceOwnership,
  auditLog
} from '../middleware';
import crypto from 'crypto';

const router = Router();

// GET /api/api-keys - List API keys for workspace organizations
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      SELECT ak.id, ak.name, ak.is_active, ak.expires_at, ak.last_used_at,
             ak.created_at, ak.created_by,
             o.name as organization_name, o.id as organization_id,
             u.name as created_by_name
      FROM APIKeys ak
      JOIN Organizations o ON ak.organization_id = o.id
      LEFT JOIN Users u ON ak.created_by = u.id
      WHERE o.workspace_id = $1 OR (o.workspace_id IS NULL AND o.is_platform_workspace = false)
      ORDER BY ak.created_at DESC
    `, [workspaceId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/api-keys - Create API key for organization
router.post('/', authenticate, auditLog('create', 'api_key'), async (req, res) => {
  try {
    const { organizationId, name, expiresAt } = req.body;
    const createdBy = req.user!.id;
    const workspaceId = req.user!.workspaceId;

    // Validate organization belongs to workspace or is external
    const orgCheck = await pool.query(`
      SELECT id, name, workspace_id, is_platform_workspace
      FROM Organizations
      WHERE id = $1
    `, [organizationId]);

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgCheck.rows[0];

    // Only allow API keys for external organizations or organizations in user's workspace
    if (org.is_platform_workspace && org.workspace_id !== workspaceId) {
      return res.status(403).json({ error: 'Cannot create API keys for organizations in other workspaces' });
    }

    // Generate secure API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await pool.query(`
      INSERT INTO APIKeys (organization_id, name, key_hash, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, is_active, expires_at, created_at
    `, [organizationId, name, keyHash, expiresAt, createdBy]);

    res.status(201).json({
      ...result.rows[0],
      apiKey, // Only returned once for security
      message: 'API key created successfully. Store this key securely as it will not be shown again.'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// PUT /api/api-keys/:id - Update API key
router.put('/:id', authenticate, auditLog('update', 'api_key'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive, expiresAt } = req.body;
    const workspaceId = req.user!.workspaceId;

    // Validate ownership
    const keyCheck = await pool.query(`
      SELECT ak.*, o.workspace_id, o.is_platform_workspace
      FROM APIKeys ak
      JOIN Organizations o ON ak.organization_id = o.id
      WHERE ak.id = $1
    `, [id]);

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const key = keyCheck.rows[0];

    // Check permissions
    if (key.is_platform_workspace && key.workspace_id !== workspaceId) {
      return res.status(403).json({ error: 'Cannot modify API keys for other workspaces' });
    }

    const result = await pool.query(`
      UPDATE APIKeys
      SET name = $1, is_active = $2, expires_at = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, is_active, expires_at, updated_at
    `, [name, isActive, expiresAt, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// DELETE /api/api-keys/:id - Delete API key
router.delete('/:id', authenticate, auditLog('delete', 'api_key'), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    // Validate ownership
    const keyCheck = await pool.query(`
      SELECT ak.*, o.workspace_id, o.is_platform_workspace
      FROM APIKeys ak
      JOIN Organizations o ON ak.organization_id = o.id
      WHERE ak.id = $1
    `, [id]);

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const key = keyCheck.rows[0];

    // Check permissions
    if (key.is_platform_workspace && key.workspace_id !== workspaceId) {
      return res.status(403).json({ error: 'Cannot delete API keys for other workspaces' });
    }

    await pool.query('DELETE FROM APIKeys WHERE id = $1', [id]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// POST /api/api-keys/:id/regenerate - Regenerate API key
router.post('/:id/regenerate', authenticate, auditLog('regenerate', 'api_key'), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    // Validate ownership
    const keyCheck = await pool.query(`
      SELECT ak.*, o.workspace_id, o.is_platform_workspace
      FROM APIKeys ak
      JOIN Organizations o ON ak.organization_id = o.id
      WHERE ak.id = $1
    `, [id]);

    if (keyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const key = keyCheck.rows[0];

    // Check permissions
    if (key.is_platform_workspace && key.workspace_id !== workspaceId) {
      return res.status(403).json({ error: 'Cannot regenerate API keys for other workspaces' });
    }

    // Generate new API key
    const newApiKey = crypto.randomBytes(32).toString('hex');
    const newKeyHash = crypto.createHash('sha256').update(newApiKey).digest('hex');

    const result = await pool.query(`
      UPDATE APIKeys
      SET key_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, is_active, expires_at, updated_at
    `, [newKeyHash, id]);

    res.json({
      ...result.rows[0],
      apiKey: newApiKey,
      message: 'API key regenerated successfully. Store this key securely as it will not be shown again.'
    });
  } catch (error) {
    console.error('Error regenerating API key:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

export default router;