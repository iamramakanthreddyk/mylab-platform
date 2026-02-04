# Audit Logging & Historical Traceability Analysis
## MyLab Platform - Database & Security Audit

**Analysis Date**: February 4, 2026  
**System**: MyLab Platform Backend  
**Scope**: AuditLog table, access tracking, version history, lineage reconstruction

---

## 1. What Actions Are Guaranteed To Be Logged in AuditLog?

### Definitive Answer: **Limited Set of Explicitly Decorated Routes Only**

The AuditLog table logs **ONLY** actions explicitly decorated with the `auditLog()` middleware. This is **opt-in, not automatic**.

### Current Logged Actions
```typescript
// From grep analysis of routes:
✅ 'create', 'sample'          // POST /api/samples
✅ 'update', 'sample'          // PUT /api/samples/:id
✅ 'delete', 'sample'          // DELETE /api/samples/:id
✅ 'cascade_delete', 'sample'  // DELETE /api/samples/:id/cascade
✅ 'revoke', 'access_grant'    // POST /api/access/grants/:grantId/revoke
```

### AuditLog Schema
```typescript
CREATE TABLE AuditLog (
  id BIGSERIAL PRIMARY KEY,
  object_type VARCHAR(50) NOT NULL,      // 'sample', 'access_grant', etc.
  object_id UUID NOT NULL,                // Specific resource ID
  action ENUM (
    'create', 'read', 'update', 'delete', 
    'share', 'upload', 'download'
  ) NOT NULL,
  actor_id UUID NOT NULL REFERENCES Users(id),
  actor_workspace UUID NOT NULL REFERENCES Workspace(id),
  actor_org_id UUID REFERENCES Organizations(id),
  details JSONB,                          // {method, url, userAgent}
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Critical Gap: Many Actions Are NOT Logged

❌ **NOT automatically logged**:
- Project creation/updates
- Batch creation
- Analysis execution
- Document uploads
- Access grant creation (only revocation)
- Derived sample creation
- Status changes
- Metadata updates
- Share/unshare operations (except 'revoke')
- External organization execution

### Root Cause: Inconsistent Middleware Application

The `auditLog()` middleware is **explicitly applied per route**:

```typescript
// ✅ Logged
router.post('/', authenticate, auditLog('create', 'sample'), async (req, res) => { ... });

