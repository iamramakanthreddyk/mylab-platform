const { Pool } = require('pg');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkOrg() {
  try {
    const result = await pool.query(
      'SELECT id, name, type, industry, company_size, website, gst_number, gst_percentage, country, primary_contact_name, primary_contact_email, primary_contact_phone, updated_at FROM Organizations WHERE id = $1',
      ['ef48736e-51ae-4431-98f4-292607111640']
    );

    if (result.rows.length === 0) {
      console.log('Organization not found');
      return;
    }

    console.log('Organization details:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOrg();
