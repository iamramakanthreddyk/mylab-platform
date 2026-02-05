import { pool } from '../../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';
import {
  RegisterOrgAdminRequest,
  LoginRequest,
  LoginResponse,
  UserNotFoundError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  InvalidTokenError,
  TokenPayload
} from './types';

/**
 * Auth Service - Handles authentication and authorization
 */

// Helper functions for password hashing
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(payload: TokenPayload): string {
  const jwtSecret = process.env.JWT_SECRET || 'your-dev-secret-change-in-production';
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

export class AuthService {
  /**
   * Register organization admin
   */
  static async registerOrgAdmin(data: RegisterOrgAdminRequest): Promise<{ userId: string; email: string }> {
    try {
      logger.info('Registering org admin', { email: data.email });

      // Check if user exists
      const existingUser = await pool.query('SELECT id FROM Users WHERE email = $1', [data.email]);

      if (existingUser.rows.length > 0) {
        throw new UserAlreadyExistsError(data.email);
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user with org_admin role
      const result = await pool.query(
        `
        INSERT INTO Users (email, password_hash, full_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email
        `,
        [data.email, passwordHash, data.fullName, 'org_admin', true]
      );

      const userId = result.rows[0].id;

      // Create workspace for org
      await pool.query(
        `
        INSERT INTO Workspaces (name, created_by)
        VALUES ($1, $2)
        `,
        [data.companyName, userId]
      );

      logger.info('Org admin registered successfully', { userId, email: data.email });

      return {
        userId,
        email: data.email
      };
    } catch (error) {
      logger.error('Failed to register org admin', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      logger.info('User login attempt', { email: data.email });

      const result = await pool.query(
        `
        SELECT id, email, password_hash, full_name, role, is_active
        FROM Users
        WHERE email = $1 AND is_active = true
        `,
        [data.email]
      );

      if (result.rows.length === 0) {
        throw new InvalidCredentialsError();
      }

      const user = result.rows[0];

      // Verify password
      const passwordValid = await comparePassword(data.password, user.password_hash);

      if (!passwordValid) {
        throw new InvalidCredentialsError();
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      logger.info('User login successful', { userId: user.id, email: user.email });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      };
    } catch (error) {
      logger.error('Login failed', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Verify token and get user
   */
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'your-dev-secret-change-in-production';
      const decoded = jwt.verify(token, jwtSecret) as TokenPayload;

      return decoded;
    } catch (error) {
      logger.error('Token verification failed', { error });
      throw new InvalidTokenError();
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    try {
      const result = await pool.query(
        `
        SELECT id, email, full_name, role, is_active, created_at
        FROM Users
        WHERE id = $1
        `,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new UserNotFoundError('unknown');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get user', { userId, error });
      throw error;
    }
  }
}
