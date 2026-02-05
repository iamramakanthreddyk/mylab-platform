import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authController } from './controller';

const router = Router();

/**
 * Auth Routes
 */

// Register organization admin (public endpoint)
router.post('/register', authController.register);

// Login user (public endpoint)
router.post('/login', authController.login);

// Set or reset password (public endpoint - users without password can set it)
router.post('/set-password', authController.setPassword);

// Get current user
router.get('/me', authenticate, authController.getCurrentUser);

// Verify token (public endpoint)
router.post('/verify', authController.verifyToken);

export default router;
