# ⚡ Quick Schema Change Checklist

Before you commit a database schema change, run through this checklist to prevent schema drift.

## Pre-Change Checklist

- [ ] Am I modifying a table schema? (columns, types, constraints)
- [ ] Have I read `DATABASE_SCHEMA_GUIDE.md`?
- [ ] Is the change urgent, or can I wait to batch changes?

## Step-by-Step Guide

### 1️⃣ Update Central Schema Definition
**File:** `backend/src/database/schemas.ts`

```typescript
export const SAMPLE_SCHEMA = {
  columns: {
    // ✅ Add/modify column definition here
    new_field: { type: 'VARCHAR(100)', required: false },
  },
  CreateRequest: Joi.object({
    // ✅ Update validation schema
  }),
  UpdateRequest: Joi.object({
    // ✅ Update validation schema
  }),
  insertColumns: [..., 'new_field'],  // ✅ If new field
  updateColumns: [..., 'new_field'],  // ✅ If updatable
  selectColumns: [..., 'new_field'],  // ✅ Always add here
}
```

**Commit point:** `git add src/database/schemas.ts`

### 2️⃣ Update Database Table Definition
**File:** `backend/src/database/setup.ts`

```typescript
CREATE TABLE IF NOT EXISTS Samples (
  // ... existing columns ...
  new_field VARCHAR(100),  // ✅ MUST match SAMPLE_SCHEMA type
)
```

**⚠️ IMPORTANT:** Table definition must exactly match schemas.ts!

**Commit point:** `git add src/database/setup.ts`

### 3️⃣ Create Migration (for existing databases)
**File:** `backend/src/database/migrations.ts`

```typescript
{
  id: '006',  // ✅ Increment from last migration
  name: 'add_new_field_to_samples',
  description: 'Add new_field column to Samples table',
  up: async (pool: Pool) => {
    await pool.query(`
      ALTER TABLE Samples ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);
    `);
    logger.info('✅ Added new_field to Samples table');
  }
}
```

**Commit point:** `git add src/database/migrations.ts`

### 4️⃣ Run Tests
```bash
cd backend
npm test -- src/database/schemas.test.ts
```

✅ All tests should pass (or skip if DB not connected during test)

**Commit point:** All schema changes committed

### 5️⃣ Restart Backend
```bash
npm run dev
```

✅ Should see migration running on startup

## Adding a New Table

If you're adding a completely new table (not modifying an existing one), follow the same 3-step process:

### 1️⃣ Define schema in `database/schemas.ts`

```typescript
export const ANALYSIS_REPORT_SCHEMA = {
  columns: {
    report_id: { type: 'UUID', required: true, primaryKey: true },
    sample_id: { type: 'UUID', required: true, foreignKey: 'Samples' },
    status: { type: 'VARCHAR(50)', required: false, default: 'pending' },
    // ... all columns
  },
  CreateRequest: Joi.object({
    sampleId: Joi.string().uuid().required(),
    // ... validation fields
  }),
  UpdateRequest: Joi.object({
    status: Joi.string().optional(),
    // ... updateable fields
  }),
  insertColumns: ['report_id', 'sample_id', 'status', ...],
  selectColumns: ['report_id', 'sample_id', 'status', ...],
  updateColumns: ['status', ...],
}
```

### 2️⃣ Create table in `database/setup.ts`

```typescript
const createAnalysisReportsTable = async (pool: Pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS AnalysisReports (
      report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sample_id UUID NOT NULL REFERENCES Samples(id),
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};
```

### 3️⃣ Add table creation to migrations

```typescript
{
  id: '005',
  name: 'create_analysis_reports_table',
  up: async (pool: Pool) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS AnalysisReports (
        report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sample_id UUID NOT NULL REFERENCES Samples(id),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✅ Created AnalysisReports table');
  }
}
```

## Files That Update Automatically

**DO NOT** manually edit these - they reference schemas from `database/schemas.ts`:

- `src/api/samples/types.ts` - ✅ Auto-references SAMPLE_SCHEMA (for Samples table)
- `src/middleware/validation.ts` - ✅ Auto-references SAMPLE_SCHEMA
- `src/api/samples/controller.ts` - ✅ Just uses correct field names
- `src/api/samples/service.ts` - ✅ Just uses correct field names

