import { Router } from 'express';
import { validate } from '../../middleware/validation';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/auth';
import { companyController } from './controller';
import { registerCompanySchema } from './types';

const router = Router();

/**
 * Company Routes
 */

// Public registration endpoint (no auth required)
router.post(
  '/onboarding/register',
  validate(registerCompanySchema),
  auditLog('register', 'company'),
  companyController.register
);

// Get onboarding request details
router.get(
  '/onboarding/:id',
  authenticate,
  companyController.getOnboarding
);

// List onboarding requests (admin only)
router.get(
  '/onboarding',
  authenticate,
  companyController.listOnboarding
);

// Approve onboarding (admin only)
router.patch(
  '/onboarding/:id/approve',
  authenticate,
  auditLog('approve', 'onboarding'),
  companyController.approveOnboarding
);

// Reject onboarding (admin only)
router.patch(
  '/onboarding/:id/reject',
  authenticate,
  auditLog('reject', 'onboarding'),
  companyController.rejectOnboarding
);

export default router;
