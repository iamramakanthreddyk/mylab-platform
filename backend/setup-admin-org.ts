import { pool } from './src/db';

(async () => {
  try {
    console.log('\n🔧 Setting up admin organization with plan...\n');
    
    // Get the admin user again
    const adminResult = await pool.query(
      'SELECT id, email, workspace_id FROM users WHERE email = $1',
      ['admin@tekflowlabs.com']
    );
    
    const admin = adminResult.rows[0] as any;
    const workspaceId = admin.workspace_id;

    // Check if enterprise plan exists
    const planResult = await pool.query(
      `SELECT id FROM plans WHERE tier = 'enterprise' AND is_active = true LIMIT 1`
    );
    
    if (planResult.rows.length === 0) {
      console.log('❌ No active enterprise plan found. Creating one...');
      const createPlan = await pool.query(`
        INSERT INTO plans (name, tier, max_projects, is_active)
        VALUES ('Enterprise', 'enterprise', 200, true)
        RETURNING id
      `);
      console.log('✅ Created enterprise plan');
    }

    const planId = planResult.rows[0]?.id || (await pool.query(
      `SELECT id FROM plans WHERE tier = 'enterprise' AND is_active = true LIMIT 1`
    )).rows[0].id;

    // Create admin's organization (with workspace_id = NULL, as organizations are self-contained)
    const createOrgResult = await pool.query(`
      INSERT INTO organizations (id, name, type, is_platform_workspace, workspace_id, plan_id, is_active, slug)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, plan_id
    `, [
      workspaceId,
      "Admin's Organization",
      'client',
      false,
      null,  // workspace_id = NULL
      planId,
      true,
      'admin-org-' + Date.now()
    ]);

    const newOrg = createOrgResult.rows[0] as any;
    console.log('✅ Created admin organization:');
    console.log(`   Name: ${newOrg.name}`);
    console.log(`   ID: ${newOrg.id}`);
    console.log(`   Plan ID: ${newOrg.plan_id}`);

    // Verify setup
    console.log('\n✅ Verification:');
    const verify = await pool.query(`
      SELECT o.id, o.name, o.type, p.name as plan_name, p.max_projects
      FROM organizations o
      LEFT JOIN plans p ON o.plan_id = p.id
      WHERE o.id = $1
    `, [workspaceId]);

    if (verify.rows.length > 0) {
      const org = verify.rows[0] as any;
      console.log(`   Organization: ${org.name}`);
      console.log(`   Plan: ${org.plan_name}`);
      console.log(`   Max Projects: ${org.max_projects}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
