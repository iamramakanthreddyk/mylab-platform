/**
 * Project Team Management API Routes
 * 
 * Endpoints for managing team members and their project assignments.
 * Uses role-based access control.
 */

import { Router } from 'express';
import { Pool } from 'pg';
import {
  requireRole,
  requireProjectAccess,
  requireAccess,
  AccessControlRequest,
} from '../../middleware/accessControlMiddleware';
import {
  getUserProjectAssignments,
  checkAccess,
  grantReportAccess,
  revokeSampleAccess,
} from '../../services/accessControlService';
import logger from '../../utils/logger';

export function createTeamRoutes(pool: Pool): Router {
  const router = Router();

  // ============================================================================
  // PROJECT TEAM ENDPOINTS
  // ============================================================================

  /**
   * GET /api/projects/:projectId/team
   * List all team members in a project
   * 
   * Requires: User assigned to project (any role can view)
   */
  router.get(
    '/api/projects/:projectId/team',
    requireProjectAccess(pool),
    async (req: AccessControlRequest, res) => {
      try {
        const { projectId } = req.params;

        const result = await pool.query(
          `SELECT 
            pt.assignment_id as "assignmentId",
            pt.user_id as "userId",
            u.email,
            u.name,
            pt.assigned_role as "assignedRole",
            pt.assigned_at as "assignedAt"
          FROM ProjectTeam pt
          JOIN Users u ON pt.user_id = u.id
          WHERE pt.project_id = $1
          ORDER BY pt.assigned_at DESC`,
          [projectId]
        );

        res.json(result.rows);
      } catch (error) {
        logger.error('Error fetching team members', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * POST /api/projects/:projectId/team
   * Add a user to a project team
   * 
   * Requires: Admin role in project
   * Body: { userId: UUID, assignedRole: 'admin'|'manager'|'scientist'|'viewer' }
   */
  router.post(
    '/api/projects/:projectId/team',
    requireRole(pool, 'admin'),
    async (req: AccessControlRequest, res) => {
      try {
        const { projectId } = req.params;
        const { userId, assignedRole } = req.body;

        if (!userId || !assignedRole) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['userId', 'assignedRole'],
          });
        }

        // Get user info to verify they exist
        const userResult = await pool.query(
          'SELECT id, email FROM Users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get project info
        const projectResult = await pool.query(
          'SELECT id, workspace_id FROM Projects WHERE id = $1',
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Find company from project
        const projectData = projectResult.rows[0];

        // Add to ProjectTeam
        const assignmentId = require('uuid').v4();

        await pool.query(
          `INSERT INTO ProjectTeam (
            assignment_id, project_id, user_id, workspace_id, company_id, 
            assigned_role, assigned_by, assigned_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (project_id, user_id) 
          DO UPDATE SET 
            assigned_role = EXCLUDED.assigned_role,
            assigned_by = EXCLUDED.assigned_by,
            assigned_at = NOW()`,
          [
            assignmentId,
            projectId,
            userId,
            projectData.workspace_id,
            req.user?.companyId || null,
            assignedRole,
            req.user?.id || null,
          ]
        );

        logger.info('User added to project team', {
          projectId,
          userId,
          assignedRole,
          addedBy: req.user?.id,
        });

        res.status(201).json({
          message: 'User added to project',
          assignmentId,
          projectId,
          userId,
          assignedRole,
        });
      } catch (error) {
        logger.error('Error adding user to team', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * PATCH /api/projects/:projectId/team/:userId
   * Change user's role in project
   * 
   * Requires: Admin role in project
   * Body: { assignedRole: 'admin'|'manager'|'scientist'|'viewer' }
   */
  router.patch(
    '/api/projects/:projectId/team/:userId',
    requireRole(pool, 'admin'),
    async (req: AccessControlRequest, res) => {
      try {
        const { projectId, userId } = req.params;
        const { assignedRole } = req.body;

        if (!assignedRole) {
          return res.status(400).json({ error: 'Missing assignedRole' });
        }

        const result = await pool.query(
          `UPDATE ProjectTeam 
          SET assigned_role = $1, assigned_by = $2, assigned_at = NOW()
          WHERE project_id = $3 AND user_id = $4
          RETURNING *`,
          [assignedRole, req.user?.id, projectId, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'User not assigned to this project',
          });
        }

        logger.info('User role updated', {
          projectId,
          userId,
          newRole: assignedRole,
          updatedBy: req.user?.id,
        });

        res.json({
          message: 'Role updated',
          assignment: result.rows[0],
        });
      } catch (error) {
        logger.error('Error updating user role', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * DELETE /api/projects/:projectId/team/:userId
   * Remove user from project
   * 
   * Requires: Admin role in project
   */
  router.delete(
    '/api/projects/:projectId/team/:userId',
    requireRole(pool, 'admin'),
    async (req: AccessControlRequest, res) => {
      try {
        const { projectId, userId } = req.params;

        const result = await pool.query(
          `DELETE FROM ProjectTeam 
          WHERE project_id = $1 AND user_id = $2
          RETURNING assignment_id`,
          [projectId, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'User not assigned to this project',
          });
        }

        logger.info('User removed from project', {
          projectId,
          userId,
          removedBy: req.user?.id,
        });

        res.json({ message: 'User removed from project' });
      } catch (error) {
        logger.error('Error removing user from team', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ============================================================================
  // REPORT SHARING ENDPOINTS
  // ============================================================================

  /**
   * POST /api/reports/:reportId/share
   * Grant user access to a report
   * 
   * Requires: Manager+ role and permission to share
   * Body: { userId: UUID, accessLevel: 'view'|'download'|'edit' }
   */
  router.post(
    '/api/reports/:reportId/share',
    requireAccess(pool, 'report', 'share'),
    async (req: AccessControlRequest, res) => {
      try {
        const { reportId } = req.params;
        const { userId, accessLevel = 'view' } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'Missing userId' });
        }

        // Verify user exists
        const userResult = await pool.query(
          'SELECT id FROM Users WHERE id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Grant access
        const accessId = await grantReportAccess(
          pool,
          reportId,
          userId,
          req.user?.workspaceId || '',
          accessLevel,
          req.user?.id
        );

        logger.info('Report access granted', {
          reportId,
          userId,
          accessLevel,
          grantedBy: req.user?.id,
        });

        res.status(201).json({
          message: 'Report access granted',
          accessId,
          reportId,
          userId,
          accessLevel,
        });
      } catch (error) {
        logger.error('Error granting report access', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * PATCH /api/reports/:reportId/share/:userId
   * Update user access level for a report
   * 
   * Requires: Manager+ role and permission to share
   * Body: { accessLevel: 'view'|'download'|'edit' }
   */
  router.patch(
    '/api/reports/:reportId/share/:userId',
    requireAccess(pool, 'report', 'share'),
    async (req: AccessControlRequest, res) => {
      try {
        const { reportId, userId } = req.params;
        const { accessLevel } = req.body;

        if (!accessLevel) {
          return res.status(400).json({ error: 'Missing accessLevel' });
        }

        const result = await pool.query(
          `UPDATE ReportAccess 
          SET access_level = $1
          WHERE report_id = $2 AND user_id = $3
          RETURNING *`,
          [accessLevel, reportId, userId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            error: 'User does not have access to this report',
          });
        }

        logger.info('Report access updated', {
          reportId,
          userId,
          newAccessLevel: accessLevel,
          updatedBy: req.user?.id,
        });

        res.json({
          message: 'Access level updated',
          access: result.rows[0],
        });
      } catch (error) {
        logger.error('Error updating report access', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * DELETE /api/reports/:reportId/share/:userId
   * Revoke user access to a report
   * 
   * Requires: Manager+ role and permission to share
   */
  router.delete(
    '/api/reports/:reportId/share/:userId',
    requireAccess(pool, 'report', 'share'),
    async (req: AccessControlRequest, res) => {
      try {
        const { reportId, userId } = req.params;

        await pool.query(
          `DELETE FROM ReportAccess 
          WHERE report_id = $1 AND user_id = $2`,
          [reportId, userId]
        );

        logger.info('Report access revoked', {
          reportId,
          userId,
          revokedBy: req.user?.id,
        });

        res.json({ message: 'Report access revoked' });
      } catch (error) {
        logger.error('Error revoking report access', {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  // ============================================================================
  // USER DASHBOARD - Show user's projects
  // ============================================================================

  /**
   * GET /api/user/projects
   * List all projects the authenticated user is assigned to
   * 
   * No role requirement - all authenticated users
   */
  router.get('/api/user/projects', async (req: AccessControlRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projects = await getUserProjectAssignments(
        pool,
        req.user.id,
        req.user.workspaceId || ''
      );

      // Fetch full project details
      if (projects.length > 0) {
        const projectIds = projects.map((p: any) => p.projectId);

        const result = await pool.query(
          `SELECT id, name, description, status, created_at as "createdAt"
          FROM Projects
          WHERE id = ANY($1)
          ORDER BY created_at DESC`,
          [projectIds]
        );

        const projectDetails = result.rows.map((p: any) => {
          const assignment = projects.find((a: any) => a.projectId === p.id);
          return {
            ...p,
            assignedRole: assignment?.assignedRole,
          };
        });

        return res.json(projectDetails);
      }

      res.json([]);
    } catch (error) {
      logger.error('Error fetching user projects', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

export default createTeamRoutes;
