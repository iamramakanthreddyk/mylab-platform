import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { requireObjectAccess, auditLog } from '../../middleware/auth';
import { projectController } from './controller';
import { createProjectSchema, updateProjectSchema } from './types';

const router = Router();

/**
 * Project Routes
 * All routes require authentication
 */

// List projects
router.get(
  '/',
  authenticate,
  projectController.list
);

// Get specific project
router.get(
  '/:id',
  authenticate,
  requireObjectAccess('project'),
  projectController.getById
);

// Create project
router.post(
  '/',
  authenticate,
  validate(createProjectSchema),
  auditLog('create', 'project'),
  projectController.create
);

// Update project
router.put(
  '/:id',
  authenticate,
  requireObjectAccess('project', 'processor'),
  validate(updateProjectSchema),
  auditLog('update', 'project'),
  projectController.update
);

// Delete project
router.delete(
  '/:id',
  authenticate,
  requireObjectAccess('project', 'client'),
  auditLog('delete', 'project'),
  projectController.delete
);

export default router;
