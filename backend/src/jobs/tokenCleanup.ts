/**
 * Token Cleanup Job
 * Scheduled job to clean up expired and revoked download tokens
 * Runs daily to prevent accumulation of unused tokens in the database
 */

import { pool } from '../db';
import * as cron from 'node-cron';

/**
 * Delete tokens that are:
 * 1. Expired (expires_at < NOW())
 * 2. Already revoked (revoked_at IS NOT NULL)
 * Preserves active tokens and recently expired tokens for audit purposes
 */
async function cleanupExpiredTokens(): Promise<void> {
  try {
    const result = await pool.query(`
      DELETE FROM DownloadTokens
      WHERE (
        -- Delete tokens expired > 30 days ago
        (expires_at < NOW() - INTERVAL '30 days')
        OR
        -- Delete revoked tokens > 7 days old
        (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')
      )
      AND (
        -- Only delete if not recently used
        used_at IS NULL OR used_at < NOW() - INTERVAL '24 hours'
      )
    `);

    console.log(`[Token Cleanup] Deleted ${result.rowCount} expired/revoked download tokens`);
    
    return;
  } catch (error) {
    console.error('[Token Cleanup] Error during cleanup:', error);
    throw error;
  }
}

/**
 * Clean up orphaned download tokens
 * Tokens whose associated grants have been deleted
 */
async function cleanupOrphanedTokens(): Promise<void> {
  try {
    const result = await pool.query(`
      DELETE FROM DownloadTokens dt
      WHERE dt.grant_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM AccessGrants ag WHERE ag.id = dt.grant_id
        )
    `);

    console.log(`[Token Cleanup] Deleted ${result.rowCount} orphaned download tokens`);
    
    return;
  } catch (error) {
    console.error('[Token Cleanup] Error cleaning orphaned tokens:', error);
    throw error;
  }
}

/**
 * Generate cleanup report
 */
async function generateCleanupReport(): Promise<{
  totalTokens: number;
  activeTokens: number;
  usedTokens: number;
  revokedTokens: number;
  expiredTokens: number;
  orphanedTokens: number;
}> {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM DownloadTokens) as total_tokens,
        (SELECT COUNT(*) FROM DownloadTokens WHERE revoked_at IS NULL AND expires_at > NOW()) as active_tokens,
        (SELECT COUNT(*) FROM DownloadTokens WHERE used_at IS NOT NULL) as used_tokens,
        (SELECT COUNT(*) FROM DownloadTokens WHERE revoked_at IS NOT NULL) as revoked_tokens,
        (SELECT COUNT(*) FROM DownloadTokens WHERE expires_at < NOW()) as expired_tokens,
        (SELECT COUNT(*) FROM DownloadTokens WHERE grant_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM AccessGrants ag WHERE ag.id = DownloadTokens.grant_id
        )) as orphaned_tokens
    `);

    const row = stats.rows[0];
    return {
      totalTokens: parseInt(row.total_tokens, 10),
      activeTokens: parseInt(row.active_tokens, 10),
      usedTokens: parseInt(row.used_tokens, 10),
      revokedTokens: parseInt(row.revoked_tokens, 10),
      expiredTokens: parseInt(row.expired_tokens, 10),
      orphanedTokens: parseInt(row.orphaned_tokens, 10)
    };
  } catch (error) {
    console.error('[Token Cleanup] Error generating report:', error);
    throw error;
  }
}

/**
 * Initialize scheduled cleanup job
 * Runs daily at 2 AM UTC
 */
export function initializeTokenCleanupJob(): void {
  // Schedule cleanup to run daily at 2 AM UTC
  const cleanupSchedule = cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[Token Cleanup] Starting scheduled cleanup job...');
      const startTime = Date.now();

      // Run cleanup tasks
      await cleanupExpiredTokens();
      await cleanupOrphanedTokens();

      // Generate and log report
      const report = await generateCleanupReport();
      const duration = Date.now() - startTime;

      console.log('[Token Cleanup] Job completed successfully', {
        duration: `${duration}ms`,
        report
      });
    } catch (error) {
      console.error('[Token Cleanup] Job failed:', error);
      // Don't throw - allow other processes to continue
    }
  });

  console.log('[Token Cleanup] Scheduled cleanup job initialized (runs daily at 2 AM UTC)');
  return cleanupSchedule as any;
}

/**
 * Manual cleanup trigger
 * Can be called from admin endpoints or CLI tools
 */
export async function triggerManualCleanup(): Promise<{
  status: 'success' | 'error';
  duration: number;
  report?: {
    totalTokens: number;
    activeTokens: number;
    usedTokens: number;
    revokedTokens: number;
    expiredTokens: number;
    orphanedTokens: number;
  };
  error?: string;
}> {
  try {
    const startTime = Date.now();

    console.log('[Token Cleanup] Manual cleanup triggered');

    await cleanupExpiredTokens();
    await cleanupOrphanedTokens();

    const report = await generateCleanupReport();
    const duration = Date.now() - startTime;

    return {
      status: 'success',
      duration,
      report
    };
  } catch (error) {
    console.error('[Token Cleanup] Manual cleanup failed:', error);
    return {
      status: 'error',
      duration: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current token statistics
 */
export async function getTokenStats(): Promise<{
  totalTokens: number;
  activeTokens: number;
  usedTokens: number;
  revokedTokens: number;
  expiredTokens: number;
  orphanedTokens: number;
}> {
  return generateCleanupReport();
}
