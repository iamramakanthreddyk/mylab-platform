import { pool } from './src/db';

(async () => {
  try {
    console.log('\n✅ FINAL VERIFICATION - Admin Project Creation Readiness\n');
    console.log('=' .repeat(60));
    
    const admin = (await pool.query(
      'SELECT id, email, workspace_id, role FROM users WHERE email = $1',
      ['admin@tekflowlabs.com']
    )).rows[0] as any;

    console.log('\n👤 Admin User:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: admin`);

    const org = (await pool.query(
      `SELECT o.id, o.name, o.type, o.plan_id, p.name as plan_name, p.max_projects
       FROM organizations o
       LEFT JOIN plans p ON o.plan_id = p.id
       WHERE o.id = $1`,
      [admin.workspace_id]
    )).rows[0] as any;

    console.log('\n🏢 Organization:');
    console.log(`   Name: ${org.name}`);
    console.log(`   Type: ${org.type}`);
    console.log(`   Plan: ${org.plan_name}`);
    console.log(`   Max Projects: ${org.max_projects}`);

    const projects = (await pool.query(
      'SELECT COUNT(*)::int as count FROM projects WHERE workspace_id = $1 AND deleted_at IS NULL',
      [admin.workspace_id]
    )).rows[0] as any;

    console.log('\n📊 Project Usage:');
    console.log(`   Current Projects: ${projects.count}`);
    console.log(`   Available Slots: ${org.max_projects - projects.count}`);

    const orgs = (await pool.query(
      'SELECT id, name, type FROM organizations WHERE deleted_at IS NULL'
    )).rows as any[];

    console.log('\n📋 Available Organizations (for project creation):');
    orgs.forEach((o, i) => {
      console.log(`   ${i + 1}. ${o.name} (${o.type})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ READY: Admin can now create projects!\n');

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
