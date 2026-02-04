# Data Integrity & Access Control Analysis

**5 Critical Questions Answered**

**Date**: February 4, 2026

---

## Question 1: What happens if a CRO uploads incorrect results and later corrects them?

### System Design

**Result Upload Architecture**:
- Analysis records stored in `Analyses` table with `file_path` (S3), `file_checksum` (SHA256), `file_size_bytes`
- Each upload gets `uploaded_at` timestamp and `uploaded_by` user tracking
- Results stored as JSONB in `results` field
- Immutability design: Once results uploaded, **cannot be modified** (design intent in schema docs)

**Current Implementation**:

```typescript
// From: backend/src/routes/analyses.ts
router.put('/:id', authenticate, requireObjectAccess('analysis', 'analyzer'), 
  auditLog('update', 'analysis'), async (req, res) => {
    const { status, results, filePath, fileChecksum, fileSizeBytes } = req.body;
    
    const result = await pool.query(`
      UPDATE Analyses
      SET status = $1, results = $2, file_path = $3, file_checksum = $4,
          file_size_bytes = $5, updated_at = NOW()
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING *
    `, [status, results, filePath, fileChecksum, fileSizeBytes, id]);
```

**⚠️ CRITICAL GAP**: The UPDATE endpoint **ALLOWS MODIFICATION** of results AFTER upload!

### What Actually Happens

**If CRO Uploads Incorrect Results**:

1. **Initial Upload** → Analysis record created with:
   - `uploaded_by`: User ID
   - `uploaded_at`: Timestamp
   - `results`: JSONB data
   - `file_checksum`: SHA256 hash
   - Status: "completed"
   - Audit log entry: `action='create'` for analysis

2. **Correction Attempt**:
   - CRO can call `PUT /api/analyses/:id`
   - Updates `results`, `file_path`, `file_checksum`
   - Sets `updated_at = NOW()` (new timestamp)
   - **Audit log entry**: `action='update'` with details of change
   - **No version history**: Old results are lost (JSONB overwritten)

3. **Consequences**:
   - ✅ Audit trail shows someone modified results
   - ❌ Original results permanently lost
   - ❌ Cannot determine what was changed (no field-level diff)
   - ❌ No immutability enforcement (design intent violated)
   - ❌ FDA 21 CFR Part 11 violation (results should be immutable)

### Regulatory Problem

**FDA 21 CFR Part 11 Requirements** (Scientific data integrity):
- Results must be immutable once recorded
- Corrections must create NEW records, not overwrite
- Full audit trail of changes required
- Cannot delete original data

**Current System**: ❌ **FAILS** (allows results modification)

### Recommended Fix Pattern

To achieve FDA compliance, system should:

```typescript
// Option 1: Prevent updates entirely
router.put('/:id', (req, res) => {
  return res.status(405).json({ 
    error: 'Analysis results are immutable. Create a new analysis record for corrections.' 
  });
});

// Option 2: Create revision records instead
router.post('/:id/revise', authenticate, async (req, res) => {
  // 1. Mark old analysis as superseded
  // 2. Create new analysis with corrected data
  // 3. Link them with revision_of_id foreign key
  // 4. Immutable trigger prevents updates
});

// Option 3: Store results in immutable S3 bucket
// - Write-once only
- Use versioning for corrections
// - Maintain pointer to current version
```

### Current Audit Coverage

✅ UPDATE operations logged to AuditLog  
❌ No version tracking (what changed?)  
❌ No immutability enforcement (DB allows changes)  
❌ No revision chain (original data lost)

---

## Question 2: How does the system handle conflicting analysis results?

### Conflict Scenario

Multiple analysts upload results for the **same batch** with **different findings**:

```
Batch-42 (NMR Analysis)
├─ Upload #1 (Jan 20, 2pm): NMR peaks at [3.2, 4.5, 7.1] ppm ✓ Active
├─ Upload #2 (Jan 20, 4pm): NMR peaks at [3.2, 4.1, 7.3] ppm ✓ Also Active
└─ Conflict: Which is correct?
```

