# MyLab Platform Database Journey: The Complete Data Flow Story

## The Database Story: From Platform Admin to End Users

This document tells the complete story of how data flows through the MyLab Platform database, from platform admin provisioning a tenant organization down to end users working with laboratory data.

---

## Chapter 0: System Invariants (Non-Negotiable Rules)

- The tenant isolation boundary is the Organization.
- Every tenant-scoped table MUST include `workspace_id` that stores the tenant Organization ID.
- Users belong to exactly one Organization (`Users.workspace_id`).
- Cross-tenant access is possible only through AccessGrants and must be explicitly checked.
- Audit logs are append-only and never updated or deleted.
- Sample lineage is immutable after creation; corrections must be versioned.

Note: The column name `workspace_id` is kept for backward compatibility, but it now stores the tenant Organization ID.

---

## Chapter 1: Platform Admin (Inside the Database)

### Platform Admin Authentication and Access

```sql
-- Platform admins are real users stored in the Users table
INSERT INTO Users (email, name, role, password_hash, workspace_id)
VALUES (
  'superadmin@mylab.io',
  'Platform Admin',
  'platform_admin',
  '$2b$10$hashedpassword',
  NULL
);
```

**Database Impact**: Platform admins are first-class users with `role = platform_admin` and `workspace_id = NULL`. All actions are auditable and revocable.

---

## Chapter 2: Organization Creation - The Birth of a Tenant

### Platform Admin Creates a Tenant Organization

When platform admin creates a tenant organization via `/api/admin/organizations` POST:

```sql
-- 1. Create the tenant organization
INSERT INTO Organizations (
  name, slug, type, is_platform_workspace,
  gst_number, gst_percentage, country,
  primary_contact_name, primary_contact_email, primary_contact_phone
) VALUES (
  'TechLab Solutions', 'techlab-solutions', 'analyzer', true,
  'GST123456', 18.00, 'India',
  'John Doe', 'john@techlab.com', '+91-9876543210'
);

-- 2. Create the admin user for that tenant
INSERT INTO Users (
  workspace_id, email, name, role, password_hash,
  is_active, require_password_change
) VALUES (
  'org-uuid', 'admin@techlab.com', 'John Doe', 'admin',
  '$2b$10$hashedpassword', true, true
);

-- 3. Create a subscription for the tenant
INSERT INTO Subscriptions (
  workspace_id, plan_id, status
) VALUES (
  'org-uuid', 'plan-uuid', 'trial'
);
```

### Database Relationships Created

```
PlatformAdmin → Creates → Organization (tenant boundary)
PlatformAdmin → Creates → User (admin role in org)
Organization → Contains → Users (1:M membership)
Organization → Links to → Subscription (1:1)
```

---

## Chapter 3: Tenant Model (Organization-Centric)

### The Tenant Hierarchy

```
Platform
  ↓
PlatformAdmin (role = platform_admin)
  ↓ creates
Organization (tenant boundary)
  ↓ contains
Users (org-scoped roles)
  ↓ work on
Projects, Samples, Analyses, etc.
```

### Key Distinctions

| Entity | Purpose | Scope | Ownership |
|--------|---------|-------|-----------|
| **Organization** | Tenant boundary + business identity | All users, projects, samples | Platform admin creates, org owns |
| **Users** | Individual employees | Org-scoped accounts | Organization employs |

### Core Rules

- Every Organization is a tenant boundary.
- Users belong to exactly one Organization.
- No data can be accessed outside tenant boundaries without explicit AccessGrants.

---

## Chapter 4: User Management and Role Hierarchy

### Organization Admin Journey

```sql
-- Admin invites team members
INSERT INTO CompanyInvitations (
  onboarding_request_id, email, role, invited_by, expires_at
) VALUES (
  'request-uuid', 'scientist@techlab.com', 'scientist',
  'admin-user-uuid', NOW() + INTERVAL '7 days'
);

-- Users accept invitations and join the tenant
UPDATE Users SET
  is_active = true,
  require_password_change = false
WHERE email = 'scientist@techlab.com';

-- Admin assigns users to projects
INSERT INTO Projects (
  workspace_id, name, description, client_org_id,
  executing_org_id, created_by
) VALUES (
  'org-uuid', 'COVID-19 Vaccine Study', 'Phase 1 trials',
  'client-org-uuid', 'org-uuid', 'admin-user-uuid'
);
```

### User Role Hierarchy

```
Organization
├── Admin (full access within tenant)
├── Manager (project management)
├── Scientist (sample and analysis work)
└── Viewer (read-only access)
```

---

## Chapter 5: Laboratory Data Flow

### Sample Processing Journey

