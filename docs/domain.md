# Canonical Domain Model - Batches

Assumptions
- Scope is the Batches domain only (Batch and BatchItem).
- Existing fields in code and schema are authoritative; no new fields are introduced.
- Canonical enums follow the database enum values unless explicitly contradicted by product docs.
- `workspaceId` remains the API field name but stores the tenant Organization ID.

A. Canonical Domain Model

Entity: Batch
- Meaning: A batch groups derived samples for a single analysis workflow and tracks its lifecycle and execution context.
- Fields:
  - id: System UUID for the batch record.
  - workspaceId: Organization (tenant) that owns the batch.
  - originalWorkspaceId: Organization that created the original samples (for cross-organization lineage).
  - batchId: Human-friendly batch identifier (user-facing).
  - description: Batch description and intent.
  - parameters: JSON parameters used for the batch (analysis inputs, notes).
  - status: Lifecycle state of the batch.
  - executionMode: Where the batch is executed (platform or external).
  - executedByOrgId: Organization executing the batch.
  - externalReference: Reference provided by an external lab or system.
  - performedAt: When the execution actually occurred (especially for external).
  - createdBy: User who created the batch.
  - sentAt: When the batch was sent to an analyzer.
  - completedAt: When results were completed or uploaded.
  - createdAt: Creation timestamp.
  - updatedAt: Last update timestamp.
  - deletedAt: Soft delete timestamp (null when active).

Entity: BatchItem
- Meaning: A derived sample included in a batch with explicit ordering.
- Fields:
  - id: System UUID for the batch item.
  - batchId: Batch UUID.
  - derivedId: Derived sample UUID.
  - sequence: Order of the derived sample within the batch.
  - createdAt: Creation timestamp.

Enum: batch_status
- created: Batch created, not yet ready to send.
- ready: Batch complete and ready to be sent.
- sent: Batch sent to analyzer.
- in_progress: Analyzer has started processing.
- completed: Results uploaded and batch finalized.

Enum: execution_mode
- platform: Executed within the platform.
- external: Executed by an external lab.

B. Database Schema

Table: batches
- Columns (snake_case):
  - id UUID PK
  - workspace_id UUID FK organizations(id)
  - original_workspace_id UUID FK organizations(id)
  - batch_id VARCHAR(100)
  - description TEXT
  - parameters JSONB
  - status batch_status DEFAULT 'created'
  - execution_mode execution_mode DEFAULT 'platform'
  - executed_by_org_id UUID FK organizations(id)
  - external_reference TEXT
  - performed_at TIMESTAMP
  - created_by UUID FK users(id)
  - sent_at TIMESTAMP
  - completed_at TIMESTAMP
  - created_at TIMESTAMP
  - updated_at TIMESTAMP
  - deleted_at TIMESTAMP

Table: batch_items
- Columns (snake_case):
  - id UUID PK
  - batch_id UUID FK batches(id)
  - derived_id UUID FK derived_samples(id)
  - sequence INT
  - created_at TIMESTAMP

Enum storage strategy
- Use native Postgres ENUM types for batch_status and execution_mode.
- Values are stored exactly as defined in the canonical enums.

C. API Contracts

Naming rules
- API uses camelCase field names.
- Enum values exactly match the canonical enum values.

GET /api/batches
Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "originalWorkspaceId": "uuid",
      "batchId": "BATCH-42",
      "description": "string",
      "parameters": {},
      "status": "created",
      "executionMode": "platform",
      "executedByOrgId": "uuid",
      "externalReference": "string",
      "performedAt": "2026-02-08T12:00:00Z",
      "createdBy": "uuid",
      "sentAt": "2026-02-08T12:00:00Z",
      "completedAt": "2026-02-08T12:00:00Z",
      "createdAt": "2026-02-08T12:00:00Z",
      "updatedAt": "2026-02-08T12:00:00Z",
      "sampleCount": 3
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}

