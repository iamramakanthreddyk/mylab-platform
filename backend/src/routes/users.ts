import { Router, Request, Response } from 'express';
import { pool } from '../db';
import crypto from 'crypto';
import { authenticate, validate, asyncHandler } from '../middleware';
import { USER_INVITATION_SCHEMA } from '../database/schemas-extended';
import { logToAuditLog } from '../utils/auditUtils';
import { getWorkspacePlanLimits, isPositiveLimit } from '../utils/planLimits';

const router = Router();

// ============================================================================
// USER INVITATION ENDPOINTS
// ============================================================================

/**
 * POST /api/users/invite
 * Invite a new user to the workspace
 * Requires: Admin or Manager role
 */
router.post('/invite', 
  authenticate,
  validate(USER_INVITATION_SCHEMA.CreateRequest),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, role, expiresInDays = 7 } = req.body;
    const workspaceId = req.user!.workspaceId;
    const invitedBy = req.user!.id;

    // Check if user has permission to invite
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can invite users' });
    }

    const plan = await getWorkspacePlanLimits(pool, workspaceId);
    if (!plan) {
      return res.status(403).json({
        error: 'No active or trial subscription found',
        hint: 'Assign a plan to this workspace before inviting users'
      });
    }

    if (!isPositiveLimit(plan.maxUsers)) {
      return res.status(400).json({
        error: 'Plan max_users is not configured',
        plan: plan.planName
      });
    }

    const userCountResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM Users WHERE workspace_id = $1 AND deleted_at IS NULL',
      [workspaceId]
    );
    const inviteCountResult = await pool.query(
      `SELECT COUNT(*)::int as count
       FROM UserInvitations
       WHERE workspace_id = $1 AND status = 'pending' AND expires_at > NOW()`,
      [workspaceId]
    );

    const activeUsers = userCountResult.rows[0].count || 0;
    const pendingInvites = inviteCountResult.rows[0].count || 0;

    if (activeUsers + pendingInvites >= plan.maxUsers) {
      return res.status(403).json({
        error: 'User limit reached for current plan',
        plan: plan.planName,
        maxUsers: plan.maxUsers,
        activeUsers,
        pendingInvites
      });
    }

    // Check if user already exists in workspace
    const existingUser = await pool.query(
      'SELECT id FROM Users WHERE email = $1 AND workspace_id = $2 AND deleted_at IS NULL',
      [email, workspaceId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists in this workspace' });
    }

    // Check if pending invitation exists
    const existingInvite = await pool.query(
      `SELECT id FROM UserInvitations 
       WHERE email = $1 AND workspace_id = $2 AND status = 'pending' AND expires_at > NOW()`,
      [email, workspaceId]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(409).json({ error: 'Pending invitation already exists for this email' });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation
    const result = await pool.query(
      `INSERT INTO UserInvitations (workspace_id, email, role, invited_by, token, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [workspaceId, email, role, invitedBy, token, expiresAt]
    );

    const invitation = result.rows[0];

    // Audit log
    await logToAuditLog(pool, {
      objectType: 'invitation',
      objectId: invitation.id,
      action: 'user_invited',
      actorId: invitedBy,
      actorWorkspace: workspaceId,
      details: { email, role },
    });

    // TODO: Send email invitation
    // await sendInvitationEmail(email, token, workspaceId);

    res.status(201).json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        invitationLink: `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`,
      },
    });
  })
);

/**
 * GET /api/users/invitations
 * Get all pending invitations for the workspace
 * Requires: Admin or Manager role
 */
router.get('/invitations',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user!.workspaceId;

    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can view invitations' });
    }

    const result = await pool.query(
      `SELECT i.*, u.name as invited_by_name, u.email as invited_by_email
       FROM UserInvitations i
       JOIN Users u ON i.invited_by = u.id
       WHERE i.workspace_id = $1 AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
      [workspaceId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * POST /api/users/accept-invitation
 * Accept an invitation and create user account
 * No auth required - public endpoint
 */
router.post('/accept-invitation',
  validate(USER_INVITATION_SCHEMA.CreateRequest),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Token, name, and password are required' });
    }

    // Find valid invitation
    const inviteResult = await pool.query(
      `SELECT * FROM UserInvitations 
       WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = inviteResult.rows[0];

    const plan = await getWorkspacePlanLimits(pool, invitation.workspace_id);
    if (!plan) {
      return res.status(403).json({
        error: 'No active or trial subscription found',
        hint: 'Assign a plan to this workspace before accepting invitations'
      });
    }

    if (!isPositiveLimit(plan.maxUsers)) {
      return res.status(400).json({
        error: 'Plan max_users is not configured',
        plan: plan.planName
      });
    }

    const userCountResult = await pool.query(
      'SELECT COUNT(*)::int as count FROM Users WHERE workspace_id = $1 AND deleted_at IS NULL',
      [invitation.workspace_id]
    );

    const activeUsers = userCountResult.rows[0].count || 0;
    if (activeUsers >= plan.maxUsers) {
      return res.status(403).json({
        error: 'User limit reached for current plan',
        plan: plan.planName,
        maxUsers: plan.maxUsers,
        activeUsers
      });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user
      const userResult = await client.query(
        `INSERT INTO Users (workspace_id, email, name, role, password_hash, require_password_change)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, role, workspace_id`,
        [invitation.workspace_id, invitation.email, name, invitation.role, passwordHash, false]
      );

      const user = userResult.rows[0];

      // Mark invitation as accepted
      await client.query(
        `UPDATE UserInvitations 
         SET status = 'accepted', accepted_at = NOW()
         WHERE id = $1`,
        [invitation.id]
      );

      // Create default notification settings
      await client.query(
        `INSERT INTO NotificationSettings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            workspaceId: user.workspace_id,
          },
          message: 'Account created successfully. You can now log in.',
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /api/users/invitations/:id
 * Cancel a pending invitation
 * Requires: Admin or Manager role
 */
router.delete('/invitations/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can cancel invitations' });
    }

    const result = await pool.query(
      `UPDATE UserInvitations 
       SET status = 'cancelled'
       WHERE id = $1 AND workspace_id = $2
       RETURNING *`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  })
);

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/users
 * Get all users in the workspace
 * Requires: Authentication
 */
router.get('/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.user!.workspaceId;
    const { role, search } = req.query;

    let query = `
      SELECT id, email, name, role, created_at, updated_at
      FROM Users
      WHERE workspace_id = $1 AND deleted_at IS NULL
    `;
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (search && typeof search === 'string') {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * GET /api/users/:id
 * Get user details
 * Requires: Authentication
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(
      `SELECT id, email, name, role, created_at, updated_at
       FROM Users
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * PATCH /api/users/:id
 * Update user details
 * Requires: Admin role or own user
 */
router.patch('/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, role } = req.body;
    const workspaceId = req.user!.workspaceId;

    // Check permissions
    if (req.user!.id !== id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own profile or must be an admin' });
    }

    // Only admins can change roles
    if (role && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change user roles' });
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (role && req.user!.role === 'admin') {
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push(role);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id, workspaceId);

    const result = await pool.query(
      `UPDATE Users 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING id, email, name, role, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * DELETE /api/users/:id
 * Soft delete a user (deactivate)
 * Requires: Admin role
 */
router.delete('/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can deactivate users' });
    }

    // Cannot delete yourself
    if (req.user!.id === id) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const result = await pool.query(
      `UPDATE Users 
       SET deleted_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
       RETURNING id, email, name`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  })
);

export default router;
