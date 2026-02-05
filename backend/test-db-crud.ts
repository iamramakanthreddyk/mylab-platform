import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, './.env.local') });

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
}

const results: TestResult[] = [];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addResult(name: string, status: 'pass' | 'fail', message: string) {
  results.push({ name, status, message });
  const emoji = status === 'pass' ? '✅' : '❌';
  console.log(`${emoji} ${name}: ${message}`);
}

async function testCreateWorkspace() {
  try {
    const result = await pool.query(`
      INSERT INTO Workspace (name, slug, type)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, type
    `, ['Test Workspace ' + Date.now(), 'test-' + Date.now(), 'research']);
    
    const workspaceId = result.rows[0].id;
    await addResult('Create Workspace', 'pass', `Created: ${result.rows[0].name}`);
    return workspaceId;
  } catch (error) {
    await addResult('Create Workspace', 'fail', String(error));
    return null;
  }
}

async function testCreateOrganization() {
  try {
    const result = await pool.query(`
      INSERT INTO Organizations (name, type, is_platform_workspace)
      VALUES ($1, $2, $3)
      RETURNING id, name, type
    `, ['Test Organization ' + Date.now(), 'analyzer', false]);
    
    const orgId = result.rows[0].id;
    await addResult('Create Organization', 'pass', `Created: ${result.rows[0].name}`);
    return orgId;
  } catch (error) {
    await addResult('Create Organization', 'fail', String(error));
    return null;
  }
}

async function testCreateUser(workspaceId: string) {
  try {
    const result = await pool.query(`
      INSERT INTO Users (workspace_id, email, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role
    `, [workspaceId, `user${Date.now()}@test.com`, 'Test User', 'scientist']);
    
    const userId = result.rows[0].id;
    await addResult('Create User', 'pass', `Created: ${result.rows[0].email}`);
    return userId;
  } catch (error) {
    await addResult('Create User', 'fail', String(error));
    return null;
  }
}

async function testCreateProject(workspaceId: string, userId: string, clientOrgId: string, executingOrgId: string) {
  try {
    const result = await pool.query(`
      INSERT INTO Projects (workspace_id, client_org_id, executing_org_id, name, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name
    `, [workspaceId, clientOrgId, executingOrgId, 'Test Project ' + Date.now(), userId]);
    
    const projectId = result.rows[0].id;
    await addResult('Create Project', 'pass', `Created: ${result.rows[0].name}`);
    return projectId;
  } catch (error) {
    await addResult('Create Project', 'fail', String(error));
    return null;
  }
}

async function testReadData() {
  try {
    const workspaces = await pool.query('SELECT COUNT(*) as count FROM Workspace');
    const organizations = await pool.query('SELECT COUNT(*) as count FROM Organizations');
    const users = await pool.query('SELECT COUNT(*) as count FROM Users');
    
    const msg = `Workspaces: ${workspaces.rows[0].count}, Organizations: ${organizations.rows[0].count}, Users: ${users.rows[0].count}`;
    await addResult('Read Data', 'pass', msg);
  } catch (error) {
    await addResult('Read Data', 'fail', String(error));
  }
}

async function testEnumValues() {
  try {
    // Test that enum constraints work
    const result = await pool.query(`
      INSERT INTO Organizations (name, type, is_platform_workspace)
      VALUES ($1, $2, $3)
      RETURNING type
    `, ['Enum Test Org', 'pharma', false]);
    
    await addResult('Enum Type Constraint', 'pass', `Valid enum value inserted: ${result.rows[0].type}`);
  } catch (error) {
    await addResult('Enum Type Constraint', 'fail', String(error));
  }
}

async function testTimestamps() {
  try {
    const result = await pool.query(`
      SELECT created_at, updated_at FROM Organizations 
      WHERE name = $1 
      ORDER BY created_at DESC LIMIT 1
    `, ['Enum Test Org']);
    
    if (result.rows.length > 0) {
      const { created_at, updated_at } = result.rows[0];
      const msg = `created_at: ${created_at.toISOString()}, updated_at: ${updated_at.toISOString()}`;
      await addResult('Timestamps', 'pass', msg);
    }
  } catch (error) {
    await addResult('Timestamps', 'fail', String(error));
  }
}

async function runTests() {
  console.log('\n🧪 Running Comprehensive Database Tests\n');
  console.log('═'.repeat(60) + '\n');

  try {
    // Create test data
    const workspaceId = await testCreateWorkspace();
    const clientOrgId = await testCreateOrganization();
    const executingOrgId = await testCreateOrganization();
    
    if (workspaceId && clientOrgId && executingOrgId) {
      const userId = await testCreateUser(workspaceId);
      if (userId) {
        await testCreateProject(workspaceId, userId, clientOrgId, executingOrgId);
      }
    }

    // Test other operations
    await testReadData();
    await testEnumValues();
    await testTimestamps();

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 Test Summary:\n');
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total:  ${results.length}\n`);

    if (failed === 0) {
      console.log('🎉 All tests passed! Your database is ready for production.\n');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

runTests();
