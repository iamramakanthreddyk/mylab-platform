import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { auditLog } from '../../middleware/auth';
import { stageController } from './controller';
import { createStageSchema, updateStageSchema } from './types';

const router = Router({ mergeParams: true });

/**
 * Project Stage Routes
 * All routes require authentication
 * Nested under /api/projects/:projectId/stages
 */

// List stages for project
router.get(
  '/',
  authenticate,
  stageController.list
);

// Get specific stage
router.get(
  '/:id',
  authenticate,
  stageController.getById
);

// Create stage
router.post(
  '/',
  authenticate,
  validate(createStageSchema),
  auditLog('create', 'stage'),
  stageController.create
);

// Update stage
router.put(
  '/:id',
  authenticate,
  validate(updateStageSchema),
  auditLog('update', 'stage'),
  stageController.update
);

// Delete stage
router.delete(
  '/:id',
  authenticate,
  auditLog('delete', 'stage'),
  stageController.delete
);

export default router;
