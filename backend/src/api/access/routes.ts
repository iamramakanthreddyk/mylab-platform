import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { accessController } from './controller';

const router = Router();

/**
 * Access Control Routes
 */

// Grant access to resource
router.post('/grant', authenticate, accessController.grant);

// List access grants for resource
router.get('/:objectType/:objectId', authenticate, accessController.list);

// Revoke access to resource
router.delete('/:userId/:objectType/:objectId', authenticate, accessController.revoke);

export default router;