// ❌ Not logged - no auditLog() decorator
router.post('/derived', authenticate, async (req, res) => { ... });
```

---

## 2. Are Failed or Denied Actions Logged?

### Answer: **NO - Only Successful Actions Are Logged**

### Current Implementation (auth.ts, lines 147-184)

```typescript
export const auditLog = (action: string, objectType: string) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function(data: any) {
      // ⚠️ LOGS ONLY AFTER RESPONSE IS SENT
      if (req.user) {
        try {
          pool.query(`
            INSERT INTO AuditLog (...)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            objectType,
            objectId,
            action,
            req.user.id,           // Always has user
            req.user.workspaceId,
            req.user.orgId,
            JSON.stringify({...}),
            req.ip,
            req.get('User-Agent')
          ]);
        } catch (error) {
          console.error('Audit logging failed:', error); // Silent failure
        }
      }
      return originalSend.call(this, data);
    };
    next();
  };
```

### Failed Actions NOT Logged

| Scenario | Logged? | Details |
|----------|---------|---------|
| 401 Authentication fails | ❌ NO | `req.user` is undefined, so condition skips |
| 403 Access denied | ❌ NO | Response sent via `requireObjectAccess`, no auditLog decorator |
| 400 Validation error | ❌ NO | Middleware runs but error response sent before log |
| 500 Server error | ❌ NO | Exception thrown, middleware never reaches `res.send` |
| Circular reference detected | ❌ NO | Validation check, 400 response sent, no log |
| Depth limit exceeded | ❌ NO | Validation check, 400 response sent, no log |
| Stage progression violation | ❌ NO | Access check fails, no log |

### Critical Security Implications

**This is a major audit gap for compliance**:
- ❌ Cannot detect repeated unauthorized access attempts
- ❌ Cannot identify attacks or suspicious patterns
- ❌ Failed revocation attempts not tracked
- ❌ Security events (denied access) invisible to admins
- ❌ ALCOA+ compliance risk: Cannot prove "access was denied" for audit trails

### What SHOULD Be Logged (But Isn't)

```typescript
// ❌ Currently NOT logged
- Failed authentication (401)
- Denied access due to permissions (403)
- Circular reference prevention
- Depth limit enforcement  
- Stage progression violations
- Revocation after expiry
- Download attempt with invalid token
- Rate limit exceeded
- Access control violations
```

---

## 3. Can Audit Records Ever Be Modified or Deleted?

### Answer: **YES - There Are No Protections (Critical Vulnerability)**

### Current State: Audit Records Are Unprotected

```sql
-- Nothing prevents this from running:
DELETE FROM AuditLog WHERE id = 123;
UPDATE AuditLog SET action = 'read' WHERE id = 123;
TRUNCATE TABLE AuditLog;
```

### Schema Vulnerabilities

```typescript
CREATE TABLE AuditLog (
  id BIGSERIAL PRIMARY KEY,
  object_type VARCHAR(50) NOT NULL,
  -- ⚠️ NO CONSTRAINTS:
  -- - NO IMMUTABILITY CONSTRAINTS
  -- - NO TIMESTAMP PROTECTION
  -- - NO CHECKSUMS
  -- - NO APPEND-ONLY ENFORCEMENT
  -- - NO RETENTION POLICY
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- ⚠️ timestamp CAN BE UPDATED AFTER INSERT
);
```

### Missing Protections That Should Exist

| Protection | Current State | Should Have |
|-----------|---------------|------------|
| Read-only after insert | ❌ NO | YES - Trigger to prevent UPDATEs |
| Append-only enforcement | ❌ NO | YES - Immutable after creation |
| Deletion prevention | ❌ NO | YES - Trigger to prevent DELETEs |
| Timestamp immutability | ❌ NO | YES - Cannot change after insert |
| Cryptographic checksums | ❌ NO | YES - Detect tampering |
| Retention policy | ❌ NO | YES - Auto-delete after X years |
| Separate archival system | ❌ NO | YES - Cold storage for compliance |

### Proof of Vulnerability

```typescript
// Any admin with database access can do this:
const response = await pool.query(`
  UPDATE AuditLog
  SET action = 'read', timestamp = NOW() - INTERVAL '30 days'
  WHERE object_id = 'sample-123' AND action = 'delete'
`);

// Result: ✅ Successfully modified/backdated audit record
// Risk: Covers up deletion, makes it look like innocent read
```

### The Real Risk

A **compromised database admin** or **insider threat** can:
1. Delete evidence of data exfiltration
2. Backdate timestamps to create alibi
3. Change action types to hide malicious activity
4. Truncate entire audit trail
5. No way to detect the tampering

### What Should Exist

```typescript
// Immutable audit table
CREATE TABLE AuditLog (
  id BIGSERIAL PRIMARY KEY,
  object_type VARCHAR(50) NOT NULL,
  object_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_id UUID NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(256) NOT NULL, -- SHA-256 of row data
  hash_previous VARCHAR(256),      -- Hash of previous row (blockchain pattern)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Enforce immutability
  CONSTRAINT audit_immutable CHECK (created_at = CURRENT_TIMESTAMP)
);

-- Trigger to prevent modifications
CREATE TRIGGER audit_no_update BEFORE UPDATE ON AuditLog
FOR EACH ROW EXECUTE FUNCTION fn_audit_immutable();

-- Trigger to prevent deletions  
CREATE TRIGGER audit_no_delete BEFORE DELETE ON AuditLog
FOR EACH ROW EXECUTE FUNCTION fn_audit_no_delete();
```

---

## 4. How Does the System Link an Audit Entry to a Specific Object Version?

### Answer: **It Doesn't - Critical Limitation**

### Current Audit Structure

```typescript
AuditLog has:
✅ object_type        // 'sample'
✅ object_id          // '550e8400-e29b-41d4-a716-446655440000'
✅ action             // 'update'
✅ timestamp          // When action happened

❌ NO:
- object_version      // What version was this?
- snapshot_before     // What was the state before?
- snapshot_after      // What was the state after?
- field_changes       // Which fields changed?
```

### The Problem

When you query the audit log:

```sql
SELECT * FROM AuditLog
WHERE object_id = 'sample-123' AND action = 'update'
ORDER BY timestamp;

-- Returns:
-- timestamp: 2026-02-04 10:00:00, action: update
-- timestamp: 2026-02-04 14:30:00, action: update

-- But WHAT CHANGED? You don't know!
```

### Version Tracking in Domain Tables

The Samples/DerivedSamples tables have minimal version info:

```typescript
// Samples table
CREATE TABLE Samples (
  id UUID PRIMARY KEY,
  sample_id VARCHAR(100),
  metadata JSONB,           // ⚠️ Changes but versions not tracked
  status ENUM(...),         // ⚠️ Changes but history not tracked
  updated_at TIMESTAMP,     // Last update time, but no changelog
  deleted_at TIMESTAMP,     // Soft delete timestamp
  -- NO VERSION COLUMN
  -- NO SNAPSHOT COLUMN
  -- NO CHANGE HISTORY
);

// Documents table - only one version tracked
CREATE TABLE Documents (
  id UUID PRIMARY KEY,
  version INT DEFAULT 1,    // ✅ Has version number
  -- But NO DOCUMENT_VERSIONS table to store history
);
```

### What's Missing: Document Versions Table

The schema references a `DocumentVersions` table that should exist:

```typescript
// This table should exist but isn't created in setup.ts
SampleMetadataHistory: `
  CREATE TABLE SampleMetadataHistory (
    id UUID PRIMARY KEY,
    sample_id UUID NOT NULL REFERENCES Samples(id),
    metadata_snapshot JSONB,
    changed_by UUID NOT NULL REFERENCES Users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`,
```

**Status**: ✅ Referenced in schema-data.ts but ❌ **NOT implemented** in database setup

### Consequence: Cannot Answer Critical Questions

| Question | Can Answer? | Example |
|----------|-------------|---------|
| What was sample's metadata on Feb 1? | ❌ NO | Last update was Feb 3 |
| Which fields changed in update #5? | ❌ NO | Know action happened, not what changed |
| Who changed the status from 'created' to 'processing'? | ❌ NO | Audit shows action, not field change |
| What was the exact metadata before deletion? | ❌ NO | Soft delete exists, but no snapshot |
| Can we recover deleted sample state? | ❌ NO | Deleted data is gone, audit doesn't help |

### Real-World Scenario

```
PharmaCorp asks: "On what date did the sample move to 'analyzed' status?"

Current system:
1. Query AuditLog: action = 'update', object_id = 'sample-123'
   Returns: 2026-02-04 14:30:00 - but we don't know what changed

2. Query Samples table: status = 'analyzed', updated_at = 2026-02-04 14:30:00
   OK, so status is currently 'analyzed' with that timestamp

3. But is that when status CHANGED to 'analyzed'?
   Or was status already 'analyzed' and something else changed?
   ⚠️ CANNOT TELL - Audit doesn't store field-level changes
```

---

## 5. Can We Reconstruct a Full Sample Journey Using Only Database Data?

### Answer: **Partially - Major Gaps Exist**

### What CAN Be Reconstructed

#### A. Full Lineage Tree

✅ **YES** - Using recursive query:

```sql
WITH RECURSIVE lineage AS (
  SELECT id, NULL::uuid as parent_id, sample_id as derived_id, 'sample' as type,
         0 as depth, ARRAY[id] as path
  FROM Samples
  WHERE id = $1

  UNION ALL

  SELECT ds.id, ds.parent_id, ds.derived_id, 'derived' as type,
         ds.depth, l.path || ds.id
  FROM DerivedSamples ds
  JOIN lineage l ON (
    (l.type = 'sample' AND ds.root_sample_id = l.id) OR
    (l.type = 'derived' AND ds.parent_id = l.id)
  )
  WHERE ds.depth <= 2
)
SELECT * FROM lineage ORDER BY depth;
```

**Result**: Full parent-child chain from root sample to all derivations

#### B. Access History

✅ **Partial** - But only for revocations:

```sql
SELECT ag.id, ag.granted_to_org_id, ag.granted_role, ag.expires_at,
       ag.revoked_at, ag.revocation_reason, u.email as revoked_by
FROM AccessGrants ag
LEFT JOIN Users u ON ag.revoked_by = u.id
WHERE ag.object_id = 'sample-123'
ORDER BY ag.created_at;
```

**Result**: 
- ✅ Can see when access was granted
- ✅ Can see when access was revoked + who + why
- ❌ Cannot see who accessed it while it was shared
- ❌ Cannot see download history
- ❌ Cannot see read operations

#### C. Basic Action Timeline

✅ **Partial** - Only for logged actions:

```sql
SELECT timestamp, action, actor_id, u.email, al.details
FROM AuditLog al
LEFT JOIN Users u ON u.id = al.actor_id
WHERE al.object_id = 'sample-123'
ORDER BY timestamp;
```

**Result**:
- ✅ Timeline of logged actions only
- ✅ Who did what and when
- ❌ Many actions missing (see gap #2)
- ❌ Failed/denied actions not logged
- ❌ No details of what changed

### What CANNOT Be Reconstructed

#### A. State at Any Point in Time

❌ **NO** - Cannot answer:
- "What was the sample's metadata on Feb 1?"
- "What stage was it in on Jan 15?"
- "Who had access on Feb 1?"

**Why**: No snapshot history. Documents table has `version INT` but no DocumentVersions table.

#### B. Detailed Change History

❌ **NO** - Cannot answer:
- "Which fields changed in each update?"
- "What were the exact changes from status A to B?"
- "Who changed the description and what was it before?"

**Why**: AuditLog doesn't store before/after snapshots. Samples table has `updated_at` but no change details.

#### C. Complete Access Timeline

❌ **NO** - Cannot answer:
- "Who downloaded this file?"
- "When did each organization access it?"
- "What was each access attempt (successful and failed)?"

**Why**: 
- Only grant creation/revocation logged
- Download logs not implemented (would use DownloadTokens table)
- Failed access attempts not logged

#### D. External Operations

❌ **NO** - Cannot answer:
- "What did the external CRO do with this sample?"
- "When was external work performed?"
- "What data did they return?"

**Why**: 
- DerivedSamples has `external_reference` (text field)
- But no integration with external system logs
- Only `performed_at` timestamp exists, no change tracking

### The Complete Picture: Sample Journey Reconstruction

```
Can Reconstruct:
✅ "What is the genealogy of this sample?"
   → Full tree via recursive lineage query
   
✅ "When was it created and by whom?"
   → created_at, created_by fields
   
✅ "When did access grants expire or get revoked?"
   → AccessGrants.revoked_at, revocation_reason
   
✅ "High-level timeline of major actions"
   → AuditLog (for logged actions only)

Cannot Reconstruct:
❌ "What was the sample's metadata at any point?"
   → No version history table
   
❌ "What specific changes were made in each update?"
   → No field-level change tracking
   
❌ "Who accessed the data and when?"
   → Download tokens logged separately, not linked to audit
   
❌ "What happened during periods between audit entries?"
   → Gaps in audit coverage
   
❌ "Full ALCOA+ compliance chain?"
   → Missing attribute (who), legibility (encrypted data), original state
```

### Real Example: PharmaCorp's Lineage Question

**Query**: "Show me everything that happened to sample S-001 from creation through final analysis"

**System Response**:

```
Sample S-001 created: 2026-01-15 10:00:00 by john@pharmacorp.com
├─ Derived: D-001-A on 2026-01-20 08:30:00 by cro@tekflow.com
│  └ What was done? Unknown - only metadata available
│  └ When was it processed? performed_at shows 2026-01-25
│  └ What changed? Unknown - no version snapshots
│
├─ Shared with: TekFlow CRO (expires 2026-02-28)
│  └ When did they access it? Unknown
│  └ Did they download results? Unknown
│  └ Failed access attempts? Not logged
│
└─ Status history: created → processing → completed
   └ When did each status change? updated_at shows 2026-02-01
   └ Why? Unknown - no reason field
   └ Who changed it? Unknown - not in AuditLog
   └ What was the impact? Unknown

Result: ⚠️ PARTIAL - Timeline exists but details missing
Compliance: ⚠️ GAPS - Cannot fully prove "chain of custody"
```

---

## Summary: Audit & Traceability Gaps

| Aspect | Status | Gap Severity |
|--------|--------|-------------|
| Action logging coverage | 🔴 Limited | HIGH - Only 5 actions logged |
| Failed action tracking | 🔴 Missing | CRITICAL - No security audit |
| Audit record immutability | 🔴 Unprotected | CRITICAL - Can be modified |
| Version snapshots | 🔴 Missing | HIGH - No metadata history |
| Field-level changes | 🔴 Not tracked | MEDIUM - Cannot see details |
| Download tracking | 🟡 Partial | MEDIUM - Tokens logged separately |
| Access attempt logging | 🔴 Missing | HIGH - Failed attempts not logged |
| ALCOA+ compliance | 🔴 Incomplete | CRITICAL - Missing attributes |

---

## Recommendations

### Immediate (Critical)

1. **Make AuditLog Immutable**
   - Add triggers to prevent UPDATE/DELETE
   - Implement checksum validation

2. **Expand Logging Coverage**
   - Log ALL mutations: create, update, delete
   - Log ALL access attempts: success and failure
   - Log security events: denied access, rate limits

3. **Implement Snapshot History**
   - Create SampleMetadataHistory table
   - Create DocumentVersions table
   - Store before/after state on each change

### Short-term (High Priority)

4. **Field-Level Change Tracking**
   - Store which fields changed in AuditLog.details
   - Include old and new values
   - Enable granular audit trails

5. **Failed Action Logging**
   - Create separate SecurityLog for auth failures
   - Track denied access attempts
   - Implement anomaly detection

6. **Download History Integration**
   - Link DownloadTokens table usage to AuditLog
   - Log each download event
   - Track file access patterns

### Long-term (Compliance)

7. **ALCOA+ Readiness**
   - Attributable: Actor identification ✅ (mostly)
   - Legible: Plaintext audit format ✅ (mostly)
   - Contemporaneous: Real-time logging ✅ (mostly)
   - Original: ❌ **Need immutability**
   - Accurate: ❌ **Need checksums**
   - Complete: ❌ **Need full coverage**
   - Consistent: ❌ **Need version snapshots**
   - Durable: ❌ **Need archival strategy**
   - Available: ❌ **Need query tools**

---

## Files That Need Updates

1. **database/setup.ts**
   - Add SampleMetadataHistory table
   - Add DocumentVersions table
   - Add triggers for AuditLog immutability

2. **middleware/auth.ts**
   - Enhance auditLog to log failures
   - Create new securityLog middleware

3. **routes/*.ts**
   - Apply auditLog decorator to ALL mutations
   - Add security event logging

4. **utils/auditUtils.ts** (NEW)
   - Helper functions for audit queries
   - Snapshot generation utilities
   - Version history functions
