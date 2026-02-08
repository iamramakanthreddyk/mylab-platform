-- SQLite schema for MyLab (testing only)
-- Only core tables for initial integration

CREATE TABLE Workspace (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  email_domain TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE Organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_platform_workspace INTEGER NOT NULL DEFAULT 0,
  workspace_id TEXT,
  contact_info TEXT,
  gst_number TEXT,
  gst_percentage REAL DEFAULT 18.00,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE Users (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  UNIQUE(workspace_id, email)
);

CREATE TABLE Projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  client_org_id TEXT NOT NULL,
  executing_org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workflow_mode TEXT DEFAULT 'trial_first',
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE Trials (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  parameters TEXT,
  parameters_json TEXT,
  equipment TEXT,
  notes TEXT,
  status TEXT DEFAULT 'planned',
  performed_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE TrialParameterTemplates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  columns TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, workspace_id)
);

CREATE TABLE Samples (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  trial_id TEXT,
  workspace_id TEXT NOT NULL,
  sample_id VARCHAR(100) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata TEXT,
  status TEXT DEFAULT 'created',
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Add more tables as needed for tests
