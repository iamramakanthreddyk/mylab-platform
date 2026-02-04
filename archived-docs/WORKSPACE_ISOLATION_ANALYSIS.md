# Multi-Tenancy & Identifier Collision Analysis
## MyLab Platform - Workspace Isolation & Data Integrity

**Analysis Date**: February 4, 2026  
**System**: MyLab Platform Backend  
**Focus**: Workspace isolation, identifier uniqueness, cross-workspace risks

---

## 1. What Happens If Two Clients Reference the Same Molecule Name?

### The Problem Scenario

**Setup**:
- Workspace A (PharmaCorp) has a sample: `sample_id = "Compound-XYZ"`
- Workspace B (BioTech Inc) also has a sample: `sample_id = "Compound-XYZ"`
- Both samples exist in the same database

### Current System Behavior: **ALLOWED - NO COLLISION DETECTION**

The database permits this because `sample_id` is **only unique within a project**, not globally:

```sql
-- From database/setup.ts line 455
CREATE UNIQUE INDEX idx_projects_workspace_sample_id 
ON Samples(project_id, sample_id);

-- This means:
-- ✅ UNIQUE constraint: (project_id, sample_id)
-- ❌ NO global uniqueness on sample_id alone
-- ❌ NO workspace-level uniqueness
```

### What the Unique Index Actually Protects

```typescript
// Valid scenarios (all allowed):
PharmaCorp Project 1: sample_id = "Compound-XYZ"
PharmaCorp Project 2: sample_id = "Compound-XYZ"  ✅ Different projects
PharmaCorp Project 1: sample_id = "Compound-XYZ"  ✅ Same combination
BioTech Inc Project 1: sample_id = "Compound-XYZ"  ✅ Different workspace entirely

// Invalid scenario (prevented):
PharmaCorp Project 1: sample_id = "Compound-XYZ"
PharmaCorp Project 1: sample_id = "Compound-XYZ"  ❌ DUPLICATE - violates UNIQUE(project_id, sample_id)
```

### Real Collision Scenario

```
Workspace A (PharmaCorp):
├─ Project: Drug Development
│  └─ Sample ID: "S-001"
│     └─ Compound: Aspirin
│     └─ Internal DB UUID: 550e8400-e29b-41d4-a716-446655440000

Workspace B (BioTech):
├─ Project: Vaccine Research
│  └─ Sample ID: "S-001"
│     └─ Compound: Different molecule
│     └─ Internal DB UUID: 650e8400-e29b-41d4-a716-446655440001
```

**Result**: ✅ Both systems work fine because:
- Each workspace has isolated projects
- Each project has unique sample IDs within it
- Backend enforces workspace isolation via `workspace_id`

### The Risk: Human Confusion (Not Data Risk)

```typescript
// If a user somehow gets URLs for both:
GET /api/samples/550e8400-e29b-41d4-a716-446655440000  // PharmaCorp's Aspirin
GET /api/samples/650e8400-e29b-41d4-a716-446655440001  // BioTech's molecule

// Both have sample_id "S-001" in UI
// But UUID is different, so data is isolated ✅

// However, if system uses sample_id to fetch:
GET /api/samples/S-001?projectId=...  // Works if workspace isolation enforced
```

### Current Architecture Defense

```typescript
// From middleware/accessControl.ts - requireObjectAccess for samples:
const query = 'SELECT id FROM Samples WHERE workspace_id = $1 AND id = $2';
//                                          ^^^^^^^^^^^^^^^^^^  Primary defense

// From routes/samples.ts - GET endpoint:
const result = await pool.query(`
  SELECT s.*, p.name as project_name
  FROM Samples s
  JOIN Projects p ON s.project_id = p.id
  WHERE s.id = $1 AND s.deleted_at IS NULL
`);
// ⚠️ Missing workspace_id check in query!
```

### CRITICAL GAP IDENTIFIED ⚠️

The GET sample query **does NOT validate workspace_id**:

```typescript
// ❌ CURRENT CODE (vulnerable):
WHERE s.id = $1 AND s.deleted_at IS NULL

// ✅ SHOULD BE:
WHERE s.id = $1 AND s.workspace_id = $2 AND s.deleted_at IS NULL
```

**Attack**: A user in Workspace B could potentially query Workspace A's sample by guessing or intercepting the UUID:

