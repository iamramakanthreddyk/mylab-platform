-- Migration: Remove all Workspace foreign keys from tables
-- Date: 2026-02-10
-- Description: Remove workspace_id foreign key constraints from all tables

-- Trials table
ALTER TABLE Trials
DROP CONSTRAINT IF EXISTS trials_workspace_id_fkey;

ALTER TABLE Trials
ALTER COLUMN workspace_id DROP NOT NULL;

-- Samples table
ALTER TABLE Samples
DROP CONSTRAINT IF EXISTS samples_workspace_id_fkey;

ALTER TABLE Samples
ALTER COLUMN workspace_id DROP NOT NULL;

-- Projects table (already done but ensure it's clean)
ALTER TABLE Projects
DROP CONSTRAINT IF EXISTS projects_workspace_id_fkey;

-- Analyses table
ALTER TABLE Analyses
DROP CONSTRAINT IF EXISTS analyses_workspace_id_fkey;

-- Any other tables with workspace_id can be added here

-- Note: We keep workspace_id columns for now during transition,
-- but they are no longer enforced by foreign keys
