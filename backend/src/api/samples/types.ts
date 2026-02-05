import Joi from 'joi';

/**
 * Sample request/response types and validation schemas
 */

// ============ Request DTOs ============

export interface ListSamplesRequest {
  projectId: string;
}

export interface CreateSampleRequest {
  projectId: string;
  stageId?: string;
  name: string;
  description?: string;
  sampleType: string;
  quantity: number;
  unit: string;
}

export interface UpdateSampleRequest {
  name?: string;
  description?: string;
  status?: string;
  quantity?: number;
  unit?: string;
  stageId?: string;
}

// ============ Response DTOs ============

export interface SampleResponse {
  id: string;
  workspace_id: string;
  project_id: string;
  stage_id?: string;
  name: string;
  description?: string;
  sample_type: string;
  quantity: number;
  unit: string;
  status: string;
  project_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============ Validation Schemas ============

export const createSampleSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  stageId: Joi.string().uuid().optional(),
  name: Joi.string().required().trim().max(255),
  description: Joi.string().optional().trim().max(2000),
  sampleType: Joi.string().required().max(100),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().required().max(50)
});

export const updateSampleSchema = Joi.object({
  name: Joi.string().optional().trim().max(255),
  description: Joi.string().optional().trim().max(2000),
  status: Joi.string().optional().max(50),
  quantity: Joi.number().optional().positive(),
  unit: Joi.string().optional().max(50),
  stageId: Joi.string().uuid().optional()
});

// ============ Custom Error Classes ============

export class SampleNotFoundError extends Error {
  constructor(sampleId: string) {
    super(`Sample ${sampleId} not found`);
    this.name = 'SampleNotFoundError';
  }
}

export class InvalidSampleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSampleDataError';
  }
}

export class SampleHasDerivedError extends Error {
  constructor(derivedCount: number) {
    super(`Cannot delete sample with ${derivedCount} derived sample(s)`);
    this.name = 'SampleHasDerivedError';
  }
}

export class UnauthorizedCascadeDeleteError extends Error {
  constructor() {
    super('Cascade delete requires admin privileges');
    this.name = 'UnauthorizedCascadeDeleteError';
  }
}
