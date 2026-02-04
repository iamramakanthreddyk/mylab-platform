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
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

-- Add more tables as needed for tests
