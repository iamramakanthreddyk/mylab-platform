import { pool } from './src/db';

async function detailedDiag() {
  try {
    console.log('\n🔍 DETAILED SUBSCRIPTION CHECK\n');

    // Check subscriptions for specific workspaces
    const adminWorkspaces = [
      '8952b4c8-4b67-46d1-b985-a9cda7504fd3',
      'fdbc5f6e-d1a2-4c34-8135-9b7696620c5b',
      'fc2abf69-b829-4664-96c4-d7f51d87f438',
      'dba33523-feef-4a16-8751-f09dd727874b'
    ];

    for (const wsId of adminWorkspaces) {
      console.log(`\n📋 Workspace: ${wsId.substring(0, 8)}...`);
      
      // Get org info
      const orgResult = await pool.query(`SELECT id, name FROM Organizations WHERE id = $1`, [wsId]);
      if (orgResult.rows.length > 0) {
        console.log(`   Organization: ${orgResult.rows[0].name}`);
      }

      // Get subscription info
      const subResult = await pool.query(`
        SELECT s.id, s.plan_id, s.status, s.deleted_at, 
               p.name, p.max_projects, p.is_active
        FROM Subscriptions s
        LEFT JOIN Plans p ON s.plan_id = p.id
        WHERE s.workspace_id = $1
      `, [wsId]);

      if (subResult.rows.length === 0) {
        console.log(`   ❌ NO SUBSCRIPTIONS`);
      } else {
        subResult.rows.forEach(row => {
          console.log(`   ✅ Sub: ${row.id.substring(0, 8)}...`);
          console.log(`      Status: ${row.status}, Deleted: ${row.deleted_at}`);
          console.log(`      Plan: ${row.name || 'NULL'}, Max Projects: ${row.max_projects || 'NULL'}`);
        });
      }
    }

    await pool.end();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

detailedDiag();
