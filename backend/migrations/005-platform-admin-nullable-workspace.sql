/**
 * Migration 005: Make workspace_id nullable for platform admins
 * Platform administrators don't belong to any specific workspace/organization.
 * They manage the entire system, so workspace_id should be nullable in tables
 * that track their activity.
 */

-- Make workspace_id nullable in lastlogin table
ALTER TABLE lastlogin
  ALTER COLUMN workspace_id DROP NOT NULL;

-- Make actor_workspace nullable in auditlog table  
ALTER TABLE auditlog
  ALTER COLUMN actor_workspace DROP NOT NULL;

-- Add comment explaining why these are nullable
COMMENT ON COLUMN lastlogin.workspace_id IS 'Workspace ID for the user. NULL for platform administrators who manage all workspaces.';
COMMENT ON COLUMN auditlog.actor_workspace IS 'Workspace ID of the actor. NULL for platform administrators who operate system-wide.';
