/**
 * Database Migration System
 * 
 * Runs automatically on server startup.
 * Idempotent - safe to run multiple times.
 * Tracks migration history in `schema_migrations` table.
 */

import { Pool, QueryResult } from 'pg';
import logger from '../utils/logger';

// Migration version - increment when adding new migrations
const MIGRATIONS_VERSION = '014';

/**
 * Migration definition
 */
interface Migration {
  id: string;
  name: string;
  description: string;
  up: (pool: Pool) => Promise<void>;
}

/**
 * List of all migrations (executed in order)
 */
const migrations: Migration[] = [
  {
    id: '001',
    name: 'create_schema_migrations_table',
    description: 'Create table to track migration history',
    up: async (pool: Pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_id VARCHAR(50) UNIQUE NOT NULL,
          migration_name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.info('✅ Created schema_migrations table');
    }
  },

  {
    id: '009',
    name: 'add_projects_workflow_mode',
    description: 'Add workflow_mode column to Projects table to support trial-first or analysis-first journeys',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          ALTER TABLE IF EXISTS projects
          ADD COLUMN IF NOT EXISTS workflow_mode VARCHAR(50) DEFAULT 'trial_first';
        `);
        logger.info('✅ Added workflow_mode to Projects table');
      } catch (err) {
        logger.error('Error adding workflow_mode to Projects', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '010',
    name: 'add_trials_and_sample_trial_id',
    description: 'Create Trials table and add trial_id to Samples for experiment-driven workflows',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS trials (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            workspace_id UUID NOT NULL REFERENCES workspace(id),
            name VARCHAR(255) NOT NULL,
            objective TEXT,
            parameters TEXT,
            equipment TEXT,
            notes TEXT,
            status VARCHAR(50) DEFAULT 'planned',
            performed_at DATE,
            created_by UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
          );
        `);

        await pool.query(`
          ALTER TABLE IF EXISTS samples
          ADD COLUMN IF NOT EXISTS trial_id UUID REFERENCES trials(id) ON DELETE SET NULL;
        `);

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_trials_project ON trials(project_id);
        `);

        logger.info('✅ Added Trials table and trial_id column');
      } catch (err) {
        logger.error('Error adding Trials table', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '011',
    name: 'add_trial_parameters_json',
    description: 'Add parameters_json column to Trials for structured trial readings',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          ALTER TABLE IF EXISTS trials
          ADD COLUMN IF NOT EXISTS parameters_json JSONB;
        `);
        logger.info('✅ Added parameters_json to Trials table');
      } catch (err) {
        logger.error('Error adding parameters_json to Trials', { error: (err as Error).message });
        throw err;
      }
    }
  },


  {
    id: '012',
    name: 'add_trial_parameter_templates',
    description: 'Add TrialParameterTemplates table for per-project trial column definitions',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS trial_parameter_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            workspace_id UUID NOT NULL REFERENCES workspace(id),
            columns JSONB NOT NULL,
            created_by UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, workspace_id)
          );
        `);
        logger.info('✅ Added trial_parameter_templates table');
      } catch (err) {
        logger.error('Error adding trial_parameter_templates', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '002',
    name: 'create_performance_indexes',
    description: 'Create indexes for frequently queried columns',
    up: async (pool: Pool) => {
      logger.info('Creating performance indexes...');
      
      // Check which tables exist before creating indexes
      const tableCheckQuery = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      try {
        const tableResult = await pool.query(tableCheckQuery);
        const existingTables = new Set(tableResult.rows.map((r: any) => r.table_name));
        
        const indexes = [
          {
            name: 'idx_workspace_id_analyses',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_workspace_id_analyses ON "Analyses"("workspace_id");`
          },
          {
            name: 'idx_user_id_users',
            table: 'Users',
            query: `CREATE INDEX IF NOT EXISTS idx_user_id_users ON "Users"("user_id");`
          },
          {
            name: 'idx_created_at_analyses',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_created_at_analyses ON "Analyses"("created_at");`
          },
          {
            name: 'idx_analysis_type',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_analysis_type ON "Analyses"("analysis_type");`
          },
          {
            name: 'idx_supersedes_id_fk',
            table: 'Analyses',
            query: `CREATE INDEX IF NOT EXISTS idx_supersedes_id_fk ON "Analyses"("supersedes_id");`
          },
        ];

        let created = 0;
        for (const index of indexes) {
          if (existingTables.has(index.table)) {
            try {
              await pool.query(index.query);
              logger.info(`  ✓ ${index.name}`);
              created++;
            } catch (err) {
              logger.warn(`  ⚠ ${index.name} - skipped`, { error: (err as Error).message });
            }
          } else {
            logger.warn(`  ⚠ ${index.name} - table "${index.table}" not found, skipping`);
          }
        }
        logger.info(`✅ Created ${created}/${indexes.length} performance indexes`);
      } catch (err) {
        logger.warn('Could not check table existence, skipping index creation', { error: (err as Error).message });
      }
    }
  },

  {
    id: '003',
    name: 'add_projects_status_column',
    description: 'Add status column to Projects table',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          ALTER TABLE "Projects" 
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        `);
        logger.info('✅ Added status column to Projects table');
      } catch (err) {
        logger.warn('Could not add status column to Projects', { error: (err as Error).message });
      }
    }
  },

  {
    id: '004',
    name: 'make_auditlog_object_id_nullable',
    description: 'Make object_id column nullable in AuditLog table for operations without object IDs',
    up: async (pool: Pool) => {
      try {
        // Drop the constraint if it exists - handle both quoted and unquoted table names
        await pool.query(`
          ALTER TABLE auditlog 
          ALTER COLUMN object_id DROP NOT NULL;
        `);
        logger.info('✅ Made object_id nullable in AuditLog table');
      } catch (err) {
        logger.warn('Could not alter AuditLog object_id constraint', { error: (err as Error).message });
      }
    }
  },

  {
    id: '005',
    name: 'create_multi_lab_workflow_tables',
    description: 'Create AnalysisReports, SampleTransfers, and ReportSharing tables for multi-lab workflows',
    up: async (pool: Pool) => {
      try {
        // Create AnalysisReports table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS AnalysisReports (
            report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES Samples(id),
            lab_id UUID NOT NULL,
            lab_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            analysis_type VARCHAR(100),
            results JSONB,
            notes TEXT,
            received_at TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('✅ Created AnalysisReports table');

        // Create SampleTransfers table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SampleTransfers (
            transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES Samples(id),
            from_lab_id UUID NOT NULL,
            to_lab_id UUID NOT NULL,
            project_id UUID NOT NULL,
            shared_metadata JSONB,
            metadata_visibility VARCHAR(50) DEFAULT 'basic',
            status VARCHAR(50) DEFAULT 'pending',
            sent_date TIMESTAMP,
            received_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('✅ Created SampleTransfers table');

        // Create ReportSharing table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ReportSharing (
            sharing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL REFERENCES AnalysisReports(report_id),
            shared_with_company_id UUID NOT NULL,
            access_level VARCHAR(50) DEFAULT 'view',
            shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        logger.info('✅ Created ReportSharing table');

        // Create indexes for performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_analysis_reports_sample_id ON AnalysisReports(sample_id);
          CREATE INDEX IF NOT EXISTS idx_analysis_reports_lab_id ON AnalysisReports(lab_id);
          CREATE INDEX IF NOT EXISTS idx_analysis_reports_status ON AnalysisReports(status);
        `);
        logger.info('✅ Created indexes on AnalysisReports table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_sample_transfers_sample_id ON SampleTransfers(sample_id);
          CREATE INDEX IF NOT EXISTS idx_sample_transfers_from_to ON SampleTransfers(from_lab_id, to_lab_id);
          CREATE INDEX IF NOT EXISTS idx_sample_transfers_status ON SampleTransfers(status);
        `);
        logger.info('✅ Created indexes on SampleTransfers table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_report_sharing_report_id ON ReportSharing(report_id);
          CREATE INDEX IF NOT EXISTS idx_report_sharing_company_id ON ReportSharing(shared_with_company_id);
        `);
        logger.info('✅ Created indexes on ReportSharing table');

      } catch (err) {
        logger.error('Error creating multi-lab workflow tables', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '006',
    name: 'create_role_based_access_control_tables',
    description: 'Create ProjectTeam, UserRolePermissions, ReportAccess, and SampleAccess tables for RBAC',
    up: async (pool: Pool) => {
      try {
        // Create ProjectTeam table - assigns employees to projects
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ProjectTeam (
            assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES Projects(id),
            user_id UUID NOT NULL REFERENCES Users(id),
            workspace_id UUID NOT NULL REFERENCES Workspace(id),
            company_id UUID NOT NULL,
            assigned_role VARCHAR(50) NOT NULL,
            assigned_by UUID NOT NULL REFERENCES Users(id),
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, user_id)
          );
        `);
        logger.info('✅ Created ProjectTeam table');

        // Create UserRolePermissions table - defines what roles can do
        await pool.query(`
          CREATE TABLE IF NOT EXISTS UserRolePermissions (
            permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50) NOT NULL,
            action VARCHAR(50) NOT NULL,
            allowed BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role, resource_type, action)
          );
        `);
        logger.info('✅ Created UserRolePermissions table');

        // Create ReportAccess table - user-level report access
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ReportAccess (
            access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID NOT NULL REFERENCES AnalysisReports(report_id),
            user_id UUID NOT NULL REFERENCES Users(id),
            workspace_id UUID NOT NULL REFERENCES Workspace(id),
            access_level VARCHAR(50) DEFAULT 'view',
            can_share BOOLEAN DEFAULT false,
            shared_by_user_id UUID REFERENCES Users(id),
            shared_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(report_id, user_id)
          );
        `);
        logger.info('✅ Created ReportAccess table');

        // Create SampleAccess table - user-level sample access
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SampleAccess (
            access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sample_id UUID NOT NULL REFERENCES Samples(id),
            user_id UUID NOT NULL REFERENCES Users(id),
            workspace_id UUID NOT NULL REFERENCES Workspace(id),
            access_level VARCHAR(50) DEFAULT 'view',
            can_share BOOLEAN DEFAULT false,
            shared_by_user_id UUID REFERENCES Users(id),
            shared_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(sample_id, user_id)
          );
        `);
        logger.info('✅ Created SampleAccess table');

        // Create indexes for performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_project_team_project ON ProjectTeam(project_id);
          CREATE INDEX IF NOT EXISTS idx_project_team_user ON ProjectTeam(user_id);
          CREATE INDEX IF NOT EXISTS idx_project_team_workspace ON ProjectTeam(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_project_team_role ON ProjectTeam(assigned_role);
        `);
        logger.info('✅ Created indexes on ProjectTeam table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON UserRolePermissions(role);
          CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON UserRolePermissions(resource_type);
          CREATE INDEX IF NOT EXISTS idx_role_permissions_action ON UserRolePermissions(action);
        `);
        logger.info('✅ Created indexes on UserRolePermissions table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_report_access_report ON ReportAccess(report_id);
          CREATE INDEX IF NOT EXISTS idx_report_access_user ON ReportAccess(user_id);
          CREATE INDEX IF NOT EXISTS idx_report_access_workspace ON ReportAccess(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_report_access_level ON ReportAccess(access_level);
        `);
        logger.info('✅ Created indexes on ReportAccess table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_sample_access_sample ON SampleAccess(sample_id);
          CREATE INDEX IF NOT EXISTS idx_sample_access_user ON SampleAccess(user_id);
          CREATE INDEX IF NOT EXISTS idx_sample_access_workspace ON SampleAccess(workspace_id);
          CREATE INDEX IF NOT EXISTS idx_sample_access_level ON SampleAccess(access_level);
        `);
        logger.info('✅ Created indexes on SampleAccess table');

        // Pre-populate UserRolePermissions with default rules
        await pool.query(`
          INSERT INTO UserRolePermissions (role, resource_type, action, allowed) VALUES
          -- Admin can do everything
          ('admin', 'sample', 'view', true),
          ('admin', 'sample', 'create', true),
          ('admin', 'sample', 'edit', true),
          ('admin', 'sample', 'delete', true),
          ('admin', 'sample', 'share', true),
          ('admin', 'report', 'view', true),
          ('admin', 'report', 'create', true),
          ('admin', 'report', 'edit', true),
          ('admin', 'report', 'delete', true),
          ('admin', 'report', 'share', true),
          ('admin', 'project', 'view', true),
          ('admin', 'project', 'edit', true),
          ('admin', 'project', 'share', true),
          
          -- Manager can view, create, edit, share (not delete)
          ('manager', 'sample', 'view', true),
          ('manager', 'sample', 'create', true),
          ('manager', 'sample', 'edit', true),
          ('manager', 'sample', 'share', true),
          ('manager', 'report', 'view', true),
          ('manager', 'report', 'create', true),
          ('manager', 'report', 'edit', true),
          ('manager', 'report', 'share', true),
          ('manager', 'project', 'view', true),
          
          -- Scientist can view, create, edit (not delete or share)
          ('scientist', 'sample', 'view', true),
          ('scientist', 'sample', 'create', true),
          ('scientist', 'sample', 'edit', true),
          ('scientist', 'report', 'view', true),
          ('scientist', 'report', 'create', true),
          ('scientist', 'report', 'edit', true),
          ('scientist', 'project', 'view', true),
          
          -- Viewer can only view
          ('viewer', 'sample', 'view', true),
          ('viewer', 'report', 'view', true),
          ('viewer', 'project', 'view', true)
          ON CONFLICT (role, resource_type, action) DO NOTHING;
        `);
        logger.info('✅ Pre-populated UserRolePermissions with default rules');

      } catch (err) {
        logger.error('Error creating role-based access control tables', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '007',
    name: 'create_supply_chain_collaboration_tables',
    description: 'Create SupplyChainOrganizations, SupplyChainRequests, MaterialHandoffs, and AnalysisTypes tables for supply chain collaboration',
    up: async (pool: Pool) => {
      try {
        // Create SupplyChainOrganizations table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SupplyChainOrganizations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL CHECK (type IN ('manufacturer', 'laboratory', 'research_institute', 'testing_facility')),
            capabilities TEXT[],
            certifications TEXT[],
            location VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            contact_address TEXT,
            partnership_status VARCHAR(20) DEFAULT 'active' CHECK (partnership_status IN ('active', 'pending', 'inactive')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
          );
        `);
        logger.info('✅ Created SupplyChainOrganizations table');

        // Alter AnalysisTypes table to add supply chain collaboration columns
        await pool.query(`
          ALTER TABLE AnalysisTypes
          ADD COLUMN IF NOT EXISTS methods TEXT[],
          ADD COLUMN IF NOT EXISTS typical_duration VARCHAR(50),
          ADD COLUMN IF NOT EXISTS equipment_required TEXT[];
        `);
        logger.info('✅ Altered AnalysisTypes table for supply chain collaboration');

        // Create SupplyChainRequests table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS SupplyChainRequests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_organization_id UUID NOT NULL REFERENCES SupplyChainOrganizations(id),
            to_organization_id UUID NOT NULL REFERENCES SupplyChainOrganizations(id),
            from_project_id UUID NOT NULL REFERENCES Projects(id),
            workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('analysis_only', 'material_transfer', 'product_continuation', 'supply_chain')),
            material_data JSONB NOT NULL,
            requirements JSONB,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected')),
            priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
            due_date TIMESTAMP,
            assigned_to UUID REFERENCES Users(id),
            notes TEXT,
            created_by UUID NOT NULL REFERENCES Users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
          );
        `);
        logger.info('✅ Created SupplyChainRequests table');

        // Create MaterialHandoffs table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS MaterialHandoffs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            supply_chain_request_id UUID NOT NULL REFERENCES SupplyChainRequests(id),
            from_organization_id UUID NOT NULL REFERENCES SupplyChainOrganizations(id),
            to_organization_id UUID NOT NULL REFERENCES SupplyChainOrganizations(id),
            material_id UUID,
            quantity DECIMAL(10,3),
            unit VARCHAR(50),
            shipping_info JSONB,
            chain_of_custody JSONB NOT NULL,
            status VARCHAR(20) DEFAULT 'preparing' CHECK (status IN ('preparing', 'shipped', 'delivered', 'received', 'processed')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP
          );
        `);
        logger.info('✅ Created MaterialHandoffs table');

        // Create indexes for performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_supply_chain_organizations_type ON SupplyChainOrganizations(type);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_organizations_status ON SupplyChainOrganizations(partnership_status);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_organizations_capabilities ON SupplyChainOrganizations USING GIN(capabilities);
        `);
        logger.info('✅ Created indexes on SupplyChainOrganizations table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_analysis_types_category ON AnalysisTypes(category);
          CREATE INDEX IF NOT EXISTS idx_analysis_types_active ON AnalysisTypes(is_active);
          CREATE INDEX IF NOT EXISTS idx_analysis_types_name ON AnalysisTypes(name);
        `);
        logger.info('✅ Created indexes on AnalysisTypes table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_from_org ON SupplyChainRequests(from_organization_id);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_to_org ON SupplyChainRequests(to_organization_id);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_project ON SupplyChainRequests(from_project_id);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_status ON SupplyChainRequests(status);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_workflow ON SupplyChainRequests(workflow_type);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_priority ON SupplyChainRequests(priority);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_assigned ON SupplyChainRequests(assigned_to);
          CREATE INDEX IF NOT EXISTS idx_supply_chain_requests_created ON SupplyChainRequests(created_at);
        `);
        logger.info('✅ Created indexes on SupplyChainRequests table');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_material_handoffs_request ON MaterialHandoffs(supply_chain_request_id);
          CREATE INDEX IF NOT EXISTS idx_material_handoffs_from_org ON MaterialHandoffs(from_organization_id);
          CREATE INDEX IF NOT EXISTS idx_material_handoffs_to_org ON MaterialHandoffs(to_organization_id);
          CREATE INDEX IF NOT EXISTS idx_material_handoffs_status ON MaterialHandoffs(status);
        `);
        logger.info('✅ Created indexes on MaterialHandoffs table');

        // Insert some default analysis types
        await pool.query(`
          INSERT INTO AnalysisTypes (name, description, category, methods, typical_duration, equipment_required) VALUES
          ('HPLC Analysis', 'High Performance Liquid Chromatography for separation and quantification', 'Chromatography', ARRAY['HPLC', 'UV-Vis Detection'], '2-4 hours', ARRAY['HPLC System', 'UV-Vis Detector']),
          ('GC-MS Analysis', 'Gas Chromatography-Mass Spectrometry for compound identification', 'Mass Spectrometry', ARRAY['GC-MS'], '1-3 hours', ARRAY['GC-MS System']),
          ('FTIR Spectroscopy', 'Fourier Transform Infrared spectroscopy for functional group identification', 'Spectroscopy', ARRAY['FTIR'], '30-60 minutes', ARRAY['FTIR Spectrometer']),
          ('XRD Analysis', 'X-Ray Diffraction for crystalline structure analysis', 'Diffraction', ARRAY['Powder XRD', 'Single Crystal XRD'], '2-6 hours', ARRAY['X-Ray Diffractometer']),
          ('ICP-MS Analysis', 'Inductively Coupled Plasma Mass Spectrometry for elemental analysis', 'Mass Spectrometry', ARRAY['ICP-MS'], '1-2 hours', ARRAY['ICP-MS System']),
          ('UV-Vis Spectroscopy', 'Ultraviolet-Visible spectroscopy for concentration determination', 'Spectroscopy', ARRAY['UV-Vis'], '15-30 minutes', ARRAY['UV-Vis Spectrometer']),
          ('NMR Analysis', 'Nuclear Magnetic Resonance for molecular structure determination', 'NMR', ARRAY['1H-NMR', '13C-NMR'], '30-120 minutes', ARRAY['NMR Spectrometer']),
          ('Thermal Analysis', 'TGA/DSC for thermal properties characterization', 'Thermal', ARRAY['TGA', 'DSC'], '1-2 hours', ARRAY['TGA Instrument', 'DSC Instrument']),
          ('Particle Size Analysis', 'Particle size distribution measurement', 'Physical Properties', ARRAY['Laser Diffraction', 'Dynamic Light Scattering'], '30 minutes', ARRAY['Particle Size Analyzer']),
          ('Moisture Content', 'Water content determination', 'Physical Properties', ARRAY['Karl Fischer', 'Loss on Drying'], '30-60 minutes', ARRAY['Karl Fischer Titrator', 'Moisture Analyzer'])
          ON CONFLICT DO NOTHING;
        `);
        logger.info('✅ Pre-populated AnalysisTypes with default analysis types');

        // Insert some default partner organizations (for demo purposes)
        await pool.query(`
          INSERT INTO SupplyChainOrganizations (name, type, capabilities, certifications, location, contact_email, partnership_status) VALUES
          ('ChemTech Solutions', 'laboratory', ARRAY['HPLC Analysis', 'GC-MS Analysis', 'FTIR Spectroscopy'], ARRAY['ISO 17025', 'GLP'], 'Boston, MA', 'contact@chemtechsolutions.com', 'active'),
          ('Materials Research Institute', 'research_institute', ARRAY['XRD Analysis', 'Thermal Analysis', 'ICP-MS Analysis'], ARRAY['ISO 9001', 'NIST Certified'], 'San Francisco, CA', 'info@mri.org', 'active'),
          ('Precision Analytics Lab', 'testing_facility', ARRAY['UV-Vis Spectroscopy', 'NMR Analysis', 'Particle Size Analysis'], ARRAY['ISO 17025', 'FDA Registered'], 'New York, NY', 'lab@precisionanalytics.com', 'active'),
          ('BioPharm Manufacturing', 'manufacturer', ARRAY['Process Development', 'Quality Control', 'Method Validation'], ARRAY['GMP', 'ISO 13485'], 'Princeton, NJ', 'contact@biopharm.com', 'active'),
          ('Advanced Testing Corp', 'laboratory', ARRAY['Moisture Content', 'Thermal Analysis', 'Physical Properties'], ARRAY['A2LA Accredited'], 'Austin, TX', 'support@advancedtesting.com', 'active')
          ON CONFLICT DO NOTHING;
        `);
        logger.info('✅ Pre-populated SupplyChainOrganizations with demo partner organizations');

      } catch (err) {
        logger.error('Error creating supply chain collaboration tables', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '008',
    name: 'create_gap_fix_tables',
    description: 'Create UserInvitations, PasswordResetTokens, FileDocuments, AnalysisRequests, and NotificationSettings tables for complete functionality',
    up: async (pool: Pool) => {
      try {
        // Create UserInvitations table
        await pool.query(`
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
        `);
        logger.info('✅ Created UserInvitations table with indexes');

        // Create PasswordResetTokens table
        await pool.query(`
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
        `);
        logger.info('✅ Created PasswordResetTokens table with indexes');

        // Create FileDocuments table
        await pool.query(`
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
        `);
        logger.info('✅ Created FileDocuments table with indexes');

        // Create AnalysisRequests table
        await pool.query(`
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
        `);
        logger.info('✅ Created AnalysisRequests table with indexes');

        // Create NotificationSettings table
        await pool.query(`
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
        `);
        logger.info('✅ Created NotificationSettings table with indexes');

        // Add workspace_id to Analyses if missing
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name='analyses' AND column_name='workspace_id') THEN
              ALTER TABLE Analyses ADD COLUMN workspace_id UUID REFERENCES Workspace(id);
            END IF;
          END$$;
        `);
        logger.info('✅ Added workspace_id to Analyses table if needed');

        // Add is_active to AnalysisTypes if missing
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name='analysistypes' AND column_name='is_active') THEN
              ALTER TABLE AnalysisTypes ADD COLUMN is_active BOOLEAN DEFAULT true;
            END IF;
          END$$;
        `);
        logger.info('✅ Added is_active to AnalysisTypes table if needed');

        // Add unique constraint to AnalysisTypes name if not exists
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysistypes_name_key') THEN
              ALTER TABLE AnalysisTypes ADD CONSTRAINT analysistypes_name_key UNIQUE (name);
            END IF;
          END$$;
        `);
        logger.info('✅ Added unique constraint to AnalysisTypes.name if needed');

        // Create function to auto-create notification settings for new users
        await pool.query(`
          CREATE OR REPLACE FUNCTION create_default_notification_settings()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO NotificationSettings (user_id)
            VALUES (NEW.id)
            ON CONFLICT (user_id) DO NOTHING;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql;
        `);
        logger.info('✅ Created create_default_notification_settings function');

        // Create trigger to auto-create notification settings
        await pool.query(`
          DROP TRIGGER IF EXISTS trigger_create_notification_settings ON Users;
          CREATE TRIGGER trigger_create_notification_settings
            AFTER INSERT ON Users
            FOR EACH ROW
            EXECUTE FUNCTION create_default_notification_settings();
        `);
        logger.info('✅ Created trigger_create_notification_settings trigger');

        // Seed enhanced analysis types if AnalysisTypes table is relatively empty
        const countResult = await pool.query('SELECT COUNT(*) as count FROM AnalysisTypes');
        const currentCount = parseInt(countResult.rows[0].count);
        
        if (currentCount < 15) {
          await pool.query(`
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
          `);
          logger.info('✅ Seeded additional standard analysis types');
        }

      } catch (err) {
        logger.error('Error creating gap fix tables', { error: (err as Error).message });
        throw err;
      }
    }
  },

  {
    id: '013',
    name: 'add_analysis_audit_fields',
    description: 'Add audit fields for tracking analysis edits: edited_by, edited_at, revision_number',
    up: async (pool: Pool) => {
      await pool.query(`
        ALTER TABLE Analyses
        ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES Users(id),
        ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS revision_number INT DEFAULT 1;
      `);
      logger.info('✅ Added audit fields to Analyses table');
    }
  },

  {
    id: '014',
    name: 'add_project_team_external_flags',
    description: 'Add external tagging columns for ProjectTeam assignments',
    up: async (pool: Pool) => {
      try {
        await pool.query(`
          ALTER TABLE IF EXISTS ProjectTeam
          ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS external_workspace_id UUID;
        `);

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_project_team_external ON ProjectTeam(is_external);
        `);

        logger.info('✅ Added external tagging columns to ProjectTeam');
      } catch (err) {
        logger.error('Error adding external tagging columns to ProjectTeam', { error: (err as Error).message });
        throw err;
      }
    }
  }

  // Add more migrations here as your database evolves
];

