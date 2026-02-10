import { pool } from './src/db';

(async () => {
  try {
    const all = await pool.query('SELECT id, name, type, deleted_at FROM organizations ORDER BY created_at DESC');
    console.log('\n📚 All organizations (including deleted):\n');
    all.rows.forEach((o: any) => {
      const deleted = o.deleted_at ? ' ❌ [DELETED]' : ' ✅';
      console.log(`${deleted} ${o.name} (${o.type})`);
    });
    process.exit(0);
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