GET /api/batches/{id}
Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "originalWorkspaceId": "uuid",
    "batchId": "BATCH-42",
    "description": "string",
    "parameters": {},
    "status": "created",
    "executionMode": "platform",
    "executedByOrgId": "uuid",
    "externalReference": "string",
    "performedAt": "2026-02-08T12:00:00Z",
    "createdBy": "uuid",
    "sentAt": "2026-02-08T12:00:00Z",
    "completedAt": "2026-02-08T12:00:00Z",
    "createdAt": "2026-02-08T12:00:00Z",
    "updatedAt": "2026-02-08T12:00:00Z",
    "sampleCount": 3
  }
}

POST /api/batches
Request
{
  "batchId": "BATCH-42",
  "description": "string",
  "parameters": {},
  "status": "created",
  "executionMode": "platform",
  "executedByOrgId": "uuid",
  "externalReference": "string",
  "performedAt": "2026-02-08T12:00:00Z",
  "sampleIds": ["uuid", "uuid"]
}

Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "originalWorkspaceId": "uuid",
    "batchId": "BATCH-42",
    "description": "string",
    "parameters": {},
    "status": "created",
    "executionMode": "platform",
    "executedByOrgId": "uuid",
    "externalReference": "string",
    "performedAt": "2026-02-08T12:00:00Z",
    "createdBy": "uuid",
    "sentAt": null,
    "completedAt": null,
    "createdAt": "2026-02-08T12:00:00Z",
    "updatedAt": "2026-02-08T12:00:00Z",
    "sampleCount": 2
  },
  "message": "Batch created successfully"
}

PUT /api/batches/{id}
Request
{
  "description": "string",
  "parameters": {},
  "status": "ready",
  "executionMode": "external",
  "executedByOrgId": "uuid",
  "externalReference": "string",
  "performedAt": "2026-02-08T12:00:00Z",
  "sentAt": "2026-02-08T12:00:00Z",
  "completedAt": "2026-02-08T12:00:00Z"
}

Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "originalWorkspaceId": "uuid",
    "batchId": "BATCH-42",
    "description": "string",
    "parameters": {},
    "status": "ready",
    "executionMode": "external",
    "executedByOrgId": "uuid",
    "externalReference": "string",
    "performedAt": "2026-02-08T12:00:00Z",
    "createdBy": "uuid",
    "sentAt": "2026-02-08T12:00:00Z",
    "completedAt": "2026-02-08T12:00:00Z",
    "createdAt": "2026-02-08T12:00:00Z",
    "updatedAt": "2026-02-08T12:00:00Z",
    "sampleCount": 2
  },
  "message": "Batch updated successfully"
}

DELETE /api/batches/{id}
Response 200
{
  "success": true,
  "message": "Batch deleted successfully"
}

D. UI Mapping

Field label mapping
- id -> "Batch Record ID"
- workspaceId -> "Organization"
- originalWorkspaceId -> "Origin Organization"
- batchId -> "Batch ID"
- description -> "Description"
- parameters -> "Parameters"
- status -> "Status"
- executionMode -> "Execution Mode"
- executedByOrgId -> "Executed By"
- externalReference -> "External Reference"
- performedAt -> "Performed At"
- createdBy -> "Created By"
- sentAt -> "Sent At"
- completedAt -> "Completed At"
- createdAt -> "Created At"
- updatedAt -> "Updated At"
- deletedAt -> "Deleted At"
- sampleCount -> "Sample Count"

Enum display mapping
- batch_status:
  - created -> "Created"
  - ready -> "Ready"
  - sent -> "Sent"
  - in_progress -> "In Progress"
  - completed -> "Completed"
- execution_mode:
  - platform -> "Platform"
  - external -> "External Lab"

E. Validation Rules

Allowed
- batch_status must be one of: created, ready, sent, in_progress, completed.
- execution_mode must be one of: platform, external.
- batch_id must be unique per organization.
- batch_items.sequence must be a non-negative integer and ordered within a batch.
- batch_items.derived_id must reference an existing derived sample.

Must never happen
- Status values outside the canonical batch_status enum.
- Mixing camelCase and snake_case in the same layer.
- Creating batch_items with a batch_id that does not exist.
- Creating a batch without an organization owner.
- External execution (execution_mode = external) without external_reference or executed_by_org_id.

Governance Rule (habit and enforcement)
- Every change starts by updating this document, then updating DB migrations, API schemas, and UI mappings to match. CI must fail if enums or fields diverge (schema tests + contract tests).