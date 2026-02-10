import http from 'http';

async function testAPI(): Promise<void> {
  return new Promise((resolve) => {
    // Wait 2 seconds for server to start
    setTimeout(() => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/health',
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            console.log('✅ Server is running!');
            console.log(JSON.stringify(parsed, null, 2));
            resolve();
          } catch {
            console.log('Response:', data);
            resolve();
          }
        });
      });

      req.on('error', (err: any) => {
        console.log('❌ Health check failed:');
        console.log(`   Error: ${err.message}`);
        console.log(`   Code: ${err.code}`);
        console.log(`   Errno: ${err.errno}`);
        resolve();
      });

      req.end();
    }, 2000);
  });
}

testAPI();
