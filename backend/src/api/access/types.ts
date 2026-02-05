/**
 * Access Control types
 */

export interface GrantAccessRequest {
  userId: string;
  objectType: string;
  objectId: string;
  accessLevel: 'view' | 'edit' | 'full';
}

export interface AccessResponse {
  id: string;
  user_id: string;
  object_type: string;
  object_id: string;
  access_level: string;
  created_at: string;
}

// ============ Custom Error Classes ============

export class AccessNotFoundError extends Error {
  constructor() {
    super('Access record not found');
    this.name = 'AccessNotFoundError';
  }
}

export class UnauthorizedAccessError extends Error {
  constructor() {
    super('You do not have permission to grant access');
    this.name = 'UnauthorizedAccessError';
  }
}

export class AccessAlreadyExistsError extends Error {
  constructor() {
    super('Access already granted to this resource');
    this.name = 'AccessAlreadyExistsError';
  }
}
