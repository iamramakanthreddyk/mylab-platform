import { pool } from './src/db';

async function fixSubscriptions() {
  const client = await pool.connect();
  try {
    console.log('\n🔧 FIXING: Assigning Plans to Admin Workspaces\n');

    // Get the default plan - Professional tier
    const planResult = await client.query(
      `SELECT id, name, max_projects FROM Plans WHERE is_active = true ORDER BY created_at LIMIT 1`
    );

    if (planResult.rows.length === 0) {
      console.error('❌ No active plans found! Creating a default Professional plan...');
      
      // Create a default Professional plan
      const createPlanResult = await client.query(`
        INSERT INTO Plans (name, tier, is_active, max_projects, max_users, max_storage_gb, price_monthly)
        VALUES ('Professional', 'professional', true, 50, 100, 1000, 99.99)
        RETURNING id, name, max_projects
      `);
      
      const defaultPlan = createPlanResult.rows[0];
      console.log(`✅ Created default plan: ${defaultPlan.name} (${defaultPlan.max_projects} max projects)\n`);
      
      // Now assign to workspaces
      await assignPlansToWorkspaces(client, defaultPlan.id);
    } else {
      const defaultPlan = planResult.rows[0];
      console.log(`📋 Using plan: ${defaultPlan.name} (${defaultPlan.max_projects} max projects)\n`);
      await assignPlansToWorkspaces(client, defaultPlan.id);
    }

    console.log('\n✅ All workspaces now have subscription plans!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function assignPlansToWorkspaces(client: any, planId: string) {
  // Get all workspaces that don't have subscriptions
  const workspacesResult = await client.query(`
    SELECT id, name FROM Organizations
    WHERE id NOT IN (SELECT DISTINCT workspace_id FROM Subscriptions WHERE deleted_at IS NULL)
    AND deleted_at IS NULL
  `);

  const workspacesWithoutPlan = workspacesResult.rows;
  console.log(`Found ${workspacesWithoutPlan.length} workspaces without plans\n`);

  for (const org of workspacesWithoutPlan) {
    try {
      const existingSub = await client.query(
        `SELECT id FROM Subscriptions WHERE workspace_id = $1`,
        [org.id]
      );

      if (existingSub.rows.length === 0) {
        // Create subscription
        await client.query(`
          INSERT INTO Subscriptions (workspace_id, organization_id, plan_id, status, auto_renew, trial_ends_at)
          VALUES ($1, $2, $3, 'active', true, NOW() + INTERVAL '30 days')
        `, [org.id, org.id, planId]);
        
        console.log(`✅ ${org.name}: Subscription created`);
      } else {
        console.log(`⏭️  ${org.name}: Already has subscription`);
      }
    } catch (error: any) {
      console.error(`❌ ${org.name}: ${error.message}`);
    }
  }
}

fixSubscriptions().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
