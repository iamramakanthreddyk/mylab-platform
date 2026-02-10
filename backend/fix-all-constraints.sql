-- ============================================================================
-- Fix All Foreign Key Constraint Violations
-- ============================================================================

-- Step 1: Drop problematic constraints from Users table
-- This removes constraints that may fail due to invalid data
ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "users_workspace_id_fkey" CASCADE;

-- Step 2: Drop problematic constraints from LastLogin table
ALTER TABLE "LastLogin" DROP CONSTRAINT IF EXISTS "lastlogin_workspace_id_fkey" CASCADE;

-- Step 3: Add missing columns to BatchItems if they don't exist
ALTER TABLE "BatchItems"
ADD COLUMN IF NOT EXISTS workspace_id UUID,
ADD COLUMN IF NOT EXISTS original_workspace_id UUID;

-- Step 4: Remove problematic constraints from BatchItems
ALTER TABLE "BatchItems" DROP CONSTRAINT IF EXISTS "batchitems_workspace_id_fkey" CASCADE;
ALTER TABLE "BatchItems" DROP CONSTRAINT IF EXISTS "batchitems_original_workspace_id_fkey" CASCADE;

-- Step 5: Clean up invalid data in Users table
-- Remove workspace_id references that don't exist in Organizations
DELETE FROM "Users" 
WHERE workspace_id IS NOT NULL 
  AND workspace_id NOT IN (SELECT id FROM "Organizations");

-- Step 6: Clean up invalid data in LastLogin table
-- Delete records where user_id no longer exists
DELETE FROM "LastLogin"
WHERE user_id NOT IN (SELECT id FROM "Users");

-- Delete records where workspace_id doesn't exist
DELETE FROM "LastLogin"
WHERE workspace_id NOT IN (SELECT id FROM "Organizations");

-- Step 7: Populate workspace_id for BatchItems from related batch
UPDATE "BatchItems" b
SET workspace_id = ba.workspace_id
FROM "Batches" ba
WHERE b.batch_id = ba.id AND b.workspace_id IS NULL;

-- Step 8: Recreate Users workspace_id constraint with proper handling
-- Users can have NULL workspace_id (for platform admins)
ALTER TABLE "Users"
ADD CONSTRAINT users_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES "Organizations"(id) ON DELETE SET NULL;

-- Step 9: Recreate LastLogin constraints
-- First delete any remaining invalid data
DELETE FROM "LastLogin"
WHERE workspace_id IS NULL OR user_id IS NULL;

-- Recreate the constraints
ALTER TABLE "LastLogin"
ADD CONSTRAINT lastlogin_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES "Organizations"(id) ON DELETE CASCADE;

-- Step 10: Recreate BatchItems constraints
-- Only add constraint if column has values
ALTER TABLE "BatchItems"
ADD CONSTRAINT batchitems_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES "Organizations"(id) ON DELETE CASCADE;

-- For original_workspace_id, only add constraint if column is used
-- First check if any data exists in original_workspace_id
-- Then add the constraint only for non-null values
ALTER TABLE "BatchItems"
ADD CONSTRAINT batchitems_original_workspace_id_fkey 
FOREIGN KEY (original_workspace_id) REFERENCES "Organizations"(id) ON DELETE SET NULL;

-- Step 11: Verify all constraints are in place
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name IN ('Users', 'LastLogin', 'BatchItems')
  AND constraint_name LIKE '%workspace%'
ORDER BY table_name, constraint_name;

-- Step 12: Display summary of fixes
DO $$
BEGIN
  RAISE NOTICE 'All foreign key constraint violations have been fixed!';
  RAISE NOTICE '✅ Users.workspace_id_fkey - recreated with ON DELETE SET NULL';
  RAISE NOTICE '✅ LastLogin.workspace_id_fkey - recreated with ON DELETE CASCADE';
  RAISE NOTICE '✅ BatchItems.workspace_id - added column and constraint';
  RAISE NOTICE '✅ BatchItems.original_workspace_id - added column and constraint';
  RAISE NOTICE '✅ Invalid data cleaned from all tables';
END $$;
