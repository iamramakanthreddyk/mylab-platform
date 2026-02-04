# MyLab: Database Schema

**PostgreSQL schema for the lab collaboration platform.**

See [Database ERD Diagram](../diagrams/database_erd.mmd) for visual representation of tables and relationships.

---

## Overview

- **15 core tables**: Workspace, Organizations, Users, Projects, ProjectStages, Samples, DerivedSamples, Batches, BatchItems, AnalysisTypes, Analyses, Documents, AccessGrants, AuditLog
- **Workspace isolation**: Every org has own workspace
- **Audit trail**: Complete chain of custody
- **Immutable lineage**: Parent-child relationships never change
- **External actor support**: Organizations can exist outside the platform

---

## Core Schema

### **1. Workspace (Platform Container)**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | VARCHAR(255) | NO | - | Organization name |
| slug | VARCHAR(50) | NO | - | URL-friendly identifier, unique |
| type | ENUM ('research', 'cro', 'analyzer', 'pharma') | NO | - | Organization type |
| email_domain | VARCHAR(255) | YES | - | Domain for user invites |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Platform container for data isolation
**Example**: "Flow Chemistry Inc" = workspace

**Relations**:
- 1:N with Users (workspace_id)
- 1:N with Projects (workspace_id)
- 1:N with Samples (workspace_id)
- 1:N with DerivedSamples (workspace_id)
- 1:N with Batches (workspace_id)
- 1:N with Analyses (workspace_id)
- 1:N with Documents (workspace_id)
- 1:N with AuditLog (actor_workspace)

**Constraints**:
- Organizations with is_platform_workspace=true must have workspace_id set

---

### **2. Organizations**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | TEXT | NO | - | Organization name |
| type | ENUM ('client', 'cro', 'analyzer', 'vendor', 'pharma') | NO | - | Organization type |
| is_platform_workspace | BOOLEAN | NO | false | Whether this org has a MyLab workspace |
| workspace_id | UUID | YES | - | Foreign key to Workspace (if on platform) |
| contact_info | JSONB | YES | - | Contact details: {email, address, phone} |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Purpose**: Model organizations, including those not on the platform
**Relations**:
- 1:1 with Workspace (workspace_id, optional)
- 1:N with Projects (client_org_id)
- 1:N with Projects (executing_org_id)
- 1:N with AccessGrants (granted_to_org_id)
- 1:N with DerivedSamples (executed_by_org_id)
- 1:N with Batches (executed_by_org_id)
- 1:N with Analyses (executed_by_org_id, source_org_id)

---

### **3. Users**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| workspace_id | UUID | NO | - | Foreign key to Workspace |
| email | VARCHAR(255) | NO | - | User email, unique globally |
| name | VARCHAR(255) | YES | - | Display name |
| role | ENUM ('admin', 'user', 'viewer') | NO | 'user' | Role in workspace |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Authenticate users, track who does what
**Note**: `role` is user's role in their own org. Platform roles (Owner, Processor, etc.) are inferred by object type.

**Relations**:
- N:1 with Workspace (workspace_id)
- 1:N with Projects (created_by)
- 1:N with Samples (created_by)
- 1:N with DerivedSamples (created_by)
- 1:N with Batches (created_by)
- 1:N with Analyses (uploaded_by)
- 1:N with Documents (uploaded_by)
- 1:N with AccessGrants (created_by)
- 1:N with AuditLog (actor_id)

**Constraints**:
- UNIQUE(workspace_id, email)

---

### **3. Projects**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| workspace_id | UUID | NO | - | Foreign key to Workspace (platform executor) |
| client_org_id | UUID | NO | - | Foreign key to Organizations (business owner) |
| executing_org_id | UUID | NO | - | Foreign key to Organizations (who executes) |
| name | VARCHAR(255) | NO | - | Project name |
| description | TEXT | YES | - | Project description |
| created_by | UUID | NO | - | Foreign key to Users |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Container for related samples, with explicit ownership and execution separation
**Owned by**: Client organization (business owner)
**Executed by**: Executing organization (may be external)
**Example**: "NP-Compound-17" owned by NovaPharma, executed by Tekflow

**Relations**:
- N:1 with Workspace (workspace_id)
- N:1 with Organizations (client_org_id)
- N:1 with Organizations (executing_org_id)
- N:1 with Users (created_by)
- 1:N with ProjectStages (project_id)
- 1:N with Samples (project_id)
- 1:N with Documents (project_id, optional)

---

