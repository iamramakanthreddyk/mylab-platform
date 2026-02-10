import { Router, Response } from 'express';
import { pool } from '../db';
import {
  authenticate,
  checkAccess,
  auditLog
} from '../middleware';
import {
  generateDownloadToken,
  validateDownloadToken,
  markTokenAsUsed,
  revokeAccessWithAudit
} from '../utils/accessSecurityUtils';
import {
  triggerManualCleanup,
  getTokenStats
} from '../jobs/tokenCleanup';
import { promises as fs } from 'fs';
import * as path from 'path';

const router = Router();

/**
 * GET /api/access/documents/:id/download
 * Issues a download token for accessing a document/analysis/result
 * Validates user has appropriate access before issuing token
 */
router.get('/documents/:id/download', authenticate, async (req, res) => {
  try {
    const { id: objectId } = req.params;
    const userId = req.user!.id;
    const organizationId = req.user!.orgId || req.user!.id;
    const { type = 'Document' } = req.query; // Document, Analysis, Result

    // Verify object exists and user has access
    const objectType = type === 'Document' || type === 'Analysis' || type === 'Result' ? type : 'Document';
    
    // Check if user has access to this object
    const accessCheck = await pool.query(`
      SELECT ag.id, ag.granted_role, ag.expires_at, ag.revoked_at
      FROM AccessGrants ag
      WHERE ag.object_id = $1 
        AND ag.object_type = $2
        AND ag.granted_to_org_id = $3
        AND (ag.revoked_at IS NULL OR ag.revoked_at > NOW())
        AND (ag.expires_at IS NULL OR ag.expires_at > NOW())
      LIMIT 1
    `, [objectId, objectType, organizationId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to download this file'
      });
    }

    const grant = accessCheck.rows[0];

    // Issue download token
    const expirationMinutes = grant.expires_at ? 
      Math.floor((new Date(grant.expires_at).getTime() - Date.now()) / (1000 * 60)) : 
      15;
    
    const token = await generateDownloadToken(
      objectType as 'Document' | 'Analysis' | 'Result',
      objectId,
      organizationId,
      userId,
      grant.id,
      Math.max(expirationMinutes, 1), // at least 1 minute
      true // one-time use for downloads
    );

    // Return token with download URL
    res.json({
      success: true,
      token: token,
      expiresIn: Math.floor((new Date(grant.expires_at).getTime() - Date.now()) / 1000),
      downloadUrl: `/api/access/documents/${objectId}/download-file?token=${token}`,
      oneTimeUse: true
    });
  } catch (error) {
    console.error('Error issuing download token:', error);
    res.status(500).json({ error: 'Failed to issue download token' });
  }
});

/**
 * GET /api/access/documents/:id/download-file
 * Validates token and serves the file
 * Token must be provided as query parameter
 */
