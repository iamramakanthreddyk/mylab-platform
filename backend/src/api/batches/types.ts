import Joi from 'joi';

/**
 * Batch types and validation schemas
 */

// ============ DTOs ============

export const BATCH_STATUS_VALUES = ['created', 'ready', 'sent', 'in_progress', 'completed'] as const;
export const EXECUTION_MODE_VALUES = ['platform', 'external'] as const;

export type BatchStatus = typeof BATCH_STATUS_VALUES[number];
export type ExecutionMode = typeof EXECUTION_MODE_VALUES[number];

export interface CreateBatchRequest {
  batchId: string;
  description: string;
  parameters?: Record<string, any>;
  status?: BatchStatus;
  executionMode?: ExecutionMode;
  executedByOrgId?: string;
  externalReference?: string;
  performedAt?: string;
  sampleIds: string[]; // Array of derived sample IDs
}

export interface UpdateBatchRequest {
  description?: string;
  parameters?: Record<string, any>;
  status?: BatchStatus;
  executionMode?: ExecutionMode;
  executedByOrgId?: string;
  externalReference?: string;
  performedAt?: string;
  sentAt?: string;
  completedAt?: string;
}

export interface BatchResponse {
  id: string;
  workspaceId: string;
  originalWorkspaceId: string;
  batchId: string;
  description: string;
  parameters: Record<string, any>;
  status: BatchStatus;
  executionMode: ExecutionMode;
  executedByOrgId: string;
  externalReference?: string;
  performedAt?: string;
  createdBy: string;
  sentAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  sampleCount?: number;
}

// ============ Validation Schemas ============

export const createBatchSchema = Joi.object({
  batchId: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().min(3).max(1000).required(),
  parameters: Joi.object().optional(),
  status: Joi.string().valid(...BATCH_STATUS_VALUES).optional(),
  executionMode: Joi.string().valid(...EXECUTION_MODE_VALUES).optional(),
  executedByOrgId: Joi.string().uuid().optional(),
  externalReference: Joi.string().trim().max(255).optional(),
  performedAt: Joi.string().isoDate().optional(),
  sampleIds: Joi.array().items(Joi.string().uuid()).min(1).required()
}).custom((value, helpers) => {
  if (value.executionMode === 'external' && !value.externalReference) {
    return helpers.error('any.custom', { message: 'externalReference is required for external execution' });
  }
  return value;
});

export const updateBatchSchema = Joi.object({
  description: Joi.string().trim().min(3).max(1000).optional(),
  parameters: Joi.object().optional(),
  status: Joi.string().valid(...BATCH_STATUS_VALUES).optional(),
  executionMode: Joi.string().valid(...EXECUTION_MODE_VALUES).optional(),
  executedByOrgId: Joi.string().uuid().optional(),
  externalReference: Joi.string().trim().max(255).optional(),
  performedAt: Joi.string().isoDate().optional(),
  sentAt: Joi.string().isoDate().optional(),
  completedAt: Joi.string().isoDate().optional()
}).min(1);

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
