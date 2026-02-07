// Error Handling
export { errorHandler, asyncHandler, errors } from './errorHandler'

// Authentication & Authorization
export {
  authenticate,
  requireWorkspaceOwnership,
  requireObjectAccess,
  requireResharePermission,
  auditLog
} from './auth'

// Access Control Utilities
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
} from './accessControl'

export type { AccessGrant, OwnershipCheck } from './accessControl'

// Access Control Middleware
export {
  enforceAccessControl,
  requireAccess,
  requireRole,
  requireProjectAccess
} from './accessControlMiddleware'

export type { AccessControlRequest } from './accessControlMiddleware'

// Utilities
export { trackLastLogin, checkFeatureAccess, trackFeatureUsage } from './analytics'
export { validate, validateQuery, validateParams, schemas, authSchemas, projectSchemas, sampleSchemas, analysisSchemas } from './validation'
export { checkRateLimit, apiRateLimit, downloadRateLimit, queryRateLimit, detectAccessAnomalies, logSuspiciousActivity, getUserAccessStats, checkDownloadQuota } from './rateLimitUtils'
export type { AccessAnomaly } from './rateLimitUtils'