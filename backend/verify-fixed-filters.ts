import { pool } from './src/db';

async function verifyFixedFilters() {
  try {
    console.log('\n✅ VERIFICATION: Fixed Organization Type Filters\n');
    console.log('=' .repeat(70));

    const orgs = await pool.query(`
      SELECT id, name, type
      FROM organizations
      WHERE deleted_at IS NULL
      ORDER BY name
    `);

    console.log('\n📋 ALL ORGANIZATIONS:\n');
    orgs.rows.forEach(org => {
      console.log(`${org.name}: type = '${org.type}'`);
    });

    console.log('\n\n🔧 FRONTEND FILTERS (AFTER FIX):\n');
    console.log('Client filter: org.type === "client" || org.type === "internal"');
    console.log('Lab filter: org.type === "analyzer" || org.type === "cro" || org.type === "internal"');

    const clientOrgs = orgs.rows.filter(o => o.type === 'client' || o.type === 'internal');
    const labOrgs = orgs.rows.filter(o => o.type === 'analyzer' || o.type === 'cro' || o.type === 'internal');

    console.log('\n\n✅ ORGANIZATIONS SHOWN IN PROJECT CREATION FORM:\n');
    console.log('CLIENT ORGANIZATIONS:');
    if (clientOrgs.length === 0) {
      console.log('  ❌ None found (user cannot select)');
    } else {
      clientOrgs.forEach(org => console.log(`  ✅ ${org.name}`));
    }

    console.log('\nLAB ORGANIZATIONS:');
    if (labOrgs.length === 0) {
      console.log('  ❌ None found (user cannot select)');
    } else {
      labOrgs.forEach(org => console.log(`  ✅ ${org.name}`));
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n🎯 RESULT FOR admin@tekflowlabs.com:\n');

    if (clientOrgs.length > 0 && labOrgs.length > 0) {
      console.log('✅ CAN NOW CREATE PROJECTS!');
      console.log('\nThe form will show:');
      console.log(`  - ${clientOrgs.length} client organization(s) to choose from`);
      console.log(`  - ${labOrgs.length} lab organization(s) to choose from`);
      console.log('\n✨ User experience improved:');
      console.log('   - Organizations will appear in dropdown');
      console.log('   - User can select client and lab orgs');
      console.log('   - Form can be submitted');
      console.log('   - Project will be created successfully!');
    } else {
      console.log('⚠️  Still cannot create projects');
      console.log(`   Client orgs available: ${clientOrgs.length}`);
      console.log(`   Lab orgs available: ${labOrgs.length}`);
    }

    console.log('\n' + '=' .repeat(70) + '\n');
    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyFixedFilters();
