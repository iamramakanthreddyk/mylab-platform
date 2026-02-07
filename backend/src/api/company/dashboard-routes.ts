/**
 * Company Dashboard Routes
 * 
 * Endpoints for company admin/owner to manage:
 * - Company profile and settings
 * - Employees and team members
 * - Projects and resources
 */

import { Router, Request, Response } from 'express';
import { pool } from '../../db';
import { authenticate } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

export function createCompanyDashboardRoutes(): Router {
  const router = Router();

  // Middleware to verify company admin
  const requireCompanyAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Company admin access required' });
    }

    next();
  };

  // ============================================================================
  // COMPANY DASHBOARD - Overview & Stats
  // ============================================================================

  /**
   * GET /api/company/dashboard
   * Get company dashboard overview (stats, recent activity)
   */
  router.get(
    '/dashboard',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;

      try {
        // Get company info
        const companyResult = await pool.query(
          `SELECT id, name, slug, type, email_domain, created_at 
           FROM Workspace WHERE id = $1`,
          [workspaceId]
        );

        if (companyResult.rows.length === 0) {
          return res.status(404).json({ error: 'Company not found' });
        }

        const company = companyResult.rows[0];

        // Get employee count
        const employeeCount = await pool.query(
          `SELECT COUNT(*) as count FROM Users WHERE workspace_id = $1 AND deleted_at IS NULL`,
          [workspaceId]
        );

        // Get project count
        const projectCount = await pool.query(
          `SELECT COUNT(*) as count FROM Projects WHERE workspace_id = $1 AND deleted_at IS NULL`,
          [workspaceId]
        );

        // Get team members assigned to projects
        const teamStats = await pool.query(
          `SELECT COUNT(DISTINCT user_id) as assigned_members 
           FROM ProjectTeam WHERE project_id IN (
             SELECT id FROM Projects WHERE workspace_id = $1
           )`,
          [workspaceId]
        );

        // Get recent activities
        const recentActivity = await pool.query(
          `SELECT action, entity_type, entity_id, user_id, created_at 
           FROM AuditLog 
           WHERE workspace_id = $1 
           ORDER BY created_at DESC 
           LIMIT 10`,
          [workspaceId]
        );

        logger.info('Dashboard accessed', { userId: req.user!.id, workspaceId });

        res.json({
          company: {
            id: company.id,
            name: company.name,
            slug: company.slug,
            type: company.type,
            emailDomain: company.email_domain,
            createdAt: company.created_at,
          },
          stats: {
            totalEmployees: parseInt(employeeCount.rows[0].count),
            totalProjects: parseInt(projectCount.rows[0].count),
            assignedMembers: parseInt(teamStats.rows[0].assigned_members),
          },
          recentActivity: recentActivity.rows.map((row) => ({
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            userId: row.user_id,
            createdAt: row.created_at,
          })),
        });
      } catch (error) {
        logger.error('Dashboard error', {
          error: error instanceof Error ? error.message : String(error),
          userId: req.user!.id,
        });
        throw error;
      }
    })
  );

  // ============================================================================
  // COMPANY PROFILE - Settings
  // ============================================================================

  /**
   * GET /api/company/profile
   * Get company profile/settings
   */
  router.get(
    '/profile',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;

      const result = await pool.query(
        `SELECT id, name, slug, type, email_domain, created_at, updated_at
         FROM Workspace WHERE id = $1`,
        [workspaceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = result.rows[0];

      res.json({
        id: company.id,
        name: company.name,
        slug: company.slug,
        type: company.type,
        emailDomain: company.email_domain,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      });
    })
  );

  /**
   * PATCH /api/company/profile
   * Update company profile/settings
   */
  router.patch(
    '/profile',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { name, emailDomain } = req.body;

      if (!name && !emailDomain) {
        return res.status(400).json({
          error: 'At least one field (name or emailDomain) is required',
        });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (emailDomain) {
        updates.push(`email_domain = $${paramCount}`);
        values.push(emailDomain);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);
      values.push(workspaceId);

      const result = await pool.query(
        `UPDATE Workspace 
         SET ${updates.join(', ')} 
         WHERE id = $${paramCount}
         RETURNING id, name, slug, type, email_domain, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = result.rows[0];

      const updateObj = { name, emailDomain };
      logger.info('Company profile updated', {
        userId: req.user!.id,
        workspaceId,
        fields: Object.keys(updateObj).filter((k) => updateObj[k as keyof typeof updateObj]),
      });

      res.json({
        id: company.id,
        name: company.name,
        slug: company.slug,
        type: company.type,
        emailDomain: company.email_domain,
        updatedAt: company.updated_at,
      });
    })
  );

  // ============================================================================
  // EMPLOYEES - Company team management
  // ============================================================================

  /**
   * GET /api/company/employees
   * List all company employees
   */
  router.get(
    '/employees',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { status = 'active', limit = '50', offset = '0' } = req.query;

      const whereClause =
        status === 'active'
          ? 'workspace_id = $1 AND deleted_at IS NULL'
          : status === 'inactive'
            ? 'workspace_id = $1 AND deleted_at IS NOT NULL'
            : 'workspace_id = $1';

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM Users WHERE ${whereClause}`,
        [workspaceId]
      );

      // Get paginated results
      const result = await pool.query(
        `SELECT id, email, name, role, created_at, updated_at, deleted_at
         FROM Users 
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [workspaceId, Math.min(parseInt(limit as string) || 50, 100), parseInt(offset as string) || 0]
      );

      logger.info('Employees listed', { userId: req.user!.id, count: result.rows.length });

      res.json({
        employees: result.rows.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.deleted_at ? 'inactive' : 'active',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: Math.min(parseInt(limit as string) || 50, 100),
          offset: parseInt(offset as string) || 0,
        },
      });
    })
  );

  /**
   * GET /api/company/employees/:userId
   * Get employee details
   */
  router.get(
    '/employees/:userId',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { userId } = req.params;

      const result = await pool.query(
        `SELECT id, email, name, role, created_at, updated_at, deleted_at
         FROM Users 
         WHERE id = $1 AND workspace_id = $2`,
        [userId, workspaceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const user = result.rows[0];

      // Get projects user is assigned to
      const projectsResult = await pool.query(
        `SELECT p.id, p.name, pt.assigned_role
         FROM Projects p
         JOIN ProjectTeam pt ON p.id = pt.project_id
         WHERE pt.user_id = $1 AND p.workspace_id = $2 AND p.deleted_at IS NULL`,
        [userId, workspaceId]
      );

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.deleted_at ? 'inactive' : 'active',
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        projects: projectsResult.rows.map((row) => ({
          id: row.id,
          name: row.name,
          assignedRole: row.assigned_role,
        })),
      });
    })
  );

  /**
   * POST /api/company/employees
   * Invite/create new employee
   */
  router.post(
    '/employees',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { email, name, role = 'user' } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        `SELECT id FROM Users WHERE workspace_id = $1 AND email = $2`,
        [workspaceId, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Employee with this email already exists' });
      }

      // Create new employee
      const { v4: uuidv4 } = require('uuid');
      const userId = uuidv4();

      const result = await pool.query(
        `INSERT INTO Users (id, workspace_id, email, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, name, role, created_at`,
        [userId, workspaceId, email, name || email.split('@')[0], role]
      );

      const user = result.rows[0];

      logger.info('Employee created', {
        userId: req.user!.id,
        newEmployeeId: user.id,
        email: user.email,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        message: 'Employee added successfully. They can now log in with their email.',
      });
    })
  );

  /**
   * PATCH /api/company/employees/:userId
   * Update employee details
   */
  router.patch(
    '/employees/:userId',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { userId } = req.params;
      const { name, role } = req.body;

      if (!name && !role) {
        return res.status(400).json({ error: 'At least one field (name or role) is required' });
      }

      const updates = [];
      const values = [workspaceId, userId];
      let paramCount = 3;

      if (name) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (role) {
        updates.push(`role = $${paramCount}`);
        values.push(role);
        paramCount++;
      }

      updates.push(`updated_at = NOW()`);

      const result = await pool.query(
        `UPDATE Users 
         SET ${updates.join(', ')}
         WHERE workspace_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING id, email, name, role, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const user = result.rows[0];

      const updateObj = { name, role };
      logger.info('Employee updated', {
        userId: req.user!.id,
        employeeId: user.id,
        fields: Object.keys(updateObj).filter((k) => updateObj[k as keyof typeof updateObj]),
      });

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        updatedAt: user.updated_at,
      });
    })
  );

  /**
   * DELETE /api/company/employees/:userId
   * Remove/deactivate employee
   */
  router.delete(
    '/employees/:userId',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { userId } = req.params;

      // Can't delete yourself
      if (userId === req.user!.id) {
        return res.status(400).json({ error: 'You cannot remove yourself from the company' });
      }

      const result = await pool.query(
        `UPDATE Users 
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE workspace_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING id, email`,
        [workspaceId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      logger.info('Employee removed', {
        userId: req.user!.id,
        employeeId: result.rows[0].id,
      });

      res.json({
        message: 'Employee removed successfully',
        employeeId: result.rows[0].id,
      });
    })
  );

  // ============================================================================
  // EMPLOYEE ROLES - View roles across projects
  // ============================================================================

  /**
   * GET /api/company/employees/:userId/roles
   * Get all roles employee has across company projects
   */
  router.get(
    '/employees/:userId/roles',
    authenticate,
    requireCompanyAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const workspaceId = req.user!.workspaceId;
      const { userId } = req.params;

      // Verify employee exists
      const userResult = await pool.query(
        `SELECT id, email, name FROM Users WHERE workspace_id = $1 AND id = $2`,
        [workspaceId, userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const user = userResult.rows[0];

      // Get all project assignments
      const rolesResult = await pool.query(
        `SELECT p.id, p.name, pt.assigned_role, pt.assigned_at
         FROM Projects p
         JOIN ProjectTeam pt ON p.id = pt.project_id
         WHERE pt.user_id = $1 AND p.workspace_id = $2 AND p.deleted_at IS NULL
         ORDER BY p.name`,
        [userId, workspaceId]
      );

      res.json({
        employee: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        roles: rolesResult.rows.map((row) => ({
          projectId: row.id,
          projectName: row.name,
          assignedRole: row.assigned_role,
          assignedAt: row.assigned_at,
        })),
        totalProjects: rolesResult.rows.length,
      });
    })
  );

  return router;
}
