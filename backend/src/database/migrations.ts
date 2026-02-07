/**
 * Database Migration System
 * 
 * Runs automatically on server startup.
 * Idempotent - safe to run multiple times.
 * Tracks migration history in `schema_migrations` table.
 */

import { Pool, QueryResult } from 'pg';
import logger from '../utils/logger';

// Migration version - increment when adding new migrations
const MIGRATIONS_VERSION = '006';

/**
 * Migration definition
 */
interface Migration {
  id: string;
  name: string;
  description: string;
  up: (pool: Pool) => Promise<void>;
}

/**
 * List of all migrations (executed in order)
 */
const migrations: Migration[] = [
  {
    id: '001',
    name: 'create_schema_migrations_table',
    description: 'Create table to track migration history',
    up: async (pool: Pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_id VARCHAR(50) UNIQUE NOT NULL,
          migration_name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.info('✅ Created schema_migrations table');
    }
  },

  {
    id: '002',
    name: 'create_performance_indexes',
    description: 'Create indexes for frequently queried columns',
    up: async (pool: Pool) => {
      logger.info('Creating performance indexes...');
      
      // Check which tables exist before creating indexes
      const tableCheckQuery = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      try {
        const tableResult = await pool.query(tableCheckQuery);
        const existingTables = new Set(tableResult.rows.map((r: any) => r.table_name));
        
        const indexes = [
          {
            name: 'idx_workspace_id_analyses',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_workspace_id_analyses ON "Analyses"("workspace_id");`
          },
          {
            name: 'idx_user_id_users',
            table: 'Users',
            query: `CREATE INDEX IF NOT EXISTS idx_user_id_users ON "Users"("user_id");`
          },
          {
            name: 'idx_created_at_analyses',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_created_at_analyses ON "Analyses"("created_at");`
          },
          {
            name: 'idx_analysis_type',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_analysis_type ON "Analyses"("analysis_type");`
          },
          {
            name: 'idx_supersedes_id_fk',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_supersedes_id_fk ON "Analyses"("supersedes_id");`
          },
        ];

        let created = 0;
        for (const index of indexes) {
          if (existingTables.has(index.table)) {
            try {
              await pool.query(index.query);
              logger.info(`  ✓ ${index.name}`);
              created++;
            } catch (err) {
              logger.warn(`  ⚠ ${index.name} - skipped`, { error: (err as Error).message });
            }
          } else {
            logger.warn(`  ⚠ ${index.name} - table "${index.table}" not found, skipping`);
          }
        }
        logger.info(`✅ Created ${created}/${indexes.length} performance indexes`);
      } catch (err) {
        logger.warn('Could not check table existence, skipping index creation', { error: (err as Error).message });
      }
    }
  },

  {
    id: '003',
    name: 'add_projects_status_column',
    description: 'Add status column to Projects table',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          ALTER TABLE "Projects" 
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        `);
        logger.info('✅ Added status column to Projects table');
      } catch (err) {
        logger.warn('Could not add status column to Projects', { error: (err as Error).message });
      }
    }
  },

  {
    id: '004',
    name: 'make_auditlog_object_id_nullable',
    description: 'Make object_id column nullable in AuditLog table for operations without object IDs',
    up: async (pool: Pool) => {
      try {
        // Drop the constraint if it exists - handle both quoted and unquoted table names
        await pool.query(`
          ALTER TABLE auditlog 
          ALTER COLUMN object_id DROP NOT NULL;
        `);
        logger.info('✅ Made object_id nullable in AuditLog table');
      } catch (err) {
        logger.warn('Could not alter AuditLog object_id constraint', { error: (err as Error).message });
      }
    }
  },

  {
    id: '005',
    name: 'create_multi_lab_workflow_tables',
    description: 'Create AnalysisReports, SampleTransfers, and ReportSharing tables for multi-lab workflows',
    up: async (pool: Pool) => {
      try {
        // Create AnalysisReports table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS AnalysisReports (
            report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES Samples(id),
            lab_id UUID NOT NULL,
            lab_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            analysis_type VARCHAR(100),
            results JSONB,
            notes TEXT,
            received_at TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('✅ Created AnalysisReports table');

        // Create SampleTransfers table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SampleTransfers (
            transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES Samples(id),
            from_lab_id UUID NOT NULL,
            to_lab_id UUID NOT NULL,
            project_id UUID NOT NULL,
            shared_metadata JSONB,
            metadata_visibility VARCHAR(50) DEFAULT 'basic',
            status VARCHAR(50) DEFAULT 'pending',
            sent_date TIMESTAMP,
            received_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('✅ Created SampleTransfers table');

        // Create ReportSharing table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ReportSharing (
            sharing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL REFERENCES AnalysisReports(report_id),
            shared_with_company_id UUID NOT NULL,
            access_level VARCHAR(50) DEFAULT 'view',
            shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('✅ Created ReportSharing table');

        // Create indexes for performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_analysis_reports_sample_id ON AnalysisReports(sample_id);
          CREATE INDEX IF NOT EXISTS idx_analysis_reports_lab_id ON AnalysisReports(lab_id);
          CREATE INDEX IF NOT EXISTS idx_analysis_reports_status ON AnalysisReports(status);
        `);
        logger.info('✅ Created indexes on AnalysisReports table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_sample_transfers_sample_id ON SampleTransfers(sample_id);
          CREATE INDEX IF NOT EXISTS idx_sample_transfers_from_to ON SampleTransfers(from_lab_id, to_lab_id);
          CREATE INDEX IF NOT EXISTS idx_sample_transfers_status ON SampleTransfers(status);
        `);
        logger.info('✅ Created indexes on SampleTransfers table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_report_sharing_report_id ON ReportSharing(report_id);
          CREATE INDEX IF NOT EXISTS idx_report_sharing_company_id ON ReportSharing(shared_with_company_id);
        `);
        logger.info('✅ Created indexes on ReportSharing table');

      } catch (err) {
        logger.error('Error creating multi-lab workflow tables', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '006',
    name: 'create_role_based_access_control_tables',
    description: 'Create ProjectTeam, UserRolePermissions, ReportAccess, and SampleAccess tables for RBAC',
    up: async (pool: Pool) => {
      try {
        // Create ProjectTeam table - assigns employees to projects
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ProjectTeam (
            assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES Projects(id),
            user_id UUID NOT NULL REFERENCES Users(id),
            workspace_id UUID NOT NULL REFERENCES Workspace(id),
            company_id UUID NOT NULL,
            assigned_role VARCHAR(50) NOT NULL,
            assigned_by UUID NOT NULL REFERENCES Users(id),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, user_id)
          );
        `);
        logger.info('✅ Created ProjectTeam table');

        // Create UserRolePermissions table - defines what roles can do
        await pool.query(`
          CREATE TABLE IF NOT EXISTS UserRolePermissions (
            permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            allowed BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role, resource_type, action)
          );
        `);
        logger.info('✅ Created UserRolePermissions table');

        // Create ReportAccess table - user-level report access
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ReportAccess (
            access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL REFERENCES AnalysisReports(report_id),
            user_id UUID NOT NULL REFERENCES Users(id),
            workspace_id UUID NOT NULL REFERENCES Workspace(id),
            access_level VARCHAR(50) DEFAULT 'view',
            can_share BOOLEAN DEFAULT false,
            shared_by_user_id UUID REFERENCES Users(id),
            shared_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(report_id, user_id)
          );
        `);
        logger.info('✅ Created ReportAccess table');

        // Create SampleAccess table - user-level sample access
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SampleAccess (
            access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES Samples(id),
            user_id UUID NOT NULL REFERENCES Users(id),
            workspace_id UUID NOT NULL REFERENCES Workspace(id),
            access_level VARCHAR(50) DEFAULT 'view',
            can_share BOOLEAN DEFAULT false,
            shared_by_user_id UUID REFERENCES Users(id),
            shared_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sample_id, user_id)
          );
        `);
        logger.info('✅ Created SampleAccess table');

        // Create indexes for performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_project_team_project ON ProjectTeam(project_id);
          CREATE INDEX IF NOT EXISTS idx_project_team_user ON ProjectTeam(user_id);
          CREATE INDEX IF NOT EXISTS idx_project_team_workspace ON ProjectTeam(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_project_team_role ON ProjectTeam(assigned_role);
        `);
        logger.info('✅ Created indexes on ProjectTeam table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON UserRolePermissions(role);
          CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON UserRolePermissions(resource_type);
          CREATE INDEX IF NOT EXISTS idx_role_permissions_action ON UserRolePermissions(action);
        `);
        logger.info('✅ Created indexes on UserRolePermissions table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_report_access_report ON ReportAccess(report_id);
          CREATE INDEX IF NOT EXISTS idx_report_access_user ON ReportAccess(user_id);
          CREATE INDEX IF NOT EXISTS idx_report_access_workspace ON ReportAccess(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_report_access_level ON ReportAccess(access_level);
        `);
        logger.info('✅ Created indexes on ReportAccess table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_sample_access_sample ON SampleAccess(sample_id);
          CREATE INDEX IF NOT EXISTS idx_sample_access_user ON SampleAccess(user_id);
          CREATE INDEX IF NOT EXISTS idx_sample_access_workspace ON SampleAccess(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_sample_access_level ON SampleAccess(access_level);
        `);
        logger.info('✅ Created indexes on SampleAccess table');

        // Pre-populate UserRolePermissions with default rules
        await pool.query(`
          INSERT INTO UserRolePermissions (role, resource_type, action, allowed) VALUES
          -- Admin can do everything
          ('admin', 'sample', 'view', true),
          ('admin', 'sample', 'create', true),
          ('admin', 'sample', 'edit', true),
          ('admin', 'sample', 'delete', true),
          ('admin', 'sample', 'share', true),
          ('admin', 'report', 'view', true),
          ('admin', 'report', 'create', true),
          ('admin', 'report', 'edit', true),
          ('admin', 'report', 'delete', true),
          ('admin', 'report', 'share', true),
          ('admin', 'project', 'view', true),
          ('admin', 'project', 'edit', true),
          ('admin', 'project', 'share', true),
          
          -- Manager can view, create, edit, share (not delete)
          ('manager', 'sample', 'view', true),
          ('manager', 'sample', 'create', true),
          ('manager', 'sample', 'edit', true),
          ('manager', 'sample', 'share', true),
          ('manager', 'report', 'view', true),
          ('manager', 'report', 'create', true),
          ('manager', 'report', 'edit', true),
          ('manager', 'report', 'share', true),
          ('manager', 'project', 'view', true),
          
          -- Scientist can view, create, edit (not delete or share)
          ('scientist', 'sample', 'view', true),
          ('scientist', 'sample', 'create', true),
          ('scientist', 'sample', 'edit', true),
          ('scientist', 'report', 'view', true),
          ('scientist', 'report', 'create', true),
          ('scientist', 'report', 'edit', true),
          ('scientist', 'project', 'view', true),
          
          -- Viewer can only view
          ('viewer', 'sample', 'view', true),
          ('viewer', 'report', 'view', true),
          ('viewer', 'project', 'view', true)
          ON CONFLICT (role, resource_type, action) DO NOTHING;
        `);
        logger.info('✅ Pre-populated UserRolePermissions with default rules');

      } catch (err) {
        logger.error('Error creating role-based access control tables', { error: (err as Error).message });
        throw err;
      }
    }
  }

  // Add more migrations here as your database evolves
];

/**
 * Run pending migrations
 * 
 * @param pool - PostgreSQL connection pool
 * @returns true if migrations ran, false if already executed
 */
export async function runMigrations(pool: Pool): Promise<boolean> {
  try {
    logger.info('🔍 Checking for pending database migrations...');

    // 1. Ensure migrations table exists
    const migrationTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      );
    `);
    const migrationsTableExists = migrationTableResult.rows[0].exists;

    if (!migrationsTableExists) {
      logger.info('📝 Initializing migration system...');
    }

    // 2. Get list of already-executed migrations
    let executedMigrations: string[] = [];
    try {
      const result = await pool.query(`
        SELECT migration_id FROM schema_migrations;
      `);
      executedMigrations = result.rows.map((row) => row.migration_id);
    } catch (err) {
      // Table doesn't exist yet, will be created in first migration
      logger.debug('Migration table not ready yet, will be created');
    }

    // 3. Find pending migrations
    const pendingMigrations = migrations.filter(
      (m) => !executedMigrations.includes(m.id)
    );

    if (pendingMigrations.length === 0) {
      logger.info('✅ Database is up to date. No pending migrations.');
      return false;
    }

    // 4. Execute pending migrations in order
    logger.info(`🚀 Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      logger.info(`\n  ⏳ Running: ${migration.name}`);
      logger.info(`     ${migration.description}`);

      try {
        // Run migration
        await migration.up(pool);

        // Record migration in history
        await pool.query(
          `
          INSERT INTO schema_migrations (migration_id, migration_name)
          VALUES ($1, $2)
          ON CONFLICT (migration_id) DO NOTHING;
          `,
          [migration.id, migration.name]
        );

        logger.info(`  ✅ ${migration.name} completed`);
      } catch (error) {
        logger.error(`  ❌ ${migration.name} FAILED`, {
          error: error instanceof Error ? error.message : String(error),
          migration: migration.id
        });
        throw error; // Don't continue if migration fails
      }
    }

    logger.info(`\n✅ All migrations completed successfully!\n`);
    return true;
  } catch (error) {
    logger.error('❌ Migration failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't crash the server, but log prominently
    console.error('\n⚠️  DATABASE MIGRATION FAILED ⚠️');
    console.error('Check logs and resolve before deploying to production');
    console.error('Error:', error, '\n');
    throw error;
  }
}

/**
 * Get migration status
 * 
 * @param pool - PostgreSQL connection pool
 * @returns Description of all migrations and their status
 */
export async function getMigrationStatus(pool: Pool): Promise<string> {
  try {
    const result = await pool.query(`
      SELECT migration_id, migration_name, executed_at 
      FROM schema_migrations 
      ORDER BY executed_at ASC;
    `);

    const allMigrations = migrations.map((m) => m.id).sort();
    const executedMigrations = result.rows.map((row) => row.migration_id);

    let status = 'Database Migrations Status:\n';
    status += '='.repeat(50) + '\n';

    for (const migration of migrations) {
      const executed = executedMigrations.includes(migration.id);
      const status_icon = executed ? '✅' : '⏳';
      const timestamp = result.rows.find((r) => r.migration_id === migration.id)
        ?.executed_at;
      const time_str = timestamp ? new Date(timestamp).toISOString() : 'pending';

      status += `${status_icon} [${migration.id}] ${migration.name}\n`;
      status += `   ${migration.description}\n`;
      status += `   Executed: ${time_str}\n\n`;
    }

    status += '='.repeat(50) + '\n';
    status += `Total: ${executedMigrations.length}/${migrations.length} migrations executed`;

    return status;
  } catch (error) {
    return `Error getting migration status: ${error instanceof Error ? error.message : String(error)}`;
  }
}
