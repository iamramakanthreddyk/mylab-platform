import http from 'http';
import { pool } from './src/db';

async function testEndpoint(): Promise<void> {
  try {
    // First get a token
    console.log('\n🔐 Getting authentication token...\n');
    
    const loginRes = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        email: 'admin@tekflowlabs.com',
        password: 'admin123'
      });

      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    const loginData = loginRes as any;
    
    if (!loginData.data?.token) {
      console.log('❌ Login failed');
      console.log(JSON.stringify(loginData, null, 2));
      process.exit(1);
    }

    const token = loginData.data.token;
    console.log('✅ Login successful');
    console.log(`   Token: ${token.substring(0, 20)}...`);

    // Now test organizations endpoint
    console.log('\n📋 Calling GET /api/organizations...\n');

    const orgsRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/organizations',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });

    const orgsData = orgsRes as any;
    console.log('✅ Organizations API Response:\n');
    console.log(JSON.stringify(orgsData, null, 2));

    if (orgsData.count === 2) {
      console.log('\n✅✅✅ SUCCESS! API returns both organizations!');
    } else {
      console.log(`\n⚠️  API returned ${orgsData.count} organizations (expected 2)`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testEndpoint();