### **4. Project Stages**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | Foreign key to Projects |
| name | VARCHAR(255) | NO | - | Stage name (e.g., "Synthesis", "Purification") |
| order | INT | NO | - | Sequence order within project |
| owner_workspace_id | UUID | NO | - | Foreign key to Workspace (who owns the stage) |
| status | ENUM ('planned', 'active', 'completed') | YES | 'planned' | Stage status |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Purpose**: Define chronological stages within projects for multi-stage workflows
**Relations**:
- N:1 with Projects (project_id)
- N:1 with Workspace (owner_workspace_id)
- 1:N with Samples (optional stage_id, future extension)
- 1:N with DerivedSamples (optional stage_id, future extension)

**Constraints**:
- UNIQUE(project_id, order)

---

### **5. Samples**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| project_id | UUID | NO | - | Foreign key to Projects |
| workspace_id | UUID | NO | - | Foreign key to Workspace |
| sample_id | VARCHAR(100) | NO | - | User-facing ID like "S-001" |
| type | VARCHAR(50) | YES | - | Sample type: "liquid", "solid", "gas", etc. |
| description | TEXT | YES | - | Sample description |
| metadata | JSONB | YES | - | Flexible metadata: {quantity, purity, batch_num, etc.} |
| status | ENUM ('created', 'shared', 'processing', 'analyzed', 'completed') | YES | 'created' | Sample status |
| created_by | UUID | NO | - | Foreign key to Users |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Individual sample record
**Owned by**: Creating workspace
**Immutable**: Once created, parent data never changes
**Metadata**: {quantity, purity, batch_number, synthesis_date, notes}

**Relations**:
- N:1 with Projects (project_id)
- N:1 with Workspace (workspace_id)
- N:1 with Users (created_by)
- 1:N with DerivedSamples (parent_id)
- 1:N with Documents (sample_id, optional)

**Constraints**:
- UNIQUE(project_id, sample_id)

---

### **5. Derived Samples**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| root_sample_id | UUID | NO | - | Foreign key to Samples (original sample) |
| parent_id | UUID | YES | - | Foreign key to DerivedSamples (parent derived, NULL for direct from sample) |
| owner_workspace_id | UUID | NO | - | Foreign key to Workspace (who owns the sample data) |
| derived_id | VARCHAR(100) | NO | - | User-facing ID like "D-001-A" |
| process_notes | TEXT | YES | - | What was done to create this |
| metadata | JSONB | YES | - | Flexible metadata: {quantity_after, yield, purity_after} |
| depth | INT | NO | - | Depth from root (0=direct from sample, 1=from derived, etc.), CHECK(depth >= 0 AND depth <= 2) |
| status | ENUM ('created', 'shared', 'processing', 'analyzed', 'completed') | YES | 'created' | Status |
| execution_mode | ENUM ('platform', 'external') | NO | 'platform' | Whether executed on platform or externally |
| executed_by_org_id | UUID | NO | - | Foreign key to Organizations (who executed, may be external) |
| external_reference | TEXT | YES | - | Reference for external execution |
| performed_at | TIMESTAMP | YES | - | When the work was actually performed (for external) |
| created_by | UUID | NO | - | Foreign key to Users |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Track transformations of samples
**Owned by**: The workspace that created the derived (usually CRO)
**Lineage**: Links to root sample and immediate parent derived
**Max depth**: 3 levels (original → 1st derived → 2nd derived → 3rd derived, then stop)
**Metadata**: {quantity_after, yield%, purity_after, processing_temp, duration}

**Relations**:
- N:1 with Samples (root_sample_id)
- N:1 with DerivedSamples (parent_id, optional)
- N:1 with Workspace (owner_workspace_id)
- N:1 with Organizations (executed_by_org_id)
- N:1 with Users (created_by)
- 1:N with BatchItems (derived_id)
- 1:N with DerivedSamples (parent_id, self-reference)

**Constraints**:
- UNIQUE(owner_workspace_id, derived_id)
- CHECK(depth >= 0 AND depth <= 2)
- If parent_id IS NULL, then depth = 0
- If parent_id IS NOT NULL, then depth = (parent.depth + 1)

---

