import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { errors } from './errorHandler';
import logger from '../utils/logger';
import { SAMPLE_SCHEMA } from '../database/schemas';

/**
 * Input validation middleware using Joi
 * Validates request body against a schema and passes errors to next middleware
 */
export const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        presence: 'required',
      });

      if (error) {
        const details = error.details.reduce((acc, detail) => {
          const path = detail.path.join('.');
          acc[path] = detail.message;
          return acc;
        }, {} as Record<string, string>);

        logger.warn('Validation error', {
          path: req.path,
          method: req.method,
          errors: details,
        });

        return next(errors.badRequest('Validation failed', details));
      }

      // Replace req.body with validated/sanitized value
      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Query parameter validation
 */
export const validateQuery = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.reduce((acc, detail) => {
          acc[detail.path.join('.')] = detail.message;
          return acc;
        }, {} as Record<string, string>);

        return next(errors.badRequest('Invalid query parameters', details));
      }

      req.query = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * URL parameter validation
 */
export const validateParams = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
      });

      if (error) {
        const details = error.details.reduce((acc, detail) => {
          acc[detail.path.join('.')] = detail.message;
          return acc;
        }, {} as Record<string, string>);

        return next(errors.badRequest('Invalid URL parameters', details));
      }

      req.params = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Common Joi validation schemas for reuse across routes
 */
export const schemas = {
  // IDs
  uuid: Joi.string().uuid().required(),
  uuidOptional: Joi.string().uuid(),
  
  // Common fields
  email: Joi.string().email().lowercase().required(),
  emailOptional: Joi.string().email().lowercase(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0),
  }),
  
  // Status enums
  projectStatus: Joi.string().valid('active', 'completed', 'archived', 'on-hold'),
  userRole: Joi.string().valid('admin', 'user', 'viewer'),
  organizationType: Joi.string().valid('client', 'cro', 'analyzer', 'vendor', 'pharma'),
};

/**
 * Example validation schemas for different features
 * Copy and customize for your routes
 */

// Auth Schemas
export const authSchemas = {
  createOrganizationAdmin: Joi.object({
    organizationName: schemas.name,
    organizationType: schemas.organizationType.default('client'),
    adminEmail: schemas.email,
    adminName: schemas.name,
    adminPassword: schemas.password,
  }),

  login: Joi.object({
    email: schemas.email,
    password: Joi.string().required(),
  }),

  verifyToken: Joi.object({
    token: Joi.string().required(),
  }),
};

// Project Schemas
export const projectSchemas = {
  create: Joi.object({
    name: schemas.name,
    description: schemas.description,
    clientOrgId: schemas.uuid,
    executingOrgId: schemas.uuid,
    status: schemas.projectStatus.default('active'),
  }),

  update: Joi.object({
    name: schemas.name.optional(),
    description: schemas.description,
    status: schemas.projectStatus,
  }).min(1),

  list: Joi.object({
    status: schemas.projectStatus,
    page: schemas.pagination.extract('page'),
    limit: schemas.pagination.extract('limit'),
  }),
};

// Sample Schemas - Reference SAMPLE_SCHEMA from database/schemas.ts
// This ensures all APIs use the same validation rules as the database definition
export const sampleSchemas = {
  create: SAMPLE_SCHEMA.CreateRequest,
  update: SAMPLE_SCHEMA.UpdateRequest,
};

// Analysis Schemas
export const analysisSchemas = {
  create: Joi.object({
    sampleId: schemas.uuid,
    analysisType: Joi.string().valid('dna_seq', 'protein_analysis', 'microscopy').required(),
    method: Joi.string().max(255).required(),
    parameters: Joi.object().optional(),
    description: schemas.description,
  }),

  update: Joi.object({
    analysisType: Joi.string().valid('dna_seq', 'protein_analysis', 'microscopy'),
    method: Joi.string().max(255),
    parameters: Joi.object(),
    description: schemas.description,
    results: Joi.object().optional(),
  }).min(1),
};
