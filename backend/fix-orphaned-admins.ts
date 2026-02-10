import { pool } from './src/db';

async function fixOrphanedAdmins() {
  const client = await pool.connect();
  try {
    console.log('\n🔧 FIXING ORPHANED ADMIN USERS\n');

    // Find admin users with missing organizations
    console.log('1️⃣  Finding orphaned admin users...');
    
    const orphanedAdmins = await client.query(`
      SELECT u.id, u.email, u.name, u.workspace_id
      FROM Users u
      WHERE u.role::text = 'admin' 
        AND u.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM Organizations o WHERE o.id = u.workspace_id AND o.deleted_at IS NULL)
    `);

    console.log(`   Found ${orphanedAdmins.rows.length} orphaned admin users\n`);

    if (orphanedAdmins.rows.length === 0) {
      console.log('✅ No orphaned admins found\n');
      client.release();
      await pool.end();
      return;
    }

    // Get a plan to assign
    const planResult = await client.query(`
      SELECT id FROM Plans WHERE is_active = true LIMIT 1
    `);

    if (planResult.rows.length === 0) {
      console.log('❌ No active plans found. Creating default...\n');
      const createdPlan = await client.query(`
        INSERT INTO Plans (name, tier, is_active, max_projects, max_users, max_storage_gb, price_monthly, features)
        VALUES ('Enterprise', 'enterprise', true, 100, 500, 5000, 299.99, '{}')
        RETURNING id
      `);
      var planId = createdPlan.rows[0].id;
    } else {
      var planId = planResult.rows[0].id;
    }

    // Fix each orphaned admin
    for (const admin of orphanedAdmins.rows) {
      try {
        // Create organization for this admin
        const orgName = `${admin.name}'s Organization`;
        const slug = `${admin.name.toLowerCase().replace(/\s+/g, '-')}-${admin.id.substring(0, 8)}`;
        
        const orgResult = await client.query(`
          INSERT INTO Organizations (id, name, slug, type, is_platform_workspace)
          VALUES ($1, $2, $3, 'client', true)
          RETURNING id
        `, [admin.workspace_id, orgName, slug]);

        console.log(`✅ Created organization for: ${admin.email}`);

        // Create subscription for this organization
        const subResult = await client.query(`
          INSERT INTO subscriptions (workspace_id, plan_id, status, auto_renew, trial_ends_at)
          VALUES ($1, $2, 'active', true, NOW() + INTERVAL '30 days')
          RETURNING id
        `, [admin.workspace_id, planId]);

        console.log(`   └─ Created subscription`);
      } catch (err: any) {
        console.error(`❌ Error fixing ${admin.email}: ${err.message.substring(0, 80)}`);
      }
    }

    console.log('\n✅ All orphaned admins fixed!\n');
  } catch (error: any) {
    console.error('❌ Critical error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixOrphanedAdmins();
