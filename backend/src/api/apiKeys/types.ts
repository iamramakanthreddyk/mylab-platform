/**
 * API Keys request/response types
 */

export interface CreateApiKeyRequest {
  name: string;
  description?: string;
  expiresAt?: string;
}

export interface ApiKeyResponse {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  key: string;
  created_at: string;
  expires_at?: string;
  last_used_at?: string;
}

// ============ Custom Error Classes ============

export class ApiKeyNotFoundError extends Error {
  constructor(keyId: string) {
    super(`API Key ${keyId} not found`);
    this.name = 'ApiKeyNotFoundError';
  }
}

export class InvalidApiKeyError extends Error {
  constructor() {
    super('Invalid or expired API key');
    this.name = 'InvalidApiKeyError';
  }
}
