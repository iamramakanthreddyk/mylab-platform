import { pool } from './src/db';

async function checkOrgSchema() {
  try {
    console.log('\n📋 Organizations Table Schema:\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      ORDER BY ordinal_position
    `);

    console.log('Columns:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });

    // Check if workspace_id exists
    const hasWorkspaceId = result.rows.some(col => col.column_name === 'workspace_id');
    console.log(`\nHas workspace_id column: ${hasWorkspaceId ? '✅ YES' : '❌ NO'}`);

    // Check actual data
    console.log('\n📊 Sample Organizations:');
    const orgs = await pool.query(`
      SELECT id, name, type LIMIT 5
    `);
    orgs.rows.forEach(org => {
      console.log(`  - ${org.name} (id: ${org.id.substring(0, 12)}...)`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkOrgSchema();
