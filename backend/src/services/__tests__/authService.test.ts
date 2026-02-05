import { AuthService } from '../authService';
import { errors } from '../../middleware/errorHandler';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Unit Tests for AuthService
 * 
 * These tests mock the database and validate business logic in isolation.
 * To run: npm test authService.test.ts
 */

describe('AuthService', () => {
  let authService: AuthService;
  let mockPool: any;

  beforeEach(() => {
    // Create a mock pool with jest.fn()
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };

    // Instantiate service with mock pool
    authService = new AuthService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganizationWithAdmin', () => {
    const validPayload = {
      organizationName: 'ACME Corp',
      organizationType: 'client',
      adminEmail: 'admin@acme.com',
      adminName: 'John Admin',
      adminPassword: 'SecurePassword123'
    };

    it('should create organization with admin user successfully', async () => {
      // Arrange: Mock database responses
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock successful query responses
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ rowCount: 0 }] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Email check
        .mockResolvedValueOnce({ rows: [{ id: 'workspace-123' }] }) // Create workspace
        .mockResolvedValueOnce({ rows: [{ id: 'org-123' }] }) // Create organization
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }) // Create user
        .mockResolvedValueOnce({ rows: [{ rowCount: 1 }] }); // COMMIT

      // Act
      const result = await authService.createOrganizationWithAdmin(validPayload);

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        email: 'admin@acme.com',
        name: 'John Admin',
      });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error when required fields are missing', async () => {
      // Arrange
      const incompletePayload = {
        organizationName: 'ACME Corp',
        adminEmail: 'admin@acme.com',
        // Missing adminName and adminPassword
      };

      // Act & Assert
      await expect(
        authService.createOrganizationWithAdmin(incompletePayload as any)
      ).rejects.toThrow();
    });

    it('should throw error when organization type is invalid', async () => {
      // Arrange
      const invalidPayload = {
        ...validPayload,
        organizationType: 'invalid-type'
      };

      // Act & Assert
      await expect(
        authService.createOrganizationWithAdmin(invalidPayload)
      ).rejects.toThrow('Invalid organization type');
    });

    it('should throw conflict error when email already exists', async () => {
      // Arrange
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ rowCount: 0 }] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'user-existing' }] }); // Email exists

      // Act & Assert
      await expect(
        authService.createOrganizationWithAdmin(validPayload)
      ).rejects.toThrow('Email already registered');
    });

    it('should rollback on database error', async () => {
      // Arrange
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Email check
        .mockRejectedValueOnce(new Error('Database error')); // Error on workspace creation

      // Act & Assert
      await expect(
        authService.createOrganizationWithAdmin(validPayload)
      ).rejects.toThrow();

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const validCredentials = {
      email: 'user@example.com',
      password: 'TestPassword123'
    };

    it('should return token for valid credentials', async () => {
      // Arrange
      const passwordHash = await bcrypt.hash(validCredentials.password, 10);
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        password_hash: passwordHash,
        workspace_id: 'workspace-123',
        organization_id: 'org-123'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Act
      const result = await authService.login(validCredentials);

      // Assert
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.id).toBe('user-123');

      // Verify token is valid JWT
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET || 'your-dev-secret-change-in-production');
      expect(decoded).toHaveProperty('userId', 'user-123');
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // User not found

      // Act & Assert
      await expect(
        authService.login(validCredentials)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      // Arrange
      const passwordHash = await bcrypt.hash('DifferentPassword', 10);
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        password_hash: passwordHash,
        workspace_id: 'workspace-123',
        organization_id: 'org-123'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });

      // Act & Assert
      await expect(
        authService.login(validCredentials)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when email is missing', async () => {
      // Act & Assert
      await expect(
        authService.login({ email: '', password: 'password' })
      ).rejects.toThrow('Email and password are required');
    });

    it('should throw error when password is missing', async () => {
      // Act & Assert
      await expect(
        authService.login({ email: 'user@example.com', password: '' })
      ).rejects.toThrow('Email and password are required');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      // Arrange
      const token = jwt.sign(
        { userId: 'user-123', workspaceId: 'workspace-123' },
        process.env.JWT_SECRET || 'your-dev-secret-change-in-production',
        { expiresIn: '7d' }
      );

      // Act
      const decoded = authService.verifyToken(token);

      // Assert
      expect(decoded.userId).toBe('user-123');
      expect(decoded.workspaceId).toBe('workspace-123');
    });

    it('should throw error for invalid token', () => {
      // Act & Assert
      expect(() => authService.verifyToken('invalid-token')).toThrow();
    });

    it('should throw error for expired token', () => {
      // Arrange
      const expiredToken = jwt.sign(
        { userId: 'user-123', workspaceId: 'workspace-123' },
        process.env.JWT_SECRET || 'your-dev-secret-change-in-production',
        { expiresIn: '-1s' } // Expired
      );

      // Act & Assert
      expect(() => authService.verifyToken(expiredToken)).toThrow();
    });

    it('should throw error for token signed with wrong secret', () => {
      // Arrange
      const wrongToken = jwt.sign(
        { userId: 'user-123', workspaceId: 'workspace-123' },
        'wrong-secret',
        { expiresIn: '7d' }
      );

      // Act & Assert
      expect(() => authService.verifyToken(wrongToken)).toThrow();
    });
  });
});

/**
 * Running Tests:
 * 
 * npm test authService.test.ts              # Run this test file
 * npm test authService.test.ts -- --watch   # Watch mode
 * npm test authService.test.ts -- --coverage # With coverage
 * npm run test:coverage                     # Full project coverage
 */
