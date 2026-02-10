import { pool } from './src/db';

(async () => {
  try {
    // Check all organizations with all relevant columns
    const all = await pool.query(`
      SELECT id, name, type, deleted_at, is_active, created_at 
      FROM organizations 
      ORDER BY created_at DESC
    `);
    
    console.log('\n📚 Complete organization list:\n');
    console.log(`Total records: ${all.rows.length}\n`);
    
    all.rows.forEach((o: any) => {
      const active = o.is_active ? '✅' : '❌';
      const deleted = o.deleted_at ? '(DELETED)' : '';
      console.log(`${active} ${o.name}`);
      console.log(`   Type: ${o.type}`);
      console.log(`   Active: ${o.is_active}`);
      console.log(`   Deleted: ${o.deleted_at || 'No'} ${deleted}`);
      console.log(`   Created: ${o.created_at?.toISOString()}\n`);
    });

    // Check organizations with plans
    console.log('\n📋 Organizations with plans:\n');
    const withPlans = await pool.query(`
      SELECT o.id, o.name, o.type, o.plan_id, p.name as plan_name
      FROM organizations o
      LEFT JOIN plans p ON o.plan_id = p.id
      ORDER BY o.created_at DESC
    `);
    
    withPlans.rows.forEach((o: any) => {
      console.log(`${o.name} | Plan: ${o.plan_name || 'None'}`);
    });
    
    process.exit(0);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
