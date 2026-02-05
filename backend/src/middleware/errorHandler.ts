import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Custom Error class for consistent error handling throughout the application
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true,
    public details?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handling middleware
 * Catches all errors from route handlers and middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error properties
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;
  let details = {};

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
    details = err.details || {};
  } else if (err instanceof Error) {
    // Log unexpected errors
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
      workspaceId: (req as any).user?.workspaceId,
    });
  }

  // Log operational errors at appropriate level
  if (isOperational) {
    if (statusCode >= 500) {
      logger.error(message, {
        statusCode,
        details,
        url: req.originalUrl,
        method: req.method,
        userId: (req as any).user?.id,
      });
    } else {
      logger.warn(message, {
        statusCode,
        userId: (req as any).user?.id,
      });
    }
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { details }),
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
    },
  });
};

/**
 * Wrapper for async route handlers to catch errors
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Common error creators for standard scenarios
 */
export const errors = {
  notFound: (resource: string, id?: string) =>
    new AppError(404, `${resource} not found${id ? ` (ID: ${id})` : ''}`),

  unauthorized: (reason = 'Authentication required') =>
    new AppError(401, reason),

  forbidden: (reason = 'Access denied') =>
    new AppError(403, reason),

  badRequest: (message: string, details?: Record<string, any>) =>
    new AppError(400, message, true, details),

  conflict: (message: string) =>
    new AppError(409, message),

  unprocessable: (message: string) =>
    new AppError(422, message),

  tooManyRequests: () =>
    new AppError(429, 'Too many requests, please try again later'),

  internalServer: (message = 'Internal Server Error', details?: Record<string, any>) =>
    new AppError(500, message, false, details),
};
