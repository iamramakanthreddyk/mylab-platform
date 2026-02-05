import { Request, Response } from 'express';
import { AuthService, AuthPayload, LoginCredentials } from '../services/authService';
import { pool } from '../db';
import { asyncHandler, errors } from '../middleware/errorHandler';
import logger from '../utils/logger';

const authService = new AuthService(pool);

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */
export const authController = {
  /**
   * POST /api/auth/organization-admin
   * Create organization with admin user
   */
  createOrganizationAdmin: asyncHandler(async (req: Request, res: Response) => {
    const payload: AuthPayload = req.body;

    logger.info('Creating organization with admin user', {
      organizationName: payload.organizationName,
      email: payload.adminEmail
    });

    const result = await authService.createOrganizationWithAdmin(payload);

    res.status(201).json({
      success: true,
      message: 'Organization and admin user created successfully',
      data: result
    });
  }),

  /**
   * POST /api/auth/login
   * Authenticate user and return JWT token
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginCredentials = req.body;

    logger.info('Login attempt', { email: credentials.email });

    const result = await authService.login(credentials);

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  }),

  /**
   * POST /api/auth/verify
   * Verify JWT token
   */
  verifyToken: asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      throw errors.badRequest('Token is required');
    }

    const decoded = authService.verifyToken(token);

    res.json({
      success: true,
      message: 'Token is valid',
      data: { userId: decoded.userId, workspaceId: decoded.workspaceId }
    });
  }),

  /**
   * GET /api/auth/me
   * Get current user info (requires authentication)
   */
  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
      throw errors.unauthorized('User not authenticated');
    }

    logger.info('Fetching current user info', { userId: user.id });

    res.json({
      success: true,
      data: user
    });
  })
};
