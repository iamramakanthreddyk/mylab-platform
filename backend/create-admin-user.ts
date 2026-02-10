import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, './.env.local') });

async function createAdminUser() {
  console.log('🔧 Creating admin user for TechLab Solutions...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    console.log('1️⃣  Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Connected successfully\n');

    // Find the organization
    console.log('2️⃣  Finding TechLab Solutions organization...');
    const orgResult = await pool.query(
      'SELECT * FROM Organizations WHERE name = $1',
      ['TechLab Solutions']
    );

    if (orgResult.rows.length === 0) {
      console.log('   ❌ Organization TechLab Solutions not found');
      return;
    }

    const org = orgResult.rows[0];
    console.log('   ✅ Found organization:', org.name);
    console.log('   📍 Workspace ID:', org.workspace_id);
    console.log();

    // Check if admin user already exists
    console.log('3️⃣  Checking for existing admin user...');
    const existingUser = await pool.query(
      'SELECT * FROM Users WHERE workspace_id = $1 AND role = $2',
      [org.workspace_id, 'admin']
    );

    if (existingUser.rows.length > 0) {
      console.log('   ✅ Admin user already exists:', existingUser.rows[0].email);
      return;
    }

    console.log('   ℹ️  No admin user found, creating one...\n');

    // Create admin user
    const adminEmail = 'admin@techlabsolutions.com';
    const adminPassword = 'TempPass123!'; // Temporary password

    console.log('4️⃣  Creating admin user...');
    console.log('   📧 Email:', adminEmail);
    console.log('   🔑 Password:', adminPassword);

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const userResult = await pool.query(
      `INSERT INTO Users (workspace_id, email, name, role, password_hash)
       VALUES ($1, $2, $3, 'admin'::user_role, $4)
       RETURNING id, email, name, role`,
      [org.workspace_id, adminEmail, 'TechLab Admin', passwordHash]
    );

    console.log('   ✅ Admin user created successfully!');
    console.log('   👤 User ID:', userResult.rows[0].id);
    console.log('   📧 Email:', userResult.rows[0].email);
    console.log('   👑 Role:', userResult.rows[0].role);
    console.log();
    console.log('⚠️  IMPORTANT: Please change the password after first login!');
    console.log('🔐 Temporary Password:', adminPassword);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser().catch(console.error);