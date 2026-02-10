-- Migration: Remove Workspace dependency from Organizations
-- Date: 2026-02-10
-- Description: Simplify architecture - Organization is top-level, no Workspace needed

-- Step 1: Drop foreign key constraint from Organizations to Workspace
ALTER TABLE Organizations
DROP CONSTRAINT IF EXISTS organizations_workspace_id_fkey;

-- Step 2: Make workspace_id nullable in Organizations (will be removed later)
ALTER TABLE Organizations
ALTER COLUMN workspace_id DROP NOT NULL;

-- Step 3: Add organization_id column to Users table
ALTER TABLE Users
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES Organizations(id);

-- Step 4: Migrate data - copy workspace_id to organization_id for existing users
UPDATE Users
SET organization_id = workspace_id
WHERE organization_id IS NULL AND workspace_id IS NOT NULL;

-- Step 5: Now we can make organization_id NOT NULL after data migration
-- ALTER TABLE Users
-- ALTER COLUMN organization_id SET NOT NULL;

-- Note: We keep workspace_id in Users for now during transition
-- Once all code is updated, we can drop it in a future migration
