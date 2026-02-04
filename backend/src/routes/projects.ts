import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/projects - List projects for user's workspace
router.get('/', async (req, res) => {
  try {
    // TODO: Get user from auth middleware
    const workspaceId = 'workspace-1'; // Mock for now

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
router.post('/', async (req, res) => {
  try {
    const { name, description, clientOrgId, executingOrgId } = req.body;
    // TODO: Get user from auth
    const workspaceId = 'workspace-1';
    const createdBy = 'user-1';

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

export default router;