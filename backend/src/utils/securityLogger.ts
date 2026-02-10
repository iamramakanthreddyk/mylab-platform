import { Pool } from 'pg';
import { Request } from 'express';

export interface SecurityEvent {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  resourceId?: string;
  reason: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log security-related events (failed auth, denied access, rate limits, etc.)
 * Separate from AuditLog for security events that don't represent successful actions
 */
export async function logSecurityEvent(
  pool: Pool,
  event: SecurityEvent
): Promise<void> {
  try {
    const organizationId = event.organizationId?.trim();
    await pool.query(`
      INSERT INTO SecurityLog (
        event_type,
        severity,
        user_id,
        organization_id,
        resource_type,
        resource_id,
        reason,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      event.eventType,
      event.severity,
      event.userId || null,
      organizationId || null,
      event.resourceType || null,
      event.resourceId || null,
      event.reason,
      event.details ? JSON.stringify(event.details) : null,
      event.ipAddress || null,
      event.userAgent || null
    ]);
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - security logging failure shouldn't break the app
  }
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(
  pool: Pool,
  organizationId: string | undefined,
  reason: string,
  req: Request
): Promise<void> {
  return logSecurityEvent(pool, {
    eventType: 'auth_failure',
    severity: 'high',
    organizationId,
    reason,
    details: {
      endpoint: req.path,
      method: req.method,
      query: req.query
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log access denial (403 Forbidden)
 */
export async function logAccessDenied(
  pool: Pool,
  userId: string,
  organizationId: string,
  resourceType: string,
  resourceId: string,
  reason: string,
  req: Request
): Promise<void> {
  return logSecurityEvent(pool, {
    eventType: 'access_denied',
    severity: 'medium',
    userId,
    organizationId,
    resourceType,
    resourceId,
    reason,
    details: {
      endpoint: req.path,
      method: req.method
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log validation failure
 */
export async function logValidationFailure(
  pool: Pool,
  userId: string,
  organizationId: string,
  resourceType: string,
  reason: string,
  req: Request
): Promise<void> {
  return logSecurityEvent(pool, {
    eventType: 'validation_failure',
    severity: 'low',
    userId,
    organizationId,
    resourceType,
    reason,
    details: {
      endpoint: req.path,
      method: req.method,
      body: req.body
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  pool: Pool,
  userId: string | undefined,
  organizationId: string,
  reason: string,
  req: Request
): Promise<void> {
  return logSecurityEvent(pool, {
    eventType: 'rate_limit_exceeded',
    severity: 'medium',
    userId,
    organizationId,
    reason,
    details: {
      endpoint: req.path,
      method: req.method
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log suspicious activity pattern
 */
export async function logSuspiciousActivity(
  pool: Pool,
  userId: string | undefined,
  organizationId: string,
  pattern: string,
  req: Request
): Promise<void> {
  return logSecurityEvent(pool, {
    eventType: 'suspicious_activity',
    severity: 'high',
    userId,
    organizationId,
    reason: `Suspicious pattern detected: ${pattern}`,
    details: {
      endpoint: req.path,
      method: req.method
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}

/**
 * Log data access attempt with token/download
 */
export async function logDataAccess(
  pool: Pool,
  userId: string,
  organizationId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  success: boolean,
  req: Request
): Promise<void> {
  return logSecurityEvent(pool, {
    eventType: 'data_access',
    severity: success ? 'low' : 'medium',
    userId,
    organizationId,
    resourceType,
    resourceId,
    reason: success ? `${action} successful` : `${action} failed`,
    details: {
      endpoint: req.path,
      method: req.method,
      success
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
}
