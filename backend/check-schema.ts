import { pool } from './src/db';

async function checkSchema() {
  try {
    // Check structure of a few tables with lowercase names
    const checkTables = ['plans', 'subscriptions', 'features', 'lastlogin', 'usagemetrics'];
    
    for (const table of checkTables) {
      const cols = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      console.log(`\n🔍 ${table.toUpperCase()}:`);
      if (cols.rows.length === 0) {
        console.log(`   ❌ No columns found`);
      } else {
        cols.rows.forEach(col => console.log(`   - ${col.column_name}`));
      }
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();
