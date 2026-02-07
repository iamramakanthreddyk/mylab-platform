/**
 * Test Configuration
 * Sets up SQLite for integration tests without affecting production
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(__dirname, '../../.test/test.db');
const TEST_DB_DIR = path.dirname(TEST_DB_PATH);

// Ensure test directory exists
if (!fs.existsSync(TEST_DB_DIR)) {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
}

export interface TestDatabase {
  db: sqlite3.Database;
  run: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Initialize test database connection
 */
export async function initializeTestDatabase(): Promise<TestDatabase> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(TEST_DB_PATH, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Enable foreign keys synchronously
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          reject(err);
          return;
        }

        const testDb: TestDatabase = {
          db,
          run: promisify(db.run.bind(db)),
          get: promisify(db.get.bind(db)),
          all: promisify(db.all.bind(db)),
          exec: async (sql: string) => {
            return new Promise((resolve, reject) => {
              db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          },
          close: async () => {
            return new Promise((resolve, reject) => {
              db.close((err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        };

        resolve(testDb);
      });
    });
  });
}

/**
 * Create schema for test database
 */
export async function createTestSchema(db: TestDatabase): Promise<void> {
  const schema = `
    -- Workspace
    CREATE TABLE IF NOT EXISTS Workspace (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    -- Users
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Viewer',
      workspace_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (workspace_id) REFERENCES Workspace(id)
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS Projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'Planning',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY (created_by) REFERENCES Users(id)
    );

    -- Samples
    CREATE TABLE IF NOT EXISTS Samples (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      sample_id VARCHAR(100) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      metadata JSONB,
      status TEXT DEFAULT 'created',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      UNIQUE(project_id, sample_id),
      FOREIGN KEY (project_id) REFERENCES Projects(id),
      FOREIGN KEY (workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY (created_by) REFERENCES Users(id)
    );

    -- DerivedSamples
    CREATE TABLE IF NOT EXISTS DerivedSamples (
      id TEXT PRIMARY KEY,
      root_sample_id TEXT NOT NULL,
      parent_id TEXT,
      owner_workspace_id TEXT NOT NULL,
      project_id TEXT,
      derived_id VARCHAR(100) NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      depth INT DEFAULT 0,
      status TEXT DEFAULT 'created',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      UNIQUE(owner_workspace_id, derived_id),
      FOREIGN KEY (root_sample_id) REFERENCES Samples(id),
      FOREIGN KEY (parent_id) REFERENCES DerivedSamples(id),
      FOREIGN KEY (owner_workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY (created_by) REFERENCES Users(id)
    );

    -- AnalysisTypes
    CREATE TABLE IF NOT EXISTS AnalysisTypes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      workspace_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    -- Batches
    CREATE TABLE IF NOT EXISTS Batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      batch_id VARCHAR(100) NOT NULL,
      status TEXT DEFAULT 'created',
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES Projects(id),
      FOREIGN KEY (workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY (created_by) REFERENCES Users(id)
    );

    -- BatchItems
    CREATE TABLE IF NOT EXISTS BatchItems (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      derived_id TEXT NOT NULL,
      sequence_number INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES Batches(id),
      FOREIGN KEY (derived_id) REFERENCES DerivedSamples(id)
    );

    -- Analyses
    CREATE TABLE IF NOT EXISTS Analyses (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      analysis_type_id TEXT NOT NULL,
      results JSONB,
      file_path TEXT,
      file_checksum TEXT,
      file_size_bytes INT,
      status TEXT DEFAULT 'pending',
      is_authoritative BOOLEAN DEFAULT FALSE,
      supersedes_id TEXT,
      execution_mode TEXT DEFAULT 'platform',
      executed_by_org_id TEXT,
      source_org_id TEXT,
      uploaded_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (batch_id) REFERENCES Batches(id),
      FOREIGN KEY (workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY (analysis_type_id) REFERENCES AnalysisTypes(id),
      FOREIGN KEY (supersedes_id) REFERENCES Analyses(id),
      FOREIGN KEY (uploaded_by) REFERENCES Users(id)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS Notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      read BOOLEAN DEFAULT FALSE,
      expires_at DATETIME,
      metadata JSONB,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES Users(id),
      FOREIGN KEY (workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY (created_by) REFERENCES Users(id)
    );

    -- NotificationPreferences
    CREATE TABLE IF NOT EXISTS NotificationPreferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      email_payment_reminders BOOLEAN DEFAULT TRUE,
      email_project_updates BOOLEAN DEFAULT TRUE,
      email_sample_notifications BOOLEAN DEFAULT TRUE,
      email_system_announcements BOOLEAN DEFAULT TRUE,
      in_app_notifications BOOLEAN DEFAULT TRUE,
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      quiet_hours_timezone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(id)
    );

    -- AuditLog
    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY,
      object_type TEXT NOT NULL,
      object_id TEXT,
      action TEXT NOT NULL,
      actor_id TEXT,
      actor_workspace TEXT,
      actor_org_id TEXT,
      details JSONB,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_id) REFERENCES Users(id)
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_workspace ON Users(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_projects_workspace ON Projects(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_samples_workspace ON Samples(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_samples_project ON Samples(project_id);
    CREATE INDEX IF NOT EXISTS idx_derived_workspace ON DerivedSamples(owner_workspace_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_batch ON Analyses(batch_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_workspace ON Analyses(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_authoritative ON Analyses(is_authoritative);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON Notifications(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_audit_object ON AuditLog(object_type, object_id);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON AuditLog(actor_id);
  `;

  await db.exec(schema);
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(db: TestDatabase): Promise<void> {
  const tables = [
    'BatchItems',
    'Analyses',
    'Batches',
    'DerivedSamples',
    'Samples',
    'Projects',
    'Notifications',
    'NotificationPreferences',
    'AuditLog',
    'AnalysisTypes',
    'Users',
    'Workspace'
  ];

  for (const table of tables) {
    await db.run(`DELETE FROM ${table}`);
  }
}

/**
 * Clear test database file
 */
export async function deleteTestDatabase(): Promise<void> {
  // Wait a bit for all file handles to close
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (err) {
    // File might be in use, will be overwritten on next run
    console.warn('Warning: could not delete test database file');
  }
}

export default {
  initializeTestDatabase,
  createTestSchema,
  cleanupTestDatabase,
  deleteTestDatabase,
  TEST_DB_PATH
};
