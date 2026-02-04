import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';

const USE_SQLITE = process.env.USE_SQLITE === 'true';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../local.db');

// Interface for consistent query execution
export interface Database {
  run: (sql: string, params?: any[]) => Promise<any>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  exec: (sql: string) => Promise<void>;
}

let dbInstance: sqlite3.Database | null = null;

// Create pool based on environment
export const pool: any = USE_SQLITE ? createSQLitePool() : createPostgresPool();

function createPostgresPool(): Pool {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mylab',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

function createSQLitePool(): any {
  return {
    query: async (sql: string, params?: any[]) => {
      if (!dbInstance) {
        throw new Error('Database not initialized');
      }
      
      const db = createDbWrapper(dbInstance);
      
      // Convert PostgreSQL syntax to SQLite
      let sqliteQuery = sql;
      
      // $1, $2, etc. to ?
      sqliteQuery = sqliteQuery.replace(/\$(\d+)/g, () => '?');
      
      // RETURNING clause - execute separately
      const returningMatch = sqliteQuery.match(/RETURNING\s+(.+?)(?:;|$)/i);
      const hasReturning = !!returningMatch;
      let returning = returningMatch ? returningMatch[1].split(',').map(c => c.trim()) : [];
      
      if (hasReturning) {
        sqliteQuery = sqliteQuery.replace(/RETURNING\s+.+?(?:;|$)/i, '');
      }
      
      try {
        const result = await db.run(sqliteQuery, params);
        
        if (hasReturning) {
          const lastRow = await db.get(
            `SELECT ${returning.join(',')} FROM ${extractTableName(sql)} ORDER BY rowid DESC LIMIT 1`
          );
          
          return {
            rows: lastRow ? [lastRow] : [],
            rowCount: result.changes || 0,
            command: 'SELECT'
          };
        }
        
        return {
          rows: [],
          rowCount: result.changes || 0,
          command: 'OK'
        };
      } catch (err) {
        console.error('Database error:', err);
        throw err;
      }
    }
  };
}

function createDbWrapper(db: sqlite3.Database): Database {
  return {
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
    }
  };
}

function extractTableName(sql: string): string {
  const match = sql.match(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
  return match ? match[1] : 'table';
}

// Initialize SQLite database for local development
export async function initializeDatabase(): Promise<void> {
  if (!USE_SQLITE) {
    return; // Use PostgreSQL
  }

  return new Promise((resolve, reject) => {
    // Create directory if needed
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new sqlite3.Database(DB_PATH, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      const db = createDbWrapper(dbInstance!);
      
      try {
        // Enable foreign keys
        await db.run('PRAGMA foreign_keys = ON');
        
        // Create schema
        await createSchema(db);
        
        console.log(`✓ SQLite database initialized at ${DB_PATH}`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function createSchema(db: Database): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS Workspace (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      domain TEXT,
      created_by TEXT,
      payment_status TEXT DEFAULT 'trial',
      payment_amount INTEGER,
      payment_due_date TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS Projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE TABLE IF NOT EXISTS Samples (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(project_id) REFERENCES Projects(id),
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE TABLE IF NOT EXISTS Batches (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(project_id) REFERENCES Projects(id),
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE TABLE IF NOT EXISTS AnalysisTypes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE TABLE IF NOT EXISTS Analyses (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      sample_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      analysis_type_id TEXT,
      is_authoritative INTEGER DEFAULT 0,
      results TEXT,
      supersedes_id TEXT,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(batch_id) REFERENCES Batches(id),
      FOREIGN KEY(sample_id) REFERENCES Samples(id),
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id),
      FOREIGN KEY(analysis_type_id) REFERENCES AnalysisTypes(id)
    );

    CREATE TABLE IF NOT EXISTS AuditLog (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT,
      action TEXT,
      table_name TEXT,
      record_id TEXT,
      changes TEXT,
      created_at TEXT,
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE TABLE IF NOT EXISTS Notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      type TEXT,
      title TEXT,
      message TEXT,
      priority TEXT DEFAULT 'medium',
      is_read INTEGER DEFAULT 0,
      action_url TEXT,
      action_label TEXT,
      expires_at TEXT,
      created_at TEXT,
      FOREIGN KEY(user_id) REFERENCES Users(id),
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE TABLE IF NOT EXISTS NotificationPreferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      email_notifications INTEGER DEFAULT 1,
      in_app_notifications INTEGER DEFAULT 1,
      digest_frequency TEXT DEFAULT 'daily',
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(user_id) REFERENCES Users(id),
      FOREIGN KEY(workspace_id) REFERENCES Workspace(id)
    );

    CREATE INDEX IF NOT EXISTS idx_projects_workspace ON Projects(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_samples_project ON Samples(project_id);
    CREATE INDEX IF NOT EXISTS idx_samples_workspace ON Samples(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_batch ON Analyses(batch_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_workspace ON Analyses(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_audit_workspace ON AuditLog(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);
  `;

  await db.exec(schema);
}
