-- ============================================================================
-- MyLab Platform - Gap Fix Migrations
-- Adds missing tables for complete functionality
-- ============================================================================

-- Create UserInvitations table
CREATE TABLE IF NOT EXISTS UserInvitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES Workspace(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'scientist', 'viewer')),
  invited_by UUID NOT NULL REFERENCES Users(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON UserInvitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON UserInvitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_workspace ON UserInvitations(workspace_id);

-- Create PasswordResetTokens table
CREATE TABLE IF NOT EXISTS PasswordResetTokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON PasswordResetTokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON PasswordResetTokens(user_id);

-- Create FileDocuments table for file management
CREATE TABLE IF NOT EXISTS FileDocuments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES Workspace(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES Users(id),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('sample', 'analysis', 'project', 'batch', 'organization')),
  entity_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  description TEXT,
  metadata JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_docs_workspace ON FileDocuments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_file_docs_entity ON FileDocuments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_docs_uploaded_by ON FileDocuments(uploaded_by);

-- Create AnalysisRequests table for external lab collaboration
CREATE TABLE IF NOT EXISTS AnalysisRequests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES Workspace(id) ON DELETE CASCADE,
  from_organization_id UUID NOT NULL REFERENCES Organizations(id),
  to_organization_id UUID NOT NULL REFERENCES Organizations(id),
  sample_id UUID NOT NULL REFERENCES Samples(id),
  analysis_type_id UUID NOT NULL REFERENCES AnalysisTypes(id),
  description TEXT NOT NULL,
  methodology_requirements TEXT,
  parameters JSONB,
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected')),
  due_date DATE,
  estimated_duration VARCHAR(100),
  assigned_to UUID REFERENCES Users(id),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES Users(id),
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analysis_requests_workspace ON AnalysisRequests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_from_org ON AnalysisRequests(from_organization_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_to_org ON AnalysisRequests(to_organization_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_sample ON AnalysisRequests(sample_id);
CREATE INDEX IF NOT EXISTS idx_analysis_requests_status ON AnalysisRequests(status);

-- Enhance NotificationSettings table if it exists, or create it
CREATE TABLE IF NOT EXISTS NotificationSettings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  analysis_complete BOOLEAN DEFAULT true,
  sample_shared BOOLEAN DEFAULT true,
  project_update BOOLEAN DEFAULT true,
  collaboration_request BOOLEAN DEFAULT true,
  system_announcements BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON NotificationSettings(user_id);

-- Add missing columns to existing tables if they don't exist
DO $$
BEGIN
  -- Add workspaceId to Analyses if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='analyses' AND column_name='workspace_id') THEN
    ALTER TABLE Analyses ADD COLUMN workspace_id UUID REFERENCES Workspace(id);
  END IF;

  -- Add is_active to AnalysisTypes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='analysistypes' AND column_name='is_active') THEN
    ALTER TABLE AnalysisTypes ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Add unique constraint to AnalysisTypes name if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysistypes_name_key') THEN
    ALTER TABLE AnalysisTypes ADD CONSTRAINT analysistypes_name_key UNIQUE (name);
  END IF;
END$$;

-- Seed default analysis types if table is empty
INSERT INTO AnalysisTypes (name, description, category, methods, typical_duration, equipment_required, is_active)
VALUES 
  ('Chemical Analysis', 'Comprehensive chemical composition analysis', 'Chemistry', 
   ARRAY['GC-MS', 'HPLC', 'IC'], '2-3 days', ARRAY['Gas Chromatograph', 'HPLC System'], true),
  
  ('Physical Testing', 'Physical properties and mechanical testing', 'Physical', 
   ARRAY['Tensile Testing', 'Hardness Testing', 'Impact Testing'], '1-2 days', 
   ARRAY['Universal Testing Machine', 'Hardness Tester'], true),
  
  ('Microbiological Analysis', 'Microbial contamination and identification', 'Microbiology', 
   ARRAY['Culture-based', 'PCR', 'MALDI-TOF'], '3-5 days', 
   ARRAY['Incubator', 'Microscope', 'PCR Machine'], true),
  
  ('Spectroscopy', 'Spectroscopic characterization', 'Spectroscopy', 
   ARRAY['NMR', 'UV-Vis', 'FTIR'], '1-2 days', 
   ARRAY['NMR Spectrometer', 'UV-Vis Spectrophotometer', 'FTIR'], true),
  
  ('Elemental Analysis', 'Elemental composition determination', 'Chemistry', 
   ARRAY['ICP-MS', 'XRF', 'AAS'], '2-3 days', 
   ARRAY['ICP-MS System', 'XRF Analyzer'], true),
  
  ('Thermal Analysis', 'Thermal properties characterization', 'Physical', 
   ARRAY['DSC', 'TGA', 'DMA'], '1-2 days', 
   ARRAY['DSC', 'TGA', 'DMA'], true)
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically create notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO NotificationSettings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create notification settings
DROP TRIGGER IF EXISTS trigger_create_notification_settings ON Users;
CREATE TRIGGER trigger_create_notification_settings
  AFTER INSERT ON Users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON UserInvitations TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON PasswordResetTokens TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON FileDocuments TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON AnalysisRequests TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON NotificationSettings TO PUBLIC;

-- Add comments for documentation
COMMENT ON TABLE UserInvitations IS 'Stores user invitations to workspaces';
COMMENT ON TABLE PasswordResetTokens IS 'Stores password reset tokens with expiry';
COMMENT ON TABLE FileDocuments IS 'Stores uploaded files and documents with integrity checksums';
COMMENT ON TABLE AnalysisRequests IS 'Stores analysis requests between organizations for external lab collaboration';
COMMENT ON TABLE NotificationSettings IS 'User notification preferences';
