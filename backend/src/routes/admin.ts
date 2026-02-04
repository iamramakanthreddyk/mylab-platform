import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const router = Router();

// Superadmin credentials (in production, use database with hashed passwords)
const SUPERADMIN_CREDENTIALS = {
  email: 'superadmin@mylab.io',
  password: 'SuperAdmin123!', // TODO: Use hashed password in production
  role: 'PlatformAdmin' as const
};

// Hardcoded JWT secret for development (use env var in production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';

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
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'PlatformAdmin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// POST /api/admin/auth/login - Superadmin login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate credentials
    if (email !== SUPERADMIN_CREDENTIALS.email || password !== SUPERADMIN_CREDENTIALS.password) {
      // Log failed attempt
      console.warn(`[SECURITY] Failed superadmin login attempt for email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: 'superadmin-1',
        email: SUPERADMIN_CREDENTIALS.email,
        role: 'PlatformAdmin'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: 'superadmin-1',
        email: SUPERADMIN_CREDENTIALS.email,
        role: 'PlatformAdmin',
        name: 'Platform Administrator'
      }
    });
  } catch (error) {
    console.error('Superadmin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/analytics/overview - Platform-wide analytics
router.get('/analytics/overview', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM Workspace) as total_workspaces,
        (SELECT COUNT(*) FROM Users) as total_users,
        (SELECT COUNT(*) FROM Organizations) as total_organizations,
        (SELECT COUNT(*) FROM Subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COUNT(*) FROM Subscriptions WHERE status = 'trial') as trial_subscriptions,
        (SELECT COUNT(*) FROM Projects) as total_projects,
        (SELECT COUNT(*) FROM Analyses) as total_analyses,
        (SELECT COALESCE(SUM(active_users), 0)::bigint FROM UsageMetrics) as total_active_users_all_time,
        (SELECT COUNT(DISTINCT workspace_id) FROM LastLogin WHERE last_login_at > NOW() - INTERVAL '30 days') as active_workspaces_30d
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/workspaces - List all workspaces with subscription data
router.get('/workspaces', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const searchTerm = req.query.search as string;

    let query = `
      SELECT
        w.id,
        w.name,
        w.created_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT p.id) as project_count,
        COUNT(DISTINCT a.id) as analysis_count,
        s.plan_id,
        pl.name as plan_name,
        pl.tier as plan_tier,
        s.status as subscription_status,
        ll.last_login_at,
        ll.ip_address as last_login_ip,
        um.active_users,
        um.api_calls
      FROM workspace w
      LEFT JOIN users u ON w.id = u.workspace_id
      LEFT JOIN projects p ON w.id = p.workspace_id
      LEFT JOIN analyses a ON w.id = a.workspace_id
      LEFT JOIN subscriptions s ON w.id = s.workspace_id
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN lastlogin ll ON w.id = ll.workspace_id
      LEFT JOIN usagemetrics um ON w.id = um.workspace_id AND um.date = CURRENT_DATE
      WHERE 1=1
    `;

    if (searchTerm) {
      query += ` AND (w.name ILIKE $1 OR w.id ILIKE $1)`;
    }

    query += ` GROUP BY w.id, s.plan_id, pl.name, pl.tier, s.status, ll.last_login_at, ll.ip_address, um.active_users, um.api_calls`;
    query += ` ORDER BY w.created_at DESC LIMIT $${searchTerm ? 2 : 1} OFFSET $${searchTerm ? 3 : 2}`;

    const params = searchTerm ? [`%${searchTerm}%`, limit, offset] : [limit, offset];
    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM workspace WHERE 1=1`;
    if (searchTerm) {
      countQuery += ` AND (name ILIKE $1 OR id ILIKE $1)`;
    }
    const countResult = await pool.query(countQuery, searchTerm ? [`%${searchTerm}%`] : []);

    res.json({
      workspaces: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    console.error('Workspaces list error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// GET /api/admin/users - List all users with login tracking
router.get('/users', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const searchTerm = req.query.search as string;
    const workspaceId = req.query.workspace_id as string;
    const lastLoginDays = parseInt(req.query.last_login_days as string) || 30;

    let query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.workspace_id,
        w.name as workspace_name,
        u.created_at as user_created_at,
        ll.last_login_at,
        ll.ip_address as last_login_ip,
        ll.user_agent as last_user_agent,
        (CURRENT_DATE - ll.last_login_at::date) as days_since_login
      FROM users u
      LEFT JOIN workspace w ON u.workspace_id = w.id
      LEFT JOIN lastlogin ll ON u.id = ll.user_id
      WHERE 1=1
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
      total: parseInt(countResult.rows[0].count),
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
        w.name as workspace_name,
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
      LEFT JOIN workspace w ON s.workspace_id = w.id
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

// POST /api/admin/subscriptions/:workspaceId/upgrade - Change workspace plan
router.post('/subscriptions/:workspaceId/upgrade', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { planId } = req.body;

    // Get current subscription
    const subResult = await pool.query(
      `SELECT * FROM subscriptions WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
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
      message: 'Plan upgraded successfully',
      subscription: updateResult.rows[0]
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

// GET /api/admin/analytics/workspace/:workspaceId - Detailed analytics for specific workspace
router.get('/analytics/workspace/:workspaceId', verifySuperAdminToken, async (req: SuperAdminRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Get basic workspace info
    const wsResult = await pool.query(
      `SELECT * FROM workspace WHERE id = $1`,
      [workspaceId]
    );

    if (wsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = wsResult.rows[0];

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
    `, [workspaceId]);

    // Get subscription info
    const subResult = await pool.query(`
      SELECT s.*, p.name as plan_name, p.tier, p.max_users, p.max_projects
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.workspace_id = $1
    `, [workspaceId]);

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
    `, [workspaceId]);

    res.json({
      workspace,
      metrics: metricsResult.rows,
      subscription: subResult.rows[0],
      recent_activity: activityResult.rows
    });
  } catch (error) {
    console.error('Workspace analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace analytics' });
  }
});

export default router;
