import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationController } from './controller';

const router = Router();

/**
 * Notifications Routes
 */

// List user's notifications
router.get('/', authenticate, notificationController.list);

// Get notification
router.get('/:id', authenticate, notificationController.get);

// Mark notification as read
router.patch('/:id/read', authenticate, notificationController.markAsRead);

// Delete notification
router.delete('/:id', authenticate, notificationController.delete);

export default router;
