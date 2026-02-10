// Quick test if API endpoint is accessible
async function testAPI() {
  try {
    console.log('\n🧪 Testing GET /api/organizations API...\n');
    
    // First, get a token by logging in
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tekflowlabs.com',
        password: 'admin123'
      })
    });

    if (!loginRes.ok) {
      console.log('❌ Login failed:', loginRes.status);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    
    if (!token) {
      console.log('❌ No token received');
      return;
    }

    console.log('✅ Logged in successfully');

    // Now test the organizations endpoint
    const orgsRes = await fetch('http://localhost:3001/api/organizations', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!orgsRes.ok) {
      console.log('❌ API request failed:', orgsRes.status);
      return;
    }

    const orgsData = await orgsRes.json();
    console.log('\n✅ Organizations API Response:');
    console.log(JSON.stringify(orgsData, null, 2));

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  }
}

testAPI();
