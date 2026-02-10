-- Migration: Add External Client Support
-- Date: 2026-02-10
-- Description: Allow projects to have either registered clients or external client names

-- Step 1: Add external_client_name column
ALTER TABLE Projects
ADD COLUMN IF NOT EXISTS external_client_name VARCHAR(255) DEFAULT NULL;

-- Step 2: Make client_org_id nullable
-- Note: This may fail if you have NOT NULL constraint. If so, see rollback steps.
ALTER TABLE Projects
ALTER COLUMN client_org_id DROP NOT NULL;

-- Step 3: Add constraint to ensure at least one client field is provided
-- Drop existing constraint if it exists
ALTER TABLE Projects
DROP CONSTRAINT IF EXISTS client_required;

-- Add the new constraint
ALTER TABLE Projects
ADD CONSTRAINT client_required CHECK (client_org_id IS NOT NULL OR external_client_name IS NOT NULL);

-- Step 4: Verify the changes
-- Run these selects to verify migration was successful
SELECT COUNT(*) as total_projects,
       COUNT(client_org_id) as count_with_registered_client,
       COUNT(external_client_name) as count_with_external_client,
       COUNT(*) FILTER (WHERE client_org_id IS NULL AND external_client_name IS NULL) as invalid_projects
FROM Projects;

-- If there are invalid_projects, you need to populate one of the client fields
-- For now, all existing projects should have client_org_id populated

-- Step 5: View schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Projects'
ORDER BY ordinal_position;
