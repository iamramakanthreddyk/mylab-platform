#!/usr/bin/env ts-node
/**
 * Fix All Constraint Violations
 * Applies immediate fixes to resolve all foreign key constraint violations
 */

import { Pool } from 'pg';

async function fixAllConstraints(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Starting constraint violation fixes...\n');

    // Step 1: Drop problematic constraints
    console.log('1️⃣ Dropping problematic constraints...');
    await pool.query('ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "users_workspace_id_fkey" CASCADE;');
    await pool.query('ALTER TABLE "LastLogin" DROP CONSTRAINT IF EXISTS "lastlogin_workspace_id_fkey" CASCADE;');
    await pool.query('ALTER TABLE "BatchItems" DROP CONSTRAINT IF EXISTS "batchitems_workspace_id_fkey" CASCADE;');
    await pool.query('ALTER TABLE "BatchItems" DROP CONSTRAINT IF EXISTS "batchitems_original_workspace_id_fkey" CASCADE;');
    console.log('   ✅ Constraints dropped\n');

    // Step 2: Add missing columns to BatchItems
    console.log('2️⃣ Adding missing columns to BatchItems...');
    await pool.query(`ALTER TABLE "BatchItems" ADD COLUMN IF NOT EXISTS workspace_id UUID;`);
    await pool.query(`ALTER TABLE "BatchItems" ADD COLUMN IF NOT EXISTS original_workspace_id UUID;`);
    console.log('   ✅ Columns added\n');

    // Step 3: Clean up invalid data in Users
    console.log('3️⃣ Cleaning up invalid data in Users...');
    const usersResult = await pool.query(`
      DELETE FROM "Users" 
      WHERE workspace_id IS NOT NULL 
        AND workspace_id NOT IN (SELECT id FROM "Organizations")
      RETURNING id;
    `);
    console.log(`   ✅ Removed ${usersResult.rows.length} invalid user records\n`);

    // Step 4: Clean up invalid data in LastLogin
    console.log('4️⃣ Cleaning up invalid data in LastLogin...');
    const lastLoginResult1 = await pool.query(`
      DELETE FROM "LastLogin"
      WHERE user_id NOT IN (SELECT id FROM "Users")
      RETURNING id;
    `);
    const lastLoginResult2 = await pool.query(`
      DELETE FROM "LastLogin"
      WHERE workspace_id NOT IN (SELECT id FROM "Organizations")
      RETURNING id;
    `);
    console.log(`   ✅ Removed ${lastLoginResult1.rows.length + lastLoginResult2.rows.length} invalid lastlogin records\n`);

    // Step 5: Populate workspace_id for BatchItems from related batch
    console.log('5️⃣ Populating BatchItems workspace_id from Batches...');
    await pool.query(`
      UPDATE "BatchItems" b
      SET workspace_id = ba.workspace_id
      FROM "Batches" ba
      WHERE b.batch_id = ba.id AND b.workspace_id IS NULL;
    `);
    console.log('   ✅ BatchItems workspace_id populated\n');

    // Step 6: Recreate Users constraint
    console.log('6️⃣ Recreating Users.workspace_id constraint...');
    await pool.query(`
      ALTER TABLE "Users"
      ADD CONSTRAINT users_workspace_id_fkey 
      FOREIGN KEY (workspace_id) REFERENCES "Organizations"(id) ON DELETE SET NULL;
    `);
    console.log('   ✅ Users constraint recreated (ON DELETE SET NULL)\n');

    // Step 7: Recreate LastLogin constraint
    console.log('7️⃣ Recreating LastLogin.workspace_id constraint...');
    await pool.query(`
      ALTER TABLE "LastLogin"
      ADD CONSTRAINT lastlogin_workspace_id_fkey 
      FOREIGN KEY (workspace_id) REFERENCES "Organizations"(id) ON DELETE CASCADE;
    `);
    console.log('   ✅ LastLogin constraint recreated\n');

    // Step 8: Recreate BatchItems constraints
    console.log('8️⃣ Recreating BatchItems constraints...');
    await pool.query(`
      ALTER TABLE "BatchItems"
      ADD CONSTRAINT batchitems_workspace_id_fkey 
      FOREIGN KEY (workspace_id) REFERENCES "Organizations"(id) ON DELETE CASCADE;
    `);
    await pool.query(`
      ALTER TABLE "BatchItems"
      ADD CONSTRAINT batchitems_original_workspace_id_fkey 
      FOREIGN KEY (original_workspace_id) REFERENCES "Organizations"(id) ON DELETE SET NULL;
    `);
    console.log('   ✅ BatchItems constraints recreated\n');

    // Step 9: Verify constraints
    console.log('9️⃣ Verifying all constraints...');
    const constraintCheck = await pool.query(`
      SELECT constraint_name, table_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name IN ('Users', 'LastLogin', 'BatchItems')
        AND constraint_name LIKE '%workspace%'
      ORDER BY table_name, constraint_name;
    `);
    
    console.log(`   Found ${constraintCheck.rows.length} workspace-related constraints:\n`);
    for (const row of constraintCheck.rows) {
      console.log(`   ✅ ${row.table_name}.${row.column_name} → ${row.constraint_name}`);
    }

    console.log('\n✨ All constraint violations have been fixed!\n');
    console.log('Summary:');
    console.log('  ✅ Users.workspace_id_fkey - recreated with ON DELETE SET NULL');
    console.log('  ✅ LastLogin.workspace_id_fkey - recreated with ON DELETE CASCADE');
    console.log('  ✅ BatchItems.workspace_id - added column and constraint');
    console.log('  ✅ BatchItems.original_workspace_id - added column and constraint');
    console.log('  ✅ All orphaned data cleaned from affected tables');

  } catch (error) {
    console.error('❌ Error fixing constraints:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixAllConstraints().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
