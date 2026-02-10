import { pool } from './src/db';

async function diagnose() {
  try {
    console.log('\n🔍 DIAGNOSTIC: Checking Admin Project Creation Issues\n');

    // 1. Find admin users
    console.log('1️⃣  ADMIN USERS:');
    const adminUsers = await pool.query(`
      SELECT id, email, name, role::text, workspace_id
      FROM Users 
      WHERE role::text = 'admin' OR role::text = 'Admin'
      LIMIT 5
    `);
    
    if (adminUsers.rows.length === 0) {
      console.log('   ❌ No admin users found!');
    } else {
      adminUsers.rows.forEach(u => {
        console.log(`   ✅ ${u.email}: role='${u.role}', workspace_id=${u.workspace_id}`);
      });
    }

    if (adminUsers.rows.length === 0) {
      console.log('\n✅ Diagnosis complete');
      await pool.end();
      return;
    }

    // 2. Check workspace plans
    console.log('\n2️⃣  WORKSPACE PLANS & SUBSCRIPTIONS:');
    const workspaceIds = adminUsers.rows.map(u => u.workspace_id);
    
    for (const wsId of workspaceIds) {
      console.log(`\n   📦 Workspace: ${wsId}`);
      
      const subResult = await pool.query(`
        SELECT 
          s.id, s.plan_id, s.status,
          p.id as plan_id_from_plan, p.name, p.max_projects, p.is_active
        FROM Subscriptions s
        LEFT JOIN Plans p ON s.plan_id = p.id
        WHERE s.workspace_id = $1
        ORDER BY s.created_at DESC
        LIMIT 3
      `, [wsId]);

      if (subResult.rows.length === 0) {
        console.log(`      ❌ No subscriptions found`);
      } else {
        subResult.rows.forEach(row => {
          console.log(`      ✅ Plan: ${row.name || 'N/A'}, Status: ${row.status}, Max Projects: ${row.max_projects}`);
        });
      }
    }

    // 3. Check existing projects
    console.log('\n3️⃣  EXISTING PROJECTS:');
    for (const wsId of workspaceIds) {
      const projectCount = await pool.query(`
        SELECT COUNT(*)::int as count, (deleted_at IS NOT NULL) as is_deleted FROM Projects
        WHERE workspace_id = $1
        GROUP BY (deleted_at IS NOT NULL)
      `, [wsId]);

      console.log(`   📁 Workspace ${wsId}:`);
      projectCount.rows.forEach(row => {
        const status = row.is_deleted ? 'deleted' : 'active';
        console.log(`      ${row.count} ${status} projects`);
      });
    }

    // 4. Check role case sensitivity issue
    console.log('\n4️⃣  ROLE VALUES IN DATABASE:');
    const roleCheck = await pool.query(`
      SELECT role::text, COUNT(*) as count
      FROM Users
      GROUP BY role::text
      ORDER BY count DESC
    `);
    roleCheck.rows.forEach(row => {
      console.log(`   - '${row.role}': ${row.count} users`);
    });

    console.log('\n✅ Diagnosis complete\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

diagnose();
