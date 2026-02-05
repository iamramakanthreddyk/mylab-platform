import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { requireObjectAccess, auditLog } from '../../middleware/auth';
import { analysisController } from './controller';
import { createAnalysisSchema, updateAnalysisSchema } from './types';

const router = Router();

/**
 * Analysis Routes
 * All routes require authentication
 */

// List analyses
router.get(
  '/',
  authenticate,
  analysisController.list
);

// Get specific analysis
router.get(
  '/:id',
  authenticate,
  requireObjectAccess('analysis'),
  analysisController.getById
);

// Create analysis
router.post(
  '/',
  authenticate,
  validate(createAnalysisSchema),
  auditLog('create', 'analysis'),
  analysisController.create
);

// Update analysis
router.put(
  '/:id',
  authenticate,
  requireObjectAccess('analysis', 'analyzer'),
  validate(updateAnalysisSchema),
  auditLog('update', 'analysis'),
  analysisController.update
);

export default router;
