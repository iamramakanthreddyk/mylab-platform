import { Pool } from 'pg';
import { PLATFORM_CONFIG } from './config/platform';

export class DatabaseSetup {
  private pool: Pool;

  constructor(databaseUrl?: string) {
    this.pool = new Pool({
      connectionString: databaseUrl || process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async connect(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }

  async setupDatabase(): Promise<void> {
    console.log('🚀 Starting MyLab database setup...');

    try {
      // Enable required extensions
      await this.enableExtensions();

      // Create all tables
      await this.createTables();

      // Create indexes
      await this.createIndexes();

      // Create constraints and relationships
      await this.createConstraints();

      // Insert initial data
      await this.insertInitialData();

      // Create welcome notifications
      await this.createWelcomeNotifications();

      console.log('✅ MyLab database setup completed successfully!');
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  private async enableExtensions(): Promise<void> {
    console.log('📦 Enabling PostgreSQL extensions...');

    const extensions = [
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
    ];

    for (const sql of extensions) {
      await this.pool.query(sql);
    }

    console.log('✅ Extensions enabled');
  }

  private async createTables(): Promise<void> {
    console.log('📋 Creating database tables...');

    // Get all table names from central brain
    const allTables = PLATFORM_CONFIG.modules.flatMap(m => m.databaseTables);
    const uniqueTables = [...new Set(allTables)];

    console.log(`Found ${uniqueTables.length} tables to create:`, uniqueTables);

    // Table creation SQL - we'll define this based on our schema
    const tableSchemas = this.generateTableSchemas();

    for (const [tableName, sql] of Object.entries(tableSchemas)) {
      console.log(`Creating table: ${tableName}`);
      await this.pool.query(sql);
    }

    console.log('✅ All tables created');
  }

  private generateTableSchemas(): Record<string, string> {
    return {
      Workspace: `
        CREATE TABLE IF NOT EXISTS Workspace (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(50) NOT NULL UNIQUE,
          type ENUM ('research', 'cro', 'analyzer', 'pharma') NOT NULL,
          email_domain VARCHAR(255),
          payment_status ENUM ('trial', 'pending', 'completed', 'overdue', 'suspended') DEFAULT 'trial',
          payment_amount DECIMAL(10,2),
          payment_due_date TIMESTAMP,
          payment_last_reminder TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Organizations: `
        CREATE TABLE IF NOT EXISTS Organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          type ENUM ('client', 'cro', 'analyzer', 'vendor', 'pharma') NOT NULL,
          is_platform_workspace BOOLEAN NOT NULL DEFAULT false,
          workspace_id UUID REFERENCES Workspace(id),
          contact_info JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      Users: `
        CREATE TABLE IF NOT EXISTS Users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          role ENUM ('admin', 'manager', 'scientist', 'viewer') NOT NULL DEFAULT 'scientist',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Projects: `
        CREATE TABLE IF NOT EXISTS Projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          client_org_id UUID NOT NULL REFERENCES Organizations(id),
          executing_org_id UUID NOT NULL REFERENCES Organizations(id),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      ProjectStages: `
        CREATE TABLE IF NOT EXISTS ProjectStages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          order_index INT NOT NULL,
          owner_workspace_id UUID NOT NULL REFERENCES Workspace(id),
          status ENUM ('planned', 'active', 'completed') DEFAULT 'planned',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      Samples: `
        CREATE TABLE IF NOT EXISTS Samples (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
          stage_id UUID REFERENCES ProjectStages(id) ON DELETE SET NULL,
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          sample_id VARCHAR(100) NOT NULL,
          type VARCHAR(50),
          description TEXT,
          metadata JSONB,
          status ENUM ('created', 'shared', 'processing', 'analyzed', 'completed') DEFAULT 'created',
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      DerivedSamples: `
        CREATE TABLE IF NOT EXISTS DerivedSamples (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          root_sample_id UUID NOT NULL REFERENCES Samples(id) ON DELETE CASCADE,
          parent_id UUID REFERENCES DerivedSamples(id) ON DELETE CASCADE,
          owner_workspace_id UUID NOT NULL REFERENCES Workspace(id),
          stage_id UUID REFERENCES ProjectStages(id) ON DELETE SET NULL,
          derived_id VARCHAR(100) NOT NULL,
          process_notes TEXT,
          metadata JSONB,
          depth INT NOT NULL CHECK (depth >= 0 AND depth <= 2),
          status ENUM ('created', 'shared', 'processing', 'analyzed', 'completed') DEFAULT 'created',
          execution_mode ENUM ('platform', 'external') NOT NULL DEFAULT 'platform',
          executed_by_org_id UUID NOT NULL REFERENCES Organizations(id),
          external_reference TEXT,
          performed_at TIMESTAMP,
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Batches: `
        CREATE TABLE IF NOT EXISTS Batches (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          original_workspace_id UUID REFERENCES Workspace(id),
          batch_id VARCHAR(100) NOT NULL,
          description TEXT,
          parameters JSONB,
          status ENUM ('created', 'ready', 'sent', 'in_progress', 'completed') DEFAULT 'created',
          execution_mode ENUM ('platform', 'external') NOT NULL DEFAULT 'platform',
          executed_by_org_id UUID NOT NULL REFERENCES Organizations(id),
          external_reference TEXT,
          performed_at TIMESTAMP,
          created_by UUID NOT NULL REFERENCES Users(id),
          sent_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      BatchItems: `
        CREATE TABLE IF NOT EXISTS BatchItems (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_id UUID NOT NULL REFERENCES Batches(id) ON DELETE CASCADE,
          derived_id UUID NOT NULL REFERENCES DerivedSamples(id) ON DELETE CASCADE,
          sequence INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      AnalysisTypes: `
        CREATE TABLE IF NOT EXISTS AnalysisTypes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          category VARCHAR(50),
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      Analyses: `
        CREATE TABLE IF NOT EXISTS Analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          batch_id UUID NOT NULL REFERENCES Batches(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          analysis_type_id UUID NOT NULL REFERENCES AnalysisTypes(id),
          results JSONB,
          file_path VARCHAR(500),
          file_checksum VARCHAR(64),
          file_size_bytes BIGINT,
          status ENUM ('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
          execution_mode ENUM ('platform', 'external') NOT NULL DEFAULT 'platform',
          executed_by_org_id UUID NOT NULL REFERENCES Organizations(id),
          source_org_id UUID NOT NULL REFERENCES Organizations(id),
          external_reference TEXT,
          received_at TIMESTAMP,
          performed_at TIMESTAMP,
          uploaded_by UUID NOT NULL REFERENCES Users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          supersedes_id UUID REFERENCES Analyses(id) ON DELETE SET NULL,
          revision_reason VARCHAR(255),
          is_authoritative BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Documents: `
        CREATE TABLE IF NOT EXISTS Documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          project_id UUID REFERENCES Projects(id) ON DELETE SET NULL,
          sample_id UUID REFERENCES Samples(id) ON DELETE SET NULL,
          name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          version INT DEFAULT 1,
          mime_type VARCHAR(50),
          size_bytes BIGINT,
          uploaded_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      AccessGrants: `
        CREATE TABLE IF NOT EXISTS AccessGrants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          object_type ENUM ('Project', 'Sample', 'DerivedSample', 'Batch', 'Analysis', 'Document') NOT NULL,
          object_id UUID NOT NULL,
          granted_to_org_id UUID NOT NULL REFERENCES Organizations(id),
          granted_role ENUM ('viewer', 'processor', 'analyzer', 'client') NOT NULL,
          access_mode ENUM ('platform', 'offline') NOT NULL DEFAULT 'platform',
          can_reshare BOOLEAN NOT NULL DEFAULT false,
          expires_at TIMESTAMP,
          revoked_at TIMESTAMP,
          revocation_reason TEXT,
          revoked_by UUID REFERENCES Users(id),
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      DownloadTokens: `
        CREATE TABLE IF NOT EXISTS DownloadTokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          object_type ENUM ('Document', 'Analysis', 'Result') NOT NULL,
          object_id UUID NOT NULL,
          grant_id UUID REFERENCES AccessGrants(id),
          organization_id UUID NOT NULL REFERENCES Organizations(id),
          user_id UUID NOT NULL REFERENCES Users(id),
          expires_at TIMESTAMP NOT NULL,
          one_time_use BOOLEAN DEFAULT false,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          revoked_at TIMESTAMP
        );
      `,

      AuditLog: `
        CREATE TABLE IF NOT EXISTS AuditLog (
          id BIGSERIAL PRIMARY KEY,
          object_type VARCHAR(50) NOT NULL,
          object_id UUID NOT NULL,
          action ENUM ('create', 'read', 'update', 'delete', 'share', 'upload', 'download') NOT NULL,
          actor_id UUID NOT NULL REFERENCES Users(id),
          actor_workspace UUID NOT NULL REFERENCES Workspace(id),
          actor_org_id UUID REFERENCES Organizations(id),
          details JSONB,
          ip_address VARCHAR(45),
          user_agent VARCHAR(500),
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,

      SampleMetadataHistory: `
        CREATE TABLE IF NOT EXISTS SampleMetadataHistory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sample_id UUID NOT NULL REFERENCES Samples(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          metadata_snapshot JSONB NOT NULL,
          field_changes JSONB,
          changed_by UUID NOT NULL REFERENCES Users(id),
          change_reason VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,

      SecurityLog: `
        CREATE TABLE IF NOT EXISTS SecurityLog (
          id BIGSERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          severity ENUM ('low', 'medium', 'high', 'critical') NOT NULL,
          user_id UUID REFERENCES Users(id),
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          resource_type VARCHAR(50),
          resource_id UUID,
          reason VARCHAR(255) NOT NULL,
          details JSONB,
          ip_address VARCHAR(45),
          user_agent VARCHAR(500),
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,

      CompanyOnboardingRequests: `
        CREATE TABLE IF NOT EXISTS CompanyOnboardingRequests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_name VARCHAR(255) NOT NULL,
          company_domain VARCHAR(255) NOT NULL,
          contact_email VARCHAR(255) NOT NULL,
          contact_name VARCHAR(255) NOT NULL,
          contact_phone VARCHAR(50),
          company_size ENUM ('1-10', '11-50', '51-200', '201-1000', '1000+') NOT NULL,
          industry VARCHAR(100),
          use_case TEXT,
          status ENUM ('pending', 'approved', 'rejected', 'workspace_created') DEFAULT 'pending',
          admin_user_id UUID REFERENCES Users(id),
          workspace_id UUID REFERENCES Workspace(id),
          rejection_reason TEXT,
          reviewed_by UUID REFERENCES Users(id),
          reviewed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      CompanyInvitations: `
        CREATE TABLE IF NOT EXISTS CompanyInvitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Workspace(id),
          invited_email VARCHAR(255) NOT NULL,
          invited_name VARCHAR(255) NOT NULL,
          role ENUM ('admin', 'manager', 'analyst', 'viewer') NOT NULL DEFAULT 'analyst',
          status ENUM ('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
          invited_by UUID NOT NULL REFERENCES Users(id),
          invitation_token VARCHAR(255) UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          accepted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      CompanyPayments: `
        CREATE TABLE IF NOT EXISTS CompanyPayments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          onboarding_request_id UUID REFERENCES CompanyOnboardingRequests(id),
          company_name VARCHAR(255) NOT NULL,
          company_domain VARCHAR(255) NOT NULL,
          contact_email VARCHAR(255) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          payment_method ENUM ('bank_transfer', 'check', 'wire', 'credit_card', 'other') NOT NULL,
          status ENUM ('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
          transaction_id VARCHAR(255),
          payment_reference VARCHAR(255),
          notes TEXT,
          due_date TIMESTAMP,
          paid_at TIMESTAMP,
          verified_by UUID REFERENCES Users(id),
          verified_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      APIKeys: `
        CREATE TABLE IF NOT EXISTS APIKeys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES Organizations(id),
          name VARCHAR(100) NOT NULL,
          key_hash VARCHAR(64) NOT NULL UNIQUE,
          is_active BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMP,
          last_used_at TIMESTAMP,
          created_by UUID REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      Notifications: `
        CREATE TABLE IF NOT EXISTS Notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES Workspace(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL DEFAULT 'info',
          title VARCHAR(255) NOT NULL,
          message TEXT,
          action_url VARCHAR(2048),
          action_label VARCHAR(100),
          priority VARCHAR(20) DEFAULT 'medium',
          read_at TIMESTAMP,
          expires_at TIMESTAMP,
          metadata JSONB,
          created_by UUID REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      NotificationPreferences: `
        CREATE TABLE IF NOT EXISTS NotificationPreferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
          email_payment_reminders BOOLEAN DEFAULT true,
          email_project_updates BOOLEAN DEFAULT true,
          email_sample_notifications BOOLEAN DEFAULT true,
          email_system_announcements BOOLEAN DEFAULT true,
          in_app_notifications BOOLEAN DEFAULT true,
          quiet_hours_start TIME,
          quiet_hours_end TIME,
          quiet_hours_timezone VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    };
  }

  private async createIndexes(): Promise<void> {
    console.log('🔍 Creating database indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_projects_workspace ON Projects(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_projects_client_org ON Projects(client_org_id);',
      'CREATE INDEX IF NOT EXISTS idx_projects_executing_org ON Projects(executing_org_id);',
      'CREATE INDEX IF NOT EXISTS idx_samples_project ON Samples(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_samples_workspace ON Samples(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_derived_samples_root ON DerivedSamples(root_sample_id);',
      'CREATE INDEX IF NOT EXISTS idx_derived_samples_parent ON DerivedSamples(parent_id);',
      'CREATE INDEX IF NOT EXISTS idx_batches_workspace ON Batches(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON BatchItems(batch_id);',
      'CREATE INDEX IF NOT EXISTS idx_batch_items_derived ON BatchItems(derived_id);',
      'CREATE INDEX IF NOT EXISTS idx_analyses_batch ON Analyses(batch_id);',
      'CREATE INDEX IF NOT EXISTS idx_analyses_workspace ON Analyses(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_analyses_status ON Analyses(status);',
      'CREATE INDEX IF NOT EXISTS idx_analyses_supersedes ON Analyses(supersedes_id);',
      'CREATE INDEX IF NOT EXISTS idx_analyses_authoritative ON Analyses(batch_id, is_authoritative);',
      'CREATE INDEX IF NOT EXISTS idx_documents_workspace ON Documents(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_documents_project ON Documents(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_documents_sample ON Documents(sample_id);',
      'CREATE INDEX IF NOT EXISTS idx_access_grants_org ON AccessGrants(granted_to_org_id);',
      'CREATE INDEX IF NOT EXISTS idx_access_grants_revoked ON AccessGrants(revoked_at);',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_grant ON DownloadTokens(grant_id);',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_org ON DownloadTokens(organization_id);',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_expires ON DownloadTokens(expires_at);',
      'CREATE INDEX IF NOT EXISTS idx_download_tokens_revoked ON DownloadTokens(revoked_at);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_object ON AuditLog(object_type, object_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON AuditLog(actor_workspace);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON AuditLog(timestamp);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_slug ON Workspace(slug);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_workspace_email ON Users(workspace_id, email);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_workspace_sample_id ON Samples(project_id, sample_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_derived_workspace_derived_id ON DerivedSamples(owner_workspace_id, derived_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_workspace_batch_id ON Batches(workspace_id, batch_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_items_unique ON BatchItems(batch_id, derived_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_access_grants_unique ON AccessGrants(object_type, object_id, granted_to_org_id);',
      'CREATE INDEX IF NOT EXISTS idx_onboarding_requests_status ON CompanyOnboardingRequests(status);',
      'CREATE INDEX IF NOT EXISTS idx_onboarding_requests_domain ON CompanyOnboardingRequests(company_domain);',
      'CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON CompanyInvitations(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_invitations_email ON CompanyInvitations(invited_email);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON CompanyInvitations(invitation_token);',
      'CREATE INDEX IF NOT EXISTS idx_invitations_status ON CompanyInvitations(status);',
      'CREATE INDEX IF NOT EXISTS idx_payments_onboarding ON CompanyPayments(onboarding_request_id);',
      'CREATE INDEX IF NOT EXISTS idx_payments_status ON CompanyPayments(status);',
      'CREATE INDEX IF NOT EXISTS idx_payments_domain ON CompanyPayments(company_domain);',
      'CREATE INDEX IF NOT EXISTS idx_payments_transaction ON CompanyPayments(transaction_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON Notifications(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type ON Notifications(type);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_read ON Notifications(read_at);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_priority ON Notifications(priority);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created ON Notifications(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON Notifications(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON Notifications(created_by);',
      'CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON NotificationPreferences(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_sample_metadata_history_sample ON SampleMetadataHistory(sample_id);',
      'CREATE INDEX IF NOT EXISTS idx_sample_metadata_history_workspace ON SampleMetadataHistory(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_sample_metadata_history_created ON SampleMetadataHistory(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_security_log_workspace ON SecurityLog(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_security_log_type ON SecurityLog(event_type);',
      'CREATE INDEX IF NOT EXISTS idx_security_log_severity ON SecurityLog(severity);',
      'CREATE INDEX IF NOT EXISTS idx_security_log_timestamp ON SecurityLog(timestamp);'
    ];

    for (const sql of indexes) {
      await this.pool.query(sql);
    }

    console.log('✅ Indexes created');
  }

  private async createConstraints(): Promise<void> {
    console.log('🔗 Creating additional constraints and triggers...');

    // Create immutability functions for AuditLog
    const triggerFunctions = [
      `CREATE OR REPLACE FUNCTION fn_audit_immutable()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'AuditLog records are immutable and cannot be modified';
        END;
        $$ LANGUAGE plpgsql;
      `,
      `CREATE OR REPLACE FUNCTION fn_audit_no_delete()
        RETURNS TRIGGER AS $$
        BEGIN
          RAISE EXCEPTION 'AuditLog records cannot be deleted';
        END;
        $$ LANGUAGE plpgsql;
      `
    ];

    for (const fn of triggerFunctions) {
      try {
        await this.pool.query(fn);
      } catch (error) {
        console.log('Function may already exist, continuing...');
      }
    }

    // Create immutability triggers for AuditLog
    const triggers = [
      `DROP TRIGGER IF EXISTS audit_immutable ON AuditLog;
       CREATE TRIGGER audit_immutable BEFORE UPDATE ON AuditLog
       FOR EACH ROW EXECUTE FUNCTION fn_audit_immutable();
      `,
      `DROP TRIGGER IF EXISTS audit_no_delete ON AuditLog;
       CREATE TRIGGER audit_no_delete BEFORE DELETE ON AuditLog
       FOR EACH ROW EXECUTE FUNCTION fn_audit_no_delete();
      `,
      `DROP TRIGGER IF EXISTS security_log_immutable ON SecurityLog;
       CREATE TRIGGER security_log_immutable BEFORE UPDATE ON SecurityLog
       FOR EACH ROW EXECUTE FUNCTION fn_audit_immutable();
      `,
      `DROP TRIGGER IF EXISTS security_log_no_delete ON SecurityLog;
       CREATE TRIGGER security_log_no_delete BEFORE DELETE ON SecurityLog
       FOR EACH ROW EXECUTE FUNCTION fn_audit_no_delete();
      `
    ];

    for (const trigger of triggers) {
      try {
        await this.pool.query(trigger);
      } catch (error) {
        console.log('Trigger already exists or dependencies missing, continuing...');
      }
    }

    const constraints = [
      'ALTER TABLE ProjectStages ADD CONSTRAINT unique_project_order UNIQUE(project_id, order_index);'
    ];

    for (const sql of constraints) {
      try {
        await this.pool.query(sql);
      } catch (error) {
        // Constraint might already exist, continue
        console.log(`Note: ${sql.split(' ')[3]} constraint may already exist`);
      }
    }

    console.log('✅ Constraints created');
  }

  private async insertInitialData(): Promise<void> {
    console.log('🌱 Inserting initial data...');

    // Insert default analysis types
    const analysisTypes = [
      { name: 'NMR Spectroscopy', description: 'Nuclear Magnetic Resonance', category: 'Spectroscopy' },
      { name: 'HPLC', description: 'High Performance Liquid Chromatography', category: 'Chromatography' },
      { name: 'GC-MS', description: 'Gas Chromatography-Mass Spectrometry', category: 'Mass Spectrometry' },
      { name: 'LC-MS', description: 'Liquid Chromatography-Mass Spectrometry', category: 'Mass Spectrometry' },
      { name: 'IR Spectroscopy', description: 'Infrared Spectroscopy', category: 'Spectroscopy' },
      { name: 'UV-Vis Spectroscopy', description: 'Ultraviolet-Visible Spectroscopy', category: 'Spectroscopy' }
    ];

    for (const type of analysisTypes) {
      await this.pool.query(`
        INSERT INTO AnalysisTypes (name, description, category)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [type.name, type.description, type.category]);
    }

    console.log('✅ Initial data inserted');
  }

  private async createWelcomeNotifications(): Promise<void> {
    console.log('🔔 Creating welcome notifications...');

    try {
      // Get all admin users from workspaces
      const adminUsers = await this.pool.query(`
        SELECT u.id, u.workspace_id, w.name as workspace_name
        FROM Users u
        JOIN Workspace w ON u.workspace_id = w.id
        WHERE u.role = 'admin' AND w.deleted_at IS NULL
      `);

      for (const user of adminUsers.rows) {
        // Check if welcome notification already exists
        const existing = await this.pool.query(`
          SELECT id FROM Notifications 
          WHERE user_id = $1 AND type = 'system' AND title LIKE 'Welcome to MyLab%'
        `, [user.id]);

        if (existing.rows.length === 0) {
          await this.pool.query(`
            INSERT INTO Notifications (user_id, workspace_id, type, title, message, priority)
            VALUES ($1, $2, 'system', 'Welcome to MyLab!', 'Your workspace ${user.workspace_name} has been successfully set up. Explore the platform and start managing your laboratory samples.', 'low')
          `, [user.id, user.workspace_id]);
        }
      }

      console.log('✅ Welcome notifications created');
    } catch (error) {
      console.warn('⚠️  Could not create welcome notifications:', error);
    }
  }

  async resetDatabase(): Promise<void> {
    console.log('⚠️  Resetting database...');

    const tables = [
      'AuditLog', 'AccessGrants', 'Documents', 'Analyses', 'AnalysisTypes',
      'BatchItems', 'Batches', 'DerivedSamples', 'SampleMetadataHistory', 'Samples', 'ProjectStages',
      'Projects', 'Users', 'Organizations', 'SecurityLog', 'Workspace', 'CompanyInvitations', 
      'CompanyOnboardingRequests', 'CompanyPayments', 'Notifications'
    ];

    for (const table of tables) {
      await this.pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    console.log('✅ Database reset complete');
  }
}