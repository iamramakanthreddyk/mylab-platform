# Organization Tenant Model

## The Core Model (Single Tenant Concept)

MyLab now uses a single tenant boundary: **Organization**.

```
PlatformAdmin
  ↓ creates
Organization (tenant boundary)
  ↓ contains
Users
  ↓ work on
Projects, Samples, Batches, Analyses
```

## Why Workspace Was Removed

Workspace and Organization overlapped in scope and ownership, creating confusion and risk. The model is now simplified:

- Organization is both the tenant boundary and the business identity.
- All data tables use `workspace_id` to store the tenant Organization ID.
- Cross-tenant collaboration is handled only through AccessGrants.

## Rules (Hard Invariants)

- Every tenant-scoped table MUST store Organization ID in `workspace_id`.
- Users belong to exactly one Organization.
- Organizations cannot share data unless AccessGrants allow it.
- Audit logs are append-only and tamper-evident at the application layer.

## Cross-Tenant Collaboration

```
Organization A owns Project
    ↓ grants
AccessGrants → Organization B
    ↓ allows
Read/Write access scoped to specific objects
```

## Terminology Note

The column name `workspace_id` remains for backward compatibility, but it stores the tenant Organization ID.
