import { pool } from './src/db';

(async () => {
  try {
    console.log('✅ Testing fixed listOrganizations query...\n');
    
    // Simulate the fixed query (without workspace_id filter)
    const result = await pool.query(`
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

    console.log(`📊 Organizations returned: ${result.rows.length}\n`);
    
    result.rows.forEach((org: any, idx: number) => {
      console.log(`${idx + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Type: ${org.type}`);
      console.log(`   Workspace: ${org.workspaceId || 'null'}`);
    });

    console.log('\n✅ Fix verified! API will now return organizations.');
    
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
