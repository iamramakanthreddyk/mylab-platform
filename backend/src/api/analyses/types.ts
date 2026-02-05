import Joi from 'joi';

/**
 * Analysis request/response types and validation schemas
 */

// ============ Request DTOs ============

export interface ListAnalysesRequest {
  batchId?: string;
  executionMode?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAnalysisRequest {
  batchId: string;
  analysisTypeId: string;
  results: Record<string, any>;
  filePath: string;
  fileChecksum: string;
  fileSizeBytes: number;
  status?: string;
  executionMode?: string;
  executedByOrgId: string;
  sourceOrgId: string;
  externalReference?: string;
  performedAt?: string;
}

export interface UpdateAnalysisRequest {
  status?: string;
  results?: Record<string, any>;
}

// ============ Response DTOs ============

export interface AnalysisResponse {
  id: string;
  workspace_id: string;
  batch_id: string;
  analysis_type_id: string;
  status: string;
  results: Record<string, any>;
  execution_mode: string;
  uploaded_by: string;
  uploaded_at: string;
  analysis_type_name?: string;
  analysis_category?: string;
  executed_by_org_name?: string;
  source_org_name?: string;
  uploaded_by_name?: string;
  created_at: string;
  updated_at: string;
}

// ============ Validation Schemas ============

export const createAnalysisSchema = Joi.object({
  batchId: Joi.string().uuid().required(),
  analysisTypeId: Joi.string().uuid().required(),
  results: Joi.object().required(),
  filePath: Joi.string().required(),
  fileChecksum: Joi.string().required(),
  fileSizeBytes: Joi.number().positive().required(),
  status: Joi.string().optional().default('pending'),
  executionMode: Joi.string().optional().default('platform'),
  executedByOrgId: Joi.string().uuid().required(),
  sourceOrgId: Joi.string().uuid().required(),
  externalReference: Joi.string().optional(),
  performedAt: Joi.date().optional()
});

export const updateAnalysisSchema = Joi.object({
  status: Joi.string().optional(),
  results: Joi.object().optional()
});

// ============ Custom Error Classes ============

export class AnalysisNotFoundError extends Error {
  constructor(analysisId: string) {
    super(`Analysis ${analysisId} not found`);
    this.name = 'AnalysisNotFoundError';
  }
}

export class BatchNotFoundError extends Error {
  constructor(batchId: string) {
    super(`Batch ${batchId} not found or inaccessible`);
    this.name = 'BatchNotFoundError';
  }
}

export class InvalidAnalysisDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnalysisDataError';
  }
}

export class ConflictingAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictingAnalysisError';
  }
}
