import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

// Must import preload FIRST to load environment variables
import './preload';

// Core Utilities & Config
import logger from './utils/logger';
import { errorHandler, asyncHandler } from './middleware';
import { pool } from './db';
import { runMigrations, getMigrationStatus, DatabaseSetup } from './database';
import { PLATFORM_CONFIG } from './config';

// API Routes (modular structure with barrel exports)
import {
  authRoutes,
  adminRoutes,
  projectRoutes,
  sampleRoutes,
  derivedSampleRoutes,
  batchRoutes,
  analysisRoutes,
  apiKeyRoutes,
  companyRoutes,
  organizationRoutes,
  notificationRoutes,
  accessRoutes,
  workspaceRoutes,
  integrationRoutes,
  createCompanyDashboardRoutes,
  createTeamRoutes,
} from './api';

// Supply Chain Routes - Direct import  
import supplyChainRoutes from './routes/supply-chain';
import usersRoutes from './routes/users';
import analysisTypesRoutes from './routes/analysis-types';
import filesRoutes from './routes/files';
import analysisRequestsRoutes from './routes/analysis-requests';
import adminSuperRoutes from './routes/admin';

import { initializeTokenCleanupJob } from './jobs/tokenCleanup';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust based on your needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
  }
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}));
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit payload size

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({ error: 'Too many requests, please try again later' });
  }
});
app.use(limiter);

// Routes - using central brain configuration
logger.info('🚀 Initializing MyLab Platform with modules:', {
  modules: PLATFORM_CONFIG.modules.map(m => m.name)
});

// Initialize background jobs
initializeTokenCleanupJob();

// Static routes for now (will be dynamic later)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminSuperRoutes); // Superadmin routes (login, etc.)
app.use('/api/admin', adminRoutes); // Regular admin routes
app.use('/api/users', usersRoutes);
app.use('/api/analysis-types', analysisTypesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/analysis-requests', analysisRequestsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api', derivedSampleRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/company', createCompanyDashboardRoutes());
app.use('/api/organizations', organizationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/supply-chain', supplyChainRoutes);

// Team management and access control routes
app.use('/api', createTeamRoutes(pool));

// Health check with platform info
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: {
      name: PLATFORM_CONFIG.name,
      version: PLATFORM_CONFIG.version,
      modules: PLATFORM_CONFIG.modules.length,
      endpoints: PLATFORM_CONFIG.modules.reduce((sum, m) => sum + m.endpoints.length, 0)
    }
  });
});

// Platform info endpoint
app.get('/api/platform', (req: Request, res: Response) => {
  res.json({
    ...PLATFORM_CONFIG,
    // Don't expose sensitive config
    database: { ...PLATFORM_CONFIG.database, password: undefined }
  });
});

// Migration status endpoint (for debugging/monitoring)
app.get('/api/admin/migrations', asyncHandler(async (req: Request, res: Response) => {
  const status = await getMigrationStatus(pool);
  res.json({
    status: 'ok',
    migrations: status
  });
}));

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database and start server
(async () => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    logger.info('✅ Database connected successfully');
    
    // Setup database schema
    const dbSetup = new DatabaseSetup();
    await dbSetup.setupDatabase();
    
    // Run database migrations
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
