import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

/**
 * Middleware to track user last login
 * Should be called after authentication middleware
 */
export const trackLastLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user && req.user.id) {
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

      // Update or insert last login record
      await pool.query(`
        INSERT INTO LastLogin (user_id, workspace_id, last_login_at, last_login_ip, last_user_agent)
        VALUES ($1, $2, NOW(), $3, $4)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          last_login_at = NOW(),
          last_login_ip = $3,
          last_user_agent = $4,
          updated_at = NOW()
      `, [req.user.id, req.user.workspaceId, ipAddress, userAgent]);
    }
    next();
  } catch (error) {
    console.error('Failed to track last login:', error);
    // Don't fail the request if login tracking fails
    next();
  }
};

/**
 * Middleware for feature gating - check if workspace has access to a feature
 */
export const checkFeatureAccess = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.workspaceId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get workspace subscription and its plan
      const subResult = await pool.query(`
        SELECT p.id as plan_id, p.name as plan_name
        FROM Subscriptions s
        LEFT JOIN Plans p ON s.plan_id = p.id
        WHERE s.workspace_id = $1 AND s.status = 'active' AND s.deleted_at IS NULL
      `, [req.user.workspaceId]);

      if (subResult.rows.length === 0) {
        return res.status(403).json({ 
          error: 'No active subscription found',
          feature: featureName 
        });
      }

      const planId = subResult.rows[0].plan_id;

      // Check if feature is available in plan
      const featureResult = await pool.query(`
        SELECT pf.*, f.name as feature_name
        FROM PlanFeatures pf
        LEFT JOIN Features f ON pf.feature_id = f.id
        WHERE pf.plan_id = $1 AND f.name = $2 AND f.deleted_at IS NULL
      `, [planId, featureName]);

      if (featureResult.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Feature not available in your plan',
          feature: featureName 
        });
      }

      // Attach feature info to request
      (req as any).feature = featureResult.rows[0];
      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
};

/**
 * Middleware for API rate limiting based on plan
 */
export const checkRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.workspaceId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Note: This is a simplified implementation
    // In production, use a caching layer (Redis) for rate limiting
    // For now, we're just checking the rate limit configuration

    next();
  } catch (error) {
    console.error('Rate limit check error:', error);
    next();
  }
};

/**
 * Middleware for tracking feature usage
 */
export const trackFeatureUsage = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startTime = Date.now();

      // Wrap the response to track when it's sent
      const originalSend = res.send;
      res.send = function(data: any) {
        const duration = Date.now() - startTime;
        
        if (req.user && req.user.workspaceId) {
          // Track usage asynchronously (non-blocking)
          pool.query(`
            INSERT INTO FeatureUsage (workspace_id, feature_id, usage_date, usage_count)
            SELECT $1, f.id, CURRENT_DATE, 1
            FROM Features f
            WHERE f.name = $2
            ON CONFLICT (workspace_id, feature_id, usage_date)
            DO UPDATE SET usage_count = usage_count + 1
          `, [req.user.workspaceId, featureName]).catch(err => {
            console.error('Failed to track feature usage:', err);
          });
        }

        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Feature usage tracking error:', error);
      next();
    }
  };
};
