import { pool } from './src/db';

async function refactorToOrgPlans() {
  const client = await pool.connect();
  try {
    console.log('\n🔧 REFACTORING: Plans at Organization Level\n');

    await client.query('BEGIN');

    // 1. Add plan_id column to organizations
    console.log('1️⃣  Adding plan_id column to Organizations...');
    try {
      await client.query(`
        ALTER TABLE organizations 
        ADD COLUMN plan_id UUID REFERENCES plans(id)
      `);
      console.log('   ✅ Column added (or already exists)');
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        console.log('   ℹ️  Column already exists');
      } else {
        throw err;
      }
    }

    // 2. Migrate plans from subscriptions to organizations
    console.log('\n2️⃣  Migrating plans from Subscriptions to Organizations...');
    const subResult = await client.query(`
      SELECT DISTINCT s.workspace_id, s.plan_id, p.name
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.deleted_at IS NULL
    `);

    let migratedCount = 0;
    for (const sub of subResult.rows) {
      const updateResult = await client.query(`
        UPDATE organizations 
        SET plan_id = $1
        WHERE id = $2 AND plan_id IS NULL
        RETURNING id
      `, [sub.plan_id, sub.workspace_id]);

      if (updateResult.rows.length > 0) {
        migratedCount++;
        console.log(`   ✅ Updated: ${sub.name} (${sub.workspace_id.substring(0, 8)}...)`);
      }
    }
    console.log(`   Total migrated: ${migratedCount} organizations`);

    // 3. Verify all organizations have plans
    console.log('\n3️⃣  Verifying all organizations have plans...');
    const withoutPlan = await client.query(`
      SELECT id, name FROM organizations 
      WHERE deleted_at IS NULL AND plan_id IS NULL
    `);

    if (withoutPlan.rows.length > 0) {
      console.log(`   ⚠️  Found ${withoutPlan.rows.length} organizations without plans`);
      console.log('   Assigning default Enterprise plan...');
      
      const defaultPlan = await client.query(`
        SELECT id FROM plans WHERE name = 'Enterprise' AND is_active = true LIMIT 1
      `);

      if (defaultPlan.rows.length > 0) {
        const planId = defaultPlan.rows[0].id;
        for (const org of withoutPlan.rows) {
          await client.query(`
            UPDATE organizations SET plan_id = $1 WHERE id = $2
          `, [planId, org.id]);
          console.log(`   ✅ ${org.name}`);
        }
      }
    } else {
      console.log('   ✅ All organizations have plans!');
    }

    // 4. Verify
    console.log('\n4️⃣  Final Verification:');
    const allOrgs = await client.query(`
      SELECT o.id, o.name, p.name as plan_name, p.max_projects
      FROM organizations o
      LEFT JOIN plans p ON o.plan_id = p.id
      WHERE o.deleted_at IS NULL
      ORDER BY o.name
    `);

    console.log(`   Total organizations: ${allOrgs.rows.length}`);
    allOrgs.rows.forEach(org => {
      const status = org.plan_name ? '✅' : '❌';
      console.log(`   ${status} ${org.name}: ${org.plan_name || 'NO PLAN'} (${org.max_projects || 'N/A'} max)`);
    });

    await client.query('COMMIT');
    console.log('\n✅ Refactoring complete!\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

refactorToOrgPlans();
