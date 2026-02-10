import { pool } from './src/db';

async function checkOrganizationsAndTeam() {
  try {
    console.log('\n🔍 CHECKING ORGANIZATIONS & PROJECT TEAM DATA\n');
    console.log('=' .repeat(70));

    const userId = (await pool.query(
      `SELECT id FROM users WHERE email = 'admin@tekflowlabs.com' AND deleted_at IS NULL`
    )).rows[0].id;

    const workspace = (await pool.query(
      `SELECT id FROM users WHERE id = $1`, [userId]
    )).rows[0].workspace_id;

    // 1. Check organizations
    console.log('\n1️⃣  ORGANIZATIONS AVAILABLE FOR PROJECT SELECTION:');
    const orgs = await pool.query(`
      SELECT id, name, type, deleted_at
      FROM organizations
      WHERE deleted_at IS NULL
      ORDER BY name
    `);

    console.log(`\nFound ${orgs.rows.length} organizations:\n`);
    orgs.rows.forEach(org => {
      console.log(`   ✅ ${org.name} (${org.type})`);
      console.log(`      ID: ${org.id.substring(0, 12)}...`);
    });

    if (orgs.rows.length < 2) {
      console.log('\n   ⚠️  WARNING: Need at least 2 orgs (client + lab) to create projects!');
    }

    // 2. Check if user is in ProjectTeam
    console.log('\n2️⃣  CHECK PROJECT TEAM MEMBERSHIP:');
    const teamCheck = await pool.query(`
      SELECT COUNT(*) as count FROM projectteam
      WHERE user_id = $1
    `, [userId]);

    console.log(`   User is in ${teamCheck.rows[0].count || 0} project teams`);

    // 3. Check if there are any project team records that need fixing
    console.log('\n3️⃣  CHECK PROJECT TEAM TABLE STRUCTURE:');
    const teamCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'projectteam'
      ORDER BY ordinal_position
    `);

    console.log('\n   ProjectTeam columns:');
    teamCols.rows.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });

    // 4. Check if there are organizations in the user's workspace
    console.log('\n4️⃣  CHECK ORGANIZATIONS IN USER WORKSPACE:');
    const wsOrgs = await pool.query(`
      SELECT id, name, type
      FROM organizations
      WHERE (id = $1 OR workspace_id IS NULL)
        AND deleted_at IS NULL
      ORDER BY name
    `, [workspace]);

    console.log(`\n   Organizations for workspace ${workspace.substring(0, 12)}...:\n`);
    wsOrgs.rows.forEach(org => {
      console.log(`   ✅ ${org.name} (${org.type})`);
    });

    // 5. Summary
    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 FRONTEND DATA CHECK:\n');

    const clientOrgs = orgs.rows.filter(o => o.type === 'client' || o.type === 'internal');
    const labOrgs = orgs.rows.filter(o => o.type === 'laboratory' || o.type === 'internal');

    console.log(`✅ Client Organizations: ${clientOrgs.length}`);
    clientOrgs.forEach(o => console.log(`   - ${o.name}`));

    console.log(`\n✅ Lab Organizations: ${labOrgs.length}`);
    labOrgs.forEach(o => console.log(`   - ${o.name}`));

    if (clientOrgs.length === 0 || labOrgs.length === 0) {
      console.log('\n⚠️  ISSUE FOUND: Need both client AND lab organizations to create projects!');
      console.log('\nThe project creation form requires:');
      console.log('  1. Select a CLIENT organization (who requests the project)');
      console.log('  2. Select a LAB organization (who executes the project)');
      console.log('\nIf either is missing, the form cannot be submitted.');
    } else {
      console.log('\n✅ Both client and lab orgs exist. Project creation should work.');
    }

    console.log('\n' + '=' .repeat(70) + '\n');
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkOrganizationsAndTeam();
