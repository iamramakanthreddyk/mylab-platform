import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/workspaces/summary
 * Get summary of all workspaces (for bulk notification workflows)
 * Returns workspace info with user counts
 */
router.get('/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role;

    // Only admins can see all workspaces summary
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can view workspace summaries' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(`
      SELECT 
        w.id,
        w.name,
        w.description,
        w.status,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT p.id) as project_count,
        w.created_at,
        w.updated_at
      FROM Workspace w
      LEFT JOIN Users u ON w.id = u.workspace_id AND u.deleted_at IS NULL
      LEFT JOIN Projects p ON w.id = p.workspace_id AND p.deleted_at IS NULL
      WHERE w.deleted_at IS NULL
      GROUP BY w.id, w.name, w.description, w.status, w.created_at, w.updated_at
      ORDER BY w.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM Workspace
      WHERE deleted_at IS NULL
    `);

    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        userCount: parseInt(row.user_count),
        projectCount: parseInt(row.project_count),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching workspace summaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/workspaces/:id
 * Get specific workspace details
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;

    // Users can only view their own workspace, admins can view any
    const allowedWorkspaceId = userRole === 'admin' ? id : req.user!.workspaceId;

    if (userRole !== 'admin' && id !== req.user!.workspaceId) {
      return res.status(403).json({ error: 'You do not have access to this workspace' });
    }

    const result = await pool.query(`
      SELECT 
        w.id,
        w.name,
        w.description,
        w.status,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT p.id) as project_count,
        w.created_at,
        w.updated_at
      FROM Workspace w
      LEFT JOIN Users u ON w.id = u.workspace_id AND u.deleted_at IS NULL
      LEFT JOIN Projects p ON w.id = p.workspace_id AND p.deleted_at IS NULL
      WHERE w.id = $1 AND w.deleted_at IS NULL
      GROUP BY w.id, w.name, w.description, w.status, w.created_at, w.updated_at
    `, [allowedWorkspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = result.rows[0];
    res.json({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      status: workspace.status,
      userCount: parseInt(workspace.user_count),
      projectCount: parseInt(workspace.project_count),
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at
    });
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
