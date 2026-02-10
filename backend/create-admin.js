const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, './.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user for TechLab Solutions...');

    // First, find the organization
    const orgResult = await pool.query(
      'SELECT * FROM Organizations WHERE name = $1',
      ['TechLab Solutions']
    );

    if (orgResult.rows.length === 0) {
      console.log('❌ Organization TechLab Solutions not found');
      return;
    }

    const org = orgResult.rows[0];
    console.log('✅ Found organization:', org.name, 'with workspace_id:', org.workspace_id);

    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT * FROM Users WHERE workspace_id = $1 AND role = $2',
      [org.workspace_id, 'admin']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Admin user already exists:', existingUser.rows[0].email);
      return;
    }

    // Create admin user
    const adminEmail = 'admin@techlabsolutions.com';
    const adminPassword = 'TempPass123!'; // Temporary password

    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    console.log('👤 Creating admin user...');
    const userResult = await pool.query(
      `INSERT INTO Users (workspace_id, email, name, role, password_hash)
       VALUES ($1, $2, $3, 'admin'::user_role, $4)
       RETURNING id, email, name, role`,
      [org.workspace_id, adminEmail, 'TechLab Admin', passwordHash]
    );

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', userResult.rows[0].email);
    console.log('🔑 Temporary Password:', adminPassword);
    console.log('⚠️  Please change the password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();