```
// If middleware check is bypassed:
User from Workspace B queries: GET /api/samples/550e8400...
Without workspace validation, they could see Workspace A's data
```

### How Same-Molecule Names Are ACTUALLY Handled

**Via Project + Sample ID Combination**:

```sql
-- Database enforces project-level uniqueness
UNIQUE(project_id, sample_id)

-- So within PharmaCorp workspace:
Project "Drug A": S-001, S-002, S-003, ...  ✅ Unique per project
Project "Drug B": S-001, S-002, S-003, ...  ✅ Can reuse IDs in different project

-- Within BioTech workspace (completely isolated):
Project "Vaccine": S-001, S-002, S-003, ...  ✅ Independent numbering
```

---

## 2. Can Identifiers Collide Across Workspaces?

### Answer: **NO - By Design, But Not All Enforced Consistently**

### Identifier Types and Their Collision Resistance

| Identifier | Type | Scope | Collision Possible? | Enforcement |
|-----------|------|-------|-------------------|------------|
| `workspace.slug` | VARCHAR(50) UNIQUE | Global | ❌ NO | DB UNIQUE constraint |
| `users.email` | VARCHAR(255) UNIQUE | Global | ❌ NO | DB UNIQUE constraint |
| `samples.id` | UUID | Global | ❌ NO | UUID generation |
| `samples.sample_id` | VARCHAR(100) | Project | ⚠️ RISKY | Only (project_id, sample_id) |
| `derived_samples.id` | UUID | Global | ❌ NO | UUID generation |
| `derived_samples.derived_id` | VARCHAR(100) | Workspace | ✅ ENFORCED | UNIQUE(workspace_id, derived_id) |
| `projects.id` | UUID | Global | ❌ NO | UUID generation |
| `organizations.id` | UUID | Global | ❌ NO | UUID generation |

### Critical Find: Sample ID Collision Risk Across Projects

**Sample Table Unique Constraint**:

```sql
CREATE UNIQUE INDEX idx_projects_workspace_sample_id 
ON Samples(project_id, sample_id);
```

**This means**:
- ✅ Prevents duplicate sample IDs in same project
- ❌ Allows duplicate sample IDs across different projects
- ❌ No workspace-level uniqueness

**Example Collision Scenario**:

```
Workspace A:
├─ Project 1: sample_id = "COMPOUND-001"  ✅
├─ Project 2: sample_id = "COMPOUND-001"  ✅ Allowed (different project)
└─ Project 3: sample_id = "COMPOUND-001"  ✅ Allowed

Workspace B:
├─ Project 1: sample_id = "COMPOUND-001"  ✅ Allowed (different workspace)
```

**Risk Level**: 🟡 MEDIUM
- Different projects can have same sample IDs
- But each workspace is isolated
- Cross-workspace collision impossible (workspace_id enforced at query level)

### Derived Sample ID Protection (Better)

```sql
CREATE UNIQUE INDEX idx_derived_workspace_derived_id 
ON DerivedSamples(owner_workspace_id, derived_id);
```

**This prevents**:
- ✅ Same derived_id in same workspace
- ✅ Workspace isolation enforced at DB level
- More restrictive than samples

### UUID Collisions (Cryptographically Impossible)

All internal IDs use UUID v4:
- `samples.id`, `derived_samples.id`, `projects.id`, `batches.id`, `analyses.id`
- Probability of collision: 1 in 5.3 × 10^36
- **Collision risk**: ❌ NEGLIGIBLE

### Global Uniqueness That IS Enforced

```sql
-- Workspace slug (URL-friendly identifier)
CREATE TABLE Workspace (
  slug VARCHAR(50) NOT NULL UNIQUE
);

-- User email
CREATE TABLE Users (
  email VARCHAR(255) NOT NULL UNIQUE
);

-- API key hash
CREATE TABLE APIKeys (
  key_hash VARCHAR(64) NOT NULL UNIQUE
);

-- Download token hash
CREATE TABLE DownloadTokens (
  token_hash VARCHAR(64) NOT NULL UNIQUE
);
```

---

## 3. Is Workspace Isolation Enforced at Query Level or Service Level?

### Answer: **HYBRID - Dangerously Mixed**

### Where Isolation IS Enforced (Query Level)

