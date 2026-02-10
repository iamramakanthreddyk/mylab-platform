import { pool } from './src/db';

async function createSubscriptions() {
  const client = await pool.connect();
  try {
    console.log('\n🔧 CREATING SUBSCRIPTIONS FOR ALL WORKSPACES\n');

    // Get all organizations without subscriptions
    const orgsWithoutSubs = await client.query(`
      SELECT o.id, o.name
      FROM organizations o
      WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.workspace_id = o.id AND s.deleted_at IS NULL)
      AND o.deleted_at IS NULL
    `);

    console.log(`Found ${orgsWithoutSubs.rows.length} organizations without subscriptions\n`);

    // Get a default plan
    const planResult = await client.query(`
      SELECT id FROM plans WHERE is_active = true LIMIT 1
    `);

    if (planResult.rows.length === 0) {
      console.log('❌ No active plans found!');
      client.release();
      await pool.end();
      return;
    }

    const planId = planResult.rows[0].id;

    // Create subscriptions
    for (const org of orgsWithoutSubs.rows) {
      try {
        const result = await client.query(`
          INSERT INTO subscriptions (workspace_id, plan_id, status, auto_renew, trial_ends_at)
          VALUES ($1, $2, 'active', true, NOW() + INTERVAL '30 days')
          RETURNING id
        `, [org.id, planId]);

        console.log(`✅ ${org.name}: Created subscription`);
      } catch (err: any) {
        console.error(`❌ ${org.name}: ${err.message}`);
      }
    }

    console.log('\n✅ Done!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createSubscriptions();
