import { pool } from './src/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Initialize Platform Superadmin
 * Creates the first platform administrator user with full system access
 * 
 * Run: npx ts-node init-superadmin.ts
 */

async function initializeSuperAdmin() {
  try {
    console.log('🚀 Initializing Platform Superadmin...');

    // Check if platform admin already exists
    const existingAdmin = await pool.query(
      `SELECT id, email FROM Users WHERE role = 'platform_admin' LIMIT 1`
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Platform admin already exists:');
      console.log(`   Email: ${existingAdmin.rows[0].email}`);
      console.log(`   ID: ${existingAdmin.rows[0].id}`);
      process.exit(0);
    }

    // Get credentials from environment or use defaults for dev
    const email = process.env.SUPERADMIN_EMAIL || 'admin@mylab-platform.com';
    const password = process.env.SUPERADMIN_PASSWORD || generateSecurePassword();
    const name = process.env.SUPERADMIN_NAME || 'Platform Administrator';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create platform admin user (no organization - manages all)
    const result = await pool.query(
      `
      INSERT INTO Users (
        email, 
        password_hash, 
        name, 
        role, 
        organization_id,
        workspace_id,
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, NULL, NULL, NOW(), NOW())
      RETURNING id, email, name, role
      `,
      [email, passwordHash, name, 'platform_admin']
    );

    const admin = result.rows[0];

    console.log('\n✅ Platform Superadmin Created Successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Email:    ${admin.email}`);
    console.log(`🔐 Password: ${password}`);
    console.log(`👤 Name:     ${admin.name}`);
    console.log(`🆔 User ID:  ${admin.id}`);
    console.log(`🎭 Role:     ${admin.role}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('   The password will not be shown again.\n');
    console.log('Next steps:');
    console.log('1. Login with these credentials');
    console.log('2. Create organizations for your clients/labs');
    console.log('3. Invite organization admins to manage their orgs');
    console.log('4. Organization admins can then invite users\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error initializing superadmin:', error);
    process.exit(1);
  }
}

function generateSecurePassword(): string {
  // Generate a secure random password for development
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(16);
  
  for (let i = 0; i < 16; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}

// Run if called directly
if (require.main === module) {
  initializeSuperAdmin();
}

export { initializeSuperAdmin };