```typescript
// ✅ AccessControl middleware - checkOwnership():
case 'sample':
  query = 'SELECT id FROM Samples WHERE workspace_id = $1 AND id = $2';
  //      ^^^^^^^^^^^^^^^^                ^^^^^^^^^^^ Enforced at DB
  break;

case 'derived_sample':
  query = 'SELECT id FROM DerivedSamples WHERE owner_workspace_id = $1 AND id = $2';
  //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^ Enforced at DB
  break;

case 'project':
  query = 'SELECT id FROM Projects WHERE workspace_id = $1 AND id = $2';
  //      ^^^^^^^^^^^^                ^^^^^^^^^^^ Enforced at DB
  break;
```

### Where Isolation is MISSING (Query Level)

```typescript
// ❌ routes/samples.ts - GET /api/samples/:id
const result = await pool.query(`
  SELECT s.*, p.name as project_name
  FROM Samples s
  JOIN Projects p ON s.project_id = p.id
  WHERE s.id = $1 AND s.deleted_at IS NULL
`);
//     ^^^ NO workspace_id check!

// ❌ routes/samples.ts - PUT /api/samples/:id
const result = await pool.query(`
  UPDATE Samples
  SET name = $1, description = $2, ...
  WHERE id = $7 AND deleted_at IS NULL
  RETURNING *
`);
//     ^^^ NO workspace_id check!

// ❌ routes/samples.ts - DELETE /api/samples/:id
const result = await pool.query(`
  UPDATE Samples
  SET deleted_at = NOW()
  WHERE id = $1 AND deleted_at IS NULL
  RETURNING id
`);
//     ^^^ NO workspace_id check!
```

### Service Level Isolation (Middleware)

```typescript
// ✅ Middleware applies workspace check:
export const requireObjectAccess = (objectType: string, requiredRole?: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const objectId = req.params.id || req.body.id || req.query.id;
    const accessCheck = await checkAccess(objectType, objectId, req.user.workspaceId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };

// This calls checkAccess() which includes workspace_id filter
```

### The Dangerous Pattern: Defense in Depth Broken

**Current Architecture**:

```
HTTP Request
    ↓
[Middleware: requireObjectAccess]  ✅ Validates workspace_id
    ↓ (passes to next)
[Route Handler: GET /api/samples/:id]  ❌ Does NOT re-validate workspace_id
    ↓
[Database Query: WHERE id = $1]  ❌ No workspace_id filter
    ↓
Result returned (relies entirely on middleware check)
```

**Problem**: 
1. Middleware does the workspace isolation check
2. Route handler trusts the middleware (implicit)
3. Database query doesn't enforce isolation
4. If middleware check somehow bypassed, data leaks across workspaces

### Evidence of Service-Level Dependency

```typescript
// From middleware/auth.ts - requireObjectAccess:
const accessCheck = await checkAccess(objectType, objectId, req.user.workspaceId);

// From middleware/accessControl.ts - checkAccess():
export async function checkAccess(
  objectType: string,
  objectId: string,
  workspaceId: string    // ← Service layer gets workspace
): Promise<OwnershipCheck> {
  
  // checkOwnership calls query with workspace_id:
  const isOwner = await checkOwnership(objectType, objectId, workspaceId);
  
  // ✅ Enforces workspace at this level
}
```

### Is This Pattern Safe?

**Technically**: ✅ YES - because:
- Middleware runs on EVERY request before route handler
- Middleware validates workspace_id
- If middleware check passes, request IS from correct workspace

**Architecturally**: 🔴 NO - because:
- Violates "defense in depth" principle
- Database doesn't enforce constraints independently
- If middleware is accidentally bypassed (direct DB call, cached connection, etc.)
- Or if middleware has a bug (missing decorator)
- → Data leaks across workspaces

### Real Risk Example

```typescript
// ✅ PROTECTED - has middleware:
router.get('/:id', authenticate, requireObjectAccess('sample'), async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM Samples WHERE id = $1
  `);
});

// ❌ VULNERABLE - missing middleware:
router.get('/bulk', authenticate, async (req, res) => {  // No requireObjectAccess!
  const result = await pool.query(`
    SELECT * FROM Samples WHERE workspace_id = (
      SELECT workspace_id FROM Samples WHERE id = $1
    )
  `);
});
```

---

## 4. What Prevents Cross-Workspace Joins by Mistake?

### Answer: **NOTHING - Query-Level Prevention is Missing**

### Current Vulnerability

**The Problem**: Developers could accidentally write queries that join across workspaces

```typescript
// ❌ DANGEROUS - could leak data across workspaces:
const result = await pool.query(`
  SELECT s.*, ds.*
  FROM Samples s
  FULL OUTER JOIN DerivedSamples ds ON s.id = ds.root_sample_id
  -- ⚠️ Missing workspace filter on both tables
  WHERE s.id = $1
`);

