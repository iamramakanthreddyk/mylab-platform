#!/usr/bin/env node

import { DatabaseSetup } from './database/setup';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const command = process.argv[2];
  const databaseUrl = process.argv[3] || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: Database URL required');
    console.log('Usage:');
    console.log('  npm run db:setup "postgresql://user:pass@localhost:5432/mylab"');
    console.log('  npm run db:reset "postgresql://user:pass@localhost:5432/mylab"');
    console.log('Or set DATABASE_URL environment variable');
    process.exit(1);
  }

  const dbSetup = new DatabaseSetup(databaseUrl);

  try {
    await dbSetup.connect();

    switch (command) {
      case 'setup':
        await dbSetup.setupDatabase();
        break;
      case 'reset':
        await dbSetup.resetDatabase();
        break;
      default:
        console.log('Available commands:');
        console.log('  setup  - Create all tables and initial data');
        console.log('  reset  - Drop all tables');
        break;
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    process.exit(1);
  } finally {
    await dbSetup.disconnect();
  }
}

main().catch(console.error);