### **6. Batches**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| workspace_id | UUID | NO | - | Foreign key to Workspace |
| original_workspace_id | UUID | YES | - | Foreign key to Workspace (original sample creator) |
| batch_id | VARCHAR(100) | NO | - | User-facing ID like "BATCH-42" |
| description | TEXT | YES | - | Description |
| parameters | JSONB | YES | - | Parameters: {temp, pressure, duration, notes} |
| status | ENUM ('created', 'ready', 'sent', 'in_progress', 'completed') | YES | 'created' | Status |
| execution_mode | ENUM ('platform', 'external') | NO | 'platform' | Whether executed on platform or externally |
| executed_by_org_id | UUID | NO | - | Foreign key to Organizations (who executed, may be external) |
| external_reference | TEXT | YES | - | Reference for external execution |
| performed_at | TIMESTAMP | YES | - | When the work was actually performed (for external) |
| created_by | UUID | NO | - | Foreign key to Users |
| sent_at | TIMESTAMP | YES | - | When sent to analyzer |
| completed_at | TIMESTAMP | YES | - | When results uploaded |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Group multiple samples for analysis
**Owned by**: Workspace that created it (usually CRO)
**Cross-workspace tracking**: `original_workspace_id` points to the lab that created the original sample — ensures audit chain even when batch crosses organizations
**Status flow**: created → ready → sent → in_progress → completed

**Relations**:
- N:1 with Workspace (workspace_id)
- N:1 with Workspace (original_workspace_id, optional)
- N:1 with Organizations (executed_by_org_id)
- N:1 with Users (created_by)
- 1:N with BatchItems (batch_id)
- 1:N with Analyses (batch_id)

---

### **7. Batch Items** (Many-to-Many)

```
CREATE TABLE BatchItems (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES Batches(id) ON DELETE CASCADE,
  derived_id        UUID NOT NULL REFERENCES DerivedSamples(id) ON DELETE CASCADE,
  sequence          INT NOT NULL,           -- Order in batch (1, 2, 3...)
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(batch_id),
  INDEX(derived_id),
  UNIQUE(batch_id, derived_id)
);
```

**Purpose**: Link multiple derived samples to a batch

---

### **8. Analysis Types**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| name | VARCHAR(100) | NO | - | Analysis type name (e.g., "NMR", "HPLC") |
| description | TEXT | YES | - | Description of the analysis type |
| category | VARCHAR(50) | YES | - | Category (e.g., "Spectroscopy", "Chromatography") |
| is_active | BOOLEAN | NO | true | Whether this type is active |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |

**Purpose**: Normalize analysis types for consistency and reporting
**Relations**:
- 1:N with Analyses (analysis_type_id, instead of VARCHAR)

**Note**: Change Analyses.analysis_type to analysis_type_id UUID REFERENCES AnalysisTypes(id)

---