// ❌ Another example:
const result = await pool.query(`
  SELECT s.*, p.name as project_name, o.name as org_name
  FROM Samples s
  JOIN Projects p ON s.project_id = p.id
  JOIN Organizations o ON p.client_org_id = o.id
  -- ⚠️ No validation that all tables belong to same workspace
  WHERE s.workspace_id = $1
`);
```

### What SHOULD Prevent This

**Option 1: Row-Level Security (RLS)**

PostgreSQL RLS enforces security at database level:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE Samples ENABLE ROW LEVEL SECURITY;

-- Create policy that filters based on current user
CREATE POLICY workspace_isolation ON Samples
  FOR SELECT
  USING (workspace_id = current_setting('app.workspace_id')::uuid);

-- Now every query automatically filters by workspace
SELECT * FROM Samples WHERE id = '...'
-- Automatically becomes: AND workspace_id = current_setting(...)
```

**Current Status**: ❌ NOT IMPLEMENTED

**Option 2: Foreign Key Enforcement**

Ensure all related tables reference workspace_id:

```sql
-- Current schema:
Samples: (id, project_id, workspace_id, ...)
Projects: (id, workspace_id, ...)
Organizations: (id, workspace_id, ...)

-- Problem: Organizations.workspace_id is NULLABLE!
Organizations: (id, workspace_id REFERENCES Workspace(id), ...)
                           ↑ Can be NULL for external orgs
```

### Actual Cross-Workspace Join Risk

```typescript
// Scenario: BioTech user (workspace_id = B) tries to query PharmaCorp data (workspace_id = A)

// If middleware check is bypassed or code doesn't use middleware:
const result = await pool.query(`
  SELECT s.id, s.sample_id, p.name, p.workspace_id
  FROM Samples s
  JOIN Projects p ON s.project_id = p.id
  WHERE s.workspace_id = $1  -- $1 = workspace_id from middleware
`, [bioTechWorkspaceId]);

// If query implementation is wrong:
const result = await pool.query(`
  SELECT * FROM Samples s
  WHERE s.id = $1
  -- ❌ Missing: AND s.workspace_id = $2
`);

// Result: Returns any sample with that ID, regardless of workspace
```

### Current Pattern for Safe Joins (What IS Implemented)

```typescript
// ✅ Safe pattern - includes workspace on all tables:
const result = await pool.query(`
  SELECT s.*, p.name as project_name
  FROM Samples s
  JOIN Projects p ON s.project_id = p.id
    AND p.workspace_id = $1  -- ✅ Both filtered
  WHERE s.id = $1 
    AND s.workspace_id = $1  -- ✅ Explicit filter
`);
```

### What's Missing from Database

**RLS (Row-Level Security)**: ❌ NOT CONFIGURED
- Every table should have RLS policies
- Would automatically filter by workspace
- Prevents accidental cross-workspace leaks

**Foreign Key Constraints to Workspace**: ❌ INCOMPLETE
- Organizations.workspace_id is NULL for external orgs
- This breaks clean workspace isolation model

**Database Views with Built-In Filtering**: ❌ NOT IMPLEMENTED
- Could create views that always include workspace filter
- Force developers to use safe view instead of raw tables

---

## 5. How Does the System Behave If a Vendor Becomes a Client Later?

### Current Schema Design

```sql
-- Organizations table:
CREATE TABLE Organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type ENUM ('client', 'cro', 'analyzer', 'vendor', 'pharma') NOT NULL,
  is_platform_workspace BOOLEAN NOT NULL DEFAULT false,
  workspace_id UUID REFERENCES Workspace(id),  -- ⚠️ Nullable for external orgs
  contact_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Types of Organizations

```typescript
// Platform organizations (internal):
{
  type: 'pharma',        // Client (owned data)
  workspace_id: UUID,    // Belongs to a workspace ✅
  is_platform_workspace: true
}

