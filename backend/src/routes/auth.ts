import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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

    // Create workspace first
    const workspaceResult = await client.query(
      `INSERT INTO Workspace (name, slug, type)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [organizationName, organizationName.toLowerCase().replace(/\s+/g, '-'), 'research']
    );

    const workspaceId = workspaceResult.rows[0].id;

    // Create organization
    const orgResult = await client.query(
      `INSERT INTO Organizations (name, type, workspace_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [organizationName, organizationType, workspaceId]
    );

    const organizationId = orgResult.rows[0].id;

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
        name: organizationName,
        type: organizationType,
        workspace_id: workspaceId
      },
      admin: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
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
             o.id as organization_id, o.name as organization_name
      FROM Users u
      LEFT JOIN Organizations o ON u.workspace_id = o.workspace_id
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
        organizationId: user.organization_id
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
        organizationId: user.organization_id,
        organizationName: user.organization_name
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

export default router;