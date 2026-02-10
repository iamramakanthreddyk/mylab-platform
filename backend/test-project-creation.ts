import http from 'http';

async function testProjectCreation(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        // Step 1: Login
        console.log('\n🔐 Step 1: Logging in...\n');
        
        const loginData = JSON.stringify({
          email: 'admin@tekflowlabs.com',
          password: 'admin123'
        });

        const loginReq = http.request({
          hostname: 'localhost',
          port: 3001,
          path: '/api/auth/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', async () => {
            const loginRes = JSON.parse(data) as any;
            
            if (!loginRes.data?.token) {
              console.log('❌ Login failed:', loginRes);
              resolve();
              return;
            }

            const token = loginRes.data.token;
            console.log('✅ Logged in');
            console.log(`   Token: ${token.substring(0, 20)}...`);

            // Step 2: Get organizations
            console.log('\n📋 Step 2: Getting organizations...\n');

            const orgsReq = http.request({
              hostname: 'localhost',
              port: 3001,
              path: '/api/organizations',
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }, (res) => {
              let data = '';
              res.on('data', (chunk) => data += chunk);
              res.on('end', async () => {
                const orgsRes = JSON.parse(data) as any;
                console.log(`✅ Got ${orgsRes.count} organizations`);
                orgsRes.data?.forEach((org: any) => {
                  console.log(`   - ${org.name} (${org.type})`);
                });

                const clientOrg = orgsRes.data?.[0];
                if (!clientOrg) {
                  console.log('❌ No organizations found');
                  resolve();
                  return;
                }

                // Step 3: Try to create a project
                console.log('\n🚀 Step 3: Creating project...\n');

                const projectData = JSON.stringify({
                  name: 'Test Project',
                  description: 'Test project creation',
                  clientOrgId: clientOrg.id,
                  executingOrgId: clientOrg.id,
                  workflowMode: 'trial_first'
                });

                const projectReq = http.request({
                  hostname: 'localhost',
                  port: 3001,
                  path: '/api/projects',
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Content-Length': projectData.length
                  }
                }, (res) => {
                  let data = '';
                  res.on('data', (chunk) => data += chunk);
                  res.on('end', () => {
                    console.log(`Status: ${res.statusCode}`);
                    try {
                      const projectRes = JSON.parse(data);
                      console.log('\nResponse:');
                      console.log(JSON.stringify(projectRes, null, 2));
                    } catch {
                      console.log('Response:', data);
                    }
                    resolve();
                  });
                });

                projectReq.on('error', (err) => {
                  console.error('❌ Request error:', err.message);
                  resolve();
                });

                projectReq.write(projectData);
                projectReq.end();
              });
            });

            orgsReq.on('error', (err) => {
              console.error('❌ Request error:', err.message);
              resolve();
            });

            orgsReq.end();
          });
        });

        loginReq.on('error', (err) => {
          console.error('❌ Request error:', err.message);
          resolve();
        });

        loginReq.write(loginData);
        loginReq.end();
      } catch (err: any) {
        console.error('❌ Error:', err.message);
        resolve();
      }
    }, 1000);
  });
}

testProjectCreation();
