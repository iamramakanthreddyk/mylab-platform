/**
 * Auth request/response types and validation schemas
 */

export interface RegisterOrgAdminRequest {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SetPasswordRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
}

// ============ Custom Error Classes ============

export class UserNotFoundError extends Error {
  constructor(email: string) {
    super(`User with email ${email} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidTokenError extends Error {
  constructor() {
    super('Invalid or expired token');
    this.name = 'InvalidTokenError';
  }
}
