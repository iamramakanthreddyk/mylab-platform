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
const MIGRATIONS_VERSION = '001';

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
      // Create indexes only if they don't exist
      const indexes = [
        {
          name: 'idx_workspace_id_analyses',
          table: 'Analyses',
          columns: ['workspace_id'],
          query: `CREATE INDEX IF NOT EXISTS idx_workspace_id_analyses ON "Analyses"("workspace_id");`
        },
        {
          name: 'idx_user_id_users',
          table: 'Users',
          columns: ['user_id'],
          query: `CREATE INDEX IF NOT EXISTS idx_user_id_users ON "Users"("user_id");`
        },
        {
          name: 'idx_created_at_analyses',
          table: 'Analyses',
          columns: ['created_at'],
          query: `CREATE INDEX IF NOT EXISTS idx_created_at_analyses ON "Analyses"("created_at");`
        },
        {
          name: 'idx_analysis_type',
          table: 'Analyses',
          columns: ['analysis_type'],
          query: `CREATE INDEX IF NOT EXISTS idx_analysis_type ON "Analyses"("analysis_type");`
        },
        {
          name: 'idx_supersedes_id_fk',
          table: 'Analyses',
          columns: ['supersedes_id'],
          query: `
            CREATE INDEX IF NOT EXISTS idx_supersedes_id_fk ON "Analyses"("supersedes_id");
            ALTER TABLE "Analyses" 
            DROP CONSTRAINT IF EXISTS fk_supersedes,
            ADD CONSTRAINT fk_supersedes FOREIGN KEY ("supersedes_id") 
            REFERENCES "Analyses"("id") ON DELETE CASCADE;
          `
        },
      ];

      for (const index of indexes) {
        await pool.query(index.query);
        logger.info(`  ✓ ${index.name}`);
      }
      logger.info('✅ Created performance indexes');
    }
  }

  // Add more migrations here as your database evolves
  // Example:
  // {
  //   id: '003',
  //   name: 'add_user_preferences_column',
  //   description: 'Add preferences column to users table',
  //   up: async (pool: Pool) => {
  //     await pool.query(`ALTER TABLE "Users" ADD COLUMN preferences JSONB DEFAULT '{}';`);
  //     logger.info('✅ Added preferences column to Users table');
  //   }
  // }
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
