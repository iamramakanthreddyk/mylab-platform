// Script to initialize SQLite DB for testing
// NOTE: This file is not used - we use PostgreSQL instead
/*
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../local-test.db');
const SCHEMA_PATH = path.join(__dirname, '../database/schema-sqlite.sql');

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH); // Remove old test DB
}

const db = new sqlite3.Database(DB_PATH);
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');

db.exec(schema, (err) => {
  if (err) {
    console.error('Failed to initialize SQLite DB:', err);
    process.exit(1);
  } else {
    console.log('SQLite test DB initialized at', DB_PATH);
    db.close();
  }
});
*/

console.log('SQLite setup script is deprecated - using PostgreSQL instead');

