import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { requireObjectAccess, auditLog } from '../../middleware/auth';
import { trialController } from './controller';
import { createTrialSchema, updateTrialSchema, bulkCreateTrialSchema, trialParameterTemplateSchema, trialSetupSchema } from './types';

const router = Router({ mergeParams: true });

const mapProjectId = (req: any, _res: any, next: any) => {
  req.params.id = req.params.projectId;
  next();
};

/**
 * Trial Routes (nested under /projects/:projectId)
 */

router.get(
  '/',
  authenticate,
  mapProjectId,
  requireObjectAccess('project'),
  trialController.list
);

router.post(
  '/',
  authenticate,
  mapProjectId,
  requireObjectAccess('project', 'processor'),
  validate(createTrialSchema),
  auditLog('create', 'trial'),
  trialController.create
);

router.post(
  '/bulk',
  authenticate,
  mapProjectId,
  requireObjectAccess('project', 'processor'),
  validate(bulkCreateTrialSchema),
  auditLog('create', 'trial'),
  trialController.bulkCreate
);

router.get(
  '/parameters',
  authenticate,
  mapProjectId,
  requireObjectAccess('project'),
  trialController.getParameterTemplate
);

router.put(
  '/parameters',
  authenticate,
  mapProjectId,
  requireObjectAccess('project', 'processor'),
  validate(trialParameterTemplateSchema),
  auditLog('update', 'trial_parameters'),
  trialController.updateParameterTemplate
);

router.get(
  '/setup',
  authenticate,
  mapProjectId,
  requireObjectAccess('project'),
  trialController.getSetup
);

router.put(
  '/setup',
  authenticate,
  mapProjectId,
  requireObjectAccess('project', 'processor'),
  validate(trialSetupSchema),
  auditLog('update', 'trial_setup'),
  trialController.updateSetup
);

router.get(
  '/:trialId',
  authenticate,
  mapProjectId,
  requireObjectAccess('project'),
  trialController.getById
);

router.put(
  '/:trialId',
  authenticate,
  mapProjectId,
  requireObjectAccess('project', 'processor'),
  validate(updateTrialSchema),
  auditLog('update', 'trial'),
  trialController.update
);

router.get(
  '/:trialId/samples',
  authenticate,
  mapProjectId,
  requireObjectAccess('project'),
  trialController.listSamples
);

export default router;