// External organizations (vendor/CRO):
{
  type: 'vendor',        // External party
  workspace_id: NULL,    // No workspace (external) ⚠️
  is_platform_workspace: false
}
```

### Scenario: Vendor Becomes a Client

**Before**: Tekflow Labs is a vendor (external)
```sql
INSERT INTO Organizations VALUES (
  'org-tekflow',
  'Tekflow Labs',
  'vendor',                    -- ← Vendor type
  false,                       -- ← Not platform workspace
  NULL,                        -- ← No workspace
  '{"email": "lab@tekflow.com"}'
);
```

**After**: PharmaCorp partners with Tekflow, brings them internal
```sql
UPDATE Organizations
SET type = 'cro',              -- ← Changed to CRO/analyzer
    is_platform_workspace = true,
    workspace_id = 'pharmacorp-ws'  -- ← Now part of workspace
WHERE id = 'org-tekflow';
```

### What Works Fine ✅

**1. Access Grants Still Function**

Before (external vendor):
```typescript
// PharmaCorp shares sample with external Tekflow
grantAccess(
  objectType: 'sample',
  objectId: '550e8400...',
  grantedToOrgId: 'org-tekflow',  // External org
  grantedRole: 'processor',
  accessMode: 'offline'           // Offline access for external
);

// Stored in AccessGrants with granted_to_org_id = org-tekflow
```

After (now internal):
```typescript
// Same grant still exists and works
// But now org has workspace_id = 'pharmacorp-ws'
// Access validation logic handles both cases:

const grantResult = await pool.query(`
  SELECT * FROM AccessGrants ag
  JOIN Organizations o ON ag.granted_to_org_id = o.id
  WHERE (
    (o.is_platform_workspace = true AND o.workspace_id = $1) OR
    (o.is_platform_workspace = false AND ag.access_mode = 'offline')
  )
`);
```

**2. New Projects Can Be Assigned**

```typescript
// After Tekflow becomes internal, PharmaCorp can create project with them:
INSERT INTO Projects (
  workspace_id,
  client_org_id,           // PharmaCorp (pharma type)
  executing_org_id,        // Tekflow (now cro type with workspace)
  name,
  created_by
);
// ✅ Works because both have workspace_id now
```

**3. Execution Tracking Works**

```typescript
// DerivedSamples executed by Tekflow when external:
INSERT INTO DerivedSamples (
  owner_workspace_id,      // PharmaCorp workspace
  executed_by_org_id,      // org-tekflow (external)
  execution_mode,          // 'external'
  external_reference,      // Reference to Tekflow's system
  performed_at,            // Timestamp of work
  ...
);

// Same record works when org becomes internal
// Can be updated to execution_mode = 'platform' if desired
```

### What BREAKS or Gets Complicated ⚠️

**1. Workspace Membership Ambiguity**

After the transition:
```typescript
// Is Tekflow a member of PharmaCorp's workspace or its own?
// - is_platform_workspace = true ✅ They have workspace_id
// - But do they have a separate workspace? Or part of PharmaCorp's?

const tekflowWorkspace = await pool.query(`
  SELECT workspace_id FROM Organizations WHERE id = 'org-tekflow'
`);
// Returns: 'pharmacorp-ws' (but is this right?)
```

**2. User Assignment Confusion**

```typescript
// Tekflow has users in workspace 'tekflow-internal'
SELECT id, email, workspace_id FROM Users
WHERE workspace_id = 'tekflow-internal';

// After becoming internal to PharmaCorp:
-- Do users stay in 'tekflow-internal' workspace?
-- Or get moved to 'pharmacorp-ws'?
-- Or do they get BOTH workspace memberships?

-- System doesn't handle multiple workspace membership
// Users table has single workspace_id:
CREATE TABLE Users (
  workspace_id UUID NOT NULL REFERENCES Workspace(id)
);
// ❌ No way to be in multiple workspaces
```

**3. Existing Data Belongs to Wrong Workspace**

```typescript
// Tekflow created data while external:
-- Analysis result might have workspace_id = 'tekflow-internal'
-- After Tekflow becomes part of PharmaCorp:
-- Result is orphaned in 'tekflow-internal' workspace

SELECT * FROM Analyses
WHERE executed_by_org_id = 'org-tekflow'
AND workspace_id = 'tekflow-internal';  -- Wrong workspace!
```

**4. Access Grant History Gets Weird**

```typescript
// PharmaCorp granted sample to Tekflow (external org):
-- Grant stored with: granted_to_org_id = org-tekflow
-- org-tekflow.workspace_id = NULL at time of grant