**For new tables**, create similar API handler files:
- `src/api/analysis-reports/types.ts` - Import ANALYSIS_REPORT_SCHEMA
- `src/api/analysis-reports/controller.ts` - Use types
- `src/api/analysis-reports/service.ts` - Use DB queries
- `src/api/analysis-reports/routes.ts` - Use validation middleware

## Column Type Quick Reference

| Type | Use Case | Example |
|------|----------|---------|
| `UUID` | IDs, Foreign Keys | `id`, `project_id` |
| `VARCHAR(N)` | Strings with max length | `sample_id VARCHAR(100)` |
| `TEXT` | Large text, no length limit | `description TEXT` |
| `JSONB` | JSON objects/arrays | `metadata JSONB` |
| `TIMESTAMP` | Dates/times | `created_at`, `updated_at` |
| `BOOLEAN` | True/false | `is_active BOOLEAN` |
| `INTEGER` | Whole numbers | `count INTEGER` |
| `NUMERIC(10,2)` | Decimals | `quantity NUMERIC(10,2)` |

## Common Mistakes & Fixes

### ❌ I added a new column to SAMPLE_SCHEMA but forgot to add it to updateColumns

```typescript
// SCHEMA_DEFINITION
columns: {
  new_field: { type: 'VARCHAR(50)', required: false },  // ✅ Added here
  // ...
},
updateColumns: ['field1', 'field2'],  // ❌ Missing new_field!
```

**Fix:**
```typescript
updateColumns: ['field1', 'field2', 'new_field'],  // ✅ Added!
```

### ❌ Changed SAMPLE_SCHEMA but forgot to update setup.ts

```typescript
// schemas.ts
new_field: { type: 'VARCHAR(100)', required: false },

// setup.ts
CREATE TABLE Samples (
  // ❌ Missing new_field!
)
```

**Fix:** Add column to setup.ts CREATE TABLE statement

### ❌ Updated validation schema but not added to insertColumns

API accepts new field in request, but INSERT fails because column not in insertColumns list.

**Fix:** Add field to SAMPLE_SCHEMA.insertColumns

## Red Flags 🚨

If you see any of these, something is wrong:

- ❌ "column X does not exist" error
- ❌ Validation passes but database INSERT fails
- ❌ Updating a file that's not in "Step 1-3"
- ❌ Adding validation schema outside of SAMPLE_SCHEMA
- ❌ Using hardcoded column names instead of SAMPLE_SCHEMA.selectColumns

## When You're Stuck

1. **Check schemas.ts** - Is your change reflected there?
2. **Check setup.ts** - Does the table definition match schemas.ts?
3. **Run the test** - `npm test -- src/database/schemas.test.ts`
4. **Check logs** - Is there a migration error on startup?
5. **Ask in PR** - Link to `DATABASE_SCHEMA_GUIDE.md`

## Example: Full Change

**Scenario:** Add a `batch_number` field to Samples table

### schemas.ts
```typescript
export const SAMPLE_SCHEMA = {
  columns: {
    // ... existing ...
    batch_number: { type: 'VARCHAR(50)', required: false },  // ✅ New
  },
  CreateRequest: Joi.object({
    // ... existing ...
    batchNumber: Joi.string().optional().max(50),  // ✅ New
  }),
  UpdateRequest: Joi.object({
    // ... existing ...
    batchNumber: Joi.string().optional().max(50),  // ✅ New
  }),
  insertColumns: ['workspace_id', /* ... */, 'batch_number'],  // ✅ New
  updateColumns: ['sample_id', /* ... */, 'batch_number'],    // ✅ New
  selectColumns: ['id', /* ... */, 'batch_number'],           // ✅ New
}
```

### setup.ts
```typescript
CREATE TABLE IF NOT EXISTS Samples (
  // ... existing ...
  batch_number VARCHAR(50),  // ✅ New
);
```

### migrations.ts
```typescript
{
  id: '006',
  name: 'add_batch_number_to_samples',
  up: async (pool: Pool) => {
    await pool.query(`
      ALTER TABLE Samples ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50);
    `);
    logger.info('✅ Added batch_number to Samples table');
  }
}
```

✅ **Done!** Everything else updates automatically.

---

**Questions?** See `DATABASE_SCHEMA_GUIDE.md` for full documentation.
