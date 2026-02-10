import { pool } from './src/db';

async function deepDiagnosis() {
  try {
    console.log('\n🔍 DEEP DIAGNOSIS: Project Creation Blocker\n');
    console.log('=' .repeat(80));

    const userId = 'b2b3800e-cd8b-4f1a-a889-5b0b87f5ed8f'; // admin@tekflowlabs.com
    const workspaceId = '8952b4c8-4b67-46d1-b985-a9cda7504fd3';

    // 1. Check user details
    console.log('\n1️⃣  USER DETAILS:');
    const user = await pool.query(`
      SELECT id, email, role::text, workspace_id FROM users WHERE id = $1
    `, [userId]);
    console.log(`   ✅ ${user.rows[0].email}: role=${user.rows[0].role}`);

    // 2. Check organizations API response
    console.log('\n2️⃣  ORGANIZATIONS (what frontend gets from API):');
    const orgs = await pool.query(`
      SELECT id, name, type, deleted_at
      FROM organizations
      WHERE deleted_at IS NULL
      ORDER BY name
    `);
    console.log(`   Total: ${orgs.rows.length}`);
    orgs.rows.forEach(org => {
      console.log(`   - ${org.name} (type='${org.type}')`);
    });

    // 3. Check if there are "NO ORGANIZATIONS" available error
    console.log('\n3️⃣  FORM VALIDATION CHECK:');
    const clientOrgs = orgs.rows.filter(o => o.type === 'client' || o.type === 'internal');
    const labOrgs = orgs.rows.filter(o => o.type === 'analyzer' || o.type === 'cro' || o.type === 'internal');

    console.log(`   Client orgs: ${clientOrgs.length}`);
    clientOrgs.forEach(o => console.log(`     ✅ ${o.name}`));

    console.log(`\n   Lab orgs: ${labOrgs.length}`);
    labOrgs.forEach(o => console.log(`     ✅ ${o.name}`));

    // 4. Check ProjectTeam table - maybe user is not team member of org
    console.log('\n4️⃣  PROJECT TEAM MEMBERSHIP:');
    const pt = await pool.query(`
      SELECT COUNT(*) as count FROM projectteam WHERE user_id = $1
    `, [userId]);
    console.log(`   User is in ${pt.rows[0].count} project teams`);

    // 5. Check if company_id is needed in ProjectTeam insert
    console.log('\n5️⃣  PROJECTTEAM TABLE REQUIREMENTS:');
    const ptCols = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projectteam'
      ORDER BY ordinal_position
    `);
    console.log('\n   Columns:');
    ptCols.rows.forEach(col => {
      const required = col.is_nullable === 'NO' ? 'REQUIRED ⚠️' : 'optional';
      console.log(`   - ${col.column_name}: ${required}`);
    });

    // 6. Check projects table
    console.log('\n6️⃣  PROJECTS TABLE:');
    const projCols = await pool.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'projects'
      ORDER BY ordinal_position
    `);
    console.log('\n   Key columns:');
    ['id', 'workspace_id', 'name', 'client_org_id', 'executing_org_id', 'created_by', 'status'].forEach(colName => {
      const col = projCols.rows.find(c => c.column_name === colName);
      if (col) {
        const required = col.is_nullable === 'NO' ? 'REQUIRED' : 'optional';
        console.log(`   - ${col.column_name}: ${required} (default: ${col.column_default || 'none'})`);
      }
    });

    // 7. Check if organization has all required data
    console.log('\n7️⃣  ORGANIZATION DATA COMPLETENESS:');
    const orgComplete = await pool.query(`
      SELECT 
        o.id, o.name, o.type, o.plan_id,
        COUNT(CASE WHEN p.name IS NOT NULL THEN 1 END) as has_plan
      FROM organizations o
      LEFT JOIN plans p ON o.plan_id = p.id
      WHERE o.deleted_at IS NULL
      GROUP BY o.id, o.name, o.type, o.plan_id
    `);
    console.log();
    orgComplete.rows.forEach(org => {
      const planStatus = org.plan_id ? '✅ Has plan' : '❌ No plan';
      console.log(`   ${org.name}: ${planStatus}`);
    });

    // 8. Check if there's a company_id issue
    console.log('\n8️⃣  CHECK COMPANY_ID REQUIREMENT:');
    const firstOrg = orgs.rows[0];
    if (firstOrg) {
      const orgCheck = await pool.query(`
        SELECT id FROM organizations WHERE id = $1
      `, [firstOrg.id]);
      console.log(`   ✅ Organization ${firstOrg.name} exists and can be referenced`);
    }

    // 9. Simulate the POST /projects request
    console.log('\n9️⃣  SIMULATE PROJECT CREATION REQUEST:');
    console.log(`\n   Request would look like:`);
    console.log(`   POST /api/projects`);
    console.log(`   Body: {`);
    console.log(`     "name": "Test Project",`);
    console.log(`     "description": "Test",`);
    console.log(`     "clientOrgId": "${clientOrgs[0]?.id || 'NONE'}",`);
    console.log(`     "executingOrgId": "${labOrgs[0]?.id || 'NONE'}",`);
    console.log(`     "workflowMode": "trial_first"`);
    console.log(`   }`);

    if (!clientOrgs[0] || !labOrgs[0]) {
      console.log(`\n   ❌ BLOCKER: Missing client or lab organization!`);
      console.log(`      - Client orgs: ${clientOrgs.length}`);
      console.log(`      - Lab orgs: ${labOrgs.length}`);
    } else {
      console.log(`\n   ✅ Request has required fields`);
    }

    // 10. Check for any constraints
    console.log('\n🔟 DATABASE CONSTRAINTS:');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'projects'
    `);
    console.log(`   ${constraints.rows.length} constraints on projects table`);

    console.log('\n' + '=' .repeat(80));
    console.log('\n📊 SUMMARY:\n');

    const issues = [];

    if (clientOrgs.length === 0) {
      issues.push('❌ No CLIENT organizations available');
    }
    if (labOrgs.length === 0) {
      issues.push('❌ No LAB organizations available');
    }

    const orgsWithoutPlan = orgComplete.rows.filter(o => !o.plan_id);
    if (orgsWithoutPlan.length > 0) {
      issues.push(`❌ ${orgsWithoutPlan.length} organization(s) without plan assigned`);
    }

    if (issues.length === 0) {
      console.log('✅ All backend requirements met!');
      console.log('\nPossible causes for frontend issue:');
      console.log('  1. JavaScript error in browser console');
      console.log('  2. Form validation not clearing (selected values not resetting)');
      console.log('  3. API request not being sent (network tab in DevTools)');
      console.log('  4. API returning an error that\'s not visible to user');
      console.log('\nACTION: Check browser console and network tab for errors!');
    } else {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    console.log('\n' + '=' .repeat(80) + '\n');
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deepDiagnosis();
