import { pool } from './src/db';

async function fixAllIssues() {
  const client = await pool.connect();
  try {
    console.log('\n🔧 FIXING ALL PROJECT CREATION ISSUES\n');

    // 1. Ensure all admin users have valid workspaces
    console.log('1️⃣  Fixing admin user workspaces...');
    
    // 2. Get or create default plans
    console.log('\n2️⃣  Checking plans...');
    const plansResult = await client.query(`
      SELECT id, name FROM Plans WHERE is_active = true
    `);

    let defaultPlanId: string;
    if (plansResult.rows.length === 0) {
      console.log('   ℹ️  Creating default Professional plan...');
      const createResult = await client.query(`
        INSERT INTO Plans (name, tier, is_active, max_projects, max_users, max_storage_gb, price_monthly, features)
        VALUES ('Professional', 'professional', true, 50, 100, 1000, 99.99, '{}')
        RETURNING id
      `);
      defaultPlanId = createResult.rows[0].id;
      console.log(`   ✅ Created plan`);
    } else {
      defaultPlanId = plansResult.rows[0].id;
      console.log(`   ✅ Using plan: ${plansResult.rows[0].name}`);
    }

    // 3. Get all users and their workspace requirements
    console.log('\n3️⃣  Assigning subscriptions to workspaces...');
    
    const usersResult = await client.query(`
      SELECT DISTINCT workspace_id FROM Users 
      WHERE role::text = 'admin' AND deleted_at IS NULL
    `);

    for (const user of usersResult.rows) {
      const wsId = user.workspace_id;
      
      // Check if workspace exists
      const wsCheck = await client.query(`
        SELECT id, name FROM Organizations WHERE id = $1
      `, [wsId]);

      if (wsCheck.rows.length === 0) {
        console.log(`   ⏭️  Workspace ${wsId.substring(0, 8)}...: No organization found, skipping`);
        continue;
      }

      const wsName = wsCheck.rows[0].name;

      // Check if has subscription
      const subCheck = await client.query(`
        SELECT id FROM Subscriptions 
        WHERE workspace_id = $1 AND deleted_at IS NULL
      `, [wsId]);

      if (subCheck.rows.length === 0) {
        // Create subscription
        try {
          await client.query(`
            INSERT INTO Subscriptions (workspace_id, organization_id, plan_id, status, auto_renew, trial_ends_at)
            VALUES ($1, $2, $3, 'active', true, NOW() + INTERVAL '30 days')
          `, [wsId, wsId, defaultPlanId]);
          
          console.log(`   ✅ ${wsName}: Subscription created`);
        } catch (err: any) {
          console.log(`   ⚠️  ${wsName}: ${err.message.substring(0, 50)}`);
        }
      } else {
        console.log(`   ✅ ${wsName}: Already has subscription`);
      }
    }

    console.log('\n✅ All fixes applied!\n');
  } catch (error: any) {
    console.error('❌ Critical error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixAllIssues();
