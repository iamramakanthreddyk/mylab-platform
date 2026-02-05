import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import logger from '../utils/logger';
import { AppError, errors } from '../middleware/errorHandler';

export interface AuthPayload {
  organizationName: string;
  organizationType?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    workspaceId: string;
    organizationId: string;
  };
}

/**
 * Authentication Service
 * Handles all authentication-related business logic
 */
export class AuthService {
  private pool: Pool;
  private jwtSecret: string;
  private jwtExpiry: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.jwtSecret = process.env.JWT_SECRET || 'your-dev-secret-change-in-production';
    this.jwtExpiry = '7d';
  }

  /**
   * Create a new organization with admin user in a transaction
   */
  async createOrganizationWithAdmin(payload: AuthPayload): Promise<AuthResponse> {
    const client = await this.pool.connect();

    try {
      // Validate required fields
      if (!payload.organizationName || !payload.adminEmail || !payload.adminName || !payload.adminPassword) {
        throw errors.badRequest('Missing required fields', {
          required: ['organizationName', 'adminEmail', 'adminName', 'adminPassword']
        });
      }

      // Validate organization type
      const validTypes = ['client', 'cro', 'analyzer', 'vendor', 'pharma'];
      const orgType = payload.organizationType || 'client';
      if (!validTypes.includes(orgType)) {
        throw errors.badRequest(`Invalid organization type. Must be one of: ${validTypes.join(', ')}`);
      }

      await client.query('BEGIN');

      // Check if email already exists
      const emailCheck = await client.query(
        'SELECT id FROM Users WHERE email = $1 AND deleted_at IS NULL',
        [payload.adminEmail]
      );

      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        throw errors.conflict('Email already registered');
      }

      // Create workspace
      const workspaceResult = await client.query(
        `INSERT INTO Workspace (name, slug, type)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [
          payload.organizationName,
          payload.organizationName.toLowerCase().replace(/\s+/g, '-'),
          'research'
        ]
      );

      const workspaceId = workspaceResult.rows[0].id;

      // Create organization
      const orgResult = await client.query(
        `INSERT INTO Organizations (name, type, workspace_id)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [payload.organizationName, orgType, workspaceId]
      );

      const organizationId = orgResult.rows[0].id;

      // Hash password
      const passwordHash = await bcrypt.hash(payload.adminPassword, 10);

      // Create admin user
      const userResult = await client.query(
        `INSERT INTO Users (email, name, password_hash, workspace_id, organization_id, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [payload.adminEmail, payload.adminName, passwordHash, workspaceId, organizationId, 'admin']
      );

      const userId = userResult.rows[0].id;

      await client.query('COMMIT');

      logger.info('Organization and admin user created successfully', {
        organizationId,
        workspaceId,
        userId,
        email: payload.adminEmail
      });

      // Generate token
      const token = this.generateToken(userId, workspaceId);

      return {
        token,
        user: {
          id: userId,
          email: payload.adminEmail,
          name: payload.adminName,
          workspaceId,
          organizationId
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error creating organization with admin', {
        error: error instanceof Error ? error.message : String(error),
        email: payload.adminEmail
      });
      throw errors.internalServer('Failed to create organization');
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      if (!credentials.email || !credentials.password) {
        throw errors.badRequest('Email and password are required');
      }

      // Fetch user
      const userResult = await this.pool.query(
        `SELECT u.id, u.email, u.name, u.password_hash, u.workspace_id, u.organization_id
         FROM Users u
         WHERE u.email = $1 AND u.deleted_at IS NULL`,
        [credentials.email]
      );

      if (userResult.rows.length === 0) {
        logger.warn('Failed login attempt - user not found', { email: credentials.email });
        throw errors.unauthorized('Invalid email or password');
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn('Failed login attempt - invalid password', { email: credentials.email, userId: user.id });
        throw errors.unauthorized('Invalid email or password');
      }

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      // Generate token
      const token = this.generateToken(user.id, user.workspace_id);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: user.workspace_id,
          organizationId: user.organization_id
        }
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error during login', {
        error: error instanceof Error ? error.message : String(error),
        email: credentials.email
      });
      throw errors.internalServer('Failed to authenticate user');
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string, workspaceId: string): string {
    return jwt.sign(
      { userId, workspaceId },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string; workspaceId: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string; workspaceId: string };
      return decoded;
    } catch (error) {
      throw errors.unauthorized('Invalid or expired token');
    }
  }
}
