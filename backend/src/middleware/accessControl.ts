import { pool } from '../db';
import { createHash } from 'crypto';
import { revokeAccessWithAudit, isGrantExpiredWithBuffer } from '../utils/accessSecurityUtils';

// Access control utilities for MyLab platform

export interface AccessGrant {
  id: string;
  objectType: string;
  objectId: string;
  grantedToOrgId: string;
  grantedRole: 'viewer' | 'processor' | 'analyzer' | 'client';
  canReshare: boolean;
  expiresAt?: Date;
  grantedBy: string;
  createdAt: Date;
}

export interface OwnershipCheck {
  isOwner: boolean;
  hasAccess: boolean;
  accessRole?: string;
  canReshare?: boolean;
  grantId?: string;
}

/**
 * Check if a workspace owns an object
 * For external organizations, ownership is determined differently
 */
export async function checkOwnership(
  objectType: string,
  objectId: string,
  workspaceId: string
): Promise<boolean> {
  let query = '';
  const params = [workspaceId, objectId];

  switch (objectType) {
    case 'project':
      query = 'SELECT id FROM Projects WHERE workspace_id = $1 AND id = $2';
      break;
    case 'sample':
      query = 'SELECT id FROM Samples WHERE workspace_id = $1 AND id = $2';
      break;
    case 'derived_sample':
      query = 'SELECT id FROM DerivedSamples WHERE owner_workspace_id = $1 AND id = $2';
      break;
    case 'batch':
      query = 'SELECT id FROM Batches WHERE workspace_id = $1 AND id = $2';
      break;
    case 'analysis':
      // For analyses, check workspace ownership OR if the analysis was performed by an external org
      // but uploaded to this workspace
      query = `
        SELECT id FROM Analyses
        WHERE workspace_id = $1 AND id = $2
           OR (execution_mode = 'external' AND workspace_id = $1 AND id = $2)
      `;
      break;
    default:
      throw new Error(`Unknown object type: ${objectType}`);
  }

  const result = await pool.query(query, params);
  return result.rows.length > 0;
}

/**
 * Check access to an object including ownership and grants
 */
export async function checkAccess(
  objectType: string,
  objectId: string,
  workspaceId: string
): Promise<OwnershipCheck> {
  // First check ownership
  const isOwner = await checkOwnership(objectType, objectId, workspaceId);

  if (isOwner) {
    return {
      isOwner: true,
      hasAccess: true,
      accessRole: 'owner',
      canReshare: true // Owners can always re-share
    };
  }

  // Check access grants - handle both platform and external organizations
  const grantResult = await pool.query(`
    SELECT ag.id, ag.granted_role, ag.can_reshare, ag.expires_at, ag.granted_by, ag.revoked_at
    FROM AccessGrants ag
    JOIN Organizations o ON ag.granted_to_org_id = o.id
    WHERE ag.object_type = $1
      AND ag.object_id = $2
      AND (
        (o.is_platform_workspace = true AND o.workspace_id = $3) OR
        (o.is_platform_workspace = false AND ag.access_mode = 'offline')
      )
      AND ag.revoked_at IS NULL
      AND (ag.expires_at IS NULL OR ag.expires_at > NOW() + INTERVAL '30 seconds')
      AND ag.deleted_at IS NULL
    ORDER BY ag.created_at DESC
    LIMIT 1
  `, [objectType, objectId, workspaceId]);

  if (grantResult.rows.length === 0) {
    return {
      isOwner: false,
      hasAccess: false
    };
  }

  const grant = grantResult.rows[0];

  return {
    isOwner: false,
    hasAccess: true,
    accessRole: grant.granted_role,
    canReshare: grant.can_reshare,
    grantId: grant.id
  };
}

/**
 * Grant access to an object
 */
