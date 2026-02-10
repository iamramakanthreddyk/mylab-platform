import { pool } from './src/db';

(async () => {
  try {
    console.log('\n✅ FINAL VERIFICATION\n');
    console.log('='.repeat(60));
    
    // Check admin user
    const admin = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['admin@tekflowlabs.com']
    );
    
    if (admin.rows.length > 0) {
      console.log('\n👤 Admin User:');
      console.log(`   Email: ${admin.rows[0].email}`);
      console.log(`   Role: ${admin.rows[0].role}`);
      console.log(`   ✅ READY`);
    }

    // Check organizations
    const orgs = await pool.query(`
      SELECT id, name, type, plan_id, is_active 
      FROM organizations 
      WHERE deleted_at IS NULL 
      ORDER BY name
    `);

    console.log(`\n📋 Organizations (${orgs.rows.length} total):`);
    orgs.rows.forEach((org: any, i: number) => {
      console.log(`   ${i + 1}. ${org.name} (${org.type})`);
      console.log(`      ID: ${org.id}`);
      console.log(`      Plan: ${org.plan_id || 'None'}`);
    });

    // Check organizations with plans
    const withPlans = await pool.query(`
      SELECT o.name, p.name as plan_name, p.max_projects
      FROM organizations o
      LEFT JOIN plans p ON o.plan_id = p.id
      WHERE o.deleted_at IS NULL
      ORDER BY o.name
    `);

    console.log('\n💳 Organizations with Plans:');
    withPlans.rows.forEach((row: any) => {
      console.log(`   ${row.name}: ${row.plan_name || 'No plan'} (${row.max_projects || 'N/A'} projects)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup Complete\n');

    process.exit(0);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
