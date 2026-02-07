import Joi from 'joi';
import { SAMPLE_SCHEMA } from '../../database/schemas';

/**
 * Sample request/response types and validation schemas
 * 
 * ⚠️ IMPORTANT: All schemas here reference the central SAMPLE_SCHEMA definition
 * in database/schemas.ts to prevent schema drift.
 * Do NOT create new validation schemas here - use SAMPLE_SCHEMA instead.
 */

// ============ Request DTOs ============

export interface ListSamplesRequest {
  projectId: string;
}

export interface CreateSampleRequest {
  projectId: string;
  stageId?: string;
  sampleId: string;
  description: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface UpdateSampleRequest {
  sampleId?: string;
  description?: string;
  type?: string;
  status?: string;
  metadata?: Record<string, any>;
  stageId?: string;
}

// ============ Response DTOs ============

export interface SampleResponse {
  id: string;
  workspace_id: string;
  project_id: string;
  stage_id?: string;
  sample_id: string;
  description: string;
  type?: string;
  metadata?: Record<string, any>;
  status: string;
  project_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============ Validation Schemas ============
// IMPORTANT: These reference SAMPLE_SCHEMA from database/schemas.ts
// This is the single source of truth - do not modify these without updating database/schemas.ts

export const createSampleSchema = SAMPLE_SCHEMA.CreateRequest;
export const updateSampleSchema = SAMPLE_SCHEMA.UpdateRequest;

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
