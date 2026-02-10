import { pool } from './src/db';

async function checkSubsCols() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Subscriptions table columns:\n');
    if (result.rows.length === 0) {
      console.log('  No columns found!');
    } else {
      result.rows.forEach(row => {
        const nullable = row.is_nullable === 'YES' ? 'nullable' : 'required';
        console.log(`  ${row.column_name}: ${row.data_type} (${nullable})`);
      });
    }
    
    console.log('\n');
    
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSubsCols();
