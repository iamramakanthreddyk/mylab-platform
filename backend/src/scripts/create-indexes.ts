/**
 * Database Indexes Migration
 * 
 * Create indexes on frequently queried columns to improve performance.
 * Run this script once to add production indexes:
 * 
 * npx ts-node backend/src/scripts/create-indexes.ts
 * 
 * Or use as a starting point for your migration tool (node-pg-migrate, Flyway, etc.)
 */

import { pool } from '../db';
import logger from '../utils/logger';

/**
 * Indexes to create for optimal query performance
 * 
 * Index naming convention: idx_{table}_{column(s)}
 * These prevent full table scans on common queries
 */
const indexes = [
  // User queries
  'CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);',
  'CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON Users(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_users_organization_id ON Users(organization_id);',
  
  // Workspace queries
  'CREATE INDEX IF NOT EXISTS idx_workspace_slug ON Workspace(slug);',
  
  // Organization queries
  'CREATE INDEX IF NOT EXISTS idx_organizations_workspace_id ON Organizations(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_organizations_type ON Organizations(type);',
  
  // Project queries (most important - frequently filtered)
  'CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON Projects(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_projects_client_org_id ON Projects(client_org_id);',
  'CREATE INDEX IF NOT EXISTS idx_projects_executing_org_id ON Projects(executing_org_id);',
  'CREATE INDEX IF NOT EXISTS idx_projects_status ON Projects(status);',
  'CREATE INDEX IF NOT EXISTS idx_projects_created_at ON Projects(created_at DESC);',
  
  // Sample queries (frequently filtered)
  'CREATE INDEX IF NOT EXISTS idx_samples_project_id ON Samples(project_id);',
  'CREATE INDEX IF NOT EXISTS idx_samples_workspace_id ON Samples(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_samples_type ON Samples(type);',
  'CREATE INDEX IF NOT EXISTS idx_samples_created_at ON Samples(created_at DESC);',
  
  // Derived sample queries
  'CREATE INDEX IF NOT EXISTS idx_derived_samples_parent_id ON DerivedSamples(parent_sample_id);',
  'CREATE INDEX IF NOT EXISTS idx_derived_samples_workspace_id ON DerivedSamples(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_derived_samples_supersedes_id ON DerivedSamples(supersedes_id);',
  
  // Analysis queries (critical for analysis dashboards)
  'CREATE INDEX IF NOT EXISTS idx_analyses_sample_id ON Analyses(sample_id);',
  'CREATE INDEX IF NOT EXISTS idx_analyses_workspace_id ON Analyses(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_analyses_type ON Analyses(type);',
  'CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON Analyses(created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_analyses_batch_id ON Analyses(batch_id);',
  
  // Audit log queries
  'CREATE INDEX IF NOT EXISTS idx_auditlog_workspace_id ON AuditLog(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_auditlog_user_id ON AuditLog(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_auditlog_action ON AuditLog(action);',
  'CREATE INDEX IF NOT EXISTS idx_auditlog_created_at ON AuditLog(created_at DESC);',
  
  // Security log queries
  'CREATE INDEX IF NOT EXISTS idx_securitylog_workspace_id ON SecurityLog(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_securitylog_severity ON SecurityLog(severity);',
  'CREATE INDEX IF NOT EXISTS idx_securitylog_created_at ON SecurityLog(created_at DESC);',
  
  // API key queries
  'CREATE INDEX IF NOT EXISTS idx_apikeys_workspace_id ON ApiKeys(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_apikeys_key_hash ON ApiKeys(key_hash);',
  'CREATE INDEX IF NOT EXISTS idx_apikeys_is_active ON ApiKeys(is_active);',
  
  // Notification queries
  'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON Notifications(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON Notifications(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON Notifications(is_read);',
  'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON Notifications(created_at DESC);',
  
  // Composite indexes for common multi-column queries
  'CREATE INDEX IF NOT EXISTS idx_projects_workspace_status ON Projects(workspace_id, status);',
  'CREATE INDEX IF NOT EXISTS idx_samples_project_type ON Samples(project_id, type);',
  'CREATE INDEX IF NOT EXISTS idx_analyses_sample_type ON Analyses(sample_id, type);',
  'CREATE INDEX IF NOT EXISTS idx_users_workspace_role ON Users(workspace_id, role);',
];

async function createIndexes(): Promise<void> {
  const client = await pool.connect();
  
  try {
    logger.info('Starting index creation...');
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        // "IF NOT EXISTS" means no error if already exists
        successCount++;
      } catch (error) {
        // Log but continue - index might already exist
        logger.warn(`Index creation skipped (may already exist):`, {
          sql: indexSql.substring(0, 80),
          error: error instanceof Error ? error.message : String(error)
        });
        skipCount++;
      }
    }
    
    logger.info('✅ Index creation completed', {
      created: successCount,
      skipped: skipCount,
      total: indexes.length
    });
    
  } catch (error) {
    logger.error('❌ Failed to create indexes', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    client.release();
  }
}

// Run if executed directly
if (require.main === module) {
  createIndexes()
    .then(() => {
      logger.info('Index migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Index migration failed', { error });
      process.exit(1);
    });
}

export { createIndexes };
