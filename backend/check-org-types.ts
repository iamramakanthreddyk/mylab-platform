import { pool } from './src/db';

async function checkOrgTypes() {
  try {
    console.log('\n🔍 CHECKING ORGANIZATION TYPES\n');

    const orgs = await pool.query(`
      SELECT id, name, type
      FROM organizations
      WHERE deleted_at IS NULL
      ORDER BY name
    `);

    console.log('All organizations:\n');
    orgs.rows.forEach(org => {
      console.log(`${org.name}: type = '${org.type}'`);
    });

    console.log('\n\nOrganization types used in ProjectsView filter:');
    console.log(`
    Client filter: type === 'Client' || type === 'Internal'
    Lab filter: type === 'Laboratory' || type === 'Internal'
    `);

    console.log('\nDATABASE VALUES vs FILTER CHECK:\n');

    const clientOrgs = orgs.rows.filter(o => o.type === 'Client' || o.type === 'Internal');
    const labOrgs = orgs.rows.filter(o => o.type === 'Laboratory' || o.type === 'Internal');

    console.log(`✅ Client orgs (type='Client' or 'Internal'): ${clientOrgs.length}`);
    clientOrgs.forEach(o => console.log(`   - ${o.name}`));

    console.log(`\n✅ Lab orgs (type='Laboratory' or 'Internal'): ${labOrgs.length}`);
    labOrgs.forEach(o => console.log(`   - ${o.name}`));

    console.log('\n\n⚠️  ISSUE FOUND!\n');
    console.log('Actual database types: client, analyzer');
    console.log('Filter expects: Client, Internal, Laboratory');
    console.log('\n❌ The types DO NOT MATCH (case-sensitive)!');
    console.log('\nFrontend filters for CLIENT orgs with:');
    console.log('  org.type === "Client" || org.type === "Internal"');
    console.log('\nBut database has:');
    console.log('  org.type = "client" (LOWERCASE)');
    console.log('\nSame issue for LAB orgs - expects "Laboratory" but has "analyzer"');

    await pool.end();
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkOrgTypes();
