import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import {
  ORG_TYPES,
  isValidOrgType
} from '../database/types';

const router = Router();


// JWT secret (should always come from env)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET not set in environment. Using development secret.');
}

interface SuperAdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
}

// Middleware to verify superadmin token
const verifySuperAdminToken = (req: SuperAdminRequest, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[AUTH] Missing or invalid authorization header:', authHeader ? 'Missing Bearer prefix' : 'No auth header');
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('[AUTH] Token verified for user:', decoded.email, 'with role:', decoded.role);
    if (decoded.role !== 'platform_admin') {
      console.warn('[AUTH] Invalid role:', decoded.role, '(expected platform_admin)');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error instanceof Error ? error.message : error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// POST /api/admin/auth/login - Platform admin login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const adminResult = await pool.query(
      `SELECT id, email, password_hash, role
       FROM Users
       WHERE email = $1 AND role = 'platform_admin'::user_role AND deleted_at IS NULL`,
      [email]
    );

    if (adminResult.rows.length === 0) {
      console.warn(`[SECURITY] Failed platform admin login attempt for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = adminResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      console.warn(`[SECURITY] Failed platform admin login attempt for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: 'platform_admin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: 'platform_admin',
        name: 'Platform Administrator'
      }
    });
  } catch (error) {
    console.error('Platform admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/analytics/overview - Platform-wide analytics
router.get('/analytics/overview', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM Organizations) as total_organizations,
        (SELECT COUNT(*) FROM Organizations) as total_workspaces,
        (SELECT COUNT(*) FROM Users) as total_users,
        (SELECT COUNT(*) FROM Subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM Subscriptions WHERE status = 'trial') as trial_subscriptions,
        (SELECT COUNT(*) FROM Projects) as total_projects,
        (SELECT COUNT(*) FROM Analyses) as total_analyses,
        (SELECT COALESCE(SUM(active_users), 0)::bigint FROM UsageMetrics) as total_active_users_all_time,
        (SELECT COUNT(DISTINCT workspace_id) FROM LastLogin WHERE last_login_at > NOW() - INTERVAL '30 days') as active_organizations_30d,
        (SELECT COUNT(DISTINCT workspace_id) FROM LastLogin WHERE last_login_at > NOW() - INTERVAL '30 days') as active_workspaces_30d
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/workspaces - List all organizations with subscription data
router.get('/workspaces', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = Number.parseInt(req.query.limit as string, 10) || 50;
    const offset = Number.parseInt(req.query.offset as string, 10) || 0;
    const searchTerm = req.query.search as string;

    let query = `
      SELECT
        w.id,
        w.name,
        w.type,
        w.id as organization_id,
        w.name as organization_name,
        w.type as organization_type,
        w.created_at,
        w.gst_number,
        w.gst_percentage,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT pr.id) as project_count,
        COUNT(DISTINCT a.id) as analysis_count,
        s.plan_id,
        pl.name as plan_name,
        pl.tier as plan_tier,
        s.status as subscription_status,
        ll.last_login_at,
        um.active_users,
        um.api_calls
      FROM Organizations w
      LEFT JOIN Users u ON w.id = u.workspace_id AND u.deleted_at IS NULL
      LEFT JOIN Projects pr ON w.id = pr.workspace_id AND pr.deleted_at IS NULL
      LEFT JOIN Analyses a ON w.id = a.workspace_id AND a.deleted_at IS NULL
      LEFT JOIN Subscriptions s ON w.id = s.workspace_id AND s.deleted_at IS NULL
      LEFT JOIN Plans pl ON s.plan_id = pl.id
      LEFT JOIN LastLogin ll ON w.id = ll.workspace_id
      LEFT JOIN UsageMetrics um ON w.id = um.workspace_id AND um.metric_date = CURRENT_DATE
      WHERE w.deleted_at IS NULL
    `;

    if (searchTerm) {
      query += ` AND (w.name ILIKE $1 OR w.id ILIKE $1)`;
    }

    query += ` GROUP BY w.id, w.gst_number, w.gst_percentage, s.plan_id, pl.name, pl.tier, s.status, ll.last_login_at, um.active_users, um.api_calls`;
    query += ` ORDER BY w.created_at DESC LIMIT $${searchTerm ? 2 : 1} OFFSET $${searchTerm ? 3 : 2}`;

    const params = searchTerm ? [`%${searchTerm}%`, limit, offset] : [limit, offset];
    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM Organizations WHERE deleted_at IS NULL`;
    if (searchTerm) {
      countQuery += ` AND (name ILIKE $1 OR id ILIKE $1)`;
    }
    const countResult = await pool.query(countQuery, searchTerm ? [`%${searchTerm}%`] : []);

    res.json({
      organizations: result.rows,
      workspaces: result.rows,
      total: Number.parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    });
  } catch (error) {
    console.error('Organizations list error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// GET /api/admin/users - List all users with login tracking
router.get('/users', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = Number.parseInt(req.query.limit as string, 10) || 50;
    const offset = Number.parseInt(req.query.offset as string, 10) || 0;
    const searchTerm = req.query.search as string;
    const workspaceId = req.query.workspace_id as string;

    let query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.workspace_id,
        u.workspace_id as organization_id,
        w.name as workspace_name,
        w.name as organization_name,
        u.created_at as user_created_at,
        ll.last_login_at,
        ll.last_login_ip,
        ll.last_user_agent,
        (CURRENT_DATE - ll.last_login_at::date) as days_since_login
      FROM Users u
      LEFT JOIN Organizations w ON u.workspace_id = w.id
      LEFT JOIN LastLogin ll ON u.id = ll.user_id
      WHERE u.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (searchTerm) {
      paramCount++;
      query += ` AND (u.email ILIKE $${paramCount} OR u.name ILIKE $${paramCount})`;
      params.push(`%${searchTerm}%`);
    }

    if (workspaceId) {
      paramCount++;
      query += ` AND u.workspace_id = $${paramCount}`;
      params.push(workspaceId);
    }

    query += ` ORDER BY ll.last_login_at DESC NULLS LAST LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM users WHERE 1=1`;
    const countParams: any[] = [];
    if (searchTerm) {
      countQuery += ` AND (email ILIKE $1 OR name ILIKE $1)`;
      countParams.push(`%${searchTerm}%`);
    }
    if (workspaceId) {
      countQuery += ` AND workspace_id = $${countParams.length + 1}`;
      countParams.push(workspaceId);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      users: result.rows,
      total: Number.parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/subscriptions - List all subscriptions by plan
router.get('/subscriptions', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const status = req.query.status as string;

    let query = `
      SELECT
        s.id,
        s.workspace_id,
        s.workspace_id as organization_id,
        w.name as workspace_name,
        w.name as organization_name,
        p.id as plan_id,
        p.name as plan_name,
        p.tier as plan_tier,
        p.max_users,
        p.max_projects,
        p.max_storage_gb,
        s.status,
        s.current_billing_cycle_start as billing_cycle_start,
        s.current_billing_cycle_end as billing_cycle_end,
        s.created_at,
        COUNT(DISTINCT u.id) as current_users,
        COUNT(DISTINCT pr.id) as current_projects
      FROM subscriptions s
      LEFT JOIN Organizations w ON s.workspace_id = w.id
      LEFT JOIN plans p ON s.plan_id = p.id
      LEFT JOIN users u ON w.id = u.workspace_id
      LEFT JOIN projects pr ON w.id = pr.workspace_id
      WHERE 1=1
    `;

    if (status) {
      query += ` AND s.status = '${status}'`;
    }

    query += ` GROUP BY s.id, w.name, p.id, p.name, p.tier`;
    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query);

    res.json({
      subscriptions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Subscriptions list error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /api/admin/plans - List all available plans
router.get('/plans', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        COUNT(DISTINCT pf.feature_id) as feature_count,
        COUNT(DISTINCT s.id) as subscription_count
      FROM plans p
      LEFT JOIN planfeatures pf ON p.id = pf.plan_id
      LEFT JOIN subscriptions s ON p.id = s.plan_id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.tier, p.price_monthly
    `);

    res.json({
      plans: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Plans list error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /api/admin/subscriptions/:workspaceId/upgrade - Change organization plan
router.post('/subscriptions/:workspaceId/upgrade', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const planCheck = await pool.query(
      `SELECT id, is_active FROM Plans WHERE id = $1`,
      [planId]
    );

    if (planCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid planId' });
    }

    if (planCheck.rows[0].is_active === false) {
      return res.status(400).json({ error: 'Selected plan is inactive' });
    }

    // Get current subscription
    const subResult = await pool.query(
      `SELECT * FROM subscriptions WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (subResult.rows.length === 0) {
      const createResult = await pool.query(
        `INSERT INTO subscriptions (workspace_id, organization_id, plan_id, status)
         VALUES ($1, $1, $2, 'active'::subscription_status)
         RETURNING *`,
        [workspaceId, planId]
      );

      return res.json({
        message: 'Organization plan activated successfully',
        subscription: createResult.rows[0],
        organization_id: workspaceId,
        workspace_id: workspaceId
      });
    }

    const subscription = subResult.rows[0];

    // Update subscription
    const updateResult = await pool.query(
      `UPDATE subscriptions SET plan_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [planId, subscription.id]
    );

    // Log the change in AuditLog
    await pool.query(
      `INSERT INTO auditlog (action, resource_type, resource_id, details, workspace_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      ['ADMIN_UPGRADE_PLAN', 'subscription', subscription.id, 
       JSON.stringify({ from_plan: subscription.plan_id, to_plan: planId }), 
       workspaceId]
    );

    res.json({
      message: 'Organization plan upgraded successfully',
      subscription: updateResult.rows[0],
      organization_id: workspaceId,
      workspace_id: workspaceId
    });
  } catch (error) {
    console.error('Plan upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

// GET /api/admin/features - List all features with availability
router.get('/features', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.name,
        f.description,
        f.status as feature_status,
        f.is_beta,
        f.created_at,
        COUNT(DISTINCT pf.plan_id) as available_in_plans
      FROM features f
      LEFT JOIN planfeatures pf ON f.id = pf.feature_id
      WHERE 1=1
      GROUP BY f.id, f.name, f.description, f.status, f.is_beta, f.created_at
      ORDER BY f.created_at DESC
    `);

    res.json({
      features: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Features list error:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// GET /api/admin/analytics/organizations/:organizationId - Detailed analytics for specific organization
router.get('/analytics/organizations/:organizationId', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Get basic organization info
    const wsResult = await pool.query(
      `SELECT * FROM Organizations WHERE id = $1`,
      [organizationId]
    );

    if (wsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = wsResult.rows[0];

    // Get metrics for last 30 days
    const metricsResult = await pool.query(`
      SELECT
        date as metric_date,
        active_users,
        total_projects as projects_created,
        total_samples as samples_created,
        total_analyses as analyses_run,
        api_calls,
        storage_used_mb / 1024.0 as storage_used_gb
      FROM usagemetrics
      WHERE workspace_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
    `, [organizationId]);

    // Get subscription info
    const subResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.tier, p.max_users, p.max_projects
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.workspace_id = $1
    `, [organizationId]);

    // Get last login activity
    const activityResult = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        ll.last_login_at,
        ll.ip_address as last_login_ip
      FROM users u
      LEFT JOIN lastlogin ll ON u.id = ll.user_id
      WHERE u.workspace_id = $1
      ORDER BY ll.last_login_at DESC NULLS LAST
      LIMIT 10
    `, [organizationId]);

    res.json({
      organization,
      metrics: metricsResult.rows,
      subscription: subResult.rows[0] || null,
      recent_activity: activityResult.rows
    });
  } catch (error) {
    console.error('Organization analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch organization analytics' });
  }
});

// GET /api/admin/organizations - List all organizations with company details
router.get('/organizations', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = Number.parseInt(req.query.limit as string, 10) || 50;
    const offset = Number.parseInt(req.query.offset as string, 10) || 0;
    const searchTerm = req.query.search as string;

    let query = `
      SELECT
        o.id,
        o.name,
        o.id as organization_id,
        o.name as organization_name,
        o.type,
        o.type as organization_type,
        o.gst_number,
        o.gst_percentage,
        o.industry,
        o.country,
        o.company_size,
        o.website,
        o.primary_contact_name,
        o.primary_contact_email,
        o.primary_contact_phone,
        s.plan_id,
        p.name as plan_name,
        s.status as subscription_status,
        admin_user.id as admin_user_id,
        admin_user.email as admin_user_email,
        admin_user.name as admin_user_name,
        o.created_at
      FROM Organizations o
      LEFT JOIN Subscriptions s ON o.id = s.workspace_id AND s.deleted_at IS NULL
      LEFT JOIN Plans p ON s.plan_id = p.id
      LEFT JOIN LATERAL (
        SELECT u.id, u.email, u.name
        FROM Users u
        WHERE u.workspace_id = o.id
          AND u.role = 'admin'::user_role
          AND u.deleted_at IS NULL
        ORDER BY u.created_at ASC
        LIMIT 1
      ) admin_user ON true
      WHERE o.deleted_at IS NULL
    `;

    const params: any[] = [];
    if (searchTerm) {
      query += ` AND (o.name ILIKE $${params.length + 1} OR o.gst_number ILIKE $${params.length + 1})`;
      params.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY o.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT o.id) as count FROM Organizations o WHERE o.deleted_at IS NULL`;
    const countParams: any[] = [];
    if (searchTerm) {
      countQuery += ` AND (o.name ILIKE $${countParams.length + 1} OR o.gst_number ILIKE $${countParams.length + 1})`;
      countParams.push(`%${searchTerm}%`);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      organizations: result.rows,
      total: Number.parseInt(countResult.rows[0].count, 10),
      limit,
      offset
    });
  } catch (error) {
    console.error('Organizations list error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// POST /api/admin/organizations/:organizationId/update-gst - Update GST details
router.post('/organizations/:organizationId/update-gst', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const { gst_number, gst_percentage } = req.body;

    if (!gst_number || !gst_percentage) {
      return res.status(400).json({ error: 'gst_number and gst_percentage are required' });
    }

    const result = await pool.query(
      `UPDATE Organizations 
       SET gst_number = $1, gst_percentage = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [gst_number, gst_percentage, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      message: 'GST details updated successfully',
      organization: result.rows[0]
    });
  } catch (error) {
    console.error('GST update error:', error);
    res.status(500).json({ error: 'Failed to update GST details' });
  }
});

// GET /api/admin/organizations/:organizationId - Get detailed organization info
router.get('/organizations/:organizationId', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    const orgResult = await pool.query(
      `SELECT * FROM Organizations WHERE id = $1 AND deleted_at IS NULL`,
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = orgResult.rows[0];

    // Get subscription details
    const subResult = await pool.query(
      `SELECT s.*, p.name as plan_name, p.tier, p.max_users, p.price_monthly
       FROM Subscriptions s
       LEFT JOIN Plans p ON s.plan_id = p.id
       WHERE s.workspace_id = $1 AND s.deleted_at IS NULL`,
      [organization.id]
    );

    res.json({
      organization,
      subscription: subResult.rows[0] || null
    });
  } catch (error) {
    console.error('Organization details error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// GET /api/admin/company-plans - Get plan-to-company mappings
router.get('/company-plans', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.tier,
        p.description,
        p.max_users,
        p.max_projects,
        p.max_storage_gb,
        p.price_monthly,
        p.features,
        p.is_active,
        COUNT(DISTINCT s.workspace_id) as companies_on_plan,
        COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.workspace_id END) as active_companies,
        SUM(CASE WHEN s.status = 'active' THEN p.price_monthly ELSE 0 END) as monthly_revenue
      FROM Plans p
      LEFT JOIN Subscriptions s ON p.id = s.plan_id AND s.deleted_at IS NULL
      GROUP BY p.id, p.name, p.tier, p.description, p.max_users, p.max_projects, p.max_storage_gb, p.price_monthly, p.features, p.is_active
      ORDER BY p.tier, p.name
    `);

    res.json({
      plans: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Company plans error:', error);
    res.status(500).json({ error: 'Failed to fetch company plan mappings' });
  }
});

// POST /api/admin/organizations - Create new organization with admin user
router.post('/organizations', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const {
      name,
      type,
      email,
      password,
      admin_email,
      admin_password,
      admin_name,
      plan_id,
      gst_number,
      gst_percentage,
      country,
      industry,
      company_size,
      website,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone
    } = req.body;

    // Validate required fields
    const effectiveAdminEmail = admin_email || email;
    const effectiveAdminPassword = admin_password || password;
    const effectiveAdminName = admin_name || primary_contact_name || name + ' Admin';

    if (!name || !type || !effectiveAdminEmail || !effectiveAdminPassword) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, admin_email, admin_password'
      });
    }

    // Validate organization type
    if (!isValidOrgType(type)) {
      return res.status(400).json({
        error: `Invalid organization type. Must be one of: ${ORG_TYPES.join(', ')}`
      });
    }

    console.log('Creating organization with admin user:', { name, type, email: effectiveAdminEmail });

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate slug from name
      const slug = name.toLowerCase().replaceAll(/[^a-z0-9]/g, '-').replaceAll(/-+/g, '-').replaceAll(/^-|-$/g, '');

      const orgResult = await client.query(`
        INSERT INTO Organizations (
          name, slug, type, gst_number, gst_percentage, country,
          industry, company_size, website, primary_contact_name,
          primary_contact_email, primary_contact_phone, is_platform_workspace
        )
        VALUES ($1, $2, $3::org_type, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
        RETURNING id
      `, [
        name, slug, type, gst_number, gst_percentage ?? 18, country,
        industry, company_size, website, primary_contact_name,
        primary_contact_email, primary_contact_phone
      ]);

      const organizationId = orgResult.rows[0].id;
      const workspaceId = organizationId;

      if (plan_id) {
        const planResult = await client.query(
          `SELECT id, is_active FROM Plans WHERE id = $1`,
          [plan_id]
        );

        if (planResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid plan_id' });
        }

        if (planResult.rows[0].is_active === false) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Selected plan is inactive' });
        }
      }

      // Hash password and create admin user
      const passwordHash = await bcrypt.hash(effectiveAdminPassword, 10);

      const userResult = await client.query(`
        INSERT INTO Users (workspace_id, email, name, role, password_hash)
        VALUES ($1, $2, $3, 'admin'::user_role, $4)
        RETURNING id
      `, [workspaceId, effectiveAdminEmail, effectiveAdminName, passwordHash]);

      const userId = userResult.rows[0].id;

      if (plan_id) {
        await client.query(`
          INSERT INTO Subscriptions (workspace_id, organization_id, plan_id, status)
          VALUES ($1, $1, $2, 'active'::subscription_status)
          ON CONFLICT (workspace_id) DO UPDATE
          SET plan_id = $2, status = 'active'::subscription_status, updated_at = CURRENT_TIMESTAMP
        `, [workspaceId, plan_id]);
      }

      await client.query('COMMIT');

      console.log('✅ Organization and admin user created successfully:', {
        organizationId,
        userId,
        workspaceId
      });

      res.status(201).json({
        message: 'Organization and admin user created successfully',
        organization: {
          id: organizationId,
          organization_id: organizationId,
          name,
          organization_name: name,
          type,
          email: effectiveAdminEmail,
          workspace_id: workspaceId
        },
        admin_user: {
          id: userId,
          email: effectiveAdminEmail,
          name: effectiveAdminName
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// PUT /api/admin/organizations/:organizationId - Update organization details
router.put('/organizations/:organizationId', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { organizationId } = req.params;
    const {
      name,
      type,
      industry,
      company_size,
      website,
      gst_number,
      gst_percentage,
      country,
      primary_contact_name,
      primary_contact_email,
      primary_contact_phone,
      create_admin,
      admin_email,
      admin_password,
      admin_name
    } = req.body;

    // Validate required fields
    if (!name || !type || !country || !primary_contact_name || !primary_contact_email) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, country, primary_contact_name, primary_contact_email'
      });
    }

    // Validate organization type
    if (!isValidOrgType(type)) {
      return res.status(400).json({
        error: `Invalid organization type. Must be one of: ${ORG_TYPES.join(', ')}`
      });
    }

    console.log('Updating organization:', organizationId, { name, type, create_admin });

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate slug from name
      const slug = name.toLowerCase().replaceAll(/[^a-z0-9]/g, '-').replaceAll(/-+/g, '-').replaceAll(/^-|-$/g, '');

      // Update organization
      const orgResult = await client.query(`
        UPDATE Organizations
        SET name = $1, slug = $2, type = $3::org_type, industry = $4, company_size = $5, website = $6,
            gst_number = $7, gst_percentage = $8, country = $9, primary_contact_name = $10,
            primary_contact_email = $11, primary_contact_phone = $12, updated_at = CURRENT_TIMESTAMP
        WHERE id = $13 AND deleted_at IS NULL
        RETURNING id, name, type
      `, [
        name, slug, type, industry || null, company_size || null, website || null,
        gst_number || null, gst_percentage ?? 18, country, primary_contact_name,
        primary_contact_email, primary_contact_phone || null, organizationId
      ]);

      if (orgResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Organization not found' });
      }

      const workspaceId = orgResult.rows[0].id;
      let adminUser = null;

      // Create admin user if requested
      if (create_admin && admin_email && admin_password) {
        console.log('Creating admin user for organization:', organizationId);

        // Check if admin user already exists for this organization
        const existingUser = await client.query(`
          SELECT id FROM Users WHERE workspace_id = $1 AND role = 'admin'::user_role
        `, [workspaceId]);

        if (existingUser.rows.length > 0) {
          console.log('Admin user already exists for this organization');
        } else {
          // Hash password and create admin user
          const passwordHash = await bcrypt.hash(admin_password, 10);

          const userResult = await client.query(`
            INSERT INTO Users (workspace_id, email, name, role, password_hash)
            VALUES ($1, $2, $3, 'admin'::user_role, $4)
            RETURNING id, email, name
          `, [workspaceId, admin_email, admin_name || name.concat(' Admin'), passwordHash]);

          adminUser = userResult.rows[0];
          console.log('✅ Admin user created:', adminUser);
        }
      }

      await client.query('COMMIT');

      console.log('✅ Organization updated successfully:', organizationId);

      res.json({
        message: 'Organization updated successfully',
        organization: {
          id: organizationId,
          name,
          type,
          industry,
          company_size,
          website,
          gst_number,
          gst_percentage,
          country,
          primary_contact_name,
          primary_contact_email,
          primary_contact_phone
        },
        admin_user: adminUser
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// PUT /api/admin/plans/:planId - Update plan details
router.put('/plans/:planId', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const { name, tier, description, price_monthly, max_users, max_projects, max_storage_gb, features, is_active } = req.body;

    // Validate required fields
    if (!name || !tier) {
      return res.status(400).json({
        error: 'Plan name and tier are required'
      });
    }

    // Validate tier
    const validTiers = ['basic', 'pro', 'enterprise', 'custom'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
      });
    }

    console.log('Updating plan:', planId, { name, tier, description, price_monthly, features, is_active });

    // Update plan
    const result = await pool.query(`
      UPDATE Plans
      SET name = $1, tier = $2::plan_tier, description = $3, price_monthly = $4, max_users = $5, max_projects = $6, max_storage_gb = $7, features = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING id, name, tier, description, price_monthly, max_users, max_projects, max_storage_gb, features, is_active
    `, [name, tier, description || null, price_monthly || 0, max_users || null, max_projects || null, max_storage_gb || null, features || {}, is_active !== undefined ? is_active : true, planId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    console.log('✅ Plan updated successfully:', result.rows[0]);

    res.json({
      message: 'Plan updated successfully',
      plan: result.rows[0]
    });

  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// POST /api/admin/organizations/:orgId/create-admin - Create admin user for existing organization
router.post('/organizations/:orgId/create-admin', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    console.log('Creating admin user for organization:', orgId, { email, name });

    // Check if organization exists
    const orgResult = await pool.query(
      'SELECT * FROM Organizations WHERE id = $1',
      [orgId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // Check if admin user already exists for this Organizations
    const existingUser = await pool.query(
      'SELECT * FROM Users WHERE workspace_id = $1 AND role = $2',
      [org.id, 'admin']
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Admin user already exists for this organization',
        admin_user: existingUser.rows[0].email
      });
    }

    // Check if email is already taken
    const emailCheck = await pool.query(
      'SELECT * FROM Users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Email already exists'
      });
    }

    // Hash password and create admin user
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO Users (workspace_id, email, name, role, password_hash)
       VALUES ($1, $2, $3, 'admin'::user_role, $4)
       RETURNING id, email, name, role`,
      [org.id, email, name || org.name.concat(' Admin'), passwordHash]
    );

    console.log('✅ Admin user created for organization:', org.name);

    res.status(201).json({
      message: 'Admin user created successfully',
      organization: {
        id: org.id,
        name: org.name
      },
      admin_user: {
        id: userResult.rows[0].id,
        email: userResult.rows[0].email,
        name: userResult.rows[0].name,
        role: userResult.rows[0].role
      }
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

export default router;
