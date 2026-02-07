# Database Schema Architecture

## Before: Schema Drift Problem ❌

```
                    ┌─── CONFLICTING DEFINITIONS ───┐
                    │                                │
                    ▼                                ▼
            
    ❌ Database Schema          ❌ API Validation         ❌ TypeScript Types
    (setup.ts)                  (middleware/validation.ts) (types.ts)
    
    name VARCHAR                nameField required        interface Sample { 
    sampleType VARCHAR          sampleType required         name: string
    quantity NUMERIC            quantity required           sampleType: string
    unit VARCHAR                unit required               quantity: number
                                                           }
    
                    │                                │
                    └─── CAUSES ───────────────────┘
                         
    • Validation errors
    • Runtime errors  
    • Manual sync nightmare
    • Schema drift over time
```

## After: Single Source of Truth ✅

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      database/schemas.ts                                  │
│                     (SINGLE SOURCE OF TRUTH)                              │
│                                                                            │
│  ┌─ SAMPLE_SCHEMA ──────────────────────────────────────────────────┐   │
│  │                                                                    │   │
│  │  columns: {                                                        │   │
│  │    id: { type: 'UUID', ... }                                      │   │
│  │    sample_id: { type: 'VARCHAR(100)', required: true }            │   │
│  │    description: { type: 'TEXT', required: true }                  │   │
│  │    type: { type: 'VARCHAR(50)', required: false }                 │   │
│  │    ...                                                             │   │
│  │  }                                                                 │   │
│  │                                                                    │   │
│  │  CreateRequest: Joi.object({ ... })   ◄─── Defines validation   │   │
│  │  UpdateRequest: Joi.object({ ... })   ◄─── Defines validation   │   │
│  │                                                                    │   │
│  │  insertColumns: [...]                                             │   │
│  │  updateColumns: [...]                                             │   │
│  │  selectColumns: [...]                                             │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                              ▲                                          │
│                              │ (IMPORT ONLY - Don't modify)             │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
                
   ✅ Database         ✅ API Validation      ✅ TypeScript Types
   (setup.ts)        (api/samples/types.ts)  (api/samples/types.ts)
   
   CREATE TABLE      export const            export interface
   Samples (         createSampleSchema =    CreateSampleRequest {
     sample_id         SAMPLE_SCHEMA.      projectId: string;
     VARCHAR(100),     CreateRequest;      sampleId: string;
     description                          description: string;
     TEXT,             export const        }
     type              updateSampleSchema =
     VARCHAR(50)       SAMPLE_SCHEMA.      
   )                   UpdateRequest;      
                                          
                       (Auto-synced!)  (Auto-synced!)
    
    ┌────────────────────────────────────────────────────┐
    │  ✅ Always in sync                                  │
    │  ✅ Single point of change                         │
    │  ✅ No manual updates needed                       │
    │  ✅ Validation matches database                    │
    │  ✅ Types match validation                         │
    └────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Sample

```
Client Request
     │
     ▼
Express Router
     │
     ▼
validate(sampleSchemas.create) ◄─── Uses SAMPLE_SCHEMA.CreateRequest
     │
     ├─ ✅ Valid: Pass data to controller
     │
     └─ ❌ Invalid: Reject with validation error
     │
     ▼
sampleController.create()
     │
     ├─ Extract: projectId, sampleId, description, type
     │
     ▼
SampleService.createSample()
     │
     ├─ Validate stage if provided
     │
     ▼
pool.query(`
  INSERT INTO Samples (
    ${SAMPLE_SCHEMA.insertColumns.join(', ')}  ◄─── Uses schema definition
  )
  VALUES($1, $2, ...)
`)
     │
     ├─ ✅ Success: Return created sample
     │
     └─ ❌ Error: Error response
     │
     ▼
Client Response

Key Points:
• All validation uses SAMPLE_SCHEMA ✅
• All inserts use insertColumns from SAMPLE_SCHEMA ✅
• All selects use selectColumns from SAMPLE_SCHEMA ✅
• All types use SAMPLE_SCHEMA definitions ✅
```

## Component Responsibilities

| Component | Responsibility | References |
|-----------|----------------|------------|
| `database/schemas.ts` | ⭐ Source of truth for all schemas | None (master) |
| `database/setup.ts` | Create tables matching schemas.ts definitions | schemas.ts structure |
| `database/migrations.ts` | Apply schema changes to existing databases | schemas.ts structure |
| `api/samples/types.ts` | Request/response types and validation | Imports: SAMPLE_SCHEMA |
| `api/samples/controller.ts` | HTTP request handling | Uses types.ts |
| `api/samples/service.ts` | Business logic and queries | Uses types.ts, selectColumns, insertColumns |
| `middleware/validation.ts` | Input validation middleware | Imports: SAMPLE_SCHEMA |
| Frontend forms | Send requests matching API schemas | Documentation |

## Change Request Flow

```
Developer wants to add a field
     │
     ▼
Update database/schemas.ts
     │
     ├─ Add to columns
     ├─ Add to CreateRequest Joi schema
     ├─ Add to UpdateRequest Joi schema
     ├─ Add to insertColumns
     ├─ Add to updateColumns (if updatable)
     └─ Add to selectColumns
     │
     ▼
Update database/setup.ts (table definition)
     │
     ▼
Create migration in database/migrations.ts
     │
     ▼
✅ All other files automatically stay in sync!
     │
     ├─ api/samples/types.ts imports SAMPLE_SCHEMA ✓
     ├─ middleware/validation.ts imports SAMPLE_SCHEMA ✓
     ├─ api/samples/controller.ts uses types ✓
     └─ api/samples/service.ts uses SAMPLE_SCHEMA.selectColumns ✓
```

## How to Verify Sync

### Quick Check
```bash
# Verify schemas.ts is valid TypeScript
npm run build

# Check for validation test errors
npm test -- src/database/schemas.test.ts
```

### Full Verification Checklist
- [ ] SAMPLE_SCHEMA has all columns listed
- [ ] Column types match between columns{} and comments
- [ ] setup.ts CREATE TABLE matches SAMPLE_SCHEMA.columns
- [ ] Validation schemas (CreateRequest, UpdateRequest) match implementation
- [ ] selectColumns includes all columns (except auto-managed ones if desired)
- [ ] insertColumns includes all required fields
- [ ] updateColumns has all updatable fields
- [ ] Tests pass without warnings

## Multi-Lab Workflow Architecture ✨ (NEW)

### Problem: Sharing Data Safely Across Labs

When sending samples to external labs for analysis, you need to:
- **Protect**: Keep internal trial data, performer names, and process secrets private
- **Track**: Know where samples went and who has them
- **Link**: Connect analysis results back to original projects
- **Control**: Decide which clients can see which reports

### Solution: Three New Tables

```
Original Lab (Your Company)
    ├─ Projects
    │   └─ Samples (contains ALL DATA - including private trials)
    │       │
    │       └─ SampleTransfers (controls what's shared)
    │           │
    │           ├─ from_lab_id (who we are)
    │           ├─ to_lab_id (where sample goes)
    │           └─ shared_metadata (filtered - no trial details)
    │
    ▼
External Analysis Lab (Partner Company)
    ├─ Receives Sample (via shared_metadata only)
    ├─ Creates AnalysisReports (their findings)
    └─ Returns report
    
Client (Product Owner / Line Company)
    ├─ Gets ReportSharing access (sees analysis results)
    └─ Cannot see:
       ❌ Trial data
       ❌ Performer names
       ❌ Internal notes
```

### Data Visibility Rules

| Data Item | Original Lab | Analysis Lab | Client | Privacy |
|-----------|--------------|--------------|--------|---------|
| trial_1_flowrate | ✓ (private) | ✗ (hidden) | ✗ | Private |
| trial_3_temperature | ✓ (private) | ✗ (hidden) | ✗ | Private |
| sample_id = "CHEM-001" | ✓ | ✓ | ✓ | Shared |
| sample_description | ✓ | ✓ | ✓ | Shared |
| analysis_results | ✓ (all) | ✓ (owner) | ✓ (via sharing) | Controlled |

### Table Relationships

**SampleTransfers** (Share samples with external labs)
```
Samples ──→ SampleTransfers ──→ (physical sample + shared_metadata)
            ├─ shared_metadata: JSONB (filtered, no trials)
            ├─ metadata_visibility: 'basic' | 'full'
            ├─ status: pending → sent → received → analyzing → completed
            └─ from_lab_id, to_lab_id, project_id (for context)
```

**AnalysisReports** (Store results from external labs)
```
AnalysisReports ──→ Samples (links back to original)
├─ lab_id (who performed analysis)
├─ lab_name (for display)
├─ status: pending → in-progress → completed
├─ analysis_type (what kind of test)
└─ results: JSONB (their findings)
```

**ReportSharing** (Control client access)
```
AnalysisReports ──→ ReportSharing ──→ Clients
├─ shared_with_company_id (which client)
├─ access_level: 'view' | 'download' | 'edit'
└─ shared_date (when access was granted)
```

## FAQ

**Q: Can I add a field to setup.ts without updating schemas.ts?**
A: No! ❌ schemas.ts is the source of truth. Always update schemas.ts first.

**Q: Do I need to update types.ts when I change SAMPLE_SCHEMA?**
A: No! ✅ types.ts imports SAMPLE_SCHEMA, so it updates automatically.

**Q: What if database and schema definition don't match?**
A: Run the migration! It will sync the database to match schemas.ts.

**Q: Can multiple developers add columns at the same time?**
A: Yes, but be careful of migration IDs! Each migration needs a unique ID number.

**Q: How do I prevent sharing trial data with external labs?**
A: Store trial parameters in `Samples.metadata` (never shared). Only put safe data in `SampleTransfers.shared_metadata`.

**Q: Can an external lab modify the sample they receive?**
A: No! `SampleTransfers` is read-only for them. They can only create `AnalysisReports`.

**Q: How do clients access the analysis results?**
A: Via `ReportSharing` records. Query `AnalysisReports` WHERE report_id IN (SELECT report_id FROM ReportSharing WHERE shared_with_company_id = client_id)

---

See `DATABASE_SCHEMA_GUIDE.md` for full documentation.
See `SCHEMA_CHANGE_CHECKLIST.md` for step-by-step guide.
