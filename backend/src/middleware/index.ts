// Authentication and access control middleware
export {
  authenticate,
  requireWorkspaceOwnership,
  requireObjectAccess,
  requireResharePermission,
  auditLog
} from './auth';

// Access control utilities
export {
  checkOwnership,
  checkAccess,
  grantAccess,
  revokeAccess,
  listAccessGrants,
  hasSufficientRole,
  isValidObjectType,
  validateExternalAPIKey,
  isExternalOrganization
} from './accessControl';

export type { AccessGrant, OwnershipCheck } from './accessControl';