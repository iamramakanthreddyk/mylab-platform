import https from 'https';

async function testAPI(): Promise<void> {
  return new Promise((resolve) => {
    // Wait 3 seconds for server to start
    setTimeout(() => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/health',
        method: 'GET',
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
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

      req.on('error', (err) => {
        console.log('⏳ Server not ready yet:', err.message);
        resolve();
      });

      req.end();
    }, 3000);
  });
}

testAPI();
