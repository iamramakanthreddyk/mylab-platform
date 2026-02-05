import Joi from 'joi';

/**
 * Project Stage types and validation schemas
 */

// ============ DTOs ============

export interface CreateStageRequest {
  name: string;
  description?: string;
  orderIndex: number;
}

export interface UpdateStageRequest {
  name?: string;
  description?: string;
  orderIndex?: number;
  status?: 'active' | 'completed' | 'archived';
}

export interface StageResponse {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  orderIndex: number;
  status: string;
  ownerWorkspaceId: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Validation Schemas ============

export const createStageSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().optional().allow(''),
  orderIndex: Joi.number().integer().min(0).required()
});

export const updateStageSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().allow('').optional(),
  orderIndex: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'completed', 'archived').optional()
});

// ============ Errors ============

export class StageNotFoundError extends Error {
  constructor(stageId: string) {
    super(`Stage not found: ${stageId}`);
    this.name = 'StageNotFoundError';
  }
}

export class InvalidStageDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStageDataError';
  }
}