/**
 * Run pending migrations
 * 
 * @param pool - PostgreSQL connection pool
 * @returns true if migrations ran, false if already executed
 */
export async function runMigrations(pool: Pool): Promise<boolean> {
  try {
    logger.info('🔍 Checking for pending database migrations...');

    // 1. Ensure migrations table exists
    const migrationTableResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      );
    `);
    const migrationsTableExists = migrationTableResult.rows[0].exists;

    if (!migrationsTableExists) {
      logger.info('📝 Initializing migration system...');
    }

    // 2. Get list of already-executed migrations
    let executedMigrations: string[] = [];
    try {
      const result = await pool.query(`
        SELECT migration_id FROM schema_migrations;
      `);
      executedMigrations = result.rows.map((row) => row.migration_id);
    } catch (err) {
      // Table doesn't exist yet, will be created in first migration
      logger.debug('Migration table not ready yet, will be created');
    }

    // 3. Find pending migrations
    const pendingMigrations = migrations.filter(
      (m) => !executedMigrations.includes(m.id)
    );

    if (pendingMigrations.length === 0) {
      logger.info('✅ Database is up to date. No pending migrations.');
      return false;
    }

    // 4. Execute pending migrations in order
    logger.info(`🚀 Running ${pendingMigrations.length} pending migration(s)...`);

    for (const migration of pendingMigrations) {
      logger.info(`\n  ⏳ Running: ${migration.name}`);
      logger.info(`     ${migration.description}`);

      try {
        // Run migration
        await migration.up(pool);

        // Record migration in history
        await pool.query(
          `
          INSERT INTO schema_migrations (migration_id, migration_name)
          VALUES ($1, $2)
          ON CONFLICT (migration_id) DO NOTHING;
          `,
          [migration.id, migration.name]
        );

        logger.info(`  ✅ ${migration.name} completed`);
      } catch (error) {
        logger.error(`  ❌ ${migration.name} FAILED`, {
          error: error instanceof Error ? error.message : String(error),
          migration: migration.id
        });
        throw error; // Don't continue if migration fails
      }
    }

    logger.info(`\n✅ All migrations completed successfully!\n`);
    return true;
  } catch (error) {
    logger.error('❌ Migration failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Don't crash the server, but log prominently
    console.error('\n⚠️  DATABASE MIGRATION FAILED ⚠️');
    console.error('Check logs and resolve before deploying to production');
    console.error('Error:', error, '\n');
    throw error;
  }
}

/**
 * Get migration status
 * 
 * @param pool - PostgreSQL connection pool
 * @returns Description of all migrations and their status
 */
export async function getMigrationStatus(pool: Pool): Promise<string> {
  try {
    const result = await pool.query(`
      SELECT migration_id, migration_name, executed_at 
      FROM schema_migrations 
      ORDER BY executed_at ASC;
    `);

    const allMigrations = migrations.map((m) => m.id).sort();
    const executedMigrations = result.rows.map((row) => row.migration_id);

    let status = 'Database Migrations Status:\n';
    status += '='.repeat(50) + '\n';

    for (const migration of migrations) {
      const executed = executedMigrations.includes(migration.id);
      const status_icon = executed ? '✅' : '⏳';
      const timestamp = result.rows.find((r) => r.migration_id === migration.id)
        ?.executed_at;
      const time_str = timestamp ? new Date(timestamp).toISOString() : 'pending';

      status += `${status_icon} [${migration.id}] ${migration.name}\n`;
      status += `   ${migration.description}\n`;
      status += `   Executed: ${time_str}\n\n`;
    }

    status += '='.repeat(50) + '\n';
    status += `Total: ${executedMigrations.length}/${migrations.length} migrations executed`;

    return status;
  } catch (error) {
    return `Error getting migration status: ${error instanceof Error ? error.message : String(error)}`;
  }
}