### **9. Analyses**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| batch_id | UUID | NO | - | Foreign key to Batches |
| workspace_id | UUID | NO | - | Foreign key to Workspace (Analyzer's workspace) |
| analysis_type_id | UUID | NO | - | Foreign key to AnalysisTypes |
| results | JSONB | YES | - | Actual results {peaks, values, etc.} |
| file_path | VARCHAR(500) | YES | - | S3 path to raw data file |
| file_checksum | VARCHAR(64) | YES | - | SHA256 hash for verification |
| file_size_bytes | BIGINT | YES | - | For storage tracking |
| status | ENUM ('pending', 'in_progress', 'completed', 'failed') | YES | 'pending' | Status |
| execution_mode | ENUM ('platform', 'external') | NO | 'platform' | Whether executed on platform or externally |
| executed_by_org_id | UUID | NO | - | Foreign key to Organizations (who executed, may be external) |
| source_org_id | UUID | NO | - | Foreign key to Organizations (who produced the results) |
| external_reference | TEXT | YES | - | Reference for external execution |
| received_at | TIMESTAMP | YES | - | When results were received from external source |
| performed_at | TIMESTAMP | YES | - | When the work was actually performed (for external) |
| uploaded_by | UUID | NO | - | Foreign key to Users |
| uploaded_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Upload timestamp |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Store analysis results
**Owned by**: Recording workspace (may be different from executor)
**Immutable**: Once uploaded, cannot be modified (store in immutable S3 bucket)
**File storage**: Raw data files stored in S3, path + checksum for integrity verification
**Checksum**: Prevents accidental file corruption; enables audit verification

**Relations**:
- N:1 with Batches (batch_id)
- N:1 with Workspace (workspace_id)
- N:1 with AnalysisTypes (analysis_type_id)
- N:1 with Organizations (executed_by_org_id)
- N:1 with Organizations (source_org_id)
- N:1 with Users (uploaded_by)

---

### **10. Documents**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| workspace_id | UUID | NO | - | Foreign key to Workspace |
| project_id | UUID | YES | - | Optional foreign key to Projects |
| sample_id | UUID | YES | - | Optional foreign key to Samples |
| name | VARCHAR(255) | NO | - | File name |
| file_path | VARCHAR(500) | NO | - | S3 path |
| version | INT | YES | 1 | Version number |
| mime_type | VARCHAR(50) | YES | - | MIME type |
| size_bytes | BIGINT | YES | - | File size |
| uploaded_by | UUID | NO | - | Foreign key to Users |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Last update timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Store reports, protocols, attachments
**Owned by**: Uploading workspace
**Versioning**: Multiple versions tracked by version number
**Shareable**: Documents can be shared via Sharing table

**Relations**:
- N:1 with Workspace (workspace_id)
- N:1 with Projects (project_id, optional)
- N:1 with Samples (sample_id, optional)
- N:1 with Users (uploaded_by)

---

### **12. AccessGrants**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| object_type | ENUM ('Project', 'Sample', 'DerivedSample', 'Batch', 'Analysis', 'Document') | NO | - | Type of object being granted access |
| object_id | UUID | NO | - | ID of the object |
| granted_to_org_id | UUID | NO | - | Foreign key to Organizations (recipient, may be external) |
| granted_role | ENUM ('viewer', 'processor', 'analyzer', 'client') | NO | - | Role granted |
| access_mode | ENUM ('platform', 'offline') | NO | 'platform' | Whether access is via platform or external |
| expires_at | TIMESTAMP | YES | - | Optional expiration |
| created_by | UUID | NO | - | Foreign key to Users (who granted) |
| created_at | TIMESTAMP | YES | CURRENT_TIMESTAMP | Creation timestamp |
| deleted_at | TIMESTAMP | YES | - | Soft delete timestamp |

**Purpose**: Grant access to objects for organizations, including external ones
**Key rule**: Supports both platform and offline access
**Immutable**: No updates, only insert/delete
**Revocable**: Soft delete for audit trail

**Relations**:
- N:1 with Organizations (granted_to_org_id)
- N:1 with Users (created_by)

**Constraints**:
- UNIQUE(object_type, object_id, granted_to_org_id)

---

### **11. Audit Log**

```
CREATE TABLE AuditLog (
  id                BIGSERIAL PRIMARY KEY,
  object_type       VARCHAR(50) NOT NULL,   -- "Sample", "Batch", "Analysis", etc.
  object_id         UUID NOT NULL,
  action            ENUM ('create', 'read', 'update', 'delete', 'share', 'upload', 'download') NOT NULL,
  actor_id          UUID NOT NULL REFERENCES Users(id),
  actor_workspace   UUID NOT NULL REFERENCES Workspace(id),
  actor_org_id      UUID REFERENCES Organizations(id),  -- May differ from actor_workspace's org
  details           JSONB,                  -- {field_changed, old_value, new_value}
  ip_address        VARCHAR(45),
  user_agent        VARCHAR(500),
  timestamp         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(object_type, object_id),
  INDEX(actor_workspace),
  INDEX(timestamp)
);
```

**Purpose**: Immutable chain of custody
**Never delete**: Audit log is eternal
**Compliance**: Regulatory proof that X happened at Y time by Z person

---

## Key Constraints

### Workspace Isolation

Data visibility is determined by:

1. Workspace ownership **OR**
2. Active AccessGrants to the user's organization

Workspace isolation + AccessGrants are the only access mechanisms.

---

### Lineage Integrity

Derived samples link to parents:

```
Sample (original, workspace A)
  ├─ DerivedSample (workspace B, parent=Sample.id)
  ├─ DerivedSample (workspace C, parent=Sample.id)
  └─ DerivedSample (workspace D, parent=Sample.id, depth=0)
      └─ DerivedSample (workspace D, parent=Derived.id, depth=1)
```

Rule: `depth` never exceeds 2 (3 total levels)

---

### Sharing Enforcement

Before returning data:

```
sql
IF user.workspace != object.workspace THEN
  SELECT 1 FROM AccessGrants
  WHERE object_type = $type
    AND object_id = $id
    AND granted_to_org_id = $user.org_id
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  IF NOT FOUND THEN RETURN 403;
END IF;
END IF;
```

---

## Indexes for Performance

```
sql
-- Query 1: List samples in my project
CREATE INDEX idx_samples_project ON Samples(project_id, created_at DESC);

-- Query 2: List samples shared with my workspace
CREATE INDEX idx_accessgrants_granted_to ON AccessGrants(granted_to_org_id, object_type);

-- Query 3: Full lineage of a sample
CREATE INDEX idx_derived_parent ON DerivedSamples(parent_id);

-- Query 4: Audit trail for compliance
CREATE INDEX idx_audit_object ON AuditLog(object_type, object_id, timestamp DESC);

-- Query 5: My uploaded analyses
CREATE INDEX idx_analyses_uploader ON Analyses(uploaded_by, uploaded_at DESC);
```

---

## Example Queries

### Get all samples in my workspace (shared or owned)

```
sql
SELECT s.* FROM Samples s
WHERE s.workspace_id = $1
UNION
SELECT s.* FROM Samples s
JOIN AccessGrants ag ON ag.object_id = s.id AND ag.object_type = 'Sample'
WHERE ag.granted_to_org_id = $2
  AND ag.expires_at IS NULL OR ag.expires_at > NOW()
ORDER BY s.created_at DESC;
```

### Get full lineage chain (recursive)

```
sql
WITH RECURSIVE lineage AS (
  -- Start with the root sample
  SELECT 
    s.id, 
    NULL::uuid as parent_id, 
    s.workspace_id, 
    s.sample_id as derived_id, 
    'sample' as type,
    0 as depth, 
    ARRAY[s.id] as path
  FROM Samples s
  WHERE s.id = $1  -- Root sample ID
  
  UNION ALL
  
  -- Add derived samples
  SELECT 
    ds.id, 
    ds.parent_id, 
    ds.workspace_id, 
    ds.derived_id, 
    'derived' as type,
    ds.depth, 
    l.path || ds.id
  FROM DerivedSamples ds
  JOIN lineage l ON (
    (l.type = 'sample' AND ds.root_sample_id = l.id) OR
    (l.type = 'derived' AND ds.parent_id = l.id)
  )
  WHERE ds.depth <= 2
)
SELECT * FROM lineage ORDER BY depth, created_at;
```

### Audit trail for a sample (chain of custody)

```
sql
SELECT 
  al.timestamp,
  al.action,
  u.email as actor,
  al.details
FROM AuditLog al
JOIN Users u ON u.id = al.actor_id
WHERE al.object_type = 'Sample' AND al.object_id = $1
ORDER BY al.timestamp ASC;
```

### Check if user can access object

```
sql
-- Returns 1 if accessible, NULL if not
SELECT 1 FROM (
  -- User owns the object
  SELECT 1 FROM Samples WHERE id = $1 AND workspace_id = $2
  UNION
  -- Object is shared with user's organization
  SELECT 1 FROM AccessGrants 
  WHERE object_id = $1 
    AND granted_to_org_id = $3
    AND (expires_at IS NULL OR expires_at > NOW())
) as access
LIMIT 1;
```

---

## Project-Level Roles (Future Enhancement)

Consider adding when RBAC complexity grows:

```
sql
CREATE TABLE ProjectRoles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  role              ENUM ('owner', 'processor', 'viewer') NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);
```

This allows granular project-level permissions without needing `Sharing` table for every sample.

---

## Gotchas & Design Decisions

### Why JSONB for metadata?
- Flexible schema (samples vary: liquid needs mL, solid needs mg)
- Query-able (can filter by purity > 95%)
- Future-proof (add fields without migration)

### Why soft delete?
- Audit trail must be complete
- Hard delete breaks lineage
- Legal/compliance: data never truly gone
- **Caution**: Foreign keys use `ON DELETE CASCADE`. For `AuditLog`, consider `ON DELETE RESTRICT` to prevent accidental deletion of compliance records.

### Why shared_at and expires_at?
- Track when access was granted
- Support time-bound sharing
- Audit trail of permission changes

### Why platform_role in AccessGrants, not user role?
- Users have role in their workspace (admin, user, viewer)
- Platform role is what they can do with GRANTED object
- User who is "viewer" in workspace might be "Analyzer" on granted batch

---

## Migrations & Deployment

### Phase 1 (MVP)
Create tables 1-11 in order (dependency chain)

### Phase 2 (Notifications + Analytics)
Add:

```
sql
CREATE TABLE Notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  event_type        ENUM ('sample.shared', 'batch.sent', 'analysis.uploaded', 'batch.completed') NOT NULL,
  object_type       VARCHAR(50),  -- "Sample", "Batch", "Analysis", etc.
  object_id         UUID,
  message           TEXT,
  read_at           TIMESTAMP,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(user_id, read_at),
  INDEX(created_at DESC)
);
```

Also add:
- `Comparison` table (cache for comparison views)
- `Analytics` table (dashboards)

### Phase 3 (Integrations)
Add:
- `APIKeys` table (external integrations)
- `Webhooks` table (event subscriptions)
- `CustomFields` table (customer-specific metadata)
- `AnalysisFiles` table (multiple files per analysis)