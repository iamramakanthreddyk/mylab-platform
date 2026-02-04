import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/samples - List samples for project
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }

    const result = await pool.query(`
      SELECT * FROM Samples
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Failed to fetch samples' });
  }
});

export default router;