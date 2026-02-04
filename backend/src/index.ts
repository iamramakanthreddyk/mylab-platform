import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './db';
import { PLATFORM_CONFIG } from './config/platform';

// Import existing routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import sampleRoutes from './routes/samples';
import derivedSampleRoutes from './routes/derivedSamples';
import analysisRoutes from './routes/analyses';
import apiKeyRoutes from './routes/apiKeys';
import companyRoutes from './routes/company';
import notificationRoutes from './routes/notifications';
import accessRoutes from './routes/access';
import { initializeTokenCleanupJob } from './jobs/tokenCleanup';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes - using central brain configuration
console.log('🚀 Initializing MyLab Platform with modules:', PLATFORM_CONFIG.modules.map(m => m.name));

// Initialize background jobs
initializeTokenCleanupJob();

// Static routes for now (will be dynamic later)
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/samples', sampleRoutes);
app.use('/api/derived-samples', derivedSampleRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/access', accessRoutes);

// Health check with platform info
app.get('/health', (req, res) => {
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
app.get('/api/platform', (req, res) => {
  res.json({
    ...PLATFORM_CONFIG,
    // Don't expose sensitive config
    database: { ...PLATFORM_CONFIG.database, password: undefined }
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});