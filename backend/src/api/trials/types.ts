import Joi from 'joi';

/**
 * Trial request/response types and validation schemas
 */

export interface CreateTrialRequest {
  name: string;
  objective?: string;
  parameters?: string;
  measurements?: Record<string, string | number>;
  equipment?: string;
  notes?: string;
  status?: 'planned' | 'running' | 'completed';
  performedAt?: string;
}

export interface BulkCreateTrialRequest {
  trials: CreateTrialRequest[];
}

export interface TrialParameterTemplateRequest {
  columns: string[];
}

export interface UpdateTrialRequest {
  name?: string;
  objective?: string;
  parameters?: string;
  measurements?: Record<string, string | number>;
  equipment?: string;
  notes?: string;
  status?: 'planned' | 'running' | 'completed';
  performedAt?: string;
}

export interface TrialResponse {
  id: string;
  project_id: string;
  workspace_id: string;
  name: string;
  objective?: string;
  parameters?: string;
  parameters_json?: Record<string, string | number> | null;
  equipment?: string;
  notes?: string;
  status: string;
  performed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export const createTrialSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  objective: Joi.string().trim().max(2000).optional(),
  parameters: Joi.string().trim().max(4000).optional(),
  measurements: Joi.object().pattern(
    Joi.string().trim().min(1),
    Joi.alternatives().try(Joi.string().trim(), Joi.number())
  ).optional(),
  equipment: Joi.string().trim().max(2000).optional(),
  notes: Joi.string().trim().max(4000).optional(),
  status: Joi.string().valid('planned', 'running', 'completed').optional(),
  performedAt: Joi.string().isoDate().optional()
});

export const bulkCreateTrialSchema = Joi.object({
  trials: Joi.array().items(createTrialSchema).min(1).required()
});

export const trialParameterTemplateSchema = Joi.object({
  columns: Joi.array().items(Joi.string().trim().min(1)).required()
});

export const updateTrialSchema = Joi.object({
  name: Joi.string().trim().max(255).optional(),
  objective: Joi.string().trim().max(2000).optional(),
  parameters: Joi.string().trim().max(4000).optional(),
  measurements: Joi.object().pattern(
    Joi.string().trim().min(1),
    Joi.alternatives().try(Joi.string().trim(), Joi.number())
  ).optional(),
  equipment: Joi.string().trim().max(2000).optional(),
  notes: Joi.string().trim().max(4000).optional(),
  status: Joi.string().valid('planned', 'running', 'completed').optional(),
  performedAt: Joi.string().isoDate().optional()
}).min(1);

export class TrialNotFoundError extends Error {
  constructor(id: string) {
    super(`Trial ${id} not found`);
    this.name = 'TrialNotFoundError';
  }
}

export class InvalidTrialDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTrialDataError';
  }
}
