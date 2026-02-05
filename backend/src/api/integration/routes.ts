import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/auth';
import { integrationController } from './controller';

const router = Router();

/**
 * Integration Routes
 */

// Create integration
router.post(
  '/:workspaceId',
  authenticate,
  auditLog('create', 'integration'),
  integrationController.create
);

// List integrations
router.get('/:workspaceId', authenticate, integrationController.list);

// Get integration
router.get('/:workspaceId/:id', authenticate, integrationController.get);

// Enable integration
router.patch(
  '/:workspaceId/:id/enable',
  authenticate,
  auditLog('enable', 'integration'),
  integrationController.enable
);

// Disable integration
router.patch(
  '/:workspaceId/:id/disable',
  authenticate,
  auditLog('disable', 'integration'),
  integrationController.disable
);

// Delete integration
router.delete(
  '/:workspaceId/:id',
  authenticate,
  auditLog('delete', 'integration'),
  integrationController.delete
);

export default router;
