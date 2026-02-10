import { pool } from './src/db';

(async () => {
  try {
    console.log('\n🔍 Checking admin user and org setup:\n');
    
    // Get admin user
    const adminResult = await pool.query(
      'SELECT id, email, workspace_id, role FROM users WHERE email = $1',
      ['admin@tekflowlabs.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    const admin = adminResult.rows[0] as any;
    console.log('👤 Admin User:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   User ID: ${admin.id}`);
    console.log(`   Workspace ID: ${admin.workspace_id}`);
    console.log(`   Role: ${admin.role}`);

    // Get admin's organization
    const adminOrgResult = await pool.query(
      'SELECT id, name, type, plan_id, is_active FROM organizations WHERE id = $1',
      [admin.workspace_id]
    );

    if (adminOrgResult.rows.length > 0) {
      const org = adminOrgResult.rows[0] as any;
      console.log('\n🏢 Admin\'s Organization:');
      console.log(`   Name: ${org.name}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Plan ID: ${org.plan_id}`);
      console.log(`   Active: ${org.is_active}`);

      if (org.plan_id) {
        const planResult = await pool.query(
          'SELECT id, name, tier, max_projects FROM plans WHERE id = $1',
          [org.plan_id]
        );
        if (planResult.rows.length > 0) {
          const plan = planResult.rows[0] as any;
          console.log('\n📋 Organization\'s Plan:');
          console.log(`   Name: ${plan.name}`);
          console.log(`   Tier: ${plan.tier}`);
          console.log(`   Max Projects: ${plan.max_projects}`);
        }
      } else {
        console.log('\n⚠️  Organization has NO PLAN assigned!');
      }
    } else {
      console.log('\n❌ No organization found for admin!');
    }

    // List all available organizations
    console.log('\n📊 All available organizations:');
    const allOrgs = await pool.query(
      'SELECT id, name, type, plan_id, is_active FROM organizations WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    
    allOrgs.rows.forEach((o: any) => {
      console.log(`   - ${o.name} (${o.type}) | Plan: ${o.plan_id || 'None'} | Active: ${o.is_active}`);
    });

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
