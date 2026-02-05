/**
 * Derived Samples types
 */

export interface CreateDerivedSampleRequest {
  parent_sample_id: string;
  name: string;
  description?: string;
  derivation_method: string;
}

export interface DerivedSampleResponse {
  id: string;
  parent_sample_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  derivation_method: string;
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
