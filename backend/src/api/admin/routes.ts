import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { adminController } from './controller';

const router = Router();

/**
 * Admin Routes - All require admin role
 */

// Get system statistics
router.get('/stats', authenticate, adminController.getStats);

// List all users
router.get('/users', authenticate, adminController.listUsers);

// Deactivate user
router.patch('/users/:id/deactivate', authenticate, adminController.deactivateUser);

// Get audit log
router.get('/audit-log', authenticate, adminController.getAuditLog);

export default router;
