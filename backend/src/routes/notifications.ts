import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/notifications - Get user notifications
router.get('/', async (req, res) => {
  try {
    // TODO: Get user from auth middleware
    const userId = req.query.userId as string || 'user-1'; // Mock for now
    const workspaceId = req.query.workspaceId as string;
    const type = req.query.type as string;
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit as string) || 50;

    let query = `
      SELECT 
        id, type, title, message, action_url, action_label, priority, 
        read_at, expires_at, metadata, created_at
      FROM Notifications 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;

    if (workspaceId) {
      query += ` AND workspace_id = $${paramIndex}`;
      params.push(workspaceId);
      paramIndex++;
    }

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
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || 'user-1'; // TODO: Get from auth

    const result = await pool.query(`
      UPDATE Notifications 
      SET read_at = NOW() 
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or already read' });
    }

    res.json({ success: true, message: 'Notification marked as read' });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || 'user-1'; // TODO: Get from auth

    const result = await pool.query(`
      DELETE FROM Notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/clear-all - Clear all notifications for user
router.delete('/clear-all', async (req, res) => {
  try {
    const userId = req.body.userId || 'user-1'; // TODO: Get from auth

    const result = await pool.query(`
      DELETE FROM Notifications 
      WHERE user_id = $1
      RETURNING id
    `, [userId]);

    res.json({ 
      success: true, 
      message: 'All notifications cleared',
      deletedCount: result.rows.length
    });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || 'user-1'; // TODO: Get from auth

    const result = await pool.query(`
      DELETE FROM Notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/bulk - Create bulk notifications
router.post('/bulk', async (req, res) => {
  try {
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

    // Build query to get target users based on groups
    let userQuery = `
      SELECT DISTINCT u.id, u.email, u.workspace_id, u.role, w.name as workspace_name
      FROM Users u
      JOIN Workspace w ON u.workspace_id = w.id
      WHERE u.deleted_at IS NULL
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    // All users
    if (targetGroups.allUsers) {
      // No additional conditions needed
    } else {
      // Workspace admins only
      if (targetGroups.workspaceAdmins) {
        conditions.push(`u.role = 'admin'`);
      }

      // Specific workspaces
      if (targetGroups.specificWorkspaces && targetGroups.specificWorkspaces.length > 0) {
        const placeholders = targetGroups.specificWorkspaces.map((_, i) =>
          `$${queryParams.length + i + 1}`
        ).join(',');
        conditions.push(`u.workspace_id IN (${placeholders})`);
        queryParams.push(...targetGroups.specificWorkspaces);
      }

      // Specific roles
      if (targetGroups.userRoles && targetGroups.userRoles.length > 0) {
        const placeholders = targetGroups.userRoles.map((_, i) =>
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

    // Create notifications for all target users
    const notificationPromises = usersResult.rows.map(user => {
      return pool.query(`
        INSERT INTO Notifications
        (user_id, workspace_id, type, title, message, priority, expires_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
          targetGroups,
          sendEmail
        })
      ]);
    });

    await Promise.all(notificationPromises);

    // TODO: Send email notifications if requested
    if (sendEmail) {
      console.log(`📧 Bulk notification emails would be sent to ${usersResult.rows.length} users`);
    }

    console.log(`📢 Bulk notification "${title}" sent to ${usersResult.rows.length} users`);

    res.json({
      success: true,
      message: 'Bulk notification sent successfully',
      recipientCount: usersResult.rows.length,
      targetGroups,
      type,
      priority
    });

  } catch (error) {
    console.error('Error creating bulk notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/project - Create project-specific notification
router.post('/project', async (req, res) => {
  try {
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

    // Get project details and stakeholders
    const projectQuery = `
      SELECT
        p.id, p.name, p.workspace_id, w.name as workspace_name,
        p.client_org_id, co.name as client_name
      FROM Projects p
      JOIN Workspace w ON p.workspace_id = w.id
      LEFT JOIN Organizations co ON p.client_org_id = co.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `;

    const projectResult = await pool.query(projectQuery, [projectId]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get all stakeholders for the project
    let stakeholderQuery = `
      SELECT DISTINCT u.id, u.email, u.workspace_id, u.role
      FROM Users u
      WHERE u.deleted_at IS NULL AND (
    `;

    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (notifyStakeholders) {
      // Always include workspace admins
      conditions.push(`(u.workspace_id = $${queryParams.length + 1} AND u.role = 'admin')`);
      queryParams.push(project.workspace_id);

      // Include client organization users if exists
      if (project.client_org_id) {
        conditions.push(`u.organization_id = $${queryParams.length + 1}`);
        queryParams.push(project.client_org_id);
      }

      // Include project team members (if we had a project_users table)
      // This would be added when project team management is implemented
    }

    if (conditions.length === 0) {
      // Fallback: notify all workspace users
      stakeholderQuery = `
        SELECT DISTINCT u.id, u.email, u.workspace_id, u.role
        FROM Users u
        WHERE u.workspace_id = $1 AND u.deleted_at IS NULL
      `;
      queryParams.length = 0;
      queryParams.push(project.workspace_id);
    } else {
      stakeholderQuery += conditions.join(' OR ') + ')';
    }

    const stakeholdersResult = await pool.query(stakeholderQuery, queryParams);

    if (stakeholdersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No stakeholders found for this project' });
    }

    // Create notifications for all stakeholders
    const notificationPromises = stakeholdersResult.rows.map(user => {
      return pool.query(`
        INSERT INTO Notifications
        (user_id, workspace_id, type, title, message, action_url, action_label, priority, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          projectId,
          notificationType,
          projectName: project.name,
          workspaceName: project.workspace_name,
          clientName: project.client_name
        })
      ]);
    });

    await Promise.all(notificationPromises);

    console.log(`📋 Project notification "${title}" sent to ${stakeholdersResult.rows.length} stakeholders for project: ${project.name}`);

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

// POST /api/notifications/system - Create system announcement
router.post('/system', async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'system',
      priority = 'medium',
      targetAudience = 'all',
      workspaceId,
      sendEmail = false,
      expiresAt
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Build query based on target audience
    let userQuery = `
      SELECT DISTINCT u.id, u.email, u.workspace_id
      FROM Users u
      WHERE u.deleted_at IS NULL
    `;

    const queryParams: any[] = [];

    if (targetAudience === 'admins') {
      userQuery += ` AND u.role = 'admin'`;
    } else if (targetAudience === 'workspace' && workspaceId) {
      userQuery += ` AND u.workspace_id = $1`;
      queryParams.push(workspaceId);
    }

    const usersResult = await pool.query(userQuery, queryParams);

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'No users found for the specified audience' });
    }

    // Create notifications for all target users
    const notificationPromises = usersResult.rows.map(user => {
      return pool.query(`
        INSERT INTO Notifications
        (user_id, workspace_id, type, title, message, priority, expires_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        user.id,
        user.workspace_id,
        type,
        title,
        message,
        priority,
        expiresAt || null,
        JSON.stringify({
          systemAnnouncement: true,
          targetAudience,
          sendEmail
        })
      ]);
    });

    await Promise.all(notificationPromises);

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
router.post('/payment-reminder', async (req, res) => {
  try {
    const { workspaceId, message, urgent = false } = req.body;

    // Get workspace details and admin users
    const workspaceResult = await pool.query(`
      SELECT w.name, w.payment_status, w.payment_amount, w.payment_due_date,
             u.id as user_id, u.email
      FROM Workspace w
      JOIN Users u ON w.id = u.workspace_id
      WHERE w.id = $1 AND u.role = 'admin'
    `, [workspaceId]);

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace or admin user not found' });
    }

    const workspace = workspaceResult.rows[0];
    const daysUntilDue = workspace.payment_due_date 
      ? Math.ceil((new Date(workspace.payment_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Create notification for each admin user in the workspace
    const notificationPromises = workspaceResult.rows.map(user => {
      const notificationMessage = message || 
        (daysUntilDue !== null && daysUntilDue <= 0 
          ? `Payment of $${workspace.payment_amount} is ${Math.abs(daysUntilDue)} days overdue.`
          : daysUntilDue !== null && daysUntilDue <= 7
          ? `Payment of $${workspace.payment_amount} is due in ${daysUntilDue} days.`
          : `Payment reminder for ${workspace.name}: $${workspace.payment_amount} due.`
        );

      return pool.query(`
        INSERT INTO Notifications 
        (user_id, workspace_id, type, title, message, action_url, action_label, priority, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        user.user_id,
        workspaceId,
        'payment',
        `Payment Reminder - ${workspace.name}`,
        notificationMessage,
        '/settings/billing',
        'Pay Now',
        urgent || workspace.payment_status === 'overdue' ? 'high' : 'medium',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expires in 30 days
      ]);
    });

    await Promise.all(notificationPromises);

    // TODO: Send email notification if configured
    console.log(`📧 Payment reminder notifications created for workspace: ${workspace.name} (${workspaceId})`);

    res.json({
      success: true,
      message: 'Payment reminder notifications created',
      workspace: workspace.name,
      notificationsCreated: workspaceResult.rows.length,
      urgent
    });

  } catch (error) {
    console.error('Error creating payment reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;