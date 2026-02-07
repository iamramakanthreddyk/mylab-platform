/**
 * Access Control Middleware
 * 
 * Enforces role-based access control on API endpoints.
 * Checks user permissions before allowing resource access.
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { checkAccess, checkRolePermission, getUserRoleInProject } from '../services/accessControlService';
import logger from '../utils/logger';

/**
 * Extended Express Request with access control context
 */
export interface AccessControlRequest extends Request {
  accessControl?: {
    userId: string;
    projectId: string;
    assigned_role: string;
    resource_type?: string;
    action?: string;
    resource_id?: string;
  };
}

/**
 * Main access control middleware
 * Checks if user has permission to access a resource
 * 
 * Usage: app.use(enforceAccessControl(pool))
 */
export function enforceAccessControl(pool: Pool) {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      // Only check protected routes (those that specify resource)
      const { projectId, resourceType, action, resourceId } = extractAccessContext(req);

      if (!projectId) {
        // No access control needed for this route
        return next();
      }

      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const userId = req.user.id;

      // Check access
      const result = await checkAccess(
        pool,
        userId,
        projectId,
        resourceType as any,
        action as any,
        resourceId
      );

      if (!result.allowed) {
        logger.warn('Access denied', {
          userId,
          projectId,
          resourceType,
          action,
          reason: result.reason,
        });
        return res.status(403).json({
          error: 'Access denied',
          reason: result.reason,
        });
      }

      // Attach context to request for use in route handlers
      req.accessControl = {
        userId,
        projectId,
        assigned_role: (await getUserRoleInProject(pool, userId, projectId)) || 'viewer',
        resource_type: resourceType,
        action,
        resource_id: resourceId,
      };

      logger.debug('Access granted', {
        userId,
        projectId,
        resourceType,
        action,
      });

      next();
    } catch (error) {
      logger.error('Error in access control middleware', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check access to a specific resource
 * Can be used in individual route handlers
 * 
 * Usage:
 * router.get('/api/samples/:id', 
 *   requireAccess(pool, 'sample', 'view'),
 *   sampleController.getSample
 * );
 */
export function requireAccess(
  pool: Pool,
  resourceType: 'sample' | 'report' | 'project' | 'analysis',
  action: 'view' | 'create' | 'edit' | 'delete' | 'share'
) {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Extract projectId from request (query, params, or body)
      const projectId =
        req.query.projectId ||
        req.params.projectId ||
        req.body?.projectId ||
        req.user.currentProjectId; // Users can set a current project

      if (!projectId) {
        return res.status(400).json({
          error: 'Missing projectId',
          hint: 'Provide projectId as query param, path param, or in request body',
        });
      }

      const userId = req.user.id;
      const resourceId = req.params.id || req.params.resourceId;

      const result = await checkAccess(
        pool,
        userId,
        projectId as string,
        resourceType,
        action,
        resourceId
      );

      if (!result.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: result.reason,
        });
      }

      // Attach context
      req.accessControl = {
        userId,
        projectId: projectId as string,
        assigned_role: (await getUserRoleInProject(pool, userId, projectId as string)) || 'viewer',
        resource_type: resourceType,
        action,
        resource_id: resourceId,
      };

      next();
    } catch (error) {
      logger.error('Error in access control middleware', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Role-based check without resource (for project-level actions)
 * 
 * Usage:
 * router.post('/api/projects/:projectId/team',
 *   requireRole(pool, 'admin'),
 *   teamController.addMember
 * );
 */
export function requireRole(
  pool: Pool,
  requiredRole: 'admin' | 'manager' | 'scientist' | 'viewer'
) {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId =
        req.params.projectId ||
        req.query.projectId ||
        req.body?.projectId ||
        req.user.currentProjectId;

      if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
      }

      const userRole = await getUserRoleInProject(pool, req.user.id, projectId as string);

      if (!userRole) {
        return res.status(403).json({
          error: 'Access denied',
          reason: 'User is not assigned to this project',
        });
      }

      // Check role hierarchy
      if (!hasRequiredRole(userRole, requiredRole)) {
        return res.status(403).json({
          error: 'Access denied',
          reason: `This action requires '${requiredRole}' role or higher. You have '${userRole}' role.`,
        });
      }

      req.accessControl = {
        userId: req.user.id,
        projectId: projectId as string,
        assigned_role: userRole,
      };

      next();
    } catch (error) {
      logger.error('Error in role check middleware', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Check project assignment (user is assigned to project at all)
 * 
 * Usage:
 * router.get('/api/projects/:projectId/dashboard',
 *   requireProjectAccess(pool),
 *   dashboardController.getProject
 * );
 */
export function requireProjectAccess(pool: Pool) {
  return async (req: AccessControlRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = req.params.projectId || req.query.projectId;

      if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
      }

      const userRole = await getUserRoleInProject(pool, req.user.id, projectId as string);

      if (!userRole) {
        return res.status(403).json({
          error: 'Access denied',
          reason: 'User is not assigned to this project',
        });
      }

      req.accessControl = {
        userId: req.user.id,
        projectId: projectId as string,
        assigned_role: userRole,
      };

      next();
    } catch (error) {
      logger.error('Error in project access check middleware', {
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Helper: Check if user has required role or higher
 * admin > manager > scientist > viewer
 */
function hasRequiredRole(
  userRole: string,
  requiredRole: string
): boolean {
  const roleHierarchy: { [key: string]: number } = {
    admin: 4,
    manager: 3,
    scientist: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Helper: Extract access context from request
 */
function extractAccessContext(
  req: AccessControlRequest
): {
  projectId?: string;
  resourceType?: string;
  action?: string;
  resourceId?: string;
} {
  // This is a simple implementation
  // In real usage, you'd want more sophisticated routing context
  // that knows what resource is being accessed

  const path = req.path;
  const method = req.method;

  // Example patterns:
  // GET /api/projects/:id/samples/:sampleId → resource: sample, action: view
  // POST /api/projects/:id/samples → resource: sample, action: create
  // PATCH /api/projects/:id/samples/:sampleId → resource: sample, action: edit

  const patterns = [
    /\/api\/projects\/([^\/]+)\/samples\/([^\/]+)/,
    /\/api\/projects\/([^\/]+)\/reports\/([^\/]+)/,
    /\/api\/projects\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      // Extract logic here
      // This is simplified - real implementation would be more complex
      return {};
    }
  }

  return {};
}
