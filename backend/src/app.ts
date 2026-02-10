import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'

import './preload'
import logger from './utils/logger'
import { errorHandler } from './middleware'
import { PLATFORM_CONFIG } from './config'
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
} from './api'
import supplyChainRoutes from './routes/supply-chain'
import usersRoutes from './routes/users'
import analysisTypesRoutes from './routes/analysis-types'
import filesRoutes from './routes/files'
import analysisRequestsRoutes from './routes/analysis-requests'
import adminSuperRoutes from './routes/admin'
import { pool } from './db'
import { initializeTokenCleanupJob } from './jobs/tokenCleanup'

export const app = express()

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
}))

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later' })
  }
})
app.use(limiter)

logger.info('🚀 Initializing MyLab Platform with modules:', {
  modules: PLATFORM_CONFIG.modules.map(m => m.name)
})

initializeTokenCleanupJob()

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminSuperRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/analysis-types', analysisTypesRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/analysis-requests', analysisRequestsRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/samples', sampleRoutes)
app.use('/api', derivedSampleRoutes)
app.use('/api/batches', batchRoutes)
app.use('/api/analyses', analysisRoutes)
app.use('/api/api-keys', apiKeyRoutes)
app.use('/api/company', companyRoutes)
app.use('/api/company', createCompanyDashboardRoutes())
app.use('/api/organizations', organizationRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/access', accessRoutes)
app.use('/api/workspaces', workspaceRoutes)
app.use('/api/integrations', integrationRoutes)
app.use('/api/supply-chain', supplyChainRoutes)
app.use('/api', createTeamRoutes(pool))

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: {
      name: PLATFORM_CONFIG.name,
      version: PLATFORM_CONFIG.version,
      modules: PLATFORM_CONFIG.modules.length,
      endpoints: PLATFORM_CONFIG.modules.reduce((sum, m) => sum + m.endpoints.length, 0)
    }
  })
})

app.get('/api/platform', (_req, res) => {
  res.json({
    ...PLATFORM_CONFIG,
    database: { ...PLATFORM_CONFIG.database, password: undefined }
  })
})

app.use(errorHandler)

export default app
