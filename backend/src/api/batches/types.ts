import Joi from 'joi';

/**
 * Batch types and validation schemas
 */

// ============ DTOs ============

export interface CreateBatchRequest {
  sampleIds: string[]; // Array of derived sample IDs
  parameters?: Record<string, any>;
}

export interface UpdateBatchRequest {
  parameters?: Record<string, any>;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BatchResponse {
  id: string;
  batchId: string;
  workspaceId: string;
  originalWorkspaceId: string;
  parameters: Record<string, any>;
  status: string;
  executionMode: string;
  createdAt: string;
  updatedAt: string;
  sampleCount?: number;
}

// ============ Validation Schemas ============

export const createBatchSchema = Joi.object({
  sampleIds: Joi.array().items(Joi.string().uuid()).optional(),
  parameters: Joi.object().optional()
});

export const updateBatchSchema = Joi.object({
  parameters: Joi.object().optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional()
});

// ============ Errors ============

export class BatchNotFoundError extends Error {
  constructor(batchId: string) {
    super(`Batch not found: ${batchId}`);
    this.name = 'BatchNotFoundError';
  }
}

export class InvalidBatchDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBatchDataError';
  }
}
