import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

/**
 * POST /api/auth/organization-admin
 * Create organization with admin user in one operation
 * No auth required - this is for initial setup
 */
router.post('/organization-admin', async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    const {
      organizationName,
      organizationType = 'client',
      adminEmail,
      adminName,
      adminPassword
    } = req.body;

    // Validate required fields
    if (!organizationName || !adminEmail || !adminName || !adminPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['organizationName', 'adminEmail', 'adminName', 'adminPassword']
      });
    }

    // Validate organization type
    const validTypes = ['client', 'cro', 'analyzer', 'vendor', 'pharma'];
    if (!validTypes.includes(organizationType)) {
      return res.status(400).json({
        error: `Invalid organization type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if email already exists
    const emailCheck = await client.query(
      'SELECT id FROM Users WHERE email = $1 AND deleted_at IS NULL',
      [adminEmail]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const slug = organizationName.toLowerCase().replace(/\s+/g, '-');
    const orgResult = await client.query(
      `INSERT INTO Organizations (name, slug, type, is_platform_workspace)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [organizationName, slug, organizationType]
    );

    const organizationId = orgResult.rows[0].id;
    const workspaceId = organizationId;

    // Assign a default plan to the organization
    const planResult = await client.query(
      `SELECT id FROM Plans WHERE tier = 'starter' AND is_active = true LIMIT 1`
    );
    
    if (planResult.rows.length > 0) {
      const planId = planResult.rows[0].id;
      await client.query(
        `UPDATE Organizations SET plan_id = $1 WHERE id = $2`,
        [planId, organizationId]
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const userResult = await client.query(
      `INSERT INTO Users (id, workspace_id, email, name, role, password_hash, require_password_change)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role`,
      [workspaceId, adminEmail, adminName, 'admin', passwordHash, false]
    );

    const user = userResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: workspaceId,
        organizationId: organizationId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.status(201).json({
      success: true,
      organization: {
        id: organizationId,
        organizationId: organizationId,
        name: organizationName,
        type: organizationType,
        workspace_id: workspaceId,
        workspaceId: workspaceId
      },
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: organizationId,
        workspaceId: workspaceId
      },
      token: token,
      message: 'Organization and admin user created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization and admin user' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/login
 * Login with email OR userId + password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, userId, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    if (!email && !userId) {
      return res.status(400).json({
        error: 'Either email or userId must be provided'
      });
    }

    // Query user by email OR userId
    let query = `
      SELECT u.id, u.email, u.name, u.role, u.workspace_id, u.password_hash, u.require_password_change,
        o.id as organization_id, o.name as organization_name, o.plan_id,
        p.name as plan_name, p.max_projects, p.tier as plan_tier
      FROM Users u
      LEFT JOIN Organizations o ON u.workspace_id = o.id
      LEFT JOIN Plans p ON o.plan_id = p.id
      WHERE u.deleted_at IS NULL AND (
    `;

    const params: any[] = [];

    if (email) {
      query += `u.email = $${params.length + 1}`;
      params.push(email);
    }

    if (userId) {
      if (email) query += ' OR ';
      query += `u.id = $${params.length + 1}`;
      params.push(userId);
    }

    query += ')';

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ error: 'User account not properly configured' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspace_id,
        organizationId: user.organization_id || user.workspace_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspace_id,
        organizationId: user.organization_id || user.workspace_id,
        organization_id: user.organization_id || user.workspace_id,
        organizationName: user.organization_name,
        plan: {
          id: user.plan_id,
          name: user.plan_name,
          tier: user.plan_tier,
          maxProjects: user.max_projects
        }
      },
      requirePasswordChange: user.require_password_change,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password (requires JWT token)
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Both currentPassword and newPassword are required'
      });
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, password_hash FROM Users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE Users 
       SET password_hash = $1, require_password_change = false, updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, decoded.userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
        workspaceId: decoded.workspaceId,
        organizationId: decoded.organizationId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// ============================================================================
// PASSWORD RESET ENDPOINTS
// ============================================================================

/**
 * POST /api/auth/forgot-password
 * Request password reset token
 * No auth required - public endpoint
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM Users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    const userId = userResult.rows[0].id;

    // Invalidate any existing tokens for this user
    await pool.query(
      'UPDATE PasswordResetTokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [userId]
    );

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Store token
    await pool.query(
      `INSERT INTO PasswordResetTokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(email, token);

    console.log(`Password reset token for ${email}: ${token}`);
    console.log(`Reset link: ${process.env.FRONTEND_URL}/reset-password?token=${token}`);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 * No auth required - public endpoint
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT prt.*, u.id as user_id
       FROM PasswordResetTokens prt
       JOIN Users u ON prt.user_id = u.id
       WHERE prt.token = $1 
         AND prt.expires_at > NOW() 
         AND prt.used_at IS NULL
         AND u.deleted_at IS NULL`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user password
      await client.query(
        'UPDATE Users SET password_hash = $1, require_password_change = $2, updated_at = NOW() WHERE id = $3',
        [passwordHash, false, resetToken.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE PasswordResetTokens SET used_at = NOW() WHERE id = $1',
        [resetToken.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;