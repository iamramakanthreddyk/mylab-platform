import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';
import { logToAuditLog } from '../utils/auditUtils';
import { logSecurityEvent } from '../utils/securityLogger';

const router = Router();

/**
 * GET /api/notification-preferences
 * Get notification preferences for the authenticated user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT id, user_id, email_payment_reminders, email_project_updates, 
              email_sample_notifications, email_system_announcements,
              in_app_notifications, quiet_hours_start, quiet_hours_end,
              quiet_hours_timezone, created_at, updated_at
       FROM NotificationPreferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default preferences if not yet created
      return res.json({
        user_id: userId,
        email_payment_reminders: true,
        email_project_updates: true,
        email_sample_notifications: true,
        email_system_announcements: true,
        in_app_notifications: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        quiet_hours_timezone: null,
        created_at: null,
        updated_at: null,
        isDefault: true
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notification-preferences
 * Update notification preferences for the authenticated user
 */
router.put('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId;

    const {
      email_payment_reminders,
      email_project_updates,
      email_sample_notifications,
      email_system_announcements,
      in_app_notifications,
      quiet_hours_start,
      quiet_hours_end,
      quiet_hours_timezone
    } = req.body;

    // Validate quiet hours if provided
    if ((quiet_hours_start || quiet_hours_end) && !quiet_hours_timezone) {
      return res.status(400).json({ 
        error: 'quiet_hours_timezone is required when setting quiet hours' 
      });
    }

    // Upsert preferences (insert if not exists, update if exists)
    const result = await pool.query(
      `INSERT INTO NotificationPreferences 
       (user_id, email_payment_reminders, email_project_updates, 
        email_sample_notifications, email_system_announcements,
        in_app_notifications, quiet_hours_start, quiet_hours_end,
        quiet_hours_timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         email_payment_reminders = $2,
         email_project_updates = $3,
         email_sample_notifications = $4,
         email_system_announcements = $5,
         in_app_notifications = $6,
         quiet_hours_start = $7,
         quiet_hours_end = $8,
         quiet_hours_timezone = $9,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        email_payment_reminders ?? true,
        email_project_updates ?? true,
        email_sample_notifications ?? true,
        email_system_announcements ?? true,
        in_app_notifications ?? true,
        quiet_hours_start || null,
        quiet_hours_end || null,
        quiet_hours_timezone || null
      ]
    );

    // Log to audit trail
    await logToAuditLog(pool, {
      objectType: 'notification_preference',
      objectId: userId,
      action: 'update',
      actorId: userId,
      actorWorkspace: workspaceId,
      actorOrgId: req.user!.orgId || '',
      details: {
        preferences: {
          email_payment_reminders,
          email_project_updates,
          email_sample_notifications,
          email_system_announcements,
          in_app_notifications,
          quiet_hours: quiet_hours_start && quiet_hours_end ? `${quiet_hours_start}-${quiet_hours_end}` : null
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notification-preferences/disable-all
 * Disable all notifications for the authenticated user
 */
router.post('/disable-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(
      `INSERT INTO NotificationPreferences 
       (user_id, email_payment_reminders, email_project_updates, 
        email_sample_notifications, email_system_announcements, in_app_notifications)
       VALUES ($1, false, false, false, false, false)
       ON CONFLICT (user_id) DO UPDATE SET
         email_payment_reminders = false,
         email_project_updates = false,
         email_sample_notifications = false,
         email_system_announcements = false,
         in_app_notifications = false,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId]
    );

    // Log to security log (user disabled notifications)
    await logSecurityEvent(pool, {
      eventType: 'notifications_disabled',
      severity: 'low',
      userId: userId,
      organizationId: req.user?.organizationId || req.user?.orgId || undefined,
      resourceType: 'notification_preference',
      resourceId: userId,
      reason: 'User disabled all notifications',
      details: { action: 'disable_all' },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({
      success: true,
      message: 'All notifications disabled',
      preferences: result.rows[0]
    });

  } catch (error) {
    console.error('Error disabling notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notification-preferences/enable-all
 * Enable all notifications for the authenticated user
 */
router.post('/enable-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId;

    const result = await pool.query(
      `INSERT INTO NotificationPreferences 
       (user_id, email_payment_reminders, email_project_updates, 
        email_sample_notifications, email_system_announcements, in_app_notifications)
       VALUES ($1, true, true, true, true, true)
       ON CONFLICT (user_id) DO UPDATE SET
         email_payment_reminders = true,
         email_project_updates = true,
         email_sample_notifications = true,
         email_system_announcements = true,
         in_app_notifications = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId]
    );

    // Log to security log (user enabled notifications)
    await logSecurityEvent(pool, {
      eventType: 'notifications_enabled',
      severity: 'low',
      userId: userId,
      organizationId: req.user?.organizationId || req.user?.orgId || undefined,
      resourceType: 'notification_preference',
      resourceId: userId,
      reason: 'User enabled all notifications',
      details: { action: 'enable_all' },
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({
      success: true,
      message: 'All notifications enabled',
      preferences: result.rows[0]
    });

  } catch (error) {
    console.error('Error enabling notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
