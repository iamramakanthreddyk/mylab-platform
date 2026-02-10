import { pool } from './src/db';

async function checkSchema() {
  try {
    console.log('\n📋 CURRENT SCHEMA CHECK\n');

    // Check Organizations table
    console.log('Organizations columns:');
    const orgCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organizations'
      ORDER BY ordinal_position
    `);
    orgCols.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check Subscriptions table
    console.log('\nSubscriptions columns:');
    const subCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);
    subCols.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));

    // Check current subscriptions
    console.log('\nCurrent subscriptions:');
    const subs = await pool.query(`
      SELECT s.id, s.workspace_id, s.plan_id, p.name, p.max_projects
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.deleted_at IS NULL
    `);
    console.log(`  Found ${subs.rows.length} active subscriptions`);
    subs.rows.forEach(s => {
      console.log(`    - Workspace: ${s.workspace_id.substring(0, 8)}..., Plan: ${s.name} (${s.max_projects} max)`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
