import { pool } from '../db';
import { createHash, randomBytes } from 'crypto';

/**
 * Access control security utilities for MyLab platform
 * Implements download token validation, revocation audit trails, and race condition prevention
 */

export interface DownloadToken {
  id: string;
  tokenHash: string;
  objectType: 'Document' | 'Analysis' | 'Result';
  objectId: string;
  organizationId: string;
  userId: string;
  expiresAt: Date;
  oneTimeUse: boolean;
  usedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

/**
 * Generate a secure download token for time-limited file access
 * Prevents files from being accessed after grant expiry or revocation
 */
export async function generateDownloadToken(
  objectType: 'Document' | 'Analysis' | 'Result',
  objectId: string,
  organizationId: string,
  userId: string,
  grantId: string | null,
  expirationMinutes: number = 15,
  oneTimeUse: boolean = false
): Promise<string> {
  try {
    // Generate cryptographically secure random token
    const randomToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(randomToken).digest('hex');

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    // Store token hash in database (never store raw token)
    await pool.query(`
      INSERT INTO DownloadTokens (
        token_hash, object_type, object_id, grant_id, organization_id, 
        user_id, expires_at, one_time_use
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      tokenHash,
      objectType,
      objectId,
      grantId,
      organizationId,
      userId,
      expiresAt,
      oneTimeUse
    ]);

    return randomToken;
  } catch (error) {
    console.error('Error generating download token:', error);
    throw error;
  }
}

/**
 * Validate a download token against multiple safety checks
 * Ensures:
 * - Token is valid and not expired
 * - Token has not been revoked
 * - Underlying grant has not been revoked
 * - One-time use tokens are only used once
 */
export async function validateDownloadToken(
  token: string,
  organizationId: string
): Promise<{ valid: boolean; error?: string; objectId?: string; objectType?: string }> {
  try {
    // Hash the provided token
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Check token validity and related grant
    const result = await pool.query(`
      SELECT 
        dt.id, dt.object_id, dt.object_type, dt.grant_id, 
        dt.expires_at, dt.used_at, dt.revoked_at, dt.one_time_use,
        ag.revoked_at as grant_revoked_at, ag.expires_at as grant_expires_at
      FROM DownloadTokens dt
      LEFT JOIN AccessGrants ag ON dt.grant_id = ag.id
      WHERE dt.token_hash = $1 AND dt.organization_id = $2
    `, [tokenHash, organizationId]);

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid download token' };
    }

    const token_record = result.rows[0];

    // Check if token is revoked
    if (token_record.revoked_at) {
      return { valid: false, error: 'Download token has been revoked' };
    }

    // Check if underlying grant is revoked
    if (token_record.grant_revoked_at) {
      return { valid: false, error: 'Access grant has been revoked' };
    }

    // Check token expiration (with 30-second safety buffer for race conditions)
    const now = new Date();
    const bufferTime = new Date(Date.now() + 30 * 1000); // 30 second buffer
    if (token_record.expires_at < bufferTime) {
      return { valid: false, error: 'Download token has expired' };
    }

    // Check grant expiration if linked (with safety buffer)
    if (token_record.grant_expires_at && token_record.grant_expires_at < bufferTime) {
      return { valid: false, error: 'Associated access grant has expired' };
    }

    // Check one-time use
    if (token_record.one_time_use && token_record.used_at) {
      return { valid: false, error: 'One-time use token has already been used' };
    }

    return {
      valid: true,
      objectId: token_record.object_id,
      objectType: token_record.object_type
    };
  } catch (error) {
    console.error('Error validating download token:', error);
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * Mark a download token as used (for one-time use tokens)
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await pool.query(`
      UPDATE DownloadTokens
      SET used_at = NOW()
      WHERE token_hash = $1
    `, [tokenHash]);
  } catch (error) {
    console.error('Error marking token as used:', error);
    throw error;
  }
}

/**
 * Revoke a download token (called when access grant is revoked)
 */
export async function revokeDownloadToken(
  grantId: string,
  revocationReason: string = 'Access grant revoked'
): Promise<void> {
  try {
    await pool.query(`
      UPDATE DownloadTokens
      SET revoked_at = NOW()
      WHERE grant_id = $1 AND revoked_at IS NULL
    `, [grantId]);
  } catch (error) {
    console.error('Error revoking download tokens:', error);
    throw error;
  }
}

/**
 * Revoke access grant with full audit trail
 * This is the enhanced version of revokeAccess that includes comprehensive logging
 */
export async function revokeAccessWithAudit(
  objectType: string,
  objectId: string,
  grantedToOrgId: string,
  revokedBy: string,
  revocationReason: string = 'Access revoked by owner'
): Promise<void> {
  try {
    // Get the granting organization/tenant
    const ownerWorkspaceResult = await pool.query(`
      SELECT id FROM Organizations WHERE id = $1
    `, [revokedBy]);

    if (ownerWorkspaceResult.rows.length === 0) {
      throw new Error('Invalid revoking organization');
    }

    const ownerWorkspaceId = ownerWorkspaceResult.rows[0].id;

    // Get grant details before revocation (for audit log)
    const grantResult = await pool.query(`
      SELECT id, granted_role, expires_at FROM AccessGrants
      WHERE object_type = $1
        AND object_id = $2
        AND granted_to_org_id = $3
        AND deleted_at IS NULL
    `, [objectType, objectId, grantedToOrgId]);

    if (grantResult.rows.length === 0) {
      throw new Error('Access grant not found');
    }

    const grant = grantResult.rows[0];

    // Revoke the grant with audit trail
    await pool.query(`
      UPDATE AccessGrants
      SET 
        deleted_at = NOW(),
        revoked_at = NOW(),
        revocation_reason = $1,
        revoked_by = $2
      WHERE id = $3
    `, [revocationReason, revokedBy, grant.id]);

    // Revoke all download tokens associated with this grant
    await revokeDownloadToken(grant.id, revocationReason);

    // Create audit log entry for revocation
    await pool.query(`
      INSERT INTO AuditLog (
        object_type, object_id, action, actor_id, actor_workspace, 
        actor_org_id, details, timestamp
      )
      VALUES ($1, $2, 'revoke_access', $3, $4, $5, $6, NOW())
    `, [
      objectType,
      objectId,
      revokedBy,
      ownerWorkspaceId,
      revokedBy,
      JSON.stringify({
        grantedToOrgId,
        grantedRole: grant.granted_role,
        originalExpiresAt: grant.expires_at,
        revocationReason,
        revokedAt: new Date()
      })
    ]);
  } catch (error) {
    console.error('Error revoking access with audit:', error);
    throw error;
  }
}

/**
 * Check if a grant is expired with safety buffer to prevent race conditions
 * Buffer time: 30 seconds before actual expiry
 * This prevents requests that start before expiry but complete after
 */
export function isGrantExpiredWithBuffer(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return false; // No expiration = never expires
  }

  // Add 30-second buffer before expiry time
  const bufferTime = new Date(expiresAt.getTime() - 30 * 1000);
  return new Date() > bufferTime;
}

/**
 * Get revocation history for an object (for admin auditing)
 */
export async function getRevocationHistory(
  objectType: string,
  objectId: string,
  workspaceId: string
): Promise<
  Array<{
    grantId: string;
    grantedToOrgId: string;
    grantedRole: string;
    revokedAt: Date;
    revocationReason: string;
    revokedByUserId: string;
  }>
> {
  try {
    const result = await pool.query(`
      SELECT 
        id as grant_id,
        granted_to_org_id,
        granted_role,
        revoked_at,
        revocation_reason,
        revoked_by
      FROM AccessGrants
      WHERE object_type = $1
        AND object_id = $2
        AND revoked_at IS NOT NULL
        AND deleted_at IS NOT NULL
      ORDER BY revoked_at DESC
    `, [objectType, objectId]);

    return result.rows.map(row => ({
      grantId: row.grant_id,
      grantedToOrgId: row.granted_to_org_id,
      grantedRole: row.granted_role,
      revokedAt: row.revoked_at,
      revocationReason: row.revocation_reason,
      revokedByUserId: row.revoked_by
    }));
  } catch (error) {
    console.error('Error getting revocation history:', error);
    return [];
  }
}

/**
 * Get active download tokens for a grant (used to verify token distribution)
 */
export async function getActiveDownloadTokens(grantId: string): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as active_count
      FROM DownloadTokens
      WHERE grant_id = $1
        AND expires_at > NOW()
        AND revoked_at IS NULL
        AND (one_time_use = false OR used_at IS NULL)
    `, [grantId]);

    return parseInt(result.rows[0].active_count);
  } catch (error) {
    console.error('Error getting active download tokens:', error);
    return 0;
  }
}
