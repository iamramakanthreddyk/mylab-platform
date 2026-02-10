import { Router } from 'express';
import { pool } from '../db';
import {
  authenticate,
  auditLog,
  requireAccess,
  requireRole,
  validate,
  projectSchemas
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
      LEFT JOIN Organizations o ON p.client_org_id = o.id
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
router.post('/', authenticate, validate(projectSchemas.create), auditLog('create', 'project'), async (req, res) => {
  try {
    const { name, description, clientOrgId, externalClientName, executingOrgId, workflowMode } = req.body;
    const workspaceId = req.user!.workspaceId;
    const userId = req.user!.id;
    const createdBy = req.user!.id;
    const workflow_mode = workflowMode || 'trial_first';

    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        details: 'Only admins and managers can create projects. Your role is ' + req.user!.role
      });
    }

    // Validate that either clientOrgId OR externalClientName is provided
    if (!clientOrgId && !externalClientName) {
      return res.status(400).json({
        error: 'Client information required',
        statusCode: 400,
        details: {
          client: 'Either select a registered client organization or provide an external client name'
        },
        timestamp: new Date().toISOString()
      });
    }

    // If clientOrgId provided, validate it exists
    if (clientOrgId) {
      const clientOrgCheck = await pool.query(
        `SELECT id, name FROM Organizations WHERE id = $1 AND deleted_at IS NULL`,
        [clientOrgId]
      );

      if (clientOrgCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Client organization not found',
          statusCode: 400,
          details: {
            clientOrgId: `Organization with ID "${clientOrgId}" does not exist. Please ask your admin to register this organization on the platform first.`
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    const executingOrgCheck = await pool.query(
      `SELECT id, name FROM Organizations WHERE id = $1 AND deleted_at IS NULL`,
      [executingOrgId]
    );

    if (executingOrgCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Executing organization (Lab) not found',
        statusCode: 400,
        details: {
          executingOrgId: `Organization with ID "${executingOrgId}" does not exist. Please ask your admin to register this laboratory on the platform first.`
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get organization (workspace) and its plan
    const orgResult = await pool.query(`
      SELECT o.id, o.name, o.plan_id, p.name as plan_name, p.max_projects
      FROM organizations o
      LEFT JOIN plans p ON o.plan_id = p.id
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `, [workspaceId]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Organization not found',
        details: 'Your workspace organization could not be found'
      });
    }

    const org = orgResult.rows[0];

    if (!org.plan_id) {
      return res.status(402).json({
        error: 'No plan assigned',
        details: 'Your organization needs a plan to create projects',
        code: 'NO_PLAN'
      });
    }

    if (!org.max_projects || org.max_projects <= 0) {
      return res.status(400).json({
        error: 'Invalid plan configuration',
        details: `Plan "${org.plan_name}" has no project limit configured`
      });
    }

    const projectCountResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM Projects WHERE workspace_id = $1 AND deleted_at IS NULL',
      [workspaceId]
    );
    const existingProjects = projectCountResult.rows[0].count || 0;

    if (existingProjects >= org.max_projects) {
      return res.status(403).json({
        error: 'Project limit reached',
        details: `Your ${org.plan_name} plan allows ${org.max_projects} project(s). You have ${existingProjects} active project(s).`,
        plan: org.plan_name,
        limit: org.max_projects,
        current: existingProjects
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO Projects (workspace_id, name, description, client_org_id, external_client_name, executing_org_id, workflow_mode, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [workspaceId, name, description, clientOrgId || null, externalClientName || null, executingOrgId, workflow_mode, createdBy]);

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
      LEFT JOIN Organizations o ON p.client_org_id = o.id
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