### System Behavior

**Database Schema** (from `03_DATABASE.md`):

```
Analyses Table:
├─ batch_id: UUID (FK to Batches)
├─ results: JSONB
├─ status: ENUM ('pending', 'in_progress', 'completed', 'failed')
├─ uploaded_by: UUID
├─ uploaded_at: TIMESTAMP
├─ execution_mode: ENUM ('platform', 'external')
└─ executed_by_org_id: UUID
```

**Key Observation**: No `parent_analysis_id` or `supersedes_id` field!

### Current Implementation

**Query to Get Results for Batch**:
```typescript
// From: backend/src/routes/analyses.ts
const result = await pool.query(`
  SELECT a.*
  FROM Analyses a
  WHERE a.workspace_id = $1 AND a.deleted_at IS NULL
  ORDER BY a.created_at DESC
`);
```

**What Happens**:
1. ✅ Multiple analyses can exist for same batch (no unique constraint)
2. ✅ All are visible in API results (both #1 and #2 returned)
3. ❌ No indication which is "official"
4. ❌ No conflict resolution mechanism
5. ❌ No way to supersede one result with another
6. ❌ Clients must manually determine which is correct

### Specific Problem Case

**Scenario**: External lab (ChemPartner CRO) uploads results, internal lab also runs same analysis:

```
Analyses Query Result:
[
  {
    id: 'analysis-abc',
    batch_id: 'batch-42',
    results: { peaks: [3.2, 4.5, 7.1] },
    executed_by_org_id: 'chempartner-org',
    execution_mode: 'external',
    uploaded_at: '2026-01-20 14:00'
  },
  {
    id: 'analysis-def', 
    batch_id: 'batch-42',
    results: { peaks: [3.2, 4.1, 7.3] },
    executed_by_org_id: 'internal-platform-org',
    execution_mode: 'platform',
    uploaded_at: '2026-01-20 16:00'
  }
]
```

**Users See**: Both results equally valid. No guidance on which to trust.

### Conflict Resolution: Missing Components

| Component | Status | Impact |
|-----------|--------|--------|
| **Result versioning** | ❌ Missing | Can't track revisions |
| **Supersedes field** | ❌ Missing | Can't mark old results as outdated |
| **Conflict detection** | ❌ Missing | No warning when > 1 result exists |
| **Authoritative flag** | ❌ Missing | No way to mark "official" result |
| **Merge logic** | ❌ Missing | No way to reconcile conflicting data |
| **Notification on conflict** | ❌ Missing | No alert to users |

### What Should Happen (Regulatory Requirement)

**FDA 21 CFR Part 11 - Multi-reviewer workflows**:
- When conflicts exist, system must flag them
- Audit trail shows all versions
- Designated authority must explicitly approve/reject each
- Approval action logged with timestamp + actor

### Example: What Conflicts Are NOT Detected

```typescript
// System allows this without any conflict detection:
const conflicts = [
  { analysis_id: '1', results: { value: 95.2 }, uploaded_by: 'alice' },
  { analysis_id: '2', results: { value: 87.1 }, uploaded_by: 'bob' },
  { analysis_id: '3', results: { value: 92.8 }, uploaded_by: 'carol' }
];
// All three are equally valid in the system
// No way to determine which is correct
```

### Audit Trail for Conflicts

✅ Each analysis has separate audit log entry  
✅ Can see who uploaded what and when  
❌ No conflict flagging  
❌ No approval chain for conflicts  
❌ No resolution tracking

---

## Question 3: Can a user upload results to the wrong batch?

### Vulnerability Analysis

**Upload Process**:

```typescript
// From: backend/src/routes/analyses.ts - POST /api/analyses
router.post('/', authenticate, requireObjectAccess('batch', 'analyzer'), 
  auditLog('create', 'analysis'), async (req, res) => {
    
    const { batchId, analysisTypeId, results, ... } = req.body;
    const workspaceId = req.user!.workspaceId;
    
    // VALIDATION 1: Batch exists
    // NOT SHOWN - but typical pattern would be:
    // const batch = await pool.query('SELECT * FROM Batches WHERE id = $1 AND workspace_id = $2', 
    //   [batchId, workspaceId]);
    
    // VALIDATION 2: User has access (requireObjectAccess middleware)
    // Checks if user's organization has access grant for this batch
    
    const result = await pool.query(`
      INSERT INTO Analyses (
        batch_id, workspace_id, analysis_type_id, results, ...
      )
      VALUES ($1, $2, $3, $4, ...)
    `, [batchId, workspaceId, analysisTypeId, results, ...]);
```

### Scenario 1: Wrong Batch (Same Organization)

**Setup**:
- ChemPartner CRO created Batch-42 (NMR, 3 samples)
- ChemPartner also created Batch-43 (HPLC, 2 samples)
- Analyst has access to both batches

**Attack**: Analyst uploads NMR results to Batch-43 (HPLC batch)

**System Response**:
1. ✅ `requireObjectAccess('batch', 'analyzer')` checks: Does analyst have access to Batch-43? YES
2. ✅ `workspaceId` check: Both batches in same workspace? YES
3. ✅ Batch exists? YES (Batch-43 exists)
4. ❌ **NO VALIDATION**: Does analysis type match batch?
5. ❌ **NO VALIDATION**: Do samples in batch match analysis results?
6. ❌ **NO VALIDATION**: Is analysis_type_id compatible with batch's expected analysis?

**Result**: ❌ NMR results successfully written to HPLC batch!

### Scenario 2: Cross-Organization Upload

**Setup**:
- Research Lab (workspace-1) sent Batch-42 to ChemPartner CRO (workspace-2)
- ChemPartner also has their own Batch-99

**Attack**: ChemPartner analyst tries to upload results to Research Lab's Batch-42

```typescript
const { batchId } = req.body; // batchId = Research Lab's Batch-42
const workspaceId = req.user!.workspaceId; // workspace-2 (ChemPartner)

await pool.query(`
  INSERT INTO Analyses (batch_id, workspace_id, ...)
  VALUES ($1, $2, ...)  // batch_id = Batch-42, workspace_id = workspace-2
`);
```

**What Happens**:
- ✅ Middleware checks: Does ChemPartner have access to Batch-42? YES (via AccessGrants)
- ✅ Batch exists? YES
- ✅ INSERT succeeds (no workspace constraint on INSERT)

**Result**: ❌ Analysis record created with mismatched workspace and batch!

**Database Integrity Issue**:
```sql
-- This becomes possible (should NOT be):
SELECT * FROM Analyses 
WHERE batch_id = 'research-lab-batch-42' 
  AND workspace_id = 'chempartner-workspace-2';
-- Result: Analysis in ChemPartner's workspace but Research Lab's batch!
```

### Validation Gaps

| Validation | Present | Issue |
|-----------|---------|-------|
| **Batch exists** | ✅ (likely) | |
| **User has access** | ✅ | Access grants allow read-only access |
| **Analysis type matches batch** | ❌ | Can upload HPLC to NMR batch |
| **Samples match results** | ❌ | Can upload results for wrong number of samples |
| **Workspace consistency** | ❌ | batch.workspace_id must match analysis.workspace_id |
| **Status validation** | ❌ | Can upload when batch status != 'in_progress' |

### Recommended Fix

```typescript
// Add comprehensive validation:
const batchCheck = await pool.query(`
  SELECT b.workspace_id, b.status, b.id,
         COUNT(DISTINCT bi.derived_id) as sample_count
  FROM Batches b
  LEFT JOIN BatchItems bi ON b.id = bi.batch_id
  WHERE b.id = $1 AND b.deleted_at IS NULL
  GROUP BY b.id
`, [batchId]);

if (!batchCheck.rows[0]) {
  return res.status(404).json({ error: 'Batch not found' });
}

const batch = batchCheck.rows[0];

// CRITICAL: Batch must be in requesting workspace
if (batch.workspace_id !== workspaceId) {
  return res.status(403).json({ 
    error: 'Batch belongs to different workspace',
    detail: `Batch workspace: ${batch.workspace_id}, Your workspace: ${workspaceId}`
  });
}

// Batch must be ready for results
if (!['in_progress', 'ready_for_results'].includes(batch.status)) {
  return res.status(400).json({ 
    error: `Cannot upload to batch in status: ${batch.status}`
  });
}

// Analysis type must be compatible
const analysisTypeCheck = await pool.query(`
  SELECT * FROM AnalysisTypes WHERE id = $1 AND is_active = true
`, [analysisTypeId]);

if (!analysisTypeCheck.rows[0]) {
  return res.status(400).json({ error: 'Analysis type not found or inactive' });
}

// Store workspaceId from batch, not from user
const result = await pool.query(`
  INSERT INTO Analyses (batch_id, workspace_id, ...)
  VALUES ($1, $2, ...) -- Use batch.workspace_id, not user's workspace_id
`, [batchId, batch.workspace_id, ...]);
```

### Current Audit Coverage

✅ Analysis creation logged  
✅ User tracked (uploaded_by)  
❌ No validation logged  
❌ No conflict detection  
❌ No type mismatch detection

---

## Question 4: What prevents mass data export by a malicious insider?

### Threat Model

**Insider**: Authorized user with legitimate access who wants to exfiltrate all company data

**Methods**:
1. Download all documents in batch
2. Query all results for organization
3. Export via API without logging
4. Download via token-based system

### Current Access Control Architecture

**Three-Layer Security** (in theory):

1. **AccessGrants Table** (Authorization)
   ```
   UNIQUE(object_type, object_id, granted_to_org_id)
   ```
   - Organizations must have grant to access objects
   - Grants can be scoped to specific roles

2. **RequireObjectAccess Middleware** (Application)
   - Checks user has access before returning data
   - Verifies access grants in database

3. **Download Tokens** (Temporary Access)
   - Time-limited tokens for downloading files
   - One-time use enforcement

### Current Implementation

**Download Token System** (from `backend/src/routes/access.ts`):

```typescript
router.get('/documents/:id/download', authenticate, async (req, res) => {
  // Check if user has access
  const accessCheck = await pool.query(`
    SELECT ag.id, ag.granted_role, ag.expires_at, ag.revoked_at
    FROM AccessGrants ag
    WHERE ag.object_id = $1 
      AND ag.object_type = $2
      AND ag.granted_to_org_id = $3
      AND (ag.revoked_at IS NULL OR ag.revoked_at > NOW())
      AND (ag.expires_at IS NULL OR ag.expires_at > NOW())
    LIMIT 1
  `, [objectId, objectType, organizationId]);

  if (accessCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Issue download token (15 minutes expiry by default)
  const token = await generateDownloadToken(
    objectType,
    objectId,
    organizationId,
    userId,
    grant.id,
    15, // minutes
    true // one-time use
  );

  res.json({ token, downloadUrl: `/api/access/documents/${objectId}/download-file?token=${token}` });
});
```

### Mass Export Attack #1: Bulk Query

**Attack**: Query all analyses in organization

```typescript
// Attacker makes request:
GET /api/analyses?workspaceId=their-workspace

// Returns all analyses for workspace
// No rate limiting on queries
```

**System Behavior**:
```typescript
router.get('/', authenticate, async (req, res) => {
  const { batchId, executionMode } = req.query;
  const workspaceId = req.user!.workspaceId;

  let query = `SELECT a.* FROM Analyses a WHERE a.workspace_id = $1`;
  
  // Returns potentially THOUSANDS of rows
  const result = await pool.query(query, [workspaceId]);
  res.json(result.rows); // All results in single response!
});
```

**Gaps**:
- ❌ No pagination (can retrieve all results in one query)
- ❌ No result count limit
- ❌ No rate limiting per user
- ❌ No download quota
- ❌ No request throttling

### Mass Export Attack #2: Parallel Token Requests

**Attack**: Request download tokens for all documents in parallel

```bash
for doc_id in {1..10000}; do
  curl -H "Authorization: Bearer $TOKEN" \
    "https://api.mylab.com/api/access/documents/$doc_id/download?token=..."
done
```

**System Behavior**:
```typescript
// No rate limiting on token generation
// Tokens issued immediately
// 15-minute expiry = user has 15 minutes to download all
```

**Gaps**:
- ❌ No rate limiting on token requests (could request 10,000 tokens/minute)
- ❌ No per-user request quota
- ❌ No anomaly detection (sudden spike in downloads)
- ❌ No concurrent download limit

### Mass Export Attack #3: Share Everything, Then Export

**Attack**: 
1. Create AccessGrants for self for all objects
2. Download everything
3. Delete access grants (try to hide)

**System Behavior**:

```typescript
// Attacker calls this for each object:
POST /api/access/grants - Create new grant
{
  "object_type": "Analysis",
  "object_id": "analysis-123",
  "granted_to_org_id": "attacker-org",
  "granted_role": "viewer"
}

// No check if user should be able to grant themselves access!
```

**Gaps**:
- ❌ No validation: Can user grant access to others?
- ❌ No separation of duties (user creates AND approves own grants)
- ❌ Soft delete on grants (can be undeleted)
- ❌ No immutable approval chain

### What IS Logged

✅ Each download token issued logged  
✅ File access logged in audit trail  
✅ Download attempts logged  

### What's NOT Logged

❌ API query volume per user  
❌ Bulk export patterns  
❌ Token generation spikes  
❌ Shared-with-self patterns  
❌ Concurrent access patterns

### Recommended Protections

**1. Rate Limiting**:
```typescript
// Per user per minute
- Max 10 API queries
- Max 100 token requests
- Max 1GB download per day

// Track in Redis:
const key = `rate_limit:${userId}:${endpoint}`;
```

**2. Pagination**:
```typescript
// Limit results per query
const limit = Math.min(parseInt(req.query.limit) || 50, 1000);
const offset = parseInt(req.query.offset) || 0;

query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
params.push(limit, offset);
```

**3. Anomaly Detection**:
```typescript
// Flag suspicious patterns
- > 100 token requests in 1 minute
- > 10GB download in 1 day
- Access to objects they haven't accessed before
- Query patterns that access all objects
```

**4. Separation of Duties**:
```typescript
// User cannot grant themselves access
if (grantedToOrgId === req.user!.orgId) {
  return res.status(403).json({ 
    error: 'Cannot grant access to your own organization. Requires approval from admin.' 
  });
}
```

**5. Audit Logging**:
```typescript
// Log EVERY query + download
await logSecurityEvent(pool, {
  eventType: 'data_access',
  severity: calculateSeverity(results.length),
  user_id: userId,
  details: {
    query_results_count: results.length,
    objects_accessed: resultIds,
    query_time_ms: elapsed
  }
});
```

### Summary: Mass Export Prevention

| Control | Implemented | Strength |
|---------|-------------|----------|
| **Access grants** | ✅ | Medium (can grant themselves) |
| **Download tokens** | ✅ | Medium (no rate limiting) |
| **Audit logging** | ✅ | Medium (logged but not analyzed) |
| **Pagination** | ❌ | None (can fetch all in one query) |
| **Rate limiting** | ❌ | None |
| **Anomaly detection** | ❌ | None |
| **Quota enforcement** | ❌ | None |
| **Separation of duties** | ❌ | None |

**Risk Level**: 🔴 **HIGH** - Determined insider with appropriate access could export substantial data without triggering alerts

---

## Question 5: How does the system behave if an external org later joins the platform?

### Current Architecture

**Organizations Table**:
```sql
CREATE TABLE Organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  is_platform_workspace BOOLEAN DEFAULT false,
  workspace_id UUID NULLABLE REFERENCES Workspace(id),
  ...
);
```

**Key Insight**: Organizations can exist in two states:
- `is_platform_workspace = false` → External org (no workspace)
- `is_platform_workspace = true` → Platform member (has workspace)

### Scenario: ChemPartner CRO Joins

**Timeline**:

**Phase 1: External (2026-01-01)**
```
ChemPartner Organization:
├─ is_platform_workspace: false
├─ workspace_id: NULL
└─ State: Can receive shared batches, execute analyses
```

**Phase 2: Joins Platform (2026-02-04)**
```
Platform creates new workspace for ChemPartner:
└─ Workspace (chempartner-ws)
   ├─ name: "ChemPartner CRO"
   ├─ slug: "chempartner"
   └─ created_at: 2026-02-04

Update organization:
├─ is_platform_workspace: true
├─ workspace_id: chempartner-ws
└─ Can now create own samples, batches, projects
```

### What Happens to Old Data?

**Data Created While External** (shared batches, analyses):

```
Before ChemPartner joins:
├─ Batch-42 (owned by Research Lab)
│  ├─ workspace_id: research-lab-ws
│  ├─ original_workspace_id: research-lab-ws
│  └─ Shared with ChemPartner via AccessGrants
│
└─ Analysis-1 (uploaded by ChemPartner)
   ├─ batch_id: Batch-42
   ├─ workspace_id: research-lab-ws  ← IMPORTANT
   ├─ source_org_id: chempartner-org
   └─ executed_by_org_id: chempartner-org
```

**After ChemPartner Joins (No Data Migration)**:

```
Batch-42 still owned by Research Lab workspace
└─ workspace_id: research-lab-ws (unchanged)

Analysis-1 still in Research Lab workspace
└─ workspace_id: research-lab-ws (unchanged)

ChemPartner new workspace is empty
└─ workspace_id: chempartner-ws (just created)
```

### Access Control Changes

**Before Joining**:
- ChemPartner users accessed data via AccessGrants
- No workspace of their own
- Could only see shared data

**After Joining**:
- ChemPartner has workspace_id: chempartner-ws
- Users must change workspace affiliation
- Question: Do they keep old access grants?

### Critical Issue: Workspace Affiliation

**When ChemPartner joins, their Users must be updated**:

```sql
-- Before (Users in Research Lab's workspace)
UPDATE Users SET workspace_id = 'research-lab-ws'
WHERE email LIKE '%@chempartner.com';

-- After (Could move to ChemPartner's workspace)
UPDATE Users SET workspace_id = 'chempartner-ws'
WHERE email LIKE '%@chempartner.com';
```

**Question**: Are users automatically moved?

**System Behavior** (likely):
- ❌ No automatic migration
- ❌ Users still in Research Lab workspace
- ❌ They lose workspace-scoped data access

```typescript
// With workspace_id = chempartner-ws, user queries:
GET /api/analyses
// Filters: workspace_id = chempartner-ws
// Result: EMPTY (all ChemPartner analyses are in research-lab-ws workspace!)
```

### Access Grant Persistence

**Old Grants from When External**:

```
AccessGrants created before ChemPartner joined:
├─ object_type: 'Batch'
├─ object_id: Batch-42
├─ granted_to_org_id: chempartner-org  ← Still points to org
├─ granted_role: 'analyzer'
└─ revoked_at: NULL (still active)
```

**After Joining**:
- ✅ Grant still exists
- ✅ Valid because granted_to_org_id still matches
- ✅ Can be accessed via requireObjectAccess

**But**:
- ❌ User's workspace changed
- ❌ Users can't see it because workspace_id doesn't match
- ⚠️ Inconsistency: Grant valid but inaccessible to user

### Scenario: Retroactive Access Granted

**Situation**: After ChemPartner joins, Research Lab wants to grant access to historical data

```
AccessGrant for Project-123 (created before ChemPartner joined):
├─ granted_to_org_id: chempartner-org
├─ object_type: 'Project'
├─ object_id: Project-123
└─ created_at: 2026-02-05 (after ChemPartner joined)
```

**Result**:
- ✅ Grant is valid
- ✅ ChemPartner can access Project-123
- ❌ But their Users are still in research-lab-ws workspace
- ❌ So API queries filter by workspace_id, not by grants!

**Example Query Behavior**:

```typescript
// ChemPartner user queries:
GET /api/projects

// API does:
WHERE workspace_id = chempartner-ws // User's workspace

// Result: NOTHING (Project-123 is in research-lab-ws!)
// Even though grant exists
```

### Data Visibility Problem

| User Type | Before Joining | After Joining | After Getting Grant |
|-----------|---|---|---|
| ChemPartner user | See shared data via grants | See nothing (wrong workspace) | Still see nothing (workspace filter blocks it) |
| Research Lab user | See all their data | See all their data | See all their data |

### Recommendations for Proper Onboarding

**Option 1: Dual-Workspace Users**
```typescript
// Allow users to belong to multiple workspaces
Users table:
├─ id
├─ primary_workspace_id
├─ additional_workspaces: UUID[] (ARRAY type)
└─ Queries: WHERE workspace_id IN (primary + additional)
```

**Option 2: Explicit Migration**
```typescript
// On onboarding:
1. Create new workspace
2. Ask: "Migrate to new workspace or keep current?"
3. If migrate: Update all user.workspace_id
4. Update all old analysis/batch workspace_id? (problematic)
5. Maintain access grants for historical data
```

**Option 3: Organization-Based Access**
```typescript
// Instead of workspace_id filtering:
// Query: WHERE object_owner_org_id = user.org_id OR 
//        (grant exists for user.org_id)
// This would work across workspaces
```

**Option 4: Virtual Workspace**
```typescript
// Don't change actual workspace
// Create role mapping: "virtual membership" in new workspace
// User sees data from: original workspace + virtually mapped workspace
```

### Current System: Likely Behavior

1. ❌ **Automatic migration**: Unlikely
2. ❌ **User access broken**: Users can't see old data after joining
3. ⚠️ **Grants become orphaned**: Technically valid but inaccessible
4. ❌ **No notification**: Users unaware of the issue
5. ❌ **Retroactive sharing broken**: New grants don't help users in old workspace

### Audit Trail

✅ Workspace creation logged  
✅ Organization update logged  
❌ User workspace change logged  
❌ Access grant effectiveness not verified  
❌ Data visibility issues not detected

---

## Summary: Risk Assessment

| Question | Risk Level | Impact | Status |
|----------|-----------|--------|--------|
| **Result corrections** | 🔴 HIGH | Results can be modified without immutability | ⚠️ DESIGN GAP |
| **Conflicting results** | 🔴 HIGH | Multiple results with no conflict resolution | ⚠️ IMPLEMENTATION GAP |
| **Wrong batch uploads** | 🟡 MEDIUM | Can upload to wrong batch without validation | ⚠️ VALIDATION GAP |
| **Mass data export** | 🔴 HIGH | No rate limiting, pagination, or anomaly detection | ⚠️ CONTROL GAP |
| **External org joining** | 🟡 MEDIUM | Data access breaks after onboarding | ⚠️ DESIGN GAP |

---

## Recommended Immediate Actions

### Critical (Implement ASAP)
1. **Immutable Results**: Block result updates via trigger
2. **Conflict Detection**: Flag when multiple analyses exist for batch
3. **Batch Validation**: Verify workspace consistency on analysis creation
4. **Rate Limiting**: Add per-user, per-API rate limits
5. **Pagination**: Enforce 1000-row max per query

### High Priority (Next Sprint)
1. **Result Versioning**: Track revisions instead of overwrites
2. **Approval Chain**: Require approval for data access grants
3. **Anomaly Detection**: Alert on suspicious access patterns
4. **Onboarding Process**: Document workspace migration path

### Medium Priority (Design Review)
1. **Multi-Workspace Users**: Support users in multiple workspaces
2. **Conflict Resolution**: Define approval process for conflicting results
3. **Download Quotas**: Implement daily/weekly limits
4. **Audit Dashboard**: Real-time view of data access patterns

---

*This analysis reveals critical data integrity and access control gaps that require immediate attention for FDA 21 CFR Part 11 compliance and operational safety.*
