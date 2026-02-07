# Database Schema Management Guide

## Problem Statement
Previously, there was constant mismatch between:
- Database table schemas (what's in PostgreSQL)
- API validation schemas (what APIs accept)
- TypeScript type definitions (what the code uses)
- Migration definitions

This caused validation errors, runtime errors, and required fixing multiple files for a single schema change.

## Solution: Single Source of Truth

We now use **`backend/src/database/schemas.ts`** as the **SINGLE SOURCE OF TRUTH** for all database schemas.

### Key Files and Their Roles

| File | Purpose | Status |
|------|---------|--------|
| `database/schemas.ts` | ✅ **MASTER** - Central schema definition for all tables | Source of Truth |
| `database/setup.ts` | Database table creation - MUST match schemas.ts | Derived |
| `database/migrations.ts` | Schema changes (migrations) - MUST match schemas.ts | Derived |
| `api/samples/types.ts` | API request/response types - REFERENCES schemas.ts | Derived |
| `middleware/validation.ts` | Input validation - REFERENCES schemas.ts | Derived |
| Frontend forms | User input - MUST match API schemas | Derived |

### How to Make Schema Changes

#### Example: Adding a `quantumStatus` field to Samples

**Step 1: Update `database/schemas.ts`**
```typescript
export const SAMPLE_SCHEMA = {
  columns: {
    // ... existing columns ...
    quantumStatus: { type: 'VARCHAR(50)', required: false },
  },
  // Add to types
  // Add to CreateRequest Joi schema
  // Add to UpdateRequest Joi schema
  insertColumns: [..., 'quantumStatus'],
  updateColumns: [..., 'quantumStatus'],
}
```

**Step 2: Update `database/setup.ts`**
```typescript
CREATE TABLE IF NOT EXISTS Samples (
  // ... existing columns ...
  quantumStatus VARCHAR(50),
)
```

**Step 3: Create Migration in `database/migrations.ts`**
```typescript
{
  id: '005',
  name: 'add_quantum_status_to_samples',
  up: async (pool: Pool) => {
    await pool.query(`
      ALTER TABLE Samples ADD COLUMN IF NOT EXISTS quantum_status VARCHAR(50);
    `);
  }
}
```

**Step 4: That's It!** ✅
- `api/samples/types.ts` auto-references `SAMPLE_SCHEMA`
- `middleware/validation.ts` auto-references `SAMPLE_SCHEMA`
- No other files need changes!

## Preventing Schema Drift

### What NOT to Do ❌
```typescript
// ❌ WRONG: Creating separate validation schemas
export const createSampleSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  // ... different from SAMPLE_SCHEMA.CreateRequest
});
```

```typescript
// ❌ WRONG: Hardcoding column names in queries
pool.query(`SELECT name, sampleType, quantity FROM Samples...`);
```

### What TO Do ✅
```typescript
// ✅ RIGHT: Reference SAMPLE_SCHEMA
import { SAMPLE_SCHEMA } from '../../database/schemas';

export const createSampleSchema = SAMPLE_SCHEMA.CreateRequest;
```

```typescript
// ✅ RIGHT: Use SAMPLE_SCHEMA.selectColumns or insertColumns
pool.query(`
  SELECT ${SAMPLE_SCHEMA.selectColumns.join(', ')} FROM Samples...
`);

pool.query(`
  INSERT INTO Samples (${SAMPLE_SCHEMA.insertColumns.join(', ')})
  VALUES (...)
`);
```

## Validation Checklist for Each Table

When adding or modifying a table, ensure:

- [ ] Table definition added to `database/schemas.ts`
- [ ] All columns documented with types and requirements
- [ ] Request validation schemas defined (Create, Update)
- [ ] SelectColumns list defined
- [ ] InsertColumns list defined  
- [ ] UpdateColumns list defined
- [ ] Table created in `database/setup.ts` with EXACT same structure
- [ ] Any schema changes have migrations in `database/migrations.ts`
- [ ] API types.ts imports from SAMPLE_SCHEMA
- [ ] API routes use schema validation middleware
- [ ] API controller uses correct field names
- [ ] API service uses SAMPLE_SCHEMA.selectColumns, insertColumns, etc.
- [ ] Documentation/README updated

## Common Mistakes to Avoid

### 1. Using Column Names That Don't Match Database
```typescript
// ❌ WRONG - database has "sample_id" not "name"
pool.query(`INSERT INTO Samples (name, sampleType) VALUES ...`);

// ✅ RIGHT
pool.query(`INSERT INTO Samples (sample_id, type) VALUES ...`);
```

### 2. Making Required Fields Optional (or vice versa)
```typescript
// ❌ WRONG - description is REQUIRED in SAMPLE_SCHEMA
description: Joi.string().optional()

// ✅ RIGHT
description: Joi.string().required()
```

### 3. Accepting Extra Fields in Validation
```typescript
// ❌ WRONG - allows unknown fields
Joi.object({ projectId: ... }).unknown(true)

// ✅ RIGHT
Joi.object({ projectId: ... }).unknown(false)
```

### 4. Not Handling NULL/Optional Correctly
```typescript
// ❌ WRONG - type is optional in DB but marked required
type: Joi.string().required()

// ✅ RIGHT
type: Joi.string().optional()
```

## Database Schema Quick Reference

### Samples Table
- **sample_id** (VARCHAR 100, NOT NULL): User-facing identifier (e.g., "SAMPLE-001")
- **description** (TEXT, REQUIRED): Sample description
- **type** (VARCHAR 50, OPTIONAL): Sample type (e.g., "Blood", "Tissue")
- **metadata** (JSONB, OPTIONAL): Arbitrary JSON data (includes trial info - NOT shared with external labs)
- **status** (sample_status, DEFAULT='created'): Current status
- **stage_id** (UUID, OPTIONAL): Optional project stage assignment

### AnalysisReports Table (NEW)
Links analysis results from external labs back to samples
- **report_id** (UUID, PRIMARY KEY): Unique report identifier
- **sample_id** (UUID, NOT NULL): Links to Samples table
- **lab_id** (UUID, NOT NULL): Which lab performed the analysis
- **lab_name** (VARCHAR 255, NOT NULL): Lab name for display
- **status** (VARCHAR 50, DEFAULT='pending'): pending → in-progress → completed
- **analysis_type** (VARCHAR 100, OPTIONAL): Type of analysis performed
- **results** (JSONB, OPTIONAL): Analysis findings and data
- **received_at**, **started_at**, **completed_at**: Timeline tracking

### SampleTransfers Table (NEW)
Controls sample shipping and data visibility between labs
- **transfer_id** (UUID, PRIMARY KEY): Unique transfer identifier
- **sample_id** (UUID, NOT NULL): Which sample is being transferred
- **from_lab_id** (UUID, NOT NULL): Sending lab (original owner)
- **to_lab_id** (UUID, NOT NULL): Receiving lab (analysis lab)
- **project_id** (UUID, NOT NULL): Still linked to original project for query context
- **shared_metadata** (JSONB, OPTIONAL): Filtered metadata (no trial details, no performer info)
- **metadata_visibility** (VARCHAR 50): 'basic' = limited info, 'full' = complete info
- **status** (VARCHAR 50): pending → sent → received → analyzing → completed
- **sent_date**, **received_date**: Timeline

### ReportSharing Table (NEW)
Tracks which clients can access analysis reports
- **sharing_id** (UUID, PRIMARY KEY): Unique sharing record
- **report_id** (UUID, NOT NULL): Which analysis report is being shared
- **shared_with_company_id** (UUID, NOT NULL): Client company receiving access
- **access_level** (VARCHAR 50): 'view' = read-only, 'download' = export, 'edit' = modify

## Testing Schema Consistency

Run this test file to catch schema drift:
```bash
npm run test -- src/database/schemas.test.ts
```

This validates:
- All SAMPLE_SCHEMA fields match database columns
- All validation schemas have required fields
- No typos in column names
- Types match between schema and database

## Multi-Lab Workflow: Sharing Samples for Analysis

### Scenario
Your lab runs 10 trials, selects the best one as a Sample, then sends it to an external Analysis Lab for testing. The results must be shared back to your client.

### Data Boundaries (IMPORTANT)

**What's SHARED (SampleTransfers.shared_metadata):**
- sample_id
- type
- description
- Small, non-sensitive metadata

**What's NOT SHARED (stays in Samples.metadata):**
- Trial parameters (flowrate, temperature, pressure, time, length)
- Performer names (who ran trials)
- Internal notes or IP data
- Selection criteria that might reveal process

### Workflow

```
Original Lab (Your Lab)
    ↓ [SampleTransfer] ↓ [physical sample + limited metadata]
Analysis Lab (External)
    ↓ [performs tests] ↓
    ↓ [AnalysisReport] ↓ [results]
    ↓ [ReportSharing] ↓ [client gets access]
Client (Product Owner)
```

### Implementation Steps

1. **Create SampleTransfer when sending sample:**
```sql
INSERT INTO SampleTransfers (
  transfer_id, sample_id, from_lab_id, to_lab_id, 
  project_id, shared_metadata, metadata_visibility, status
) VALUES (
  gen_random_uuid(),
  'CHEM-001-id',
  'your-lab-id',
  'external-lab-id',
  'project-xyz-id',
  '{"sample_id": "CHEM-001", "type": "chemical", "description": "..."}',
  'basic',
  'sent'
);
```

2. **Analysis Lab receives sample, creates AnalysisReport:**
```sql
INSERT INTO AnalysisReports (
  report_id, sample_id, lab_id, lab_name, 
  status, received_at
) VALUES (
  gen_random_uuid(),
  'CHEM-001-id',
  'external-lab-id',
  'ExternalLabInc',
  'pending',
  NOW()
);
```

3. **Analysis Lab completes analysis, updates AnalysisReport:**
```sql
UPDATE AnalysisReports SET
  status = 'completed',
  results = '{"pH": 7.2, "concentration": 0.5, ...}'::jsonb,
  completed_at = NOW()
WHERE report_id = '...';
```

4. **Share results with client:**
```sql
INSERT INTO ReportSharing (
  sharing_id, report_id, shared_with_company_id, access_level
) VALUES (
  gen_random_uuid(),
  'report-id',
  'client-company-id',
  'view'
);
```

5. **Client queries their reports:**
```sql
SELECT r.* FROM AnalysisReports r
JOIN ReportSharing rs ON r.report_id = rs.report_id
WHERE rs.shared_with_company_id = 'client-company-id'
  AND r.status = 'completed';
```

### Query Examples for Original Lab Owner

Get all samples they sent for analysis and their status:
```sql
SELECT 
  s.sample_id,
  st.to_lab_id,
  st.status,
  ar.status as analysis_status,
  ar.results
FROM Samples s
JOIN SampleTransfers st ON s.id = st.sample_id
LEFT JOIN AnalysisReports ar ON s.id = ar.sample_id
WHERE st.from_lab_id = 'your-lab-id'
ORDER BY st.sent_date DESC;
```

Get reports shared with a specific client:
```sql
SELECT 
  ar.report_id,
  ar.lab_name,
  ar.analysis_type,
  ar.results,
  rs.access_level,
  rs.shared_date
FROM AnalysisReports ar
JOIN ReportSharing rs ON ar.report_id = rs.report_id
WHERE rs.shared_with_company_id = 'client-company-id'
  AND ar.status = 'completed';
```

## Support for Multi-Table Changes

For changes affecting multiple tables, follow the same process:

1. Update all table definitions in `schemas.ts`
2. Update `setup.ts` with all table changes
3. Create ONE migration that handles all changes
4. Update all derived files that reference those schemas

## Questions?

When in doubt:
1. Check `database/schemas.ts` - it's the source of truth
2. If something doesn't match schemas.ts, it's wrong
3. All changes start in schemas.ts, then cascade outward
