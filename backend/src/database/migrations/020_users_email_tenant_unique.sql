-- Allow the same email across tenants and keep platform admin unique
ALTER TABLE Users
  DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_workspace_email
  ON Users(workspace_id, email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_platform_email
  ON Users(email)
  WHERE workspace_id IS NULL;
