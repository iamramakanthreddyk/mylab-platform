import { pool } from './src/db';

async function checkWorkspace() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'workspace'
      ORDER BY ordinal_position
    `);
    
    console.log('Workspace Table Columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'workspace'::regclass
    `);
    
    console.log('\nConstraints:');
    constraints.rows.forEach(row => {
      console.log(`  ${row.conname} (${row.contype}): ${row.pg_get_constraintdef}`);
    });
    
    // Check current data
    const data = await pool.query('SELECT * FROM workspace LIMIT 5');
    console.log(`\nCurrent rows: ${data.rows.length}`);
    data.rows.forEach(row => {
      console.log(`  ID:${row.id}, Name: ${row.name || 'N/A'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWorkspace();
