import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { workspaceController } from './controller';

const router = Router();

/**
 * Workspace Routes
 */

// List user's workspaces
router.get(
  '/',
  authenticate,
  workspaceController.list
);

// Get workspace summary (count of users, projects, samples)
router.get(
  '/:id/summary',
  authenticate,
  workspaceController.getSummary
);

// Get complete workspace details
router.get(
  '/:id/detail',
  authenticate,
  workspaceController.getDetail
);

export default router;
