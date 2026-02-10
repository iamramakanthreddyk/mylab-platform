import { pool } from './src/db';

async function diagnoseProjectCreation() {
  try {
    console.log('\n🔍 DIAGNOSING PROJECT CREATION FOR admin@tekflowlabs.com\n');
    console.log('=' .repeat(70));

    // 1. Find the user
    console.log('\n1️⃣  FIND USER:');
    const userResult = await pool.query(`
      SELECT id, email, name, role::text, workspace_id
      FROM users
      WHERE email = 'admin@tekflowlabs.com' AND deleted_at IS NULL
    `);

    if (userResult.rows.length === 0) {
      console.log('   ❌ User not found!');
      await pool.end();
      return;
    }

    const user = userResult.rows[0];
    console.log(`   ✅ ${user.email}`);
    console.log(`      Role: ${user.role}`);
    console.log(`      Workspace ID: ${user.workspace_id.substring(0, 12)}...`);
    console.log(`      User ID: ${user.id.substring(0, 12)}...`);

    // 2. Check organization
    console.log('\n2️⃣  CHECK ORGANIZATION:');
    const orgResult = await pool.query(`
      SELECT id, name, plan_id, type
      FROM organizations
      WHERE id = $1 AND deleted_at IS NULL
    `, [user.workspace_id]);

    if (orgResult.rows.length === 0) {
      console.log('   ❌ Organization not found!');
      await pool.end();
      return;
    }

    const org = orgResult.rows[0];
    console.log(`   ✅ ${org.name}`);
    console.log(`      Org ID: ${org.id.substring(0, 12)}...`);
    console.log(`      Type: ${org.type}`);
    console.log(`      Plan ID: ${org.plan_id ? org.plan_id.substring(0, 12) + '...' : 'NULL ❌'}`);

    // 3. Check plan if exists
    if (org.plan_id) {
      console.log('\n3️⃣  CHECK PLAN:');
      const planResult = await pool.query(`
        SELECT id, name, tier, max_projects, is_active
        FROM plans
        WHERE id = $1
      `, [org.plan_id]);

      if (planResult.rows.length === 0) {
        console.log('   ❌ Plan referenced but not found!');
      } else {
        const plan = planResult.rows[0];
        console.log(`   ✅ ${plan.name}`);
        console.log(`      Tier: ${plan.tier}`);
        console.log(`      Max Projects: ${plan.max_projects}`);
        console.log(`      Is Active: ${plan.is_active ? 'Yes ✅' : 'No ❌'}`);

        // 4. Check project count
        console.log('\n4️⃣  CHECK PROJECT COUNT:');
        const projectResult = await pool.query(`
          SELECT COUNT(*)::int as count
          FROM projects
          WHERE workspace_id = $1 AND deleted_at IS NULL
        `, [user.workspace_id]);

        const projectCount = projectResult.rows[0].count || 0;
        console.log(`   Projects created: ${projectCount}`);
        console.log(`   Limit: ${plan.max_projects}`);
        
        if (projectCount >= plan.max_projects) {
          console.log(`   ❌ PROJECT LIMIT REACHED! (${projectCount}/${plan.max_projects})`);
        } else {
          console.log(`   ✅ Can create projects (${projectCount}/${plan.max_projects})`);
        }
      }
    } else {
      console.log('\n3️⃣  ❌ NO PLAN ASSIGNED');
      console.log('      Organization has no plan! User cannot create projects.');
    }

    // 5. Check role
    console.log('\n5️⃣  CHECK RBAC:');
    if (user.role === 'admin' || user.role === 'manager') {
      console.log(`   ✅ Role "${user.role}" can create projects`);
    } else {
      console.log(`   ❌ Role "${user.role}" cannot create projects (need admin or manager)`);
    }

    // 6. Summary
    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 RESULT:\n');

    let canCreate = true;
    const reasons = [];

    if (user.role !== 'admin' && user.role !== 'manager') {
      canCreate = false;
      reasons.push(`❌ Insufficient role: "${user.role}" (need admin or manager)`);
    }

    if (!org.plan_id) {
      canCreate = false;
      reasons.push(`❌ No plan assigned to organization`);
    } else {
      const planCheck = await pool.query(`
        SELECT is_active FROM plans WHERE id = $1
      `, [org.plan_id]);
      
      if (planCheck.rows.length === 0) {
        canCreate = false;
        reasons.push(`❌ Plan not found in database`);
      } else if (!planCheck.rows[0].is_active) {
        canCreate = false;
        reasons.push(`❌ Plan is inactive`);
      }

      const projCheck = await pool.query(`
        SELECT COUNT(*)::int as count FROM projects
        WHERE workspace_id = $1 AND deleted_at IS NULL
      `, [user.workspace_id]);

      const count = projCheck.rows[0].count || 0;
      const maxProj = (await pool.query(`
        SELECT max_projects FROM plans WHERE id = $1
      `, [org.plan_id])).rows[0].max_projects;

      if (count >= maxProj) {
        canCreate = false;
        reasons.push(`❌ Project limit reached: ${count}/${maxProj}`);
      }
    }

    if (canCreate) {
      console.log('✅ USER CAN CREATE PROJECTS!\n');
      console.log('   No blockers found. If user still cannot create:');
      console.log('   1. Check frontend error message');
      console.log('   2. Check API response status code');
      console.log('   3. Verify project data is being sent correctly');
    } else {
      console.log('❌ USER CANNOT CREATE PROJECTS\n');
      console.log('REASONS:\n');
      reasons.forEach(r => console.log(`   ${r}`));
    }

    console.log('\n' + '=' .repeat(70) + '\n');
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

diagnoseProjectCreation();
