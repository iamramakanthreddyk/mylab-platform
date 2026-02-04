import { Router } from 'express';
import { pool } from '../db';
import {
  authenticate,
  requireWorkspaceOwnership,
  requireObjectAccess,
  auditLog
} from '../middleware';

const router = Router();

// GET /api/projects - List projects for user's workspace
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      SELECT p.*, o.name as client_org_name, o2.name as executing_org_name
      FROM Projects p
      JOIN Organizations o ON p.client_org_id = o.id
      JOIN Organizations o2 ON p.executing_org_id = o2.id
      WHERE p.workspace_id = $1
      ORDER BY p.created_at DESC
    `, [workspaceId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects - Create project
router.post('/', authenticate, auditLog('create', 'project'), async (req, res) => {
  try {
    const { name, description, clientOrgId, executingOrgId } = req.body;
    const workspaceId = req.user!.workspaceId;
    const createdBy = req.user!.id;

    const result = await pool.query(`
      INSERT INTO Projects (workspace_id, name, description, client_org_id, executing_org_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [workspaceId, name, description, clientOrgId, executingOrgId, createdBy]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - Get specific project
router.get('/:id', authenticate, requireObjectAccess('project'), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      SELECT p.*, o.name as client_org_name, o2.name as executing_org_name
      FROM Projects p
      JOIN Organizations o ON p.client_org_id = o.id
      JOIN Organizations o2 ON p.executing_org_id = o2.id
      WHERE p.id = $1 AND p.workspace_id = $2
    `, [id, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authenticate, requireObjectAccess('project', 'processor'), auditLog('update', 'project'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      UPDATE Projects
      SET name = $1, description = $2, status = $3, updated_at = NOW()
      WHERE id = $4 AND workspace_id = $5
      RETURNING *
    `, [name, description, status, id, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticate, requireObjectAccess('project', 'client'), auditLog('delete', 'project'), async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      UPDATE Projects
      SET deleted_at = NOW()
      WHERE id = $1 AND workspace_id = $2
      RETURNING id
    `, [id, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;