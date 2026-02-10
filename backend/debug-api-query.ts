import { pool } from './src/db';

(async () => {
  try {
    console.log('\n🔍 Checking organizations in database...\n');
    
    const all = await pool.query(`
      SELECT id, name, type, deleted_at, created_at
      FROM organizations
      ORDER BY created_at DESC
    `);

    console.log(`Total organizations in DB: ${all.rows.length}\n`);
    
    all.rows.forEach((o: any) => {
      const deleted = o.deleted_at ? ' ❌ [DELETED]' : ' ✅';
      console.log(`${deleted} ${o.name}`);
      console.log(`   ID: ${o.id}`);
      console.log(`   Type: ${o.type}`);
      console.log(`   Deleted At: ${o.deleted_at || 'null'}\n`);
    });

    console.log('\n🧪 Testing the exact query used by API:\n');
    
    const apiQuery = await pool.query(`
      SELECT
        id,
        workspace_id as "workspaceId",
        name,
        type,
        contact_info as "contactInfo",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM Organizations
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `);

    console.log(`API query returns: ${apiQuery.rows.length} organizations\n`);
    apiQuery.rows.forEach((o: any) => {
      console.log(`✅ ${o.name} (${o.type})`);
    });

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
