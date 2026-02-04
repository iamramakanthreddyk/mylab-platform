import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST before any other code runs
dotenv.config({ path: resolve(__dirname, '../.env.local') });

console.log('🔧 Environment Configuration Loaded');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('  PORT:', process.env.PORT);
