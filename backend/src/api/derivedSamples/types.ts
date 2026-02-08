/**
 * Derived Samples types
 */

export interface CreateDerivedSampleRequest {
  parent_sample_id: string;
  derived_id?: string;
  name?: string;
  description?: string;
  derivation_method?: string;
  execution_mode?: 'platform' | 'external';
  executed_by_org_id?: string;
  external_reference?: string;
  performed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface DerivedSampleResponse {
  id: string;
  parent_sample_id: string;
  workspace_id: string;
  name?: string;
  derived_id?: string;
  description?: string;
  derivation_method?: string;
  execution_mode?: 'platform' | 'external';
  executed_by_org_id?: string;
  external_reference?: string;
  performed_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

// ============ Custom Error Classes ============

export class DerivedSampleNotFoundError extends Error {
  constructor(id: string) {
    super(`Derived sample ${id} not found`);
    this.name = 'DerivedSampleNotFoundError';
  }
}

export class ParentSampleNotFoundError extends Error {
  constructor(id: string) {
    super(`Parent sample ${id} not found`);
    this.name = 'ParentSampleNotFoundError';
  }
}

export class InvalidDerivedSampleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDerivedSampleDataError';
  }
}
