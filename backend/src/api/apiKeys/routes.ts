import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { apiKeyController } from './controller';

const router = Router({ mergeParams: true });

/**
 * API Keys Routes
 */

// Create API key
router.post('/', authenticate, apiKeyController.create);

// List API keys
router.get('/', authenticate, apiKeyController.list);

// Get API key
router.get('/:id', authenticate, apiKeyController.get);

// Delete API key
router.delete('/:id', authenticate, apiKeyController.delete);

export default router;
