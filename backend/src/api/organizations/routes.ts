import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { requireObjectAccess, auditLog } from '../../middleware/auth';
import { organizationController } from './controller';
import { createOrganizationSchema, updateOrganizationSchema } from './types';

const router = Router();

/**
 * Organization Routes
 * All routes require authentication
 */

// List organizations
router.get(
  '/',
  authenticate,
  organizationController.list
);

// Get specific organization
router.get(
  '/:id',
  authenticate,
  organizationController.getById
);

// Create organization
router.post(
  '/',
  authenticate,
  validate(createOrganizationSchema),
  auditLog('create', 'organization'),
  organizationController.create
);

// Update organization
router.put(
  '/:id',
  authenticate,
  validate(updateOrganizationSchema),
  auditLog('update', 'organization'),
  organizationController.update
);

// Delete organization
router.delete(
  '/:id',
  authenticate,
  auditLog('delete', 'organization'),
  organizationController.delete
);

export default router;