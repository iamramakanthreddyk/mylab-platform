# MyLab Platform Database Story: Summary

## Available Documentation

### The Complete Database Story
- [DATABASE_JOURNEY_STORY.md](DATABASE_JOURNEY_STORY.md)
- Narrative of data flow from platform admin to end users
- SQL examples for provisioning and lab workflows

### Organization Tenant Model
- [WORKSPACE_ORGANIZATION_HIERARCHY.md](WORKSPACE_ORGANIZATION_HIERARCHY.md)
- Defines the single-tenant boundary model
- Documents invariants and access rules

### Visual Diagrams
- [WORKSPACE_ORGANIZATION_DIAGRAM.mmd](WORKSPACE_ORGANIZATION_DIAGRAM.mmd)
- [DATABASE_HIERARCHY_FLOW.mmd](DATABASE_HIERARCHY_FLOW.mmd)
- [database_erd.mmd](database_erd.mmd)
- [README_ERD.md](README_ERD.md)

---

## Key Insights

### 1) The Hierarchy
```
PlatformAdmin → Creates Organization → Employs Users → Create Work
```

### 2) Tenant Boundary
- Organization is the tenant boundary and business identity.
- All tenant-scoped tables store Organization ID in `workspace_id`.
- Users belong to exactly one Organization.

### 3) Collaboration
- AccessGrants enable cross-tenant reads/writes with explicit roles.
- SupplyChainRequests and MaterialHandoff formalize external workflows.

---

## Quick Start

1. Read [DATABASE_JOURNEY_STORY.md](DATABASE_JOURNEY_STORY.md)
2. Review [WORKSPACE_ORGANIZATION_HIERARCHY.md](WORKSPACE_ORGANIZATION_HIERARCHY.md)
3. Open Mermaid `.mmd` diagrams in VS Code

---

## Common Questions

| Question | Answer |
|----------|--------|
| What is the tenant boundary? | Organization |
| Can users belong to multiple tenants? | No, users belong to exactly one Organization |
| How does collaboration work? | AccessGrants + SupplyChainRequests |
| Who pays the bills? | Subscription is scoped to Organization |
| What is the isolation level? | Organization-level tenant isolation |

---

## For Developers

### Schema Files
- backend/src/database/setup.ts
- backend/src/database/schemas.ts
- backend/src/database/types.ts

### Key Relationships
```sql
-- Tenant boundary
Users.workspace_id → Organizations.id
Projects.workspace_id → Organizations.id
Samples.workspace_id → Organizations.id

-- Billing
Subscriptions.workspace_id → Organizations.id

-- Collaboration
AccessGrants.granted_to_org_id → Organizations.id
SupplyChainRequests.from_organization_id → Organizations.id
SupplyChainRequests.to_organization_id → Organizations.id
```
