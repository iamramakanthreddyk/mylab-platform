import { Pool } from 'pg';
import './preload'; // Load environment variables first

const connectionString = process.env.DATABASE_URL;

console.log('\n📊 PostgreSQL Connection Configuration:');
console.log(`  URL: ${connectionString ? connectionString.substring(0, 50) + '...' : 'NOT SET'}`);

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL not set in environment');
  process.exit(1);
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Allow self-signed certificates from Railway
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Pool error:', err);
});

pool.on('connect', () => {
  console.log('✅ Database pool connection established');
});