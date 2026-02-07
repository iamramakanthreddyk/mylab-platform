/**
 * Access Control Service
 * 
 * Core logic for checking user permissions.
 * Used by middleware and API endpoints to enforce access rules.
 */

import { Pool } from 'pg';
import logger from '../utils/logger';

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  accessLevel?: 'view' | 'download' | 'edit';
}

export interface UserProjectAssignment {
  projectId: string;
  assignedRole: 'admin' | 'manager' | 'scientist' | 'viewer';
  companyId: string;
  workspaceId: string;
}

/**
 * Get all projects a user is assigned to
 * Used during login to determine accessible projects
 */
export async function getUserProjectAssignments(
  pool: Pool,
  userId: string,
  workspaceId: string
): Promise<UserProjectAssignment[]> {
  try {
    const result = await pool.query(
      `SELECT 
        project_id as "projectId",
        assigned_role as "assignedRole",
        company_id as "companyId",
        workspace_id as "workspaceId"
      FROM ProjectTeam
      WHERE user_id = $1 AND workspace_id = $2
      ORDER BY created_at DESC`,
      [userId, workspaceId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error fetching user project assignments', {
      userId,
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get user's assigned role in a specific project
 */
export async function getUserRoleInProject(
  pool: Pool,
  userId: string,
  projectId: string
): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT assigned_role FROM ProjectTeam
      WHERE user_id = $1 AND project_id = $2`,
      [userId, projectId]
    );

    return result.rows.length > 0 ? result.rows[0].assigned_role : null;
  } catch (error) {
    logger.error('Error fetching user role in project', {
      userId,
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Check if a role has permission to perform an action on a resource
 */
export async function checkRolePermission(
  pool: Pool,
  role: string,
  resourceType: 'sample' | 'report' | 'project' | 'analysis',
  action: 'view' | 'create' | 'edit' | 'delete' | 'share'
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT allowed FROM UserRolePermissions
      WHERE role = $1 AND resource_type = $2 AND action = $3`,
      [role, resourceType, action]
    );

    if (result.rows.length === 0) {
      logger.warn('Permission rule not found', { role, resourceType, action });
      return false;
    }

    return result.rows[0].allowed;
  } catch (error) {
    logger.error('Error checking role permission', {
      role,
      resourceType,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get user-level access override for a report
 */
export async function getReportAccessOverride(
  pool: Pool,
  reportId: string,
  userId: string
): Promise<{ accessLevel: 'view' | 'download' | 'edit'; canShare: boolean } | null> {
  try {
    const result = await pool.query(
      `SELECT access_level as "accessLevel", can_share as "canShare"
      FROM ReportAccess
      WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId]
    );

    return result.rows.length > 0
      ? {
          accessLevel: result.rows[0].accessLevel,
          canShare: result.rows[0].canShare,
        }
      : null;
  } catch (error) {
    logger.error('Error fetching report access override', {
      reportId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get user-level access override for a sample
 */
export async function getSampleAccessOverride(
  pool: Pool,
  sampleId: string,
  userId: string
): Promise<{ accessLevel: 'view' | 'download' | 'edit'; canShare: boolean } | null> {
  try {
    const result = await pool.query(
      `SELECT access_level as "accessLevel", can_share as "canShare"
      FROM SampleAccess
      WHERE sample_id = $1 AND user_id = $2`,
      [sampleId, userId]
    );

    return result.rows.length > 0
      ? {
          accessLevel: result.rows[0].accessLevel,
          canShare: result.rows[0].canShare,
        }
      : null;
  } catch (error) {
    logger.error('Error fetching sample access override', {
      sampleId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Main access control check
 * 
 * Performs a 3-step check:
 * 1. Is user assigned to the project?
 * 2. Does their role allow the action?
 * 3. Are there user-level overrides?
 */
export async function checkAccess(
  pool: Pool,
  userId: string,
  projectId: string,
  resourceType: 'sample' | 'report' | 'project' | 'analysis',
  action: 'view' | 'create' | 'edit' | 'delete' | 'share',
  resourceId?: string
): Promise<AccessCheckResult> {
  try {
    // Step 1: Check project assignment
    const userRole = await getUserRoleInProject(pool, userId, projectId);

    if (!userRole) {
      return {
        allowed: false,
        reason: `User is not assigned to this project`,
      };
    }

    // Step 2: Check role permissions
    const hasRolePermission = await checkRolePermission(
      pool,
      userRole,
      resourceType,
      action
    );

    if (!hasRolePermission) {
      return {
        allowed: false,
        reason: `Role '${userRole}' cannot ${action} ${resourceType}`,
      };
    }

    // Step 3: Check user-level overrides (if resource ID provided)
    if (resourceId) {
      const override =
        resourceType === 'report'
          ? await getReportAccessOverride(pool, resourceId, userId)
          : resourceType === 'sample'
            ? await getSampleAccessOverride(pool, resourceId, userId)
            : null;

      if (override) {
        // User has explicit access record
        // Check if action is compatible with access level
        const isCompatible = isActionCompatibleWithAccessLevel(
          action,
          override.accessLevel
        );

        if (!isCompatible) {
          return {
            allowed: false,
            reason: `User's explicit access level (${override.accessLevel}) does not allow ${action}`,
          };
        }

        return {
          allowed: true,
          reason: `User has explicit ${override.accessLevel} access`,
          accessLevel: override.accessLevel,
        };
      }
    }

    return {
      allowed: true,
      reason: `Role '${userRole}' allows ${action} on ${resourceType}`,
    };
  } catch (error) {
    logger.error('Error checking access', {
      userId,
      projectId,
      resourceType,
      action,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      allowed: false,
      reason: 'Internal error during access check',
    };
  }
}

/**
 * Helper: Check if action is compatible with access level
 * view < download < edit
 */
function isActionCompatibleWithAccessLevel(
  action: string,
  accessLevel: string
): boolean {
  const hierarchy: { [key: string]: number } = {
    view: 0,
    download: 1,
    edit: 2,
  };

  const actionLevel = hierarchy[action];
  const accessLevelNum = hierarchy[accessLevel];

  if (actionLevel === undefined || accessLevelNum === undefined) {
    return false;
  }

  // Action must be at or below access level
  return actionLevel <= accessLevelNum;
}

/**
 * Grant user access to a report
 */
export async function grantReportAccess(
  pool: Pool,
  reportId: string,
  userId: string,
  workspaceId: string,
  accessLevel: string = 'view',
  grantedByUserId?: string
): Promise<string> {
  try {
    const accessId = require('uuid').v4();

    await pool.query(
      `INSERT INTO ReportAccess (
        access_id, report_id, user_id, workspace_id, 
        access_level, can_share, shared_by_user_id, shared_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (report_id, user_id) 
      DO UPDATE SET access_level = $5, shared_by_user_id = $7, shared_date = NOW()`,
      [
        accessId,
        reportId,
        userId,
        workspaceId,
        accessLevel,
        false, // can_share
        grantedByUserId || null,
      ]
    );

    logger.info('Report access granted', {
      reportId,
      userId,
      accessLevel,
      grantedBy: grantedByUserId,
    });

    return accessId;
  } catch (error) {
    logger.error('Error granting report access', {
      reportId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Grant user access to a sample
 */
export async function grantSampleAccess(
  pool: Pool,
  sampleId: string,
  userId: string,
  workspaceId: string,
  accessLevel: string = 'view',
  grantedByUserId?: string
): Promise<string> {
  try {
    const accessId = require('uuid').v4();

    await pool.query(
      `INSERT INTO SampleAccess (
        access_id, sample_id, user_id, workspace_id, 
        access_level, can_share, shared_by_user_id, shared_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (sample_id, user_id) 
      DO UPDATE SET access_level = $5, shared_by_user_id = $7, shared_date = NOW()`,
      [
        accessId,
        sampleId,
        userId,
        workspaceId,
        accessLevel,
        false,
        grantedByUserId || null,
      ]
    );

    logger.info('Sample access granted', {
      sampleId,
      userId,
      accessLevel,
      grantedBy: grantedByUserId,
    });

    return accessId;
  } catch (error) {
    logger.error('Error granting sample access', {
      sampleId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Revoke user access to a report
 */
export async function revokeReportAccess(
  pool: Pool,
  reportId: string,
  userId: string
): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM ReportAccess WHERE report_id = $1 AND user_id = $2`,
      [reportId, userId]
    );

    logger.info('Report access revoked', { reportId, userId });
  } catch (error) {
    logger.error('Error revoking report access', {
      reportId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Revoke user access to a sample
 */
export async function revokeSampleAccess(
  pool: Pool,
  sampleId: string,
  userId: string
): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM SampleAccess WHERE sample_id = $1 AND user_id = $2`,
      [sampleId, userId]
    );

    logger.info('Sample access revoked', { sampleId, userId });
  } catch (error) {
    logger.error('Error revoking sample access', {
      sampleId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
