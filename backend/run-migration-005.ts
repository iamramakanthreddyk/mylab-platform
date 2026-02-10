/**
 * Temporary migration runner for migration 005
 * Makes workspace_id nullable in lastlogin and auditlog tables for platform admin support
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { pool } from './src/db';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function runMigration005() {
  try {
    console.log('🚀 Running migration 005: Platform admin nullable workspace support...');
    
    // Make workspace_id nullable in lastlogin
    await pool.query(`
      ALTER TABLE lastlogin
        ALTER COLUMN workspace_id DROP NOT NULL
    `);
    console.log('✅ Made lastlogin.workspace_id nullable');
    
    // Make actor_workspace nullable in auditlog
    await pool.query(`
      ALTER TABLE auditlog
        ALTER COLUMN actor_workspace DROP NOT NULL
    `);
    console.log('✅ Made auditlog.actor_workspace nullable');
    
    // Add comments
    await pool.query(`
      COMMENT ON COLUMN lastlogin.workspace_id IS 
        'Workspace ID for the user. NULL for platform administrators who manage all workspaces.'
    `);
    
    await pool.query(`
      COMMENT ON COLUMN auditlog.actor_workspace IS 
        'Workspace ID of the actor. NULL for platform administrators who operate system-wide.'
    `);
    console.log('✅ Added column comments');
    
    console.log('✅ Migration 005 completed successfully');
  } catch (error) {
    console.error('❌ Migration 005 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration005();
