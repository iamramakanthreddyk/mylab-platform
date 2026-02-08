import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { auditLog } from '../../middleware/auth';
import { batchController } from './controller';
import { createBatchSchema, updateBatchSchema } from './types';

const router = Router();

/**
 * Batch Routes
 * All routes require authentication
 */

// List batches
router.get(
  '/',
  authenticate,
  batchController.list
);

// Get specific batch
router.get(
  '/:id',
  authenticate,
  batchController.getById
);

// Create batch
router.post(
  '/',
  authenticate,
  validate(createBatchSchema),
  batchController.create
);

// Update batch
router.put(
  '/:id',
  authenticate,
  validate(updateBatchSchema),
  auditLog('update', 'batch'),
  batchController.update
);

// Delete batch
router.delete(
  '/:id',
  authenticate,
  auditLog('delete', 'batch'),
  batchController.delete
);

export default router;
