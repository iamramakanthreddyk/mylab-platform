import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { requireObjectAccess, auditLog } from '../../middleware/auth';
import { sampleController } from './controller';
import { createSampleSchema, updateSampleSchema } from './types';

const router = Router();

/**
 * Sample Routes
 * All routes require authentication
 */

// List samples for project
router.get(
  '/',
  authenticate,
  sampleController.list
);

// Get specific sample
router.get(
  '/:id',
  authenticate,
  requireObjectAccess('sample'),
  sampleController.getById
);

// Create sample
router.post(
  '/',
  authenticate,
  validate(createSampleSchema),
  auditLog('create', 'sample'),
  sampleController.create
);

// Update sample
router.put(
  '/:id',
  authenticate,
  requireObjectAccess('sample', 'processor'),
  validate(updateSampleSchema),
  auditLog('update', 'sample'),
  sampleController.update
);

// Delete sample (with lineage protection)
router.delete(
  '/:id',
  authenticate,
  requireObjectAccess('sample', 'client'),
  auditLog('delete', 'sample'),
  sampleController.delete
);

// Cascade delete (admin only)
router.delete(
  '/:id/cascade',
  authenticate,
  requireObjectAccess('sample', 'client'),
  auditLog('cascade_delete', 'sample'),
  sampleController.cascadeDelete
);

export default router;
