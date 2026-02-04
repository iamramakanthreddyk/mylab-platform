/**
 * Integration Tests - Notification & Workspace APIs
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeTestDatabase,
  createTestSchema,
  cleanupTestDatabase,
  deleteTestDatabase,
  TestDatabase
} from './testConfig';
import { createTestFixtures } from './fixtures';

describe('Notification APIs', () => {
  let db: TestDatabase;
  let fixtures: any;

  beforeAll(async () => {
    db = await initializeTestDatabase();
    await createTestSchema(db);
  });

  afterAll(async () => {
    await db.close();
    await deleteTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(db);
    fixtures = await createTestFixtures(db);
  });

  describe('Notification Preferences', () => {
    it('should create notification preferences for user', async () => {
      const prefId = uuidv4();
      const userId = fixtures.users[0].id;

      await db.run(
        `INSERT INTO NotificationPreferences (id, user_id, email_payment_reminders, email_project_updates, in_app_notifications)
         VALUES (?, ?, ?, ?, ?)`,
        [prefId, userId, true, true, true]
      );

      const prefs = await db.get(
        'SELECT * FROM NotificationPreferences WHERE user_id = ?',
        [userId]
      );

      expect(prefs).toBeDefined();
      expect(prefs.email_payment_reminders).toBe(1);
      expect(prefs.in_app_notifications).toBe(1);
    });

    it('should update notification preferences', async () => {
      const prefId = uuidv4();
      const userId = fixtures.users[0].id;

      // Create preferences
      await db.run(
        `INSERT INTO NotificationPreferences (id, user_id, email_payment_reminders, email_project_updates)
         VALUES (?, ?, ?, ?)`,
        [prefId, userId, true, true]
      );

      // Update preferences
      await db.run(
        `UPDATE NotificationPreferences SET email_payment_reminders = 0, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [userId]
      );

      const prefs = await db.get(
        'SELECT * FROM NotificationPreferences WHERE user_id = ?',
        [userId]
      );

      expect(prefs.email_payment_reminders).toBe(0);
      expect(prefs.email_project_updates).toBe(1);
    });
  });

  describe('System Notifications', () => {
    it('should create system announcement', async () => {
      const notifId = uuidv4();

      await db.run(
        `INSERT INTO Notifications (id, user_id, workspace_id, type, title, message, priority, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notifId,
          fixtures.users[0].id,
          fixtures.workspace.id,
          'system',
          'System Maintenance',
          'System will be under maintenance tomorrow',
          'high',
          fixtures.users[0].id
        ]
      );

      const notif = await db.get(
        'SELECT * FROM Notifications WHERE id = ?',
        [notifId]
      );

      expect(notif).toBeDefined();
      expect(notif.type).toBe('system');
      expect(notif.priority).toBe('high');
    });

    it('should fetch system notifications for user', async () => {
      // Create multiple system notifications
      for (let i = 0; i < 3; i++) {
        await db.run(
          `INSERT INTO Notifications (id, user_id, workspace_id, type, title, message, priority)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            fixtures.users[0].id,
            fixtures.workspace.id,
            'system',
            `System Notification ${i + 1}`,
            `Message ${i + 1}`,
            i === 0 ? 'high' : 'medium'
          ]
        );
      }

      // Fetch system notifications
      const notifs = await db.all(
        `SELECT id, type, title, priority FROM Notifications 
         WHERE user_id = ? AND workspace_id = ? AND type = 'system'
         ORDER BY priority DESC, created_at DESC`,
        [fixtures.users[0].id, fixtures.workspace.id]
      );

      expect(notifs.length).toBe(3);
      expect(notifs[0].priority).toBe('high'); // High priority first
    });

    it('should handle notification expiration', async () => {
      const expiredId = uuidv4();
      const validId = uuidv4();

      // Create expired notification (1 day ago)
      const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      await db.run(
        `INSERT INTO Notifications (id, user_id, workspace_id, type, title, message, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          expiredId,
          fixtures.users[0].id,
          fixtures.workspace.id,
          'system',
          'Expired Notice',
          'This has expired',
          yesterdayDate
        ]
      );

      // Create valid notification
      const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db.run(
        `INSERT INTO Notifications (id, user_id, workspace_id, type, title, message, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          validId,
          fixtures.users[0].id,
          fixtures.workspace.id,
          'system',
          'Valid Notice',
          'This is still valid',
          tomorrowDate
        ]
      );

      // Fetch only non-expired notifications
      const notifs = await db.all(
        `SELECT id FROM Notifications 
         WHERE user_id = ? AND workspace_id = ? 
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
        [fixtures.users[0].id, fixtures.workspace.id]
      );

      expect(notifs.length).toBe(1);
      expect(notifs[0].id).toBe(validId);
    });
  });

  describe('Notification Read Status', () => {
    it('should mark notification as read', async () => {
      const notifId = uuidv4();

      // Create unread notification
      await db.run(
        `INSERT INTO Notifications (id, user_id, workspace_id, type, title, message, read)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          notifId,
          fixtures.users[0].id,
          fixtures.workspace.id,
          'info',
          'Test',
          'Test message',
          false
        ]
      );

      // Mark as read
      await db.run(
        'UPDATE Notifications SET read = 1 WHERE id = ?',
        [notifId]
      );

      const notif = await db.get(
        'SELECT read FROM Notifications WHERE id = ?',
        [notifId]
      );

      expect(notif.read).toBe(1);
    });
  });
});

describe('Workspace APIs', () => {
  let db: TestDatabase;
  let fixtures: any;

  beforeAll(async () => {
    db = await initializeTestDatabase();
    await createTestSchema(db);
  });

  afterAll(async () => {
    await db.close();
    await deleteTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(db);
    fixtures = await createTestFixtures(db);
  });

  describe('Workspace Listing', () => {
    it('should list all workspaces with user count', async () => {
      // Fixture already created workspace with users
      const workspace = await db.get(
        `SELECT w.id, w.name, COUNT(DISTINCT u.id) as user_count
         FROM Workspace w
         LEFT JOIN Users u ON w.id = u.workspace_id AND u.deleted_at IS NULL
         WHERE w.id = ?
         GROUP BY w.id`,
        [fixtures.workspace.id]
      );

      expect(workspace).toBeDefined();
      expect(workspace.user_count).toBe(3); // 3 users created in fixtures
    });

    it('should list workspaces with pagination', async () => {
      // Create additional workspaces
      for (let i = 0; i < 5; i++) {
        const wsId = uuidv4();
        await db.run(
          'INSERT INTO Workspace (id, name, description, status) VALUES (?, ?, ?, ?)',
          [wsId, `Workspace ${i}`, `Description ${i}`, 'active']
        );
      }

      // Get first page (limit 3)
      const page1 = await db.all(
        `SELECT id, name FROM Workspace WHERE deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 3 OFFSET 0`
      );

      expect(page1.length).toBe(3);

      // Get second page (limit 3, offset 3)
      const page2 = await db.all(
        `SELECT id, name FROM Workspace WHERE deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 3 OFFSET 3`
      );

      expect(page2.length).toBeGreaterThan(0);
    });
  });

  describe('Workspace Details', () => {
    it('should get workspace with statistics', async () => {
      const workspace = await db.get(
        `SELECT 
           w.id, w.name, w.description, w.status,
           COUNT(DISTINCT u.id) as user_count,
           COUNT(DISTINCT p.id) as project_count
         FROM Workspace w
         LEFT JOIN Users u ON w.id = u.workspace_id AND u.deleted_at IS NULL
         LEFT JOIN Projects p ON w.id = p.workspace_id AND p.deleted_at IS NULL
         WHERE w.id = ?
         GROUP BY w.id, w.name, w.description, w.status`,
        [fixtures.workspace.id]
      );

      expect(workspace).toBeDefined();
      expect(workspace.user_count).toBe(3);
      expect(workspace.project_count).toBe(2);
    });

    it('should track workspace creation and updates', async () => {
      const workspace = await db.get(
        'SELECT created_at, updated_at FROM Workspace WHERE id = ?',
        [fixtures.workspace.id]
      );

      expect(workspace.created_at).toBeDefined();
      expect(workspace.updated_at).toBeDefined();
    });
  });

  describe('Workspace Isolation', () => {
    it('should isolate data by workspace', async () => {
      // Create second workspace
      const ws2Id = uuidv4();
      await db.run(
        'INSERT INTO Workspace (id, name, status) VALUES (?, ?, ?)',
        [ws2Id, 'Workspace 2', 'active']
      );

      // Create user in second workspace
      const user2Id = uuidv4();
      await db.run(
        'INSERT INTO Users (id, email, name, role, workspace_id) VALUES (?, ?, ?, ?, ?)',
        [user2Id, 'user2@test.com', 'User 2', 'Scientist', ws2Id]
      );

      // Verify users are isolated
      const ws1Users = await db.all(
        'SELECT id FROM Users WHERE workspace_id = ?',
        [fixtures.workspace.id]
      );

      const ws2Users = await db.all(
        'SELECT id FROM Users WHERE workspace_id = ?',
        [ws2Id]
      );

      expect(ws1Users.length).toBe(3);
      expect(ws2Users.length).toBe(1);
      expect(ws1Users.some((u: any) => u.id === user2Id)).toBe(false);
    });

    it('should prevent cross-workspace access', async () => {
      // Create second workspace and project
      const ws2Id = uuidv4();
      await db.run(
        'INSERT INTO Workspace (id, name, status) VALUES (?, ?, ?)',
        [ws2Id, 'Workspace 2', 'active']
      );

      const proj2Id = uuidv4();
      const user2Id = uuidv4();
      await db.run(
        'INSERT INTO Users (id, email, name, role, workspace_id) VALUES (?, ?, ?, ?, ?)',
        [user2Id, 'user2@test.com', 'User 2', 'Scientist', ws2Id]
      );

      await db.run(
        'INSERT INTO Projects (id, workspace_id, name, status, created_by) VALUES (?, ?, ?, ?, ?)',
        [proj2Id, ws2Id, 'Project 2', 'Active', user2Id]
      );

      // Verify user from ws1 cannot see ws2 projects
      const wsUser = await db.get(
        'SELECT workspace_id FROM Users WHERE id = ?',
        [fixtures.users[0].id]
      );

      const canAccess = await db.get(
        'SELECT id FROM Projects WHERE id = ? AND workspace_id = ?',
        [proj2Id, wsUser.workspace_id]
      );

      expect(canAccess).toBeUndefined();
    });
  });
});

import { v4 as uuidv4 } from 'uuid';
