/**
 * Integration types
 */

export interface CreateIntegrationRequest {
  workspace_id: string;
  provider: string;
  name: string;
  config: Record<string, any>;
}

export interface IntegrationResponse {
  id: string;
  workspace_id: string;
  provider: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SyncResultResponse {
  id: string;
  integration_id: string;
  status: string;
  synced_records: number;
  errors?: string;
  started_at: string;
  completed_at?: string;
}

// ============ Custom Error Classes ============

export class IntegrationNotFoundError extends Error {
  constructor(id: string) {
    super(`Integration ${id} not found`);
    this.name = 'IntegrationNotFoundError';
  }
}

export class UnsupportedProviderError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" is not supported`);
    this.name = 'UnsupportedProviderError';
  }
}

export class IntegrationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationConfigError';
  }
}
