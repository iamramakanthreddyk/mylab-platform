import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import { checkAccess, hasSufficientRole, isValidObjectType } from './accessControl';
import { logAuthFailure, logAccessDenied } from '../utils/securityLogger';
import { trackLastLogin } from './analytics';

// Extend Express Request to include user and grant
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        workspaceId: string;
        orgId?: string;
        companyId?: string;
        currentProjectId?: string;
      };
      grant?: {
        id: string;
        grantedRole: string;
        canReshare: boolean;
        expiresAt?: Date;
      };
    }
  }
}

// Mock authentication for development - replace with real JWT validation
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-change-in-production';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('Token verification failed:', error instanceof Error ? error.message : error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user details from database to ensure they still exist and aren't deleted
    const userResult = await pool.query(`
      SELECT u.id, u.email, u.name, u.role, u.workspace_id,
             o.id as org_id
      FROM Users u
      LEFT JOIN Organizations o ON u.workspace_id = o.workspace_id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      // Log authentication failure (only if we have workspaceId from token)
      if (decoded.workspaceId) {
        try {
          await logAuthFailure(pool, decoded.workspaceId, 'User not found in database', req);
        } catch (logError) {
          console.error('Failed to log auth failure:', logError);
        }
      } else {
        console.warn('User not found but no workspaceId in token for logging');
      }
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspace_id,
      orgId: user.org_id
    };

    // Track last login
    await trackLastLogin(req, res, () => {});

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    // Note: Don't log auth error to securitylog if we don't have workspace context
    // to avoid NULL constraint violations
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Check if user owns the workspace
export const requireWorkspaceOwnership = (req: Request, res: Response, next: NextFunction) => {
  const { workspaceId } = req.params;
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.workspaceId !== workspaceId) {
    // Log access denial
    try {
      logAccessDenied(
        pool,
        req.user.id,
        req.user.workspaceId,
        'workspace',
        workspaceId,
        'Workspace ownership required',
        req
      ).catch(err => console.error('Failed to log access denial:', err));
    } catch (logError) {
      console.error('Failed to log access denial:', logError);
    }
    return res.status(403).json({ error: 'Access denied: workspace ownership required' });
  }

  next();
};

// Check if user has access to an object via ownership or grants
export const requireObjectAccess = (objectType: string, requiredRole?: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!isValidObjectType(objectType)) {
      return res.status(400).json({ error: 'Invalid object type' });
    }

    const objectId = req.params.id || req.body.id || req.query.id;
    if (!objectId) {
      return res.status(400).json({ error: 'Object ID required' });
    }

    try {
      const accessCheck = await checkAccess(objectType, objectId, req.user.workspaceId);

      if (!accessCheck.hasAccess) {
        // Log access denial
        try {
          await logAccessDenied(
            pool,
            req.user.id,
            req.user.workspaceId,
            objectType,
            objectId,
            'No ownership or access grant found',
            req
          );
        } catch (logError) {
          console.error('Failed to log access denial:', logError);
        }
        return res.status(403).json({ error: 'Access denied: no ownership or access grant found' });
      }

      // Check role requirements
      if (requiredRole && accessCheck.accessRole) {
        if (!hasSufficientRole(accessCheck.accessRole, requiredRole)) {
          // Log role insufficiency
          try {
            await logAccessDenied(
              pool,
              req.user.id,
              req.user.workspaceId,
              objectType,
              objectId,
              `${accessCheck.accessRole} role insufficient, ${requiredRole} required`,
              req
            );
          } catch (logError) {
            console.error('Failed to log access denial:', logError);
          }
          return res.status(403).json({
            error: `Access denied: ${accessCheck.accessRole} role insufficient, ${requiredRole} required`
          });
        }
      }

      // Store grant info for later use (if not owner)
      if (!accessCheck.isOwner && accessCheck.grantId) {
        req.grant = {
          id: accessCheck.grantId,
          grantedRole: accessCheck.accessRole!,
          canReshare: accessCheck.canReshare || false,
          expiresAt: undefined // Could be added to accessCheck if needed
        };
      }

      next();

    } catch (error) {
      console.error('Access control error:', error);
      res.status(500).json({ error: 'Access control check failed' });
    }
  };

// Prevent re-sharing if not allowed
export const requireResharePermission = (req: Request, res: Response, next: NextFunction) => {
  if (req.grant && !req.grant.canReshare) {
    return res.status(403).json({ error: 'Access denied: re-sharing not permitted' });
  }
  next();
};

// Audit logging middleware
export const auditLog = (action: string, objectType: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function(data: any) {
      // Log after response is sent
      if (req.user) {
        try {
          let objectId = req.params.id || req.body.id || null;

          if (!objectId && data) {
            let payload: any = data;
            if (typeof data === 'string') {
              try {
                payload = JSON.parse(data);
              } catch {
                payload = null;
              }
            }

            objectId = payload?.data?.id || payload?.id || null;
          }

          if (!objectId) {
            return originalSend.call(this, data);
          }
          pool.query(`
            INSERT INTO AuditLog (object_type, object_id, action, actor_id, actor_workspace, actor_org_id, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            objectType,
            objectId,
            action,
            req.user.id,
            req.user.workspaceId,
            req.user.orgId || null,
            JSON.stringify({
              method: req.method,
              url: req.url,
              userAgent: req.get('User-Agent')
            }),
            req.ip,
            req.get('User-Agent')
          ]).catch(error => {
            console.error('Audit logging failed:', error);
          });
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };