import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/auth';
import { derivedSampleController } from './controller';

const router = Router({ mergeParams: true });

/**
 * Derived Samples Routes
 */

// Create derived sample from parent
router.post(
  '/samples/:workspaceId/:parentId/derived',
  authenticate,
  auditLog('create', 'derived_sample'),
  derivedSampleController.create
);

// List derived samples for parent
router.get('/samples/:workspaceId/:parentId/derived', authenticate, derivedSampleController.list);

// Get derived sample details
router.get('/derived-samples/:workspaceId/:id', authenticate, derivedSampleController.get);

// Delete derived sample
router.delete(
  '/derived-samples/:workspaceId/:id',
  authenticate,
  auditLog('delete', 'derived_sample'),
  derivedSampleController.delete
);

export default router;
