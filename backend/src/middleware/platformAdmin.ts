import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to require platform admin role
 * Platform admins have full system access including:
 * - Creating/deleting organizations
 * - Managing users across all organizations
 * - Viewing all system data
 * - Platform-wide configuration
 */
export const requirePlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    logger.warn('Platform admin check failed: No user in request');
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  if (req.user.role !== 'platform_admin') {
    logger.warn('Platform admin access denied', { 
      userId: req.user.id, 
      role: req.user.role,
      path: req.path 
    });
    
    return res.status(403).json({ 
      success: false, 
      error: 'Platform administrator access required. Only platform admins can perform this action.' 
    });
  }

  logger.info('Platform admin access granted', { 
    userId: req.user.id, 
    path: req.path 
  });
  
  next();
};

/**
 * Middleware to require org admin OR platform admin
 * Used for organization management endpoints where both roles are allowed
 */
export const requireOrgOrPlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  const allowedRoles = ['admin', 'platform_admin'];
  
  if (!allowedRoles.includes(req.user.role)) {
    logger.warn('Admin access denied', { 
      userId: req.user.id, 
      role: req.user.role,
      path: req.path 
    });
    
    return res.status(403).json({ 
      success: false, 
      error: 'Administrator access required' 
    });
  }

  next();
};
