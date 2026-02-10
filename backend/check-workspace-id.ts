import { pool } from './src/db';

(async () => {
  try {
    console.log('🔍 Checking admin user workspace_id...\n');
    
    const adminResult = await pool.query(
      'SELECT id, email, workspace_id, role FROM users WHERE email = $1',
      ['admin@tekflowlabs.com']
    );
    
    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    const admin = adminResult.rows[0] as any;
    console.log('👤 Admin User:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   User ID: ${admin.id}`);
    console.log(`   Workspace ID: ${admin.workspace_id}`);
    console.log(`   Role: ${admin.role}`);

    console.log('\n📊 Organizations by workspace_id:');
    
    const byWorkspace = await pool.query(`
      SELECT workspace_id, COUNT(*) as count 
      FROM organizations 
      WHERE deleted_at IS NULL 
      GROUP BY workspace_id
    `);
    
    byWorkspace.rows.forEach((row: any) => {
      const match = row.workspace_id === admin.workspace_id ? ' ✅ (Admin\'s workspace)' : '';
      console.log(`   ${row.workspace_id}: ${row.count} org(s)${match}`);
    });

    console.log('\n📋 All active organizations:');
    const allOrgs = await pool.query(`
      SELECT id, name, workspace_id, type 
      FROM organizations 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    allOrgs.rows.forEach((org: any) => {
      const match = org.workspace_id === admin.workspace_id ? ' ✅ (matches admin workspace)' : '';
      console.log(`   ${org.name} | Type: ${org.type} | Workspace: ${org.workspace_id}${match}`);
    });

    console.log(`\n✅ Total active organizations: ${allOrgs.rows.length}`);
    
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
