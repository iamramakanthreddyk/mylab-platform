import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Authentication Routes (Refactored with Controller/Service Pattern)
 *
 * This demonstrates the recommended architecture:
 * Route -> Controller -> Service -> Database
 *
 * Benefits:
 * - Easier to test (mock the service)
 * - Better separation of concerns
 * - Reusable business logic across routes
 * - Centralized error handling
 */

// Public routes (no authentication required)
router.post('/organization-admin', authController.createOrganizationAdmin);
router.post('/login', authController.login);
router.post('/verify', authController.verifyToken);

// Protected routes (authentication required)
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
