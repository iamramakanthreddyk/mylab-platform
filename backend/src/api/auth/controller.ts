import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthService } from './service';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidTokenError
} from './types';
import logger from '../../utils/logger';

/**
 * Auth Controller - Handles authentication endpoints
 */

export const authController = {
  /**
   * POST /api/auth/register - Register organization admin
   */
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, fullName, companyName } = req.body;

    try {
      const result = await AuthService.registerOrgAdmin({
        email,
        password,
        fullName,
        companyName
      });

      logger.info('Org admin registered via API', { email });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful'
      });
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * POST /api/auth/login - Login user
   */
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const result = await AuthService.login({ email, password });

      logger.info('User logged in via API', { email });

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/auth/me - Get current user
   */
  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await AuthService.getUserById(userId);

    res.status(200).json({
      success: true,
      data: user
    });
  }),

  /**
   * POST /api/auth/verify - Verify token
   */
  verifyToken: asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = await AuthService.verifyToken(token);

      res.status(200).json({
        success: true,
        data: payload
      });
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return res.status(401).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
