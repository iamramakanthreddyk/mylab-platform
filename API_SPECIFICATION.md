# MyLab Platform API Specification
**Version:** 1.1.0
**Last Updated:** February 9, 2026
**Base URL:** `/api`

This document provides a comprehensive specification of all API endpoints in the MyLab Platform backend.

## Table of Contents
1. [Authentication](#authentication)
2. [Users & Invitations](#users--invitations)
3. [Analysis Types](#analysis-types)
4. [Analysis Requests](#analysis-requests)
5. [Files](#files)
6. [Projects](#projects)
7. [Stages](#stages-nested-under-projects)
8. [Trials](#trials-nested-under-projects)
9. [Samples](#samples)
10. [Derived Samples](#derived-samples)
11. [Analyses](#analyses)
12. [Batches](#batches)
13. [Supply Chain](#supply-chain)
14. [Workspaces](#workspaces)
15. [Access Control](#access-control)
16. [API Keys](#api-keys)
17. [Notifications](#notifications)
18. [Notification Preferences](#notification-preferences)
19. [Integrations](#integrations)
20. [Team Management](#team-management)
21. [Admin](#admin)
22. [Company](#company)

---

## Authentication

### POST /api/auth/login
**Description:** Authenticate user and return JWT token
**Auth:** None required
**Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
**Response:** JWT token and user info

### POST /api/auth/change-password
**Description:** Change user password
**Auth:** Required
**Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### POST /api/auth/refresh
**Description:** Refresh JWT token
**Auth:** Required (refresh token)

### POST /api/auth/forgot-password
**Description:** Initiate password reset
**Auth:** None required
**Body:**
```json
{
  "email": "string"
}
```

### POST /api/auth/reset-password
**Description:** Reset password with token
**Auth:** None required
**Body:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

### POST /api/auth/onboarding/register
**Description:** Register new organization admin
**Auth:** None required

### GET /api/auth/onboarding/status/:requestId
**Description:** Check onboarding request status
**Auth:** None required

### PUT /api/auth/onboarding/approve/:requestId
**Description:** Approve onboarding request
**Auth:** Super admin required

---

## Users & Invitations

### POST /api/users/invite
**Description:** Create user invitation
**Auth:** Admin/Manager required
**Body:**
```json
{
  "email": "string",
  "role": "admin|manager|analyst|client"
}
```

### GET /api/users/invitations
**Description:** List workspace invitations
**Auth:** Required
**Query:** `status=pending|accepted|expired`

### POST /api/users/accept-invitation
**Description:** Accept invitation and create account
**Auth:** None required
**Body:**
```json
{
  "token": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string"
}
```

### DELETE /api/users/invitations/:id
**Description:** Cancel invitation
**Auth:** Admin/Manager required

### GET /api/users
**Description:** List workspace users
**Auth:** Required
**Query:** `search`, `role`, `status`

### GET /api/users/:id
**Description:** Get user details
**Auth:** Required

### PATCH /api/users/:id
**Description:** Update user
**Auth:** Self or Admin required

### DELETE /api/users/:id
**Description:** Soft delete user
**Auth:** Admin required

---

## Analysis Types

### GET /api/analysis-types
**Description:** List all analysis types (auto-seeds if empty)
**Auth:** Required

### POST /api/analysis-types
**Description:** Create new analysis type
**Auth:** Admin required
**Body:**
```json
{
  "name": "string",
  "description": "string",
  "methodology": "string",
  "isActive": true
}
```

### GET /api/analysis-types/:id
**Description:** Get analysis type details
**Auth:** Required

### PATCH /api/analysis-types/:id
**Description:** Update analysis type
**Auth:** Admin required

### DELETE /api/analysis-types/:id
**Description:** Soft delete analysis type
**Auth:** Admin required

---

## Analysis Requests

### POST /api/analysis-requests
**Description:** Create new analysis request
**Auth:** Required
**Body:**
```json
{
  "toOrganizationId": "uuid",
  "sampleId": "uuid",
  "analysisTypeId": "uuid",
  "description": "string",
  "methodologyRequirements": "string",
  "parameters": "object",
  "priority": "low|medium|high|urgent",
  "dueDate": "date",
  "estimatedDuration": "string"
}
```

### GET /api/analysis-requests/incoming
**Description:** Get requests TO current organization
**Auth:** Required
**Query:** `status`, `priority`

### GET /api/analysis-requests/outgoing
**Description:** Get requests FROM current organization
**Auth:** Required
**Query:** `status`, `priority`

### GET /api/analysis-requests/:id
**Description:** Get request details
**Auth:** Required

### POST /api/analysis-requests/:id/accept
**Description:** Accept request and assign
**Auth:** Required
**Body:**
```json
{
  "assignedTo": "uuid"
}
```

### POST /api/analysis-requests/:id/reject
**Description:** Reject request
**Auth:** Required
**Body:**
```json
{
  "reason": "string"
}
```

### PATCH /api/analysis-requests/:id/status
**Description:** Update request status
**Auth:** Required
**Body:**
```json
{
  "status": "in_progress|completed",
  "notes": "string"
}
```

---

## Files

### POST /api/files/upload
**Description:** Upload file with entity association
**Auth:** Required
**Content-Type:** multipart/form-data
**Body:** file, entity_type, entity_id, description

### GET /api/files/:id
**Description:** Get file metadata
**Auth:** Required

### GET /api/files/:id/download
**Description:** Download file with integrity check
**Auth:** Required

### GET /api/files/entity/:entity_type/:entity_id
**Description:** Get all files for entity
**Auth:** Required

### PATCH /api/files/:id
**Description:** Update file metadata
**Auth:** Required

### DELETE /api/files/:id
**Description:** Soft delete file
**Auth:** Required

---

## Projects

### GET /api/projects
**Description:** List workspace projects
**Auth:** Required

### POST /api/projects
**Description:** Create new project
**Auth:** Required
**Body:**
```json
{
  "name": "string",
  "description": "string",
  "clientOrgId": "uuid",
  "executingOrgId": "uuid"
}
```

### GET /api/projects/:projectId
**Description:** Get project details
**Auth:** Required

### PUT /api/projects/:projectId
**Description:** Update project
**Auth:** Required

### DELETE /api/projects/:projectId
**Description:** Delete project
**Auth:** Admin required

### Stages (Nested under Projects)

#### GET /api/projects/:projectId/stages
**Description:** List stages for project
**Auth:** Required

#### GET /api/projects/:projectId/stages/:id
**Description:** Get stage details
**Auth:** Required

#### POST /api/projects/:projectId/stages
**Description:** Create new stage
**Auth:** Required
**Body:**
```json
{
  "name": "string",
  "description": "string",
  "orderIndex": "number",
  "estimatedDuration": "string",
  "requiredResources": "string"
}
```

#### PUT /api/projects/:projectId/stages/:id
**Description:** Update stage
**Auth:** Required

#### DELETE /api/projects/:projectId/stages/:id
**Description:** Delete stage
**Auth:** Required

### Trials (Nested under Projects)

#### GET /api/projects/:projectId/trials
**Description:** List trials for project
**Auth:** Required

#### GET /api/projects/:projectId/trials/:trialId
**Description:** Get trial details
**Auth:** Required

#### POST /api/projects/:projectId/trials
**Description:** Create new trial
**Auth:** Required

#### POST /api/projects/:projectId/trials/bulk
**Description:** Create multiple trials
**Auth:** Required

#### PUT /api/projects/:projectId/trials/:trialId
**Description:** Update trial
**Auth:** Required

#### DELETE /api/projects/:projectId/trials/:trialId
**Description:** Delete trial
**Auth:** Required

#### POST /api/projects/:projectId/trials/:trialId/parameters
**Description:** Update trial parameters
**Auth:** Required

#### GET /api/projects/:projectId/trials/:trialId/parameters
**Description:** Get trial parameters
**Auth:** Required

---

## Samples

### GET /api/samples
**Description:** List workspace samples
**Auth:** Required

### POST /api/samples
**Description:** Create new sample
**Auth:** Required
**Body:**
```json
{
  "name": "string",
  "description": "string",
  "sampleType": "string",
  "metadata": "object"
}
```

### GET /api/samples/:id
**Description:** Get sample details
**Auth:** Required

### PUT /api/samples/:id
**Description:** Update sample
**Auth:** Required

### DELETE /api/samples/:id
**Description:** Delete sample
**Auth:** Required

### DELETE /api/samples/:id/cascade
**Description:** Delete sample and all derived samples
**Auth:** Required

---

## Derived Samples

### GET /api/derived-samples
**Description:** List derived samples
**Auth:** Required

### POST /api/derived-samples
**Description:** Create derived sample
**Auth:** Required
**Body:**
```json
{
  "parentSampleId": "uuid",
  "name": "string",
  "description": "string",
  "derivationMethod": "string"
}
```

### GET /api/derived-samples/:id
**Description:** Get derived sample details
**Auth:** Required

### PUT /api/derived-samples/:id
**Description:** Update derived sample
**Auth:** Required

### POST /api/derived-samples/:id/share
**Description:** Share derived sample
**Auth:** Required

### DELETE /api/derived-samples/:id
**Description:** Delete derived sample
**Auth:** Required

---

## Analyses

### GET /api/analyses
**Description:** List analyses
**Auth:** Required

### POST /api/analyses
**Description:** Create new analysis
**Auth:** Required

### POST /api/analyses/external
**Description:** Create external analysis
**Auth:** None required

### GET /api/analyses/:id
**Description:** Get analysis details
**Auth:** Required

### POST /api/analyses/:id/revise
**Description:** Revise analysis
**Auth:** Required

### PUT /api/analyses/:id
**Description:** Update analysis
**Auth:** Required

### DELETE /api/analyses/:id
**Description:** Delete analysis
**Auth:** Required

---

## Batches

### GET /api/batches
**Description:** List batches
**Auth:** Required

### POST /api/batches
**Description:** Create new batch
**Auth:** Required
**Body:**
```json
{
  "sampleIds": ["uuid"],
  "parameters": "object"
}
```

### POST /api/batches/external
**Description:** Create external batch
**Auth:** None required

---

## Supply Chain

### GET /api/supply-chain/partners
**Description:** List supply chain partners
**Auth:** Required

### GET /api/supply-chain/partners/:id
**Description:** Get partner details
**Auth:** Required

### POST /api/supply-chain/partners
**Description:** Create new partner
**Auth:** Required

### GET /api/supply-chain/collaboration-requests
**Description:** List collaboration requests
**Auth:** Required

### GET /api/supply-chain/collaboration-requests/:id
**Description:** Get collaboration request details
**Auth:** Required

### POST /api/supply-chain/collaboration-requests
**Description:** Create collaboration request
**Auth:** Required

### PUT /api/supply-chain/collaboration-requests/:id
**Description:** Update collaboration request
**Auth:** Required

### POST /api/supply-chain/collaboration-requests/:id/accept
**Description:** Accept collaboration request
**Auth:** Required

### POST /api/supply-chain/collaboration-requests/:id/reject
**Description:** Reject collaboration request
**Auth:** Required

### GET /api/supply-chain/material-handoffs
**Description:** List material handoffs
**Auth:** Required

### POST /api/supply-chain/material-handoffs
**Description:** Create material handoff
**Auth:** Required

### PUT /api/supply-chain/material-handoffs/:id
**Description:** Update material handoff
**Auth:** Required

### GET /api/supply-chain/analysis-types
**Description:** List analysis types for supply chain
**Auth:** Required

---

## Workspaces

### GET /api/workspaces
**Description:** Get current workspace info
**Auth:** Required

### GET /api/workspaces/summary
**Description:** Get workspace summary
**Auth:** Required

### GET /api/workspaces/:id
**Description:** Get workspace details
**Auth:** Required

---

## Access Control

### GET /api/access/documents/:id/download
**Description:** Download document with access control
**Auth:** Required

### GET /api/access/documents/:id/download-file
**Description:** Download file with access control
**Auth:** None required

### POST /api/access/grants/:grantId/revoke
**Description:** Revoke access grant
**Auth:** Required

### GET /api/access/grants/:grantId
**Description:** Get access grant details
**Auth:** Required

### GET /api/access/audit
**Description:** Get access audit log
**Auth:** Required

### GET /api/access/tokens/:objectId
**Description:** Get access tokens for object
**Auth:** Required

### POST /api/access/admin/cleanup
**Description:** Admin cleanup of access records
**Auth:** Required

### GET /api/access/admin/stats
**Description:** Admin access statistics
**Auth:** Required

---

## API Keys

### GET /api/api-keys
**Description:** List API keys
**Auth:** Required

### POST /api/api-keys
**Description:** Create new API key
**Auth:** Required

### PUT /api/api-keys/:id
**Description:** Update API key
**Auth:** Required

### DELETE /api/api-keys/:id
**Description:** Delete API key
**Auth:** Required

### POST /api/api-keys/:id/regenerate
**Description:** Regenerate API key
**Auth:** Required

---

## Notifications

### GET /api/notifications
**Description:** List user notifications
**Auth:** Required

### PUT /api/notifications/:id/read
**Description:** Mark notification as read
**Auth:** Required

### DELETE /api/notifications/:id
**Description:** Delete notification
**Auth:** Required

### DELETE /api/notifications
**Description:** Delete all notifications
**Auth:** Required

### POST /api/notifications/bulk
**Description:** Send bulk notifications
**Auth:** Required

### POST /api/notifications/project
**Description:** Send project notification
**Auth:** Required

### GET /api/notifications/system
**Description:** Get system notifications
**Auth:** Required

### POST /api/notifications/system
**Description:** Create system notification
**Auth:** Required

### POST /api/notifications/payment-reminder
**Description:** Send payment reminder
**Auth:** Required

---

## Notification Preferences

### GET /api/notification-preferences
**Description:** Get user notification preferences
**Auth:** Required

### PUT /api/notification-preferences
**Description:** Update notification preferences
**Auth:** Required

### POST /api/notification-preferences/disable-all
**Description:** Disable all notifications
**Auth:** Required

### POST /api/notification-preferences/enable-all
**Description:** Enable all notifications
**Auth:** Required

---

## Admin

### POST /api/admin/auth/login
**Description:** Super admin login
**Auth:** None required

### GET /api/admin/analytics/overview
**Description:** Admin analytics overview
**Auth:** Super admin required

### GET /api/admin/workspaces
**Description:** List all workspaces
**Auth:** Super admin required

### GET /api/admin/users
**Description:** List all users
**Auth:** Super admin required

### GET /api/admin/subscriptions
**Description:** List all subscriptions
**Auth:** Super admin required

### GET /api/admin/plans
**Description:** List all plans
**Auth:** Super admin required

### POST /api/admin/subscriptions/:workspaceId/upgrade
**Description:** Upgrade workspace subscription
**Auth:** Super admin required

### GET /api/admin/features
**Description:** List features
**Auth:** Super admin required

### GET /api/admin/analytics/organizations/:organizationId
**Description:** Organization analytics
**Auth:** Super admin required

### GET /api/admin/organizations
**Description:** List all organizations
**Auth:** Super admin required

### POST /api/admin/organizations/:organizationId/update-gst
**Description:** Update organization GST
**Auth:** Super admin required

### GET /api/admin/organizations/:organizationId
**Description:** Get organization details
**Auth:** Super admin required

### GET /api/admin/company-plans
**Description:** List company plans
**Auth:** Super admin required

### POST /api/admin/organizations
**Description:** Create organization
**Auth:** Super admin required

### PUT /api/admin/organizations/:organizationId
**Description:** Update organization
**Auth:** Super admin required

### PUT /api/admin/plans/:planId
**Description:** Update plan
**Auth:** Super admin required

### POST /api/admin/organizations/:orgId/create-admin
**Description:** Create organization admin
**Auth:** Super admin required

---

## Company

### POST /api/company/invitations
**Description:** Create company invitation
**Auth:** None required

### POST /api/company/invitations/accept/:token
**Description:** Accept company invitation
**Auth:** None required

### GET /api/company/invitations/workspace/:workspaceId
**Description:** Get workspace invitations
**Auth:** None required

### POST /api/company/payments/initiate
**Description:** Initiate payment
**Auth:** None required

### GET /api/company/payments/:paymentId/status
**Description:** Get payment status
**Auth:** None required

### POST /api/company/payments/:paymentId/verify
**Description:** Verify payment
**Auth:** None required

### GET /api/company/payments/:paymentId/receipt
**Description:** Get payment receipt
**Auth:** None required

### POST /api/company/payments/send-reminder
**Description:** Send payment reminder
**Auth:** None required

### GET /api/company/workspaces/payment-status
**Description:** Get workspace payment status
**Auth:** None required

---

## Integrations

### GET /api/integrations/:workspaceId
**Description:** List workspace integrations
**Auth:** Required

### POST /api/integrations/:workspaceId
**Description:** Create new integration
**Auth:** Required

### GET /api/integrations/:workspaceId/:id
**Description:** Get integration details
**Auth:** Required

### PATCH /api/integrations/:workspaceId/:id/enable
**Description:** Enable integration
**Auth:** Required

### PATCH /api/integrations/:workspaceId/:id/disable
**Description:** Disable integration
**Auth:** Required

### DELETE /api/integrations/:workspaceId/:id
**Description:** Delete integration
**Auth:** Required

---

## Team Management

### GET /api/projects/:projectId/team
**Description:** List team members in a project
**Auth:** Required (project access)

### POST /api/projects/:projectId/team
**Description:** Add team member to project
**Auth:** Required (admin role)

### DELETE /api/projects/:projectId/team/:assignmentId
**Description:** Remove team member from project
**Auth:** Required (admin role)

### POST /api/projects/:projectId/team/:assignmentId/role
**Description:** Update team member role
**Auth:** Required (admin role)

### DELETE /api/projects/:projectId/team/:assignmentId/access
**Description:** Revoke team member access
**Auth:** Required (admin role)

### GET /api/user/projects
**Description:** Get user's project assignments
**Auth:** Required

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Authentication Headers
- `Authorization: Bearer <jwt_token>`
- `Content-Type: application/json` (for JSON requests)
- `Content-Type: multipart/form-data` (for file uploads)

## Rate Limiting
- Standard endpoints: 100 requests per minute
- File uploads: 10 requests per minute
- Admin endpoints: 50 requests per minute

## Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

---

**Note:** This specification covers all implemented endpoints as of the latest implementation. Some endpoints may require additional middleware or have specific business logic validations not fully documented here.</content>
<parameter name="filePath">c:\Users\r.kowdampalli\Documents\MyProjects\mylab-platform\API_SPECIFICATION.md