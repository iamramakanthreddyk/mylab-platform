import { Router } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { logToAuditLog, logSampleMetadataChange } from '../utils/auditUtils';
import { logSecurityEvent } from '../utils/securityLogger';

const router = Router();

// GET /api/notifications - Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    // FIXED: Get user from authenticated middleware
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId; // FIXED: Enforce workspace from auth, not query param
    const type = req.query.type as string;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit as string) || 50;

    let query = `
      SELECT 
        id, type, title, message, action_url, action_label, priority, 
        read_at, expires_at, metadata, created_at
      FROM Notifications 
      WHERE user_id = $1 AND workspace_id = $2
    `;
    const params: any[] = [userId, workspaceId];
    let paramIndex = 3;

    // REMOVED: Optional workspaceId filter (now enforced above)

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (unreadOnly) {
      query += ` AND read_at IS NULL`;
    }

    // Exclude expired notifications
    query += ` AND (expires_at IS NULL OR expires_at > NOW())`;

    query += ` ORDER BY priority DESC, created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      actionUrl: row.action_url,
      actionLabel: row.action_label,
      priority: row.priority,
      read: !!row.read_at,
      timestamp: row.created_at,
      expiresAt: row.expires_at,
      metadata: row.metadata
    }));

    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id; // FIXED: Get from authenticated middleware
    const workspaceId = req.user!.workspaceId; // FIXED: Enforce workspace isolation

    const result = await pool.query(`
      UPDATE Notifications 
      SET read_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND workspace_id = $3 AND read_at IS NULL
      RETURNING id
    `, [id, userId, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or already read' });
    }

    // ADDED: Log action to audit trail
    await logToAuditLog(pool, {
      objectType: 'notification',
      objectId: id,
      action: 'read',
      actorId: userId,
      actorWorkspace: workspaceId,
      actorOrgId: req.user!.orgId || '',
      details: { notificationId: id },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({ success: true, message: 'Notification marked as read' });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id; // FIXED: Get from authenticated middleware
    const workspaceId = req.user!.workspaceId; // FIXED: Enforce workspace isolation

    const result = await pool.query(`
      DELETE FROM Notifications 
      WHERE id = $1 AND user_id = $2 AND workspace_id = $3
      RETURNING id, type
    `, [id, userId, workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // ADDED: Log deletion to security log
    await logSecurityEvent(pool, {
      eventType: 'notification_deleted',
      severity: 'low',
      userId: userId,
      workspaceId: workspaceId,
      resourceType: 'notification',
      resourceId: id,
      reason: 'User deleted notification',
      details: { notificationType: result.rows[0].type },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({ success: true, message: 'Notification deleted' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/ - Clear all notifications for user
router.delete('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id; // FIXED: Get from authenticated middleware
    const workspaceId = req.user!.workspaceId; // FIXED: Enforce workspace isolation

    const result = await pool.query(`
      DELETE FROM Notifications 
      WHERE user_id = $1 AND workspace_id = $2
      RETURNING id
    `, [userId, workspaceId]);

    // ADDED: Log bulk deletion to security log
    const deletedCount = result.rows.length;
    if (deletedCount > 0) {
      await logSecurityEvent(pool, {
        eventType: 'notifications_cleared',
        severity: 'low',
        userId: userId,
        workspaceId: workspaceId,
        resourceType: 'notification',
        resourceId: 'bulk',
        reason: `User cleared all ${deletedCount} notifications`,
        details: { count: deletedCount },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown'
      });
    }

    res.json({ success: true, message: `Cleared ${deletedCount} notifications` });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/bulk - Create bulk notifications
router.post('/bulk', authenticate, async (req, res) => {
  try {
    // FIXED: Authenticate user - only admins can send bulk notifications
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can send bulk notifications' });
    }

    const {
      title,
      message,
      type = 'info',
      priority = 'medium',
      targetGroups,
      sendEmail = false,
      expiresAt
    } = req.body;

    if (!title || !message || !targetGroups) {
      return res.status(400).json({ error: 'Title, message, and target groups are required' });
    }

    // Build query to get target users based on groups (FIXED: scope to workspace)
    let userQuery = `
      SELECT DISTINCT u.id, u.email, u.workspace_id, u.role, w.name as workspace_name
      FROM Users u
      JOIN Workspace w ON u.workspace_id = w.id
      WHERE u.deleted_at IS NULL AND u.workspace_id = $1
    `;

    const queryParams: any[] = [req.user!.workspaceId];
    const conditions: string[] = [];

    // All users
    if (targetGroups.allUsers) {
      // No additional conditions needed
    } else {
      // Workspace admins only
      if (targetGroups.workspaceAdmins) {
        conditions.push(`u.role = 'admin'`);
      }

      // Specific roles
      if (targetGroups.userRoles && targetGroups.userRoles.length > 0) {
        const placeholders = targetGroups.userRoles.map((_: any, i: number) =>
          `$${queryParams.length + i + 1}`
        ).join(',');
        conditions.push(`u.role IN (${placeholders})`);
        queryParams.push(...targetGroups.userRoles);
      }

      // If no conditions were added but allUsers is false, return error
      if (conditions.length === 0) {
        return res.status(400).json({ error: 'No valid target groups specified' });
      }

      userQuery += ` AND (${conditions.join(' OR ')})`;
    }

    const usersResult = await pool.query(userQuery, queryParams);

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No users found matching the specified criteria' });
    }

    // Create notifications for all target users (FIXED: remove object IDs from metadata)
    const notificationIds: string[] = [];
    const notificationPromises = usersResult.rows.map(async (user) => {
      const result = await pool.query(`
        INSERT INTO Notifications
        (user_id, workspace_id, type, title, message, priority, expires_at, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        user.id,
        user.workspace_id,
        type,
        title,
        message,
        priority,
        expiresAt || null,
        JSON.stringify({
          bulkNotification: true,
          // REMOVED: targetGroups, sendEmail (metadata leakage)
          // REMOVED: workspaceName, recipientRole (information disclosure)
        }),
        req.user!.id // FIXED: Add created_by field
      ]);
      return result.rows[0].id;
    });

    const createdIds = await Promise.all(notificationPromises);
    notificationIds.push(...createdIds);

    // ADDED: Log bulk notification creation to audit log
    await logToAuditLog(pool, {
      objectType: 'notification',
      objectId: 'bulk',
      action: 'create',
      actorId: req.user!.id,
      actorWorkspace: req.user!.workspaceId,
      actorOrgId: req.user!.orgId || '',
      details: {
        bulkNotificationTitle: title,
        recipientCount: usersResult.rows.length,
        type
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    // TODO: Send email notifications if requested
    if (sendEmail) {
      console.log(`📧 Bulk notification emails would be sent to ${usersResult.rows.length} users`);
    }

    console.log(`📢 Bulk notification "${title}" sent to ${usersResult.rows.length} users`);

    res.json({
      success: true,
      message: 'Bulk notification sent successfully',
      recipientCount: usersResult.rows.length,
      type,
      priority
    });

  } catch (error) {
    console.error('Error creating bulk notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/project - Create project-specific notification
router.post('/project', authenticate, async (req, res) => {
  try {
    // FIXED: Authenticate user
    const {
      projectId,
      notificationType,
      title,
      message,
      priority = 'medium',
      notifyStakeholders = true
    } = req.body;

    if (!projectId || !title || !message) {
      return res.status(400).json({ error: 'Project ID, title, and message are required' });
    }

    // FIXED: Scope query to workspace AND verify user has access to project
    const projectQuery = `
      SELECT
        p.id, p.name, p.workspace_id
      FROM Projects p
      WHERE p.id = $1 
        AND p.workspace_id = $2
        AND p.deleted_at IS NULL
    `;

    const projectResult = await pool.query(projectQuery, [projectId, req.user!.workspaceId]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const project = projectResult.rows[0];

    // Get all stakeholders for the project (FIXED: scope to workspace)
    let stakeholderQuery = `
      SELECT DISTINCT u.id, u.email, u.workspace_id, u.role
      FROM Users u
      WHERE u.deleted_at IS NULL AND u.workspace_id = $1 AND (
    `;

    const queryParams: any[] = [project.workspace_id];
    const conditions: string[] = [];

    if (notifyStakeholders) {
      // Always include workspace admins
      conditions.push(`u.role = 'admin'`);

      // Include all users (project is scoped to workspace)
      if (conditions.length === 0) {
        // This shouldn't happen, but fallback to all users in workspace
        queryParams.length = 0;
        stakeholderQuery = `
          SELECT DISTINCT u.id, u.email, u.workspace_id, u.role
          FROM Users u
          WHERE u.workspace_id = $1 AND u.deleted_at IS NULL
        `;
      }
    }

    // If we have conditions, use them; otherwise notify all admins
    if (conditions.length > 0) {
      stakeholderQuery += conditions.join(' OR ') + ')';
    } else {
      stakeholderQuery = `
        SELECT DISTINCT u.id, u.email, u.workspace_id, u.role
        FROM Users u
        WHERE u.workspace_id = $1 AND u.deleted_at IS NULL AND u.role = 'admin'
      `;
    }

    const stakeholdersResult = await pool.query(stakeholderQuery, queryParams);

    if (stakeholdersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No stakeholders found for this project' });
    }

    // Create notifications for all stakeholders (FIXED: add created_by, remove metadata leakage)
    const notificationPromises = stakeholdersResult.rows.map(user => {
      return pool.query(`
        INSERT INTO Notifications
        (user_id, workspace_id, type, title, message, action_url, action_label, priority, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        user.id,
        user.workspace_id,
        'info', // Project notifications are generally informational
        title,
        message,
        `/projects/${projectId}`,
        'View Project',
        priority,
        JSON.stringify({
          notificationType
          // REMOVED: projectId, projectName, workspaceName, clientName (information disclosure)
        }),
        req.user!.id // ADDED: Track who created the notification
      ]);
    });

    await Promise.all(notificationPromises);

    // ADDED: Log to audit trail
    await logToAuditLog(pool, {
      objectType: 'notification',
      objectId: 'project',
      action: 'create',
      actorId: req.user!.id,
      actorWorkspace: req.user!.workspaceId,
      actorOrgId: req.user!.orgId || '',
      details: { projectId, notificationType },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    console.log(`📋 Project notification "${title}" sent to ${stakeholdersResult.rows.length} stakeholders for project`);

    res.json({
      success: true,
      message: 'Project notification sent successfully',
      recipientCount: stakeholdersResult.rows.length,
      project: project.name,
      notificationType,
      priority
    });

  } catch (error) {
    console.error('Error creating project notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/notifications/system - Get system announcements for authenticated user
router.get('/system', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(`
      SELECT id, user_id, workspace_id, type, title, message, priority, 
             expires_at, metadata, read, created_at, updated_at
      FROM Notifications
      WHERE user_id = $1 
        AND workspace_id = $2 
        AND type = 'system'
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, workspaceId, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM Notifications
      WHERE user_id = $1 
        AND workspace_id = $2 
        AND type = 'system'
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [userId, workspaceId]);

    res.json({
      notifications: result.rows,
      pagination: {
        limit,
        offset,
        total: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching system notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/system - Create system announcement
router.post('/system', authenticate, async (req, res) => {
  try {
    // FIXED: Authenticate user - only admins can create system announcements
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create system announcements' });
    }

    const {
      title,
      message,
      type = 'system',
      priority = 'medium',
      targetAudience = 'all',
      sendEmail = false,
      expiresAt
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // FIXED: Build query scoped to workspace only (removed cross-workspace targeting)
    let userQuery = `
      SELECT DISTINCT u.id, u.email, u.workspace_id
      FROM Users u
      WHERE u.deleted_at IS NULL AND u.workspace_id = $1
    `;

    const queryParams: any[] = [req.user!.workspaceId];

    if (targetAudience === 'admins') {
      userQuery += ` AND u.role = 'admin'`;
    }

    const usersResult = await pool.query(userQuery, queryParams);

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No users found for the specified audience' });
    }

    // Create notifications for all target users (FIXED: add created_by, remove metadata leakage)
    const notificationPromises = usersResult.rows.map(user => {
      return pool.query(`
        INSERT INTO Notifications
        (user_id, workspace_id, type, title, message, priority, expires_at, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        user.id,
        user.workspace_id,
        type,
        title,
        message,
        priority,
        expiresAt || null,
        JSON.stringify({
          systemAnnouncement: true
          // REMOVED: targetAudience, sendEmail (metadata leakage)
        }),
        req.user!.id // ADDED: Track who created
      ]);
    });

    await Promise.all(notificationPromises);

    // ADDED: Log to audit trail
    await logToAuditLog(pool, {
      objectType: 'notification',
      objectId: 'system',
      action: 'create',
      actorId: req.user!.id,
      actorWorkspace: req.user!.workspaceId,
      actorOrgId: req.user!.orgId || '',
      details: { targetAudience, recipientCount: usersResult.rows.length },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    // TODO: Send email notifications if requested
    if (sendEmail) {
      console.log(`📧 System announcement emails would be sent to ${usersResult.rows.length} users`);
    }

    console.log(`📢 System announcement "${title}" sent to ${usersResult.rows.length} users`);

    res.json({
      success: true,
      message: 'System announcement sent successfully',
      recipientCount: usersResult.rows.length,
      targetAudience,
      type,
      priority
    });

  } catch (error) {
    console.error('Error creating system announcement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/payment-reminder - Send payment reminder to workspace
router.post('/payment-reminder', authenticate, async (req, res) => {
  try {
    // FIXED: Authenticate user - only workspace admins can send payment reminders
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only workspace administrators can send payment reminders' });
    }

    const { message, urgent = false } = req.body;
    const workspaceId = req.user!.workspaceId; // FIXED: Use workspace from auth, not request

    // Get workspace details and admin users (FIXED: scope to workspace)
    const workspaceResult = await pool.query(`
      SELECT w.id, w.name, w.payment_status, w.payment_amount, w.payment_due_date,
             u.id as user_id, u.email
      FROM Workspace w
      JOIN Users u ON w.id = u.workspace_id
      WHERE w.id = $1 AND w.id = $2 AND u.role = 'admin' AND u.deleted_at IS NULL
    `, [workspaceId, req.user!.workspaceId]);

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace or admin users not found' });
    }

    const workspace = workspaceResult.rows[0];
    const daysUntilDue = workspace.payment_due_date 
      ? Math.ceil((new Date(workspace.payment_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Create notification for each admin user in the workspace (FIXED: add created_by)
    const notificationPromises = workspaceResult.rows.map(user => {
      const notificationMessage = message || 
        (daysUntilDue !== null && daysUntilDue <= 0 
          ? `Payment of $${workspace.payment_amount} is ${Math.abs(daysUntilDue)} days overdue.`
          : daysUntilDue !== null && daysUntilDue <= 7
          ? `Payment of $${workspace.payment_amount} is due in ${daysUntilDue} days.`
          : `Payment reminder: $${workspace.payment_amount} due.`
        );

      return pool.query(`
        INSERT INTO Notifications 
        (user_id, workspace_id, type, title, message, action_url, action_label, priority, expires_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        user.user_id,
        workspaceId,
        'payment',
        `Payment Reminder`,
        notificationMessage,
        '/settings/billing',
        'Pay Now',
        urgent || workspace.payment_status === 'overdue' ? 'high' : 'medium',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
        req.user!.id // ADDED: Track who created
      ]);
    });

    await Promise.all(notificationPromises);

    // ADDED: Log to audit trail
    await logToAuditLog(pool, {
      objectType: 'notification',
      objectId: 'payment-reminder',
      action: 'create',
      actorId: req.user!.id,
      actorWorkspace: req.user!.workspaceId,
      actorOrgId: req.user!.orgId || '',
      details: { urgent, recipientCount: workspaceResult.rows.length },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    console.log(`📧 Payment reminder notifications created`);

    res.json({
      success: true,
      message: 'Payment reminder notifications created',
      notificationsCreated: workspaceResult.rows.length,
      urgent
    });

  } catch (error) {
    console.error('Error creating payment reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;