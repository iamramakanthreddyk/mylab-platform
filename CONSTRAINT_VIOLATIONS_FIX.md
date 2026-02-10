# Foreign Key Constraint Violations - Fix Guide

## Problem Summary

The database is experiencing 4 foreign key constraint violations:

1. **Users table**: `users_workspace_id_fkey` constraint violation
2. **LastLogin table**: `lastlogin_workspace_id_fkey` constraint violation  
3. **BatchItems table**: Missing `workspace_id` column referenced in constraint
4. **BatchItems table**: Missing `original_workspace_id` column referenced in constraint

## Root Causes

### Users Constraint Violation
- **Cause**: Invalid `workspace_id` values in Users table that don't exist in Organizations
- **Fix**: Delete orphaned user records and recreate constraint with `ON DELETE SET NULL`
- **Rationale**: Platform admins can have `NULL` workspace_id (not tied to any organization)

### LastLogin Constraint Violation  
- **Cause**: Invalid references to deleted Users or Organizations
- **Fix**: Delete orphaned records and recreate constraint with `ON DELETE CASCADE`
- **Rationale**: If a user or org is deleted, their login history should be removed

### BatchItems Missing Columns
- **Cause**: Constraints are trying to reference columns that don't exist
- **Fix**: Add `workspace_id` and `original_workspace_id` columns to BatchItems table
- **Rationale**: Needed to track which organization owns/created batch items

## Solutions Provided

### 1. SQL Script (for direct database execution)
**File**: `fix-all-constraints.sql`

This script can be run directly in PostgreSQL client:
```bash
psql -U postgres -d your_db < fix-all-constraints.sql
```

**Steps contained**:
- Drop all problematic constraints
- Add missing columns
- Clean up orphaned data
- Recreate constraints with proper ON DELETE actions
- Verify all constraints

### 2. TypeScript Script (automated fix)
**File**: `fix-all-constraints.ts`

Run this to automatically fix the database:
```bash
ts-node fix-all-constraints.ts
```

**Prerequisites**:
- DATABASE_URL environment variable must be set
- Node.js and ts-node installed

### 3. Updated Database Setup
**File**: `backend/src/database/setup.ts`

The setup file has been updated to:
- Add `workspace_id` and `original_workspace_id` columns to BatchItems during table creation
- Clean up orphaned data BEFORE recreating constraints
- Use proper ON DELETE actions:
  - `ON DELETE SET NULL` for Users (platform admins need NULL workspace_id)
  - `ON DELETE CASCADE` for LastLogin and BatchItems

## Implementation Steps

### Option A: Fresh Database Setup (Recommended)
If you're setting up the database fresh:
1. Run database initialization as normal
2. The updated `setup.ts` will handle all fixes automatically

### Option B: Existing Database Fix
If you have an existing database:

**Step 1**: Apply the TypeScript fix
```bash
cd backend
npx ts-node fix-all-constraints.ts
```

**OR** apply the SQL fix directly:
```bash
# Using psql
psql -U postgres -d kisaan_dev < fix-all-constraints.sql

# Or using your PostgreSQL client
```

**Step 2**: Restart your application
```bash
npm run dev
```

**Step 3**: Verify constraints are in place
```bash
npx ts-node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  SELECT constraint_name, table_name, column_name
  FROM information_schema.key_column_usage
  WHERE table_name IN ('Users', 'LastLogin', 'BatchItems')
    AND constraint_name LIKE '%workspace%'
  ORDER BY table_name;
\`).then(r => {
  console.log('Constraints:');
  r.rows.forEach(row => console.log('  ' + row.table_name + '.' + row.column_name + ' → ' + row.constraint_name));
  process.exit(0);
});
"
```

## What Each Fix Does

### Users table fix
```sql
-- Remove invalid data
DELETE FROM Users WHERE workspace_id NOT IN (SELECT id FROM Organizations);

-- Recreate constraint allowing NULLs
ALTER TABLE Users ADD CONSTRAINT users_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES Organizations(id) ON DELETE SET NULL;
```

**Why ON DELETE SET NULL**: Platform administrators don't belong to a specific organization, so their workspace_id is NULL. If an org is deleted, user workspace_id becomes NULL instead of deleting the user.

### LastLogin table fix
```sql
-- Remove invalid login history records
DELETE FROM LastLogin 
WHERE user_id NOT IN (SELECT id FROM Users)
   OR workspace_id NOT IN (SELECT id FROM Organizations);

-- Recreate constraint
ALTER TABLE LastLogin ADD CONSTRAINT lastlogin_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES Organizations(id) ON DELETE CASCADE;
```

**Why ON DELETE CASCADE**: Login history is tied to a workspace. If org is deleted, no need to keep their login records.

### BatchItems table fix
```sql
-- Add missing columns
ALTER TABLE BatchItems ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE BatchItems ADD COLUMN IF NOT EXISTS original_workspace_id UUID;

-- Populate from related batch
UPDATE BatchItems b SET workspace_id = ba.workspace_id
FROM Batches ba WHERE b.batch_id = ba.id AND b.workspace_id IS NULL;

-- Add constraints
ALTER TABLE BatchItems ADD CONSTRAINT batchitems_workspace_id_fkey 
  FOREIGN KEY (workspace_id) REFERENCES Organizations(id) ON DELETE CASCADE;

ALTER TABLE BatchItems ADD CONSTRAINT batchitems_original_workspace_id_fkey 
  FOREIGN KEY (original_workspace_id) REFERENCES Organizations(id) ON DELETE SET NULL;
```

**Why these columns**: 
- `workspace_id`: Current owner of the batch
- `original_workspace_id`: Original creator (useful for cross-org batches)

## Verification

After applying fixes, verify with:

```sql
-- Check Users constraint
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'Users' AND constraint_name LIKE '%workspace%';

-- Check LastLogin constraint
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'LastLogin' AND constraint_name LIKE '%workspace%';

-- Check BatchItems constraints
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'BatchItems' AND constraint_name LIKE '%workspace%';
```

All should return results showing the constraints are in place.

## Testing

After fixes, test data operations:

```typescript
// Create a user
INSERT INTO Users (email, password_hash, name, role, workspace_id) 
VALUES ('test@example.com', 'hash', 'Test', 'scientist', null);

// Create a login record
INSERT INTO LastLogin (user_id, workspace_id, last_login_at) 
VALUES (user_id, org_id, now());

// Create a batch item
INSERT INTO BatchItems (batch_id, derived_id, workspace_id, sequence)  
VALUES (batch_id, derived_id, org_id, 1);
```

These should all work without constraint violations.

## Prevention

To prevent this in the future:
1. The updated setup.ts file automatically handles these fixes
2. Always run migrations in order when updating schema
3. Validate foreign key references before data operations
4. Use database validation constraints to catch issues early

## Questions?

Review the actual fix files:
- SQL version: `fix-all-constraints.sql`  
- TypeScript version: `fix-all-constraints.ts`
- Updated setup: `backend/src/database/setup.ts` (lines 746-900 approximately)
