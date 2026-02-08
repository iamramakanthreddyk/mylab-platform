import { Router } from 'express';
import { pool } from '../db';
import {
  authenticate,
  auditLog,
  requireAccess,
  requireRole
} from '../middleware';
import { getWorkspacePlanLimits, isPositiveLimit } from '../utils/planLimits';

const router = Router();

// GET /api/projects - List projects for user's workspace
router.get('/', authenticate, async (req, res) => {
  try {
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;

    const result = await pool.query(`
      SELECT p.*, o.name as client_org_name, o2.name as executing_org_name
      FROM Projects p
      JOIN Organizations o ON p.client_org_id = o.id
      JOIN Organizations o2 ON p.executing_org_id = o2.id
      JOIN ProjectTeam pt ON p.id = pt.project_id
      WHERE p.workspace_id = $1
        AND pt.user_id = $2
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
    `, [workspaceId, userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects - Create project
router.post('/', authenticate, auditLog('create', 'project'), async (req, res) => {
  try {
    const { name, description, clientOrgId, executingOrgId, workflowMode } = req.body;
    const workspaceId = req.user!.workspaceId;
    const createdBy = req.user!.id;
    const workflow_mode = workflowMode || 'trial_first';

    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can create projects' });
    }

    const plan = await getWorkspacePlanLimits(pool, workspaceId);
    if (!plan) {
      return res.status(403).json({
        error: 'No active or trial subscription found',
        hint: 'Assign a plan to this workspace before creating projects'
      });
    }

    if (!isPositiveLimit(plan.maxProjects)) {
      return res.status(400).json({
        error: 'Plan max_projects is not configured',
        plan: plan.planName
      });
    }

    const projectCountResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM Projects WHERE workspace_id = $1 AND deleted_at IS NULL',
      [workspaceId]
    );
    const existingProjects = projectCountResult.rows[0].count || 0;

    if (existingProjects >= plan.maxProjects) {
      return res.status(403).json({
        error: 'Project limit reached for current plan',
        plan: plan.planName,
        maxProjects: plan.maxProjects,
        existingProjects
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO Projects (workspace_id, name, description, client_org_id, executing_org_id, workflow_mode, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [workspaceId, name, description, clientOrgId, executingOrgId, workflow_mode, createdBy]);

      const project = result.rows[0];

      let companyId = req.user!.orgId;
      if (!companyId) {
        const orgResult = await client.query(
          `SELECT id FROM Organizations
           WHERE workspace_id = $1 AND deleted_at IS NULL
           ORDER BY created_at ASC
           LIMIT 1`,
          [workspaceId]
        );
        companyId = orgResult.rows[0]?.id;
      }

      if (!companyId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Organization not found for workspace',
          hint: 'Create an organization before creating projects'
        });
      }

      const assignmentId = require('uuid').v4();
      await client.query(
        `INSERT INTO ProjectTeam (
          assignment_id, project_id, user_id, workspace_id, company_id,
          assigned_role, assigned_by, assigned_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [assignmentId, project.id, createdBy, workspaceId, companyId, 'admin', createdBy]
      );

      await client.query('COMMIT');

      res.status(201).json(project);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - Get specific project
router.get('/:projectId', authenticate, requireAccess(pool, 'project', 'view'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      SELECT p.*, o.name as client_org_name, o2.name as executing_org_name
      FROM Projects p
      JOIN Organizations o ON p.client_org_id = o.id
      JOIN Organizations o2 ON p.executing_org_id = o2.id
      WHERE p.id = $1 AND p.workspace_id = $2
    `, [projectId, workspaceId]);

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
router.put('/:projectId', authenticate, requireAccess(pool, 'project', 'edit'), auditLog('update', 'project'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, status, workflowMode } = req.body;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      UPDATE Projects
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          workflow_mode = COALESCE($4, workflow_mode),
          updated_at = NOW()
      WHERE id = $5 AND workspace_id = $6
      RETURNING *
    `, [name, description, status, workflowMode, projectId, workspaceId]);

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
router.delete('/:projectId', authenticate, requireRole(pool, 'admin'), auditLog('delete', 'project'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(`
      UPDATE Projects
      SET deleted_at = NOW()
      WHERE id = $1 AND workspace_id = $2
      RETURNING id
    `, [projectId, workspaceId]);

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