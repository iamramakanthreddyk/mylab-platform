const { Pool } = require('pg');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(__dirname, '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function backfillOrganizations() {
  try {
    const insertResult = await pool.query(`
      INSERT INTO Organizations (workspace_id, name, type, is_platform_workspace, created_at, updated_at)
      SELECT
        w.id,
        w.name,
        CASE w.type
          WHEN 'cro' THEN 'cro'::org_type
          WHEN 'analyzer' THEN 'analyzer'::org_type
          WHEN 'pharma' THEN 'pharma'::org_type
          ELSE 'client'::org_type
        END,
        false,
        NOW(),
        NOW()
      FROM Workspace w
      WHERE w.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM Organizations o
          WHERE o.workspace_id = w.id
            AND o.deleted_at IS NULL
        )
      RETURNING id, workspace_id, name, type;
    `);

    console.log(`Inserted ${insertResult.rowCount} organization(s).`);
    if (insertResult.rowCount > 0) {
      insertResult.rows.forEach((row) => {
        console.log(`- ${row.id} | ${row.name} | ${row.type} | workspace ${row.workspace_id}`);
      });
    }
  } catch (error) {
    console.error('Backfill failed:', error.message);
  } finally {
    await pool.end();
  }
}

backfillOrganizations();