```sql
-- 1. Project created by admin/manager
INSERT INTO Projects (workspace_id, name, client_org_id, executing_org_id, created_by)
VALUES ('org-uuid', 'Drug Study A', 'client-org', 'org-uuid', 'admin-uuid');

-- 2. Samples created by scientists
INSERT INTO Samples (workspace_id, project_id, sample_id, type, created_by)
VALUES ('org-uuid', 'project-uuid', 'SAMP-001', 'blood', 'scientist-uuid');

-- 3. Samples processed into derived samples
INSERT INTO DerivedSamples (
  owner_workspace_id, root_sample_id, derived_id, type, executed_by_org_id, created_by
) VALUES (
  'org-uuid', 'sample-uuid', 'DS-001', 'plasma', 'org-uuid', 'scientist-uuid'
);

-- 4. Batches created for analysis
INSERT INTO Batches (
  workspace_id, project_id, name, executed_by_org_id, created_by
) VALUES (
  'org-uuid', 'project-uuid', 'Batch A1', 'org-uuid', 'scientist-uuid'
);

-- 5. Batch items link derived samples to batches
INSERT INTO BatchItems (batch_id, derived_id)
VALUES ('batch-uuid', 'derived-sample-uuid');

-- 6. Analyses performed on batches
INSERT INTO Analyses (
  batch_id, workspace_id, analysis_type_id, status, uploaded_by
) VALUES (
  'batch-uuid', 'org-uuid', 'analysis-type-uuid', 'completed', 'scientist-uuid'
);
```

### Data Flow Hierarchy

```
Organization (Client) ←→ Project ←→ Organization (Executor)
                                      ↓
                                   Samples
                                      ↓
                               DerivedSamples
                                      ↓
                                 BatchItems
                                      ↓
                                   Batches
                                      ↓
                                  Analyses
```

---

## Chapter 6: Cross-Organization Collaboration

### The Collaboration Flow

```sql
-- Client organization requests analysis from CRO
INSERT INTO SupplyChainRequests (
  from_organization_id, to_organization_id, from_project_id,
  workflow_type, material_data, status
) VALUES (
  'client-org-uuid', 'cro-org-uuid', 'project-uuid',
  'material_transfer', '{"batch": "BATCH-001", "quantity": 100}',
  'pending'
);

-- CRO accepts and creates access grant
INSERT INTO AccessGrants (
  granted_to_org_id, object_type, object_id, permissions, created_by
) VALUES (
  'cro-org-uuid', 'Project', 'project-uuid', '{"read": true, "write": false}',
  'client-admin-uuid'
);

-- Material transfer recorded
INSERT INTO MaterialHandoff (
  supply_chain_request_id, from_organization_id, to_organization_id,
  material_id, quantity, status
) VALUES (
  'request-uuid', 'client-org-uuid', 'cro-org-uuid',
  'batch-uuid', 100, 'completed'
);
```

### Cross-Tenant Access Model

- Every request is evaluated against the tenant Organization ID.
- Ownership checks must include `workspace_id = user.workspace_id`.
- AccessGrants permit cross-tenant reads/writes with explicit roles and expiry.
- Queries MUST enforce either tenant ownership OR valid AccessGrant.

---

## Chapter 7: Security and Audit Trail

### Complete Audit Coverage

```sql
-- Every action is logged
INSERT INTO AuditLog (
  actor_user, actor_workspace, actor_org,
  action, object_type, object_id, details
) VALUES (
  'scientist-uuid', 'org-uuid', 'org-uuid',
  'create', 'Sample', 'sample-uuid', '{"sample_id": "SAMP-001"}'
);

-- Security events tracked
INSERT INTO SecurityLog (
  event_type, details, ip_address, user_agent, severity
) VALUES (
  'login_attempt', '{"success": true}', '192.168.1.1',
  'Mozilla/5.0...', 'low'
);

-- API access controlled
INSERT INTO APIKeys (
  organization_id, name, key_hash, is_active, created_by
) VALUES (
  'org-uuid', 'Integration Key', 'hashed-key', true, 'admin-uuid'
);
```

### Audit Integrity Rules

- AuditLog is append-only.
- No updates or deletes to audit rows in production.
- All admin actions must generate audit events.

---

## Chapter 8: Business and Subscription Management

### The Money Flow

```sql
-- Plans define capabilities
INSERT INTO Plans (name, tier, price_monthly, features)
VALUES ('Professional', 'pro', 299.00, '{"users": 50, "storage": "100GB"}');

-- Usage tracking
INSERT INTO UsageMetrics (
  workspace_id, date, active_users, api_calls, storage_used_mb
) VALUES (
  'org-uuid', CURRENT_DATE, 25, 1500, 2048
);

-- Feature usage monitoring
INSERT INTO FeatureUsage (workspace_id, feature_id, usage_count, date)
VALUES ('org-uuid', 'feature-uuid', 150, CURRENT_DATE);
```

---

## The Complete Database Story Summary

### Data Flow Hierarchy

```
PlatformAdmin
    ↓ creates
Organization (tenant boundary)
    ↓ employs
Users
    ↓ create/manage
Projects → Samples → DerivedSamples → Batches → Analyses
```

### Key Overlap Points

1. Organization is the tenant boundary and business identity.
2. Users belong to exactly one Organization.
3. AccessGrants enable cross-tenant collaboration.
4. Audit and security logs span all entities.
5. Subscriptions and plans control tenant-level feature access.

### The Journey's End

Every piece of laboratory data can be traced back through this hierarchy:

```
Analysis → Batch → DerivedSample → Sample → Project → Organization → PlatformAdmin
```

This structure ensures clear tenant boundaries, explicit collaboration, and full auditability while keeping the data model simpler and more secure.
