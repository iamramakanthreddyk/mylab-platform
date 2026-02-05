import Joi from 'joi';

/**
 * Organization Types and Schemas
 */

export type OrganizationType = 'Client' | 'Laboratory' | 'Partner' | 'Internal';

export interface OrganizationModel {
  id: string;
  workspace_id: string;
  name: string;
  type: OrganizationType;
  contact_info?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface OrganizationResponse {
  id: string;
  workspaceId: string;
  name: string;
  type: OrganizationType;
  contactInfo?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  type: OrganizationType;
  contactInfo?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  type?: OrganizationType;
  contactInfo?: Record<string, any>;
}

// Validation schemas
export const createOrganizationSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.empty': 'Organization name cannot be empty',
      'string.min': 'Organization name cannot be empty',
      'string.max': 'Organization name cannot exceed 100 characters'
    }),
  type: Joi.string()
    .valid('Client', 'Laboratory', 'Partner', 'Internal')
    .required()
    .messages({
      'any.only': 'Organization type must be one of: Client, Laboratory, Partner, Internal'
    }),
  contactInfo: Joi.object()
    .optional()
    .messages({
      'object.base': 'Contact info must be an object'
    }),
});

export const updateOrganizationSchema = Joi.object({
  name: Joi.string()
    .optional()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.empty': 'Organization name cannot be empty',
      'string.min': 'Organization name cannot be empty',
      'string.max': 'Organization name cannot exceed 100 characters'
    }),
  type: Joi.string()
    .valid('Client', 'Laboratory', 'Partner', 'Internal')
    .optional()
    .messages({
      'any.only': 'Organization type must be one of: Client, Laboratory, Partner, Internal'
    }),
  contactInfo: Joi.object()
    .optional()
    .messages({
      'object.base': 'Contact info must be an object'
    }),
});

// Error classes
export class OrganizationNotFoundError extends Error {
  constructor(id: string) {
    super(`Organization with id ${id} not found`);
    this.name = 'OrganizationNotFoundError';
  }
}

export class InvalidOrganizationDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOrganizationDataError';
  }
}