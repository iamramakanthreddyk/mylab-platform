import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

/**
 * Rate Limiting Utilities - Prevent mass data export and abuse
 * Enforces per-user and per-endpoint limits to mitigate insider threats
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix: string; // Redis/tracking key prefix
}

interface RateLimitStore {
  [key: string]: Array<number>;
}

// In-memory store (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

/**
 * Check if request exceeds rate limit
 * Returns { allowed: boolean, remaining: number, resetTime: Date }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: Date } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Initialize or get existing timestamps
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
  }

  // Remove old timestamps outside window
  rateLimitStore[key] = rateLimitStore[key].filter(ts => ts > windowStart);

  const requestCount = rateLimitStore[key].length;
  const allowed = requestCount < config.maxRequests;

  if (allowed) {
    rateLimitStore[key].push(now);
  }

  const remaining = Math.max(0, config.maxRequests - requestCount);
  const resetTime = new Date(rateLimitStore[key][0] + config.windowMs);

  return { allowed, remaining, resetTime };
}

/**
 * Middleware: API Rate Limiting
 * Per-user, per-endpoint limits
 */
export const apiRateLimit = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip || 'anonymous';
    const endpoint = req.baseUrl || req.path;
    const key = `${config.keyPrefix}:${userId}:${endpoint}`;

    const limit = checkRateLimit(key, config);

    res.set('X-RateLimit-Limit', config.maxRequests.toString());
    res.set('X-RateLimit-Remaining', limit.remaining.toString());
    res.set('X-RateLimit-Reset', limit.resetTime.toISOString());

    if (!limit.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${config.maxRequests} requests per ${Math.round(config.windowMs / 1000)}s`,
        retryAfter: Math.ceil((limit.resetTime.getTime() - Date.now()) / 1000)
      });
    }

    next();
  };
};

/**
 * Middleware: Download Rate Limiting
 * Stricter limits for file downloads to prevent bulk export
 */
export const downloadRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const config: RateLimitConfig = {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100, // Max 100 downloads per hour
    keyPrefix: 'downloads'
  };

  const limit = apiRateLimit(config)(req, res, () => {});
  next();
};

/**
 * Middleware: Query Rate Limiting
 * Prevent bulk data queries
 */
export const queryRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const config: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // Max 10 queries per minute
    keyPrefix: 'queries'
  };

  const limit = apiRateLimit(config)(req, res, () => {});
  next();
};

/**
 * Detect suspicious patterns in data access
 * Returns array of detected anomalies
 */
export interface AccessAnomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
}

export function detectAccessAnomalies(
  userId: string,
  accessCount: number,
  resultsCount: number,
  userHistory: { resultCounts: number[] }
): AccessAnomaly[] {
  const anomalies: AccessAnomaly[] = [];

  // Anomaly 1: Sudden spike in data access
  const avgHistoricalSize = userHistory.resultCounts.length > 0
    ? userHistory.resultCounts.reduce((a, b) => a + b, 0) / userHistory.resultCounts.length
    : 100;

  if (resultsCount > avgHistoricalSize * 5) {
    anomalies.push({
      type: 'spike_in_result_size',
      severity: 'high',
      description: 'Results size 5x higher than user average',
      details: {
        current: resultsCount,
        average: avgHistoricalSize,
        multiplier: (resultsCount / avgHistoricalSize).toFixed(1)
      }
    });
  }

  // Anomaly 2: Access all available data
  if (resultsCount > 1000 && accessCount === 1) {
    anomalies.push({
      type: 'bulk_data_request',
      severity: 'critical',
      description: 'Single request accessing 1000+ records',
      details: { recordCount: resultsCount }
    });
  }

  // Anomaly 3: Rapid-fire requests
  if (accessCount > 50 && accessCount < 300) {
    // 50-300 requests in short time
    anomalies.push({
      type: 'rapid_requests',
      severity: 'medium',
      description: 'Unusually rapid series of requests',
      details: { requestCount: accessCount }
    });
  }

  // Anomaly 4: Access to objects user hasn't accessed before
  if (resultsCount > 100) {
    anomalies.push({
      type: 'new_batch_access',
      severity: 'medium',
      description: 'Accessing large number of new objects',
      details: { newObjectCount: resultsCount }
    });
  }

  return anomalies;
}

/**
 * Log suspicious activity for security review
 */
export async function logSuspiciousActivity(
  pool: Pool,
  userId: string,
  activityType: string,
  severity: string,
  details: any
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO SecurityLog (
        event_type, severity, user_id, details, created_at
      )
      VALUES ($1, $2, $3, $4, NOW())`,
      [activityType, severity, userId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
}

/**
 * Get user access stats for anomaly detection
 */
export async function getUserAccessStats(
  pool: Pool,
  userId: string,
  timeWindowHours: number = 24
): Promise<{
  requestCount: number;
  avgResultSize: number;
  lastAccess: Date | null;
  uniqueObjects: number;
}> {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as request_count,
        AVG(CAST(details->>'result_count' AS INTEGER)) as avg_result_size,
        MAX(created_at) as last_access,
        COUNT(DISTINCT details->>'object_id') as unique_objects
      FROM AuditLog
      WHERE actor_id = $1
        AND action = 'read'
        AND created_at > NOW() - INTERVAL '${timeWindowHours} hours'`,
      [userId]
    );

    const row = result.rows[0];
    return {
      requestCount: parseInt(row.request_count),
      avgResultSize: row.avg_result_size ? parseInt(row.avg_result_size) : 0,
      lastAccess: row.last_access ? new Date(row.last_access) : null,
      uniqueObjects: parseInt(row.unique_objects)
    };
  } catch (error) {
    console.error('Error fetching user access stats:', error);
    return {
      requestCount: 0,
      avgResultSize: 0,
      lastAccess: null,
      uniqueObjects: 0
    };
  }
}

/**
 * Enforce daily download quota (e.g., 5GB per day)
 */
export async function checkDownloadQuota(
  pool: Pool,
  userId: string,
  fileSize: number,
  quotaGBPerDay: number = 5
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  try {
    const quotaBytes = quotaGBPerDay * 1024 * 1024 * 1024;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await pool.query(
      `SELECT COALESCE(SUM(CAST(details->>'file_size' AS BIGINT)), 0) as total_downloaded
      FROM AuditLog
      WHERE actor_id = $1
        AND action = 'download'
        AND created_at > $2`,
      [userId, today]
    );

    const totalDownloaded = parseInt(result.rows[0].total_downloaded);
    const remaining = Math.max(0, quotaBytes - totalDownloaded - fileSize);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      allowed: remaining >= 0,
      remaining: Math.floor(remaining / (1024 * 1024)), // Return in MB
      resetTime: tomorrow
    };
  } catch (error) {
    console.error('Error checking download quota:', error);
    return {
      allowed: true, // Fail open for availability
      remaining: 5000,
      resetTime: new Date()
    };
  }
}
