import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

interface TestContext {
  adminToken?: string;
  workspaceId?: string;
  userId?: string;
  planId?: string;
}

const ctx: TestContext = {};

async function testSuperAdminLogin() {
  console.log('\n📝 Testing Superadmin Login...');
  try {
    const response = await fetch('http://localhost:3001/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@mylab.io',
        password: 'SuperAdmin123!'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Login failed:', data);
      return false;
    }

    ctx.adminToken = data.token;
    console.log('✅ Superadmin login successful');
    console.log(`   Token: ${data.token.substring(0, 20)}...`);
    console.log(`   Admin: ${data.admin.email}`);
    return true;
  } catch (error) {
    console.error('❌ Login test error:', error);
    return false;
  }
}

async function testAnalyticsOverview() {
  console.log('\n📊 Testing Analytics Overview...');
  try {
    if (!ctx.adminToken) {
      console.error('❌ No admin token available');
      return false;
    }

    const response = await fetch('http://localhost:3001/api/admin/analytics/overview', {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Analytics failed:', data);
      return false;
    }

    console.log('✅ Analytics overview retrieved');
    console.log(`   Total Workspaces: ${data.total_workspaces}`);
    console.log(`   Total Users: ${data.total_users}`);
    console.log(`   Active Subscriptions: ${data.active_subscriptions}`);
    console.log(`   Trial Subscriptions: ${data.trial_subscriptions}`);
    console.log(`   Total Projects: ${data.total_projects}`);
    return true;
  } catch (error) {
    console.error('❌ Analytics test error:', error);
    return false;
  }
}

async function testWorkspacesList() {
  console.log('\n🏢 Testing Workspaces List...');
  try {
    if (!ctx.adminToken) {
      console.error('❌ No admin token available');
      return false;
    }

    const response = await fetch('http://localhost:3001/api/admin/workspaces?limit=10', {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Workspaces list failed:', data);
      return false;
    }

    console.log('✅ Workspaces list retrieved');
    console.log(`   Total Workspaces: ${data.total}`);
    console.log(`   Items Returned: ${data.workspaces.length}`);
    
    if (data.workspaces.length > 0) {
      console.log('\n   Sample Workspace:');
      const ws = data.workspaces[0];
      console.log(`   - ID: ${ws.id}`);
      console.log(`   - Name: ${ws.name}`);
      console.log(`   - Users: ${ws.user_count}`);
      console.log(`   - Plan: ${ws.plan_name || 'None'} (${ws.plan_tier || 'N/A'})`);
      console.log(`   - Last Login: ${ws.last_login_at ? new Date(ws.last_login_at).toLocaleString() : 'Never'}`);
      ctx.workspaceId = ws.id;
    }

    return true;
  } catch (error) {
    console.error('❌ Workspaces list test error:', error);
    return false;
  }
}

async function testUsersList() {
  console.log('\n👥 Testing Users List...');
  try {
    if (!ctx.adminToken) {
      console.error('❌ No admin token available');
      return false;
    }

    const response = await fetch('http://localhost:3001/api/admin/users?limit=10', {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Users list failed:', data);
      return false;
    }

    console.log('✅ Users list retrieved');
    console.log(`   Total Users: ${data.total}`);
    console.log(`   Items Returned: ${data.users.length}`);
    
    if (data.users.length > 0) {
      console.log('\n   Sample Users:');
      data.users.slice(0, 3).forEach((user: any, idx: number) => {
        console.log(`   ${idx + 1}. ${user.email} (${user.role}) - Last Login: ${user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}`);
      });
      ctx.userId = data.users[0].id;
    }

    return true;
  } catch (error) {
    console.error('❌ Users list test error:', error);
    return false;
  }
}

async function testPlansList() {
  console.log('\n💰 Testing Plans List...');
  try {
    if (!ctx.adminToken) {
      console.error('❌ No admin token available');
      return false;
    }

    const response = await fetch('http://localhost:3001/api/admin/plans', {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Plans list failed:', data);
      return false;
    }

    console.log('✅ Plans list retrieved');
    console.log(`   Total Plans: ${data.total}`);
    
    if (data.plans.length > 0) {
      console.log('\n   Available Plans:');
      data.plans.forEach((plan: any) => {
        console.log(`   - ${plan.name} (${plan.tier})`);
        console.log(`     Max Users: ${plan.max_users}`);
        console.log(`     Max Projects: ${plan.max_projects}`);
        console.log(`     Storage: ${plan.max_storage_gb}GB`);
        console.log(`     Subscriptions: ${plan.subscription_count}`);
      });
      if (data.plans.length > 0) {
        ctx.planId = data.plans[0].id;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Plans list test error:', error);
    return false;
  }
}

async function testSubscriptionsList() {
  console.log('\n📋 Testing Subscriptions List...');
  try {
    if (!ctx.adminToken) {
      console.error('❌ No admin token available');
      return false;
    }

    const response = await fetch('http://localhost:3001/api/admin/subscriptions', {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Subscriptions list failed:', data);
      return false;
    }

    console.log('✅ Subscriptions list retrieved');
    console.log(`   Total Subscriptions: ${data.total}`);
    
    if (data.subscriptions.length > 0) {
      console.log('\n   Sample Subscriptions:');
      data.subscriptions.slice(0, 3).forEach((sub: any, idx: number) => {
        console.log(`   ${idx + 1}. ${sub.workspace_name}`);
        console.log(`      Plan: ${sub.plan_name} (${sub.plan_tier})`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Users: ${sub.current_users}/${sub.max_users}`);
        console.log(`      Projects: ${sub.current_projects}/${sub.max_projects}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Subscriptions list test error:', error);
    return false;
  }
}

async function testFeaturesList() {
  console.log('\n⚙️ Testing Features List...');
  try {
    if (!ctx.adminToken) {
      console.error('❌ No admin token available');
      return false;
    }

    const response = await fetch('http://localhost:3001/api/admin/features', {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Features list failed:', data);
      return false;
    }

    console.log('✅ Features list retrieved');
    console.log(`   Total Features: ${data.total}`);
    
    if (data.features.length > 0) {
      console.log('\n   Sample Features:');
      data.features.slice(0, 5).forEach((feature: any) => {
        console.log(`   - ${feature.name}`);
        console.log(`     Status: ${feature.feature_status}`);
        console.log(`     Available in ${feature.available_in_plans} plans`);
        if (feature.is_beta) console.log(`     ⚠️  BETA`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Features list test error:', error);
    return false;
  }
}

async function testWorkspaceAnalytics() {
  console.log('\n📈 Testing Workspace Analytics...');
  try {
    if (!ctx.adminToken || !ctx.workspaceId) {
      console.error('❌ Missing admin token or workspace ID');
      return false;
    }

    const response = await fetch(`http://localhost:3001/api/admin/analytics/workspace/${ctx.workspaceId}`, {
      headers: { 
        'Authorization': `Bearer ${ctx.adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Workspace analytics failed:', data);
      return false;
    }

    console.log('✅ Workspace analytics retrieved');
    console.log(`   Workspace: ${data.workspace.name}`);
    if (data.subscription) {
      console.log(`   Plan: ${data.subscription.plan_name} (${data.subscription.tier})`);
      console.log(`   Max Users: ${data.subscription.max_users}`);
      console.log(`   Max Projects: ${data.subscription.max_projects}`);
    }
    console.log(`   Metrics Data Points: ${data.metrics.length}`);
    console.log(`   Recent Activity Users: ${data.recent_activity.length}`);
    
    if (data.metrics.length > 0) {
      console.log('\n   Latest Metrics:');
      const latest = data.metrics[0];
      console.log(`   - Date: ${latest.metric_date}`);
      console.log(`   - Active Users: ${latest.active_users}`);
      console.log(`   - API Calls: ${latest.api_calls}`);
      console.log(`   - Storage Used: ${latest.storage_used_gb}GB`);
    }

    return true;
  } catch (error) {
    console.error('❌ Workspace analytics test error:', error);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔒 Testing Unauthorized Access...');
  try {
    const response = await fetch('http://localhost:3001/api/admin/workspaces', {
      headers: { 
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      console.log('✅ Correctly rejected unauthorized request (401)');
      return true;
    } else {
      console.error(`❌ Expected 401, got ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Unauthorized access test error:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Admin Routes Test Suite');
  console.log('═'.repeat(50));

  const results: Record<string, boolean> = {};

  // Run tests in order
  results['Unauthorized Access'] = await testUnauthorizedAccess();
  results['Superadmin Login'] = await testSuperAdminLogin();
  
  if (ctx.adminToken) {
    results['Analytics Overview'] = await testAnalyticsOverview();
    results['Workspaces List'] = await testWorkspacesList();
    results['Users List'] = await testUsersList();
    results['Plans List'] = await testPlansList();
    results['Subscriptions List'] = await testSubscriptionsList();
    results['Features List'] = await testFeaturesList();
    
    if (ctx.workspaceId) {
      results['Workspace Analytics'] = await testWorkspaceAnalytics();
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Test Summary');
  console.log('═'.repeat(50));
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, result]) => {
    console.log(`${result ? '✅' : '❌'} ${name}`);
  });

  console.log('\n' + `Total: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️ ${total - passed} test(s) failed`);
  }

  await pool.end();
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  pool.end();
  process.exit(1);
});
