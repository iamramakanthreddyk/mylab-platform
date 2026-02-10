import { pool } from './src/db';
import { v4 as uuidv4 } from 'uuid';

(async () => {
  try {
    console.log('\n🔧 Recreating Admin Organization...\n');
    
    const admin = (await pool.query(
      'SELECT id, email, workspace_id FROM users WHERE email = $1',
      ['admin@tekflowlabs.com']
    )).rows[0] as any;

    const workspaceId = admin.workspace_id;
    console.log(`Admin workspace_id: ${workspaceId}`);

    // Get enterprise plan
    const plan = (await pool.query(
      `SELECT id FROM plans WHERE tier = 'enterprise' AND is_active = true LIMIT 1`
    )).rows[0] as any;

    const planId = plan.id;
    console.log(`Enterprise plan_id: ${planId}\n`);

    // Create org with fresh UUID
    const orgId = workspaceId;  // Use workspace_id as organization ID
    const slug = 'admin-org-' + Date.now();

    console.log(`Creating organization:
   ID: ${orgId}
   Name: Admin's Organization
   Type: client
   Slug: ${slug}
   Plan: ${planId}
   Workspace: null\n`);

    const result = await pool.query(`
      INSERT INTO organizations 
        (id, name, type, is_platform_workspace, workspace_id, plan_id, is_active, slug)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE 
      SET name = $2, type = $3, plan_id = $6, updated_at = NOW()
      RETURNING id, name, type, plan_id
    `, [orgId, "Admin's Organization", 'client', false, null, planId, true, slug]);

    if (result.rows.length > 0) {
      const org = result.rows[0] as any;
      console.log('✅ Organization created/updated:');
      console.log(`   ID: ${org.id}`);
      console.log(`   Name: ${org.name}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Plan: ${org.plan_id}`);
    }

    // Verify
    console.log('\n📋 Verifying all organizations:\n');
    const all = await pool.query(
      `SELECT id, name, type, deleted_at FROM organizations WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
    
    all.rows.forEach((o: any) => {
      console.log(`✅ ${o.name} (${o.type})`);
    });

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    console.error(err.detail);
    process.exit(1);
  }
})();