// After org becomes internal:
-- Same grant row exists with granted_to_org_id = org-tekflow
-- But now org-tekflow.workspace_id = 'pharmacorp-ws'
-- Did the grant automatically change scope? ⚠️ Unclear
```

### How System Should Handle This

**Better Schema**:

```sql
-- Organization should have clear boundaries:
CREATE TABLE Organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type ENUM ('internal', 'external-cro', 'external-vendor', 'external-pharma'),
  
  -- For internal organizations:
  workspace_id UUID REFERENCES Workspace(id),
  
  -- For external organizations:
  is_external BOOLEAN NOT NULL DEFAULT false,
  relationship_started_at TIMESTAMP,
  relationship_ended_at TIMESTAMP,
  
  -- Separate field for transition tracking:
  onboarded_workspace_id UUID REFERENCES Workspace(id),  -- When brought internal
  onboarded_at TIMESTAMP
);
```

**Better Transition Process**:

```typescript
// 1. Keep external data in external workspace
// 2. Don't modify workspace_id directly
// 3. Add new relationship record
// 4. Migrate data as needed with explicit audit trail

const transition = {
  org_id: 'org-tekflow',
  old_type: 'vendor',
  new_type: 'cro',
  external_workspace: 'tekflow-internal',      // Original workspace
  onboarded_workspace: 'pharmacorp-ws',        // New workspace
  transitioned_at: NOW(),
  data_migration_status: 'in_progress'
};

// Data still references old workspace but relationship is tracked
```

### Current Behavior When Transition Happens

**Most Likely**:
1. ✅ Type is updated in Organizations
2. ✅ workspace_id is assigned to PharmaCorp workspace
3. ⚠️ Existing data (analyses, grants) references stay unchanged
4. ❌ No audit trail of the transition
5. ❌ Users don't automatically get workspace membership updated

**Risk**:
- Tekflow's historical data might be unreachable (wrong workspace)
- Access grants might behave unpredictably
- User access gets complicated
- No record of when/why transition happened

---

## Summary: Isolation Gaps and Risks

| Aspect | Risk Level | Details |
|--------|-----------|---------|
| Sample ID Collisions | 🟡 MEDIUM | Allowed across projects, but workspace isolated |
| UUID Collisions | ✅ NEGLIGIBLE | Cryptographically impossible |
| Workspace Isolation - Queries | 🔴 HIGH | Service-level only, DB queries lack workspace filter |
| Cross-Workspace Joins | 🔴 HIGH | No RLS, developers could accidentally leak data |
| Missing workspace_id in Routes | 🔴 CRITICAL | GET/PUT/DELETE routes don't validate workspace |
| Org Type Transitions | 🟡 MEDIUM | No built-in mechanism for vendor→client transition |
| Multiple Workspace Membership | 🔴 HIGH | Users can only belong to one workspace |

---

## Recommendations

### Immediate (Critical)

1. **Add workspace_id Filter to All Route Queries**
   ```typescript
   // Add to every query in route handlers:
   WHERE ... AND s.workspace_id = $n
   ```

2. **Implement Row-Level Security (RLS)**
   ```sql
   ALTER TABLE Samples ENABLE ROW LEVEL SECURITY;
   ALTER TABLE Projects ENABLE ROW LEVEL SECURITY;
   -- etc. for all tenant tables
   ```

3. **Document Workspace Isolation Pattern**
   - Every query MUST include workspace_id filter
   - Every join MUST validate related tables are in same workspace

### Short-term (High Priority)

4. **Add Organization Transition Tracking**
   ```sql
   ALTER TABLE Organizations ADD COLUMN onboarded_at TIMESTAMP;
   ALTER TABLE Organizations ADD COLUMN onboarded_workspace_id UUID;
   ```

5. **Create Migration Tools**
   - Detect when org type changes
   - Migrate data to new workspace if needed
   - Log transition in audit trail

### Long-term

6. **Support Multi-Workspace Users**
   - Users need ability to work across multiple workspaces
   - Create UserWorkspaces junction table
   - Update authentication to handle workspace switching

7. **Implement RLS Policies Comprehensively**
   - All tenant tables should have automatic workspace filtering
   - Makes it impossible to accidentally leak data
   - Becomes source of truth for isolation
