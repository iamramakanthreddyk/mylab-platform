import { Request, Response } from 'express';
import { asyncHandler } from './middleware';
import { pool } from './db';
import { runMigrations, getMigrationStatus, DatabaseSetup } from './database';
import logger from './utils/logger';
import app from './app';

const PORT = process.env.PORT || 3001;

// Migration status endpoint (for debugging/monitoring)
app.get('/api/admin/migrations', asyncHandler(async (_req: Request, res: Response) => {
  const status = await getMigrationStatus(pool);
  res.json({
    status: 'ok',
    migrations: status
  });
}));

// Initialize database and start server (skip when imported for tests)
if (process.env.JEST_WORKER_ID === undefined) {
  (async () => {
    try {
      const result = await pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');
      logger.info('✅ Database connected successfully');

      if (process.env.SKIP_DB_SETUP !== 'true') {
        const dbSetup = new DatabaseSetup();
        await dbSetup.setupDatabase();
      } else {
        console.log('⚠️ Skipping database table creation (SKIP_DB_SETUP=true)');
        logger.warn('⚠️ Skipping database table creation (SKIP_DB_SETUP=true)');
      }

      console.log('🔄 Running database migrations...');
      await runMigrations(pool);

      app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📊 Dashboard: http://localhost:${PORT}/health`);
      });
    } catch (err) {
      logger.error('❌ Failed to start server:', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  })();
}

export default app;