router.get('/documents/:id/download-file', async (req, res) => {
  try {
    const { id: objectId } = req.params;
    const { token, org } = req.query;
    const organizationId = (org || req.query.organizationId) as string;

    if (!token || !organizationId) {
      return res.status(400).json({ error: 'Missing token or organization' });
    }

    // Validate the token
    const validation = await validateDownloadToken(token as string, organizationId);

    if (!validation.valid) {
      return res.status(403).json({ 
        error: 'Invalid or expired token',
        message: validation.error
      });
    }

    // Verify token is for this object
    if (validation.objectId !== objectId) {
      return res.status(403).json({ error: 'Token not valid for this object' });
    }

    // Mark token as used (one-time use)
    await markTokenAsUsed(token as string);

    // Serve the file
    // NOTE: In production, this should:
    // 1. Retrieve file from storage (S3, local filesystem, etc.)
    // 2. Set appropriate content-type header
    // 3. Stream large files efficiently
    // 4. Log the download in audit trail

    const filePath = path.join(process.env.FILES_DIR || './files', validation.objectType!, objectId);
    
    try {
      const fileStats = await fs.stat(filePath);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
      res.setHeader('Content-Length', fileStats.size);
      
      // Stream file
      const fileStream = (await fs.readFile(filePath)).toString('base64');
      res.send(Buffer.from(fileStream, 'base64'));
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

/**
 * POST /api/access/grants/:grantId/revoke
 * Revokes an access grant and all associated download tokens
 * Only grant owner or organization admin can revoke
 */
router.post('/grants/:grantId/revoke', authenticate, auditLog('revoke', 'access_grant'), async (req, res) => {
  try {
    const { grantId } = req.params;
    const { reason } = req.body;
    const revokedBy = req.user!.id;
    const organizationId = req.user!.orgId || req.user!.id;

    // Verify grant exists and user has permission to revoke
    const grantCheck = await pool.query(`
      SELECT ag.id, ag.object_id, ag.object_type, ag.granted_by, ag.created_by_org_id
      FROM AccessGrants ag
      WHERE ag.id = $1
    `, [grantId]);

    if (grantCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Access grant not found' });
    }

    const grant = grantCheck.rows[0];

    // Check if user is grant owner or org admin
    const permissionCheck = await pool.query(`
      SELECT ur.role FROM UserRoles ur
      WHERE ur.user_id = $1 AND ur.organization_id = $2
    `, [revokedBy, organizationId]);

    const userRole = permissionCheck.rows[0]?.role;
    const isGrantOwner = grant.granted_by === revokedBy;
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    if (!isGrantOwner && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied: Cannot revoke this grant' });
    }

    // Revoke the grant and all associated download tokens with audit trail
    await revokeAccessWithAudit(
      grant.object_type,
      grant.object_id,
      organizationId,
      revokedBy,
      reason || 'User revoked access'
    );

    res.json({
      success: true,
      message: 'Access grant revoked successfully',
      revokedAt: new Date().toISOString(),
      revokedBy: revokedBy
    });
  } catch (error) {
    console.error('Error revoking access grant:', error);
    res.status(500).json({ error: 'Failed to revoke access grant' });
  }
});

/**
 * GET /api/access/grants/:grantId
 * Retrieve details of an access grant including revocation status
 */
router.get('/grants/:grantId', authenticate, async (req, res) => {
  try {
    const { grantId } = req.params;
    const organizationId = req.user!.orgId || req.user!.id;

    const result = await pool.query(`
      SELECT 
        ag.id, ag.object_id, ag.object_type, ag.granted_to_org_id,
        ag.granted_role, ag.can_reshare, ag.expires_at,
        ag.granted_by, ag.revoked_at, ag.revocation_reason, ag.revoked_by,
        ag.created_at,
        u_granted.name as granted_by_name,
        u_revoked.name as revoked_by_name,
        o.name as organization_name
      FROM AccessGrants ag
      LEFT JOIN Users u_granted ON ag.granted_by = u_granted.id
      LEFT JOIN Users u_revoked ON ag.revoked_by = u_revoked.id
      JOIN Organizations o ON ag.granted_to_org_id = o.id
      WHERE ag.id = $1 AND (ag.granted_to_org_id = $2 OR ag.created_by_org_id = $2)
    `, [grantId, organizationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Access grant not found' });
    }

    const grant = result.rows[0];
    const isRevoked = grant.revoked_at !== null;
    const isExpired = grant.expires_at && new Date(grant.expires_at) < new Date();

    res.json({
      ...grant,
      status: isRevoked ? 'revoked' : isExpired ? 'expired' : 'active',
      isRevoked,
      isExpired
    });
  } catch (error) {
    console.error('Error fetching access grant:', error);
    res.status(500).json({ error: 'Failed to fetch access grant' });
  }
});

/**
 * GET /api/access/audit
 * Admin endpoint to view access revocation audit trail
 * Supports filtering by date range, organization, user, object
 */
router.get('/audit', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.orgId || req.user!.id;

    // Verify user is admin
    const adminCheck = await pool.query(`
      SELECT role FROM UserRoles
      WHERE user_id = $1 AND organization_id = $2 AND role IN ('admin', 'owner')
    `, [userId, organizationId]);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied: Admin access required' });
    }

    // Get revocation audit trail with filters
    const { startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        ag.id, ag.object_id, ag.object_type, ag.granted_role,
        ag.revoked_at, ag.revocation_reason, ag.revoked_by,
        u_revoked.name as revoked_by_name,
        o.name as organization_name,
        dt.created_at, dt.expires_at
      FROM AccessGrants ag
      LEFT JOIN Users u_revoked ON ag.revoked_by = u_revoked.id
      JOIN Organizations o ON ag.granted_to_org_id = o.id
      LEFT JOIN DownloadTokens dt ON ag.id = dt.grant_id
      WHERE o.id = $1
      AND ag.revoked_at IS NOT NULL
    `;

    const params: any[] = [organizationId];

    if (startDate) {
      params.push(startDate);
      query += ` AND ag.revoked_at >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND ag.revoked_at <= $${params.length}`;
    }

    query += ` ORDER BY ag.revoked_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      total: result.rows.length,
      limit,
      offset,
      revocations: result.rows
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

/**
 * GET /api/access/tokens/:objectId
 * Admin endpoint to view download tokens for an object
 * Shows token usage, expiry, and revocation status
 */
router.get('/tokens/:objectId', authenticate, async (req, res) => {
  try {
    const { objectId } = req.params;
    const organizationId = req.user!.orgId || req.user!.id;

    const result = await pool.query(`
      SELECT 
        dt.id, dt.token_hash, dt.object_type, dt.created_at,
        dt.expires_at, dt.one_time_use, dt.used_at, dt.revoked_at,
        u.name as issued_to_name,
        ag.granted_role
      FROM DownloadTokens dt
      LEFT JOIN Users u ON dt.user_id = u.id
      LEFT JOIN AccessGrants ag ON dt.grant_id = ag.id
      WHERE dt.object_id = $1 AND dt.organization_id = $2
      ORDER BY dt.created_at DESC
    `, [objectId, organizationId]);

    res.json({
      objectId,
      tokens: result.rows.map(token => ({
        ...token,
        status: token.revoked_at ? 'revoked' : token.used_at ? 'used' : 'active',
        expiresIn: Math.floor((new Date(token.expires_at).getTime() - Date.now()) / 1000)
      }))
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

/**
 * POST /api/access/admin/cleanup
 * Manually trigger token cleanup job
 * Admin only
 */
router.post('/admin/cleanup', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.orgId || req.user!.id;

    // Verify admin access
    const adminCheck = await pool.query(`
      SELECT role FROM UserRoles
      WHERE user_id = $1 AND organization_id = $2 AND role IN ('admin', 'owner')
    `, [userId, organizationId]);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied: Admin access required' });
    }

    // Trigger cleanup
    const result = await triggerManualCleanup();

    if (result.status === 'error') {
      return res.status(500).json({ 
        error: 'Cleanup job failed',
        message: result.error 
      });
    }

    res.json({
      success: true,
      message: 'Token cleanup completed successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering cleanup:', error);
    res.status(500).json({ error: 'Failed to trigger cleanup job' });
  }
});

/**
 * GET /api/access/admin/stats
 * Get current token statistics
 * Admin only
 */
router.get('/admin/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.orgId || req.user!.id;

    // Verify admin access
    const adminCheck = await pool.query(`
      SELECT role FROM UserRoles
      WHERE user_id = $1 AND organization_id = $2 AND role IN ('admin', 'owner')
    `, [userId, organizationId]);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Permission denied: Admin access required' });
    }

    // Get stats
    const stats = await getTokenStats();

    res.json({
      timestamp: new Date().toISOString(),
      stats
    });
  } catch (error) {
    console.error('Error fetching token stats:', error);
    res.status(500).json({ error: 'Failed to fetch token statistics' });
  }
});

export default router;
