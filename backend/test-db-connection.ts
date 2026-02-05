import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, './.env.local') });

async function testDatabaseConnection() {
  console.log('🧪 Testing PostgreSQL Database Connection...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  console.log();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test 1: Connect to database
    console.log('1️⃣  Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('   ✅ Connected successfully');
    console.log(`   Current time: ${result.rows[0].now}\n`);

    // Test 2: Check enum types
    console.log('2️⃣  Checking enum types...');
    const enumResult = await pool.query(`
      SELECT typname FROM pg_type 
      WHERE typtype = 'e' AND typname LIKE '%type' OR typname LIKE '%status' OR typname IN ('audit_action', 'execution_mode')
      ORDER BY typname
    `);
    if (enumResult.rows.length > 0) {
      console.log(`   ✅ Found ${enumResult.rows.length} enum types:`);
      enumResult.rows.forEach(row => console.log(`      - ${row.typname}`));
    }
    console.log();

    // Test 3: Check tables
    console.log('3️⃣  Checking database tables...');
    const tableResult = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log(`   ✅ Found ${tableResult.rows.length} tables:`);
    tableResult.rows.forEach(row => console.log(`      - ${row.tablename}`));
    console.log();

    // Test 4: Check record counts
    console.log('4️⃣  Checking data in tables...');
    const tables = tableResult.rows.map(r => r.tablename);
    for (const table of tables.slice(0, 5)) { // Check first 5 tables
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = countResult.rows[0].count;
      console.log(`   - ${table}: ${count} records`);
    }
    console.log();

    // Test 5: Test data insertion
    console.log('5️⃣  Testing data insertion...');
    const testInsert = await pool.query(`
      INSERT INTO Organizations (name, type, is_platform_workspace)
      VALUES ($1, $2, $3)
      RETURNING id, name, type
    `, ['Test Org', 'client', false]);
    
    if (testInsert.rows.length > 0) {
      console.log('   ✅ Successfully inserted test data:');
      console.log(`      ID: ${testInsert.rows[0].id}`);
      console.log(`      Name: ${testInsert.rows[0].name}`);
      console.log(`      Type: ${testInsert.rows[0].type}`);
      console.log();

      // Clean up test data
      await pool.query('DELETE FROM Organizations WHERE id = $1', [testInsert.rows[0].id]);
      console.log('   ✅ Cleaned up test data\n');
    }

    console.log('✅ All tests passed! Your database is ready to use.\n');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

testDatabaseConnection();