export async function grantAccess(
  objectType: string,
  objectId: string,
  grantedToOrgId: string,
  grantedRole: 'viewer' | 'processor' | 'analyzer' | 'client',
  canReshare: boolean,
  grantedBy: string,
  expiresAt?: Date
): Promise<string> {
  // Verify the granter owns the object
  const ownerWorkspaceResult = await pool.query(`
    SELECT workspace_id FROM Organizations WHERE id = $1
  `, [grantedBy]);

  if (ownerWorkspaceResult.rows.length === 0) {
    throw new Error('Invalid granting organization');
  }

  const ownerWorkspaceId = ownerWorkspaceResult.rows[0].workspace_id;

  const isOwner = await checkOwnership(objectType, objectId, ownerWorkspaceId);
  if (!isOwner) {
    throw new Error('Only owners can grant access');
  }

  // Insert the grant
  const result = await pool.query(`
    INSERT INTO AccessGrants (
      object_type, object_id, granted_to_org_id,
      granted_role, can_reshare, expires_at, granted_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `, [
    objectType, objectId, grantedToOrgId,
    grantedRole, canReshare, expiresAt, grantedBy
  ]);

  return result.rows[0].id;
}

/**
 * Revoke access to an object with complete audit trail
 * Records who revoked, when, and why - supports compliance requirements
 */
export async function revokeAccess(
  objectType: string,
  objectId: string,
  grantedToOrgId: string,
  revokedBy: string,
  revocationReason: string = 'Access revoked'
): Promise<void> {
  // Use the enhanced revocation function with audit trail
  await revokeAccessWithAudit(objectType, objectId, grantedToOrgId, revokedBy, revocationReason);
}

/**
 * List all access grants for an object
 */
export async function listAccessGrants(
  objectType: string,
  objectId: string,
  ownerWorkspaceId: string
): Promise<AccessGrant[]> {
  // Verify ownership
  const isOwner = await checkOwnership(objectType, objectId, ownerWorkspaceId);
  if (!isOwner) {
    throw new Error('Only owners can view access grants');
  }

  const result = await pool.query(`
    SELECT ag.*, o.name as granted_to_org_name
    FROM AccessGrants ag
    JOIN Organizations o ON ag.granted_to_org_id = o.id
    WHERE ag.object_type = $1
      AND ag.object_id = $2
      AND ag.deleted_at IS NULL
    ORDER BY ag.created_at DESC
  `, [objectType, objectId]);

  return result.rows.map(row => ({
    id: row.id,
    objectType: row.object_type,
    objectId: row.object_id,
    grantedToOrgId: row.granted_to_org_id,
    grantedRole: row.granted_role,
    canReshare: row.can_reshare,
    expiresAt: row.expires_at,
    grantedBy: row.granted_by,
    createdAt: row.created_at
  }));
}

/**
 * Check if a role has sufficient permissions
 */
export function hasSufficientRole(
  userRole: string,
  requiredRole: string
): boolean {
  const roleHierarchy = ['viewer', 'processor', 'analyzer', 'client', 'owner'];
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
}

/**
 * Validate object type
 */
export function isValidObjectType(objectType: string): boolean {
  const validTypes = ['project', 'sample', 'derived_sample', 'batch', 'analysis'];
  return validTypes.includes(objectType);
}

/**
 * Validate external organization API key
 */
export async function validateExternalAPIKey(
  organizationId: string,
  apiKey: string
): Promise<boolean> {
  try {
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const result = await pool.query(`
      SELECT id FROM APIKeys
      WHERE organization_id = $1
        AND key_hash = $2
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [organizationId, keyHash]);

    if (result.rows.length > 0) {
      // Update last_used_at
      await pool.query(`
        UPDATE APIKeys SET last_used_at = NOW() WHERE id = $1
      `, [result.rows[0].id]);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

/**
 * Check if organization is external (no platform workspace)
 */
export async function isExternalOrganization(organizationId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT is_platform_workspace FROM Organizations WHERE id = $1
    `, [organizationId]);

    return result.rows.length > 0 && !result.rows[0].is_platform_workspace;
  } catch (error) {
    console.error('Error checking organization type:', error);
    return false;
  }
}