import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PLATFORM_CONFIG } from '../config/platform';

export class DatabaseSetup {
  private pool: Pool;
  private ownsPool: boolean;

  constructor(databaseUrl?: string, existingPool?: Pool) {
    if (existingPool) {
      this.pool = existingPool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString: databaseUrl || process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      this.ownsPool = true;
    }
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
    if (this.ownsPool) {
      await this.pool.end();
      console.log('🔌 Database connection closed');
    }
  }

  async setupDatabase(): Promise<void> {
    console.log('🚀 Starting MyLab database setup...');

    try {
      // Enable required extensions
      await this.enableExtensions();

      // Create all required enum types before tables
      await this.createEnumTypes();

      // Create all tables
      await this.createTables();

      // Run migrations to update existing tables
      await this.runMigrations();

      if (process.env.RUN_MIGRATIONS === 'true') {
        await this.runSchemaMigrations();
      } else {
        console.log('ℹ️  RUN_MIGRATIONS not set, skipping file-based migrations');
      }

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

  private async createEnumTypes(): Promise<void> {
    console.log('🗂️ Creating enum types...');
    
    // Define enum types with their values
    const enumDefinitions: Record<string, string[]> = {
      payment_status: ['trial', 'pending', 'completed', 'overdue', 'suspended'],
      org_type: ['client', 'cro', 'analyzer', 'vendor', 'pharma', 'laboratory'],
      user_role: ['platform_admin', 'admin', 'manager', 'scientist', 'viewer'],
      stage_status: ['planned', 'active', 'completed'],
      sample_status: ['created', 'shared', 'processing', 'analyzed', 'completed'],
      execution_mode: ['platform', 'external'],
      batch_status: ['created', 'ready', 'sent', 'in_progress', 'completed'],
      analysis_status: ['pending', 'in_progress', 'completed', 'failed'],
      object_type: ['Project', 'Sample', 'DerivedSample', 'Batch', 'Analysis', 'Document'],
      granted_role: ['viewer', 'processor', 'analyzer', 'client'],
      access_mode: ['platform', 'offline'],
      download_object_type: ['Document', 'Analysis', 'Result'],
      audit_action: ['create', 'read', 'update', 'delete', 'share', 'upload', 'download'],
      severity_type: ['low', 'medium', 'high', 'critical'],
      company_size_type: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
      onboarding_status: ['pending', 'approved', 'rejected', 'workspace_created'],
      invitation_role: ['admin', 'manager', 'analyst', 'viewer'],
      invitation_status: ['pending', 'accepted', 'expired', 'cancelled'],
      payment_method_type: ['bank_transfer', 'check', 'wire', 'credit_card', 'other'],
      payment_status_type: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      subscription_status: ['trial', 'active', 'suspended', 'cancelled', 'expired'],
      plan_tier: ['basic', 'pro', 'enterprise', 'custom'],
      feature_status: ['available', 'limited', 'disabled', 'beta']
    };

    for (const [typeName, values] of Object.entries(enumDefinitions)) {
      try {
        // Check if type exists
        const typeExists = await this.pool.query(
          `SELECT 1 FROM pg_type WHERE typname = $1`,
          [typeName]
        );

        if (typeExists.rows.length > 0) {
          // Type exists, ensure all values are present
          for (const value of values) {
            try {
              // Check if value already exists in enum
              const valueExists = await this.pool.query(`
                SELECT 1 FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
                AND enumlabel = $2
              `, [typeName, value]);

              if (valueExists.rows.length === 0) {
                // Value doesn't exist, add it (must use identifier, not parameter)
                // Note: ALTER TYPE ADD VALUE cannot use parameters for the value itself
                await this.pool.query(`ALTER TYPE ${typeName} ADD VALUE '${value.replace(/'/g, "''")}'`);
                console.log(`  ✓ Added '${value}' to ${typeName}`);
              }
            } catch (addError: any) {
              // Ignore if already exists or in use
              if (addError.code !== '23505') {
                console.warn(`Could not add value '${value}' to ${typeName}:`, addError.message);
              }
            }
          }
        } else {
          // Type doesn't exist, create it
          const valuesList = values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
          await this.pool.query(`CREATE TYPE ${typeName} AS ENUM (${valuesList});`);
          console.log(`  ✓ Created ${typeName}`);
        }
      } catch (error: any) {
        console.warn(`Error handling enum type ${typeName}:`, error.message);
      }
    }
    
    console.log('✅ Enum types created');
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
      Organizations: `
        CREATE TABLE IF NOT EXISTS Organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug VARCHAR(50) NOT NULL UNIQUE,
          type org_type NOT NULL,
          is_platform_workspace BOOLEAN NOT NULL DEFAULT false,
          email_domain VARCHAR(255),
          payment_status payment_status DEFAULT 'trial',
          payment_amount DECIMAL(10,2),
          payment_due_date TIMESTAMP,
          payment_last_reminder TIMESTAMP,
          website VARCHAR(255),
          industry VARCHAR(100),
          company_size company_size_type,
          annual_revenue VARCHAR(50),
          company_registration_number VARCHAR(255),
          gst_number VARCHAR(255),
          gst_percentage DECIMAL(5,2) DEFAULT 18.00,
          tax_id VARCHAR(255),
          country VARCHAR(100),
          state VARCHAR(100),
          city VARCHAR(100),
          postal_code VARCHAR(20),
          address TEXT,
          contact_info JSONB,
          logo_url VARCHAR(255),
          primary_contact_name VARCHAR(255),
          primary_contact_email VARCHAR(255),
          primary_contact_phone VARCHAR(20),
          billing_contact_name VARCHAR(255),
          billing_contact_email VARCHAR(255),
          billing_contact_phone VARCHAR(20),
          is_active BOOLEAN NOT NULL DEFAULT true,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Users: `
        CREATE TABLE IF NOT EXISTS Users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID REFERENCES Organizations(id),
          email VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          role user_role NOT NULL DEFAULT 'scientist',
          require_password_change BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Projects: `
        CREATE TABLE IF NOT EXISTS Projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          client_org_id UUID REFERENCES Organizations(id),
          external_client_name VARCHAR(255),
          executing_org_id UUID NOT NULL REFERENCES Organizations(id),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
          workflow_mode VARCHAR(50) DEFAULT 'trial_first',
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP,
          CHECK (client_org_id IS NOT NULL OR external_client_name IS NOT NULL)
        );
      `,

      Trials: `
        CREATE TABLE IF NOT EXISTS Trials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          name VARCHAR(255) NOT NULL,
          objective TEXT,
          parameters TEXT,
          parameters_json JSONB,
          equipment TEXT,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'planned',
          performed_at DATE,
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      TrialParameterTemplates: `
        CREATE TABLE IF NOT EXISTS TrialParameterTemplates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          columns JSONB NOT NULL,
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, workspace_id)
        );
      `,

      ProjectStages: `
        CREATE TABLE IF NOT EXISTS ProjectStages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          order_index INT NOT NULL,
          owner_workspace_id UUID NOT NULL REFERENCES Organizations(id),
          status stage_status DEFAULT 'planned',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      Samples: `
        CREATE TABLE IF NOT EXISTS Samples (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES Projects(id) ON DELETE CASCADE,
          trial_id UUID REFERENCES Trials(id) ON DELETE SET NULL,
          stage_id UUID REFERENCES ProjectStages(id) ON DELETE SET NULL,
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          sample_id VARCHAR(100) NOT NULL,
          type VARCHAR(50),
          description TEXT,
          metadata JSONB,
          status sample_status DEFAULT 'created',
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
          owner_workspace_id UUID NOT NULL REFERENCES Organizations(id),
          stage_id UUID REFERENCES ProjectStages(id) ON DELETE SET NULL,
          derived_id VARCHAR(100) NOT NULL,
          process_notes TEXT,
          metadata JSONB,
          depth INT NOT NULL CHECK (depth >= 0 AND depth <= 2),
          status sample_status DEFAULT 'created',
          execution_mode execution_mode NOT NULL DEFAULT 'platform',
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
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          original_workspace_id UUID REFERENCES Organizations(id),
          batch_id VARCHAR(100) NOT NULL,
          description TEXT,
          parameters JSONB,
          status batch_status DEFAULT 'created',
          execution_mode execution_mode NOT NULL DEFAULT 'platform',
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
          workspace_id UUID REFERENCES Organizations(id) ON DELETE CASCADE,
          original_workspace_id UUID REFERENCES Organizations(id) ON DELETE SET NULL,
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
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          analysis_type_id UUID NOT NULL REFERENCES AnalysisTypes(id),
          results JSONB,
          file_path VARCHAR(500),
          file_checksum VARCHAR(64),
          file_size_bytes BIGINT,
          status analysis_status DEFAULT 'pending',
          execution_mode execution_mode NOT NULL DEFAULT 'platform',
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
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
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
          object_type object_type NOT NULL,
          object_id UUID NOT NULL,
          granted_to_org_id UUID NOT NULL REFERENCES Organizations(id),
          granted_role granted_role NOT NULL,
          access_mode access_mode NOT NULL DEFAULT 'platform',
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
          object_type download_object_type NOT NULL,
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
          object_id UUID,
          action audit_action NOT NULL,
          actor_id UUID NOT NULL REFERENCES Users(id),
          actor_workspace UUID NOT NULL REFERENCES Organizations(id),
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
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
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
          severity severity_type NOT NULL,
          user_id UUID REFERENCES Users(id),
          organization_id UUID REFERENCES Organizations(id) ON DELETE SET NULL,
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
          company_size company_size_type NOT NULL,
          industry VARCHAR(100),
          use_case TEXT,
          status onboarding_status DEFAULT 'pending',
          admin_user_id UUID REFERENCES Users(id),
          workspace_id UUID REFERENCES Organizations(id),
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
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          invited_email VARCHAR(255) NOT NULL,
          invited_name VARCHAR(255) NOT NULL,
          role invitation_role NOT NULL DEFAULT 'analyst',
          status invitation_status DEFAULT 'pending',
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
          currency VARCHAR(3) NOT NULL DEFAULT 'INR',
          payment_method payment_method_type NOT NULL,
          status payment_status_type DEFAULT 'pending',
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
          workspace_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
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

      Plans: `
        CREATE TABLE IF NOT EXISTS Plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(50) NOT NULL UNIQUE,
          tier plan_tier NOT NULL,
          description TEXT,
          max_users INT,
          max_projects INT,
          max_storage_gb INT,
          price_monthly DECIMAL(10,2),
          features JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      Subscriptions: `
        CREATE TABLE IF NOT EXISTS Subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL UNIQUE REFERENCES Organizations(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES Organizations(id),
          plan_id UUID NOT NULL REFERENCES Plans(id),
          status subscription_status DEFAULT 'trial',
          current_billing_cycle_start TIMESTAMP,
          current_billing_cycle_end TIMESTAMP,
          next_billing_date TIMESTAMP,
          user_count INT DEFAULT 1,
          auto_renew BOOLEAN DEFAULT true,
          last_payment_date TIMESTAMP,
          trial_ends_at TIMESTAMP,
          cancelled_at TIMESTAMP,
          cancellation_reason TEXT,
          coupon_code VARCHAR(50),
          discount_percentage DECIMAL(5,2),
          custom_price DECIMAL(12,2),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
      `,

      Features: `
        CREATE TABLE IF NOT EXISTS Features (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          api_endpoint VARCHAR(500),
          status feature_status DEFAULT 'available',
          is_beta BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      PlanFeatures: `
        CREATE TABLE IF NOT EXISTS PlanFeatures (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          plan_id UUID NOT NULL REFERENCES Plans(id) ON DELETE CASCADE,
          feature_id UUID NOT NULL REFERENCES Features(id) ON DELETE CASCADE,
          is_enabled BOOLEAN DEFAULT true,
          rate_limit_per_hour INT,
          rate_limit_per_day INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(plan_id, feature_id)
        );
      `,

      LastLogin: `
        CREATE TABLE IF NOT EXISTS LastLogin (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE REFERENCES Users(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES Organizations(id),
          last_login_at TIMESTAMP NOT NULL,
          ip_address VARCHAR(45),
          user_agent VARCHAR(500),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,

      UsageMetrics: `
        CREATE TABLE IF NOT EXISTS UsageMetrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          active_users INT DEFAULT 0,
          total_projects INT DEFAULT 0,
          total_samples INT DEFAULT 0,
          total_analyses INT DEFAULT 0,
          api_calls INT DEFAULT 0,
          storage_used_mb BIGINT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workspace_id, date)
        );
      `,

      FeatureUsage: `
        CREATE TABLE IF NOT EXISTS FeatureUsage (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES Organizations(id) ON DELETE CASCADE,
          feature_id UUID NOT NULL REFERENCES Features(id),
          usage_count INT DEFAULT 1,
          date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(workspace_id, feature_id, date)
        );
      `,
    };
  }

  private async runMigrations(): Promise<void> {
    console.log('🔄 Running database migrations...');
    
    try {
      // Add slug column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Organizations
        ADD COLUMN IF NOT EXISTS slug VARCHAR(50);
      `);

      // Generate slugs for existing organizations without one
      await this.pool.query(`
        UPDATE Organizations
        SET slug = COALESCE(slug, LOWER(REGEXP_REPLACE(name, '[^a-z0-9]+', '-', 'g')))
        WHERE slug IS NULL OR slug = '';
      `);

      // Make slug NOT NULL and UNIQUE after data migration
      await this.pool.query(`
        ALTER TABLE Organizations
        ALTER COLUMN slug SET NOT NULL;
      `);

      await this.pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique ON Organizations(slug);
      `);

      // Add email_domain column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Organizations
        ADD COLUMN IF NOT EXISTS email_domain VARCHAR(255);
      `);

      // Add is_active column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Organizations
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
      `);

      // Add gst_number column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Organizations
        ADD COLUMN IF NOT EXISTS gst_number VARCHAR(255);
      `);
      
      // Add gst_percentage column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Organizations
        ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 18.00;
      `);
      
      // Add deleted_at column if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Organizations
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      `);

      // Add deleted_at column to Plans if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Plans
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      `);

      // Add deleted_at column to Subscriptions if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Subscriptions
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      `);

      // Add password_hash column to Users if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Users
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      `);

      // Add require_password_change column to Users if it doesn't exist
      await this.pool.query(`
        ALTER TABLE Users
        ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT false;
      `);

      // CRITICAL: Make workspace_id nullable to support platform admins without workspace
      await this.pool.query(`
        ALTER TABLE Users
        ALTER COLUMN workspace_id DROP NOT NULL;
      `);

      // Remove global email uniqueness to allow per-tenant email reuse
      await this.pool.query(`
        ALTER TABLE Users
        DROP CONSTRAINT IF EXISTS users_email_key;
      `);

      // Fix foreign key constraints that may reference old "workspace" table
      // Drop old constraints if they exist and recreate them pointing to Organizations
      const tablesToFix = [
        'Users',
        'Projects',
        'TrialParameterTemplates', 
        'Samples',
        'Batches',
        'Analyses',
        'Documents',
        'SampleMetadataHistory',
        'SecurityLog',
        'CompanyOnboardingRequests',
        'CompanyInvitations',
        'Notifications',
        'Subscriptions',
        'LastLogin',
        'UsageMetrics',
        'FeatureUsage'
      ];

      // First pass: Clean up orphaned data before fixing constraints
      for (const tableName of tablesToFix) {
        try {
          if (tableName === 'Users') {
            // Delete users with invalid workspace_id references
            await this.pool.query(`
              DELETE FROM ${tableName}
              WHERE workspace_id IS NOT NULL
                AND workspace_id NOT IN (SELECT id FROM Organizations);
            `);
          } else if (tableName === 'LastLogin') {
            // Delete lastlogin records with invalid references
            await this.pool.query(`
              DELETE FROM ${tableName}
              WHERE user_id NOT IN (SELECT id FROM Users);
            `);
            await this.pool.query(`
              DELETE FROM ${tableName}
              WHERE workspace_id NOT IN (SELECT id FROM Organizations);
            `);
          } else {
            // For other tables, clean up workspace_id references
            await this.pool.query(`
              DELETE FROM ${tableName}
              WHERE workspace_id IS NOT NULL
                AND workspace_id NOT IN (SELECT id FROM Organizations);
            `);
          }
        } catch (err) {
          // Some tables might not have workspace_id column, that's ok
        }
      }

      // Second pass: Recreate constraints
      for (const tableName of tablesToFix) {
        const constraintName = `${tableName.toLowerCase()}_workspace_id_fkey`;
        try {
          // Drop old constraint
          await this.pool.query(`
            ALTER TABLE ${tableName}
            DROP CONSTRAINT IF EXISTS ${constraintName};
          `);
          
          // Recreate constraint pointing to Organizations
          // Users table: ON DELETE SET NULL (to preserve platform admins)
          // LastLogin: ON DELETE CASCADE (if org deleted, delete its login records)
          // Other tables: ON DELETE CASCADE
          let deleteAction = 'CASCADE';
          if (tableName === 'Users') {
            deleteAction = 'SET NULL';
          }
          
          await this.pool.query(`
            ALTER TABLE ${tableName}
            ADD CONSTRAINT ${constraintName} 
            FOREIGN KEY (workspace_id) REFERENCES Organizations(id) ON DELETE ${deleteAction};
          `);
        } catch (err) {
          console.warn(`Note: Could not fix constraint for ${tableName}:`, (err as Error).message);
        }
      }

      // Fix owner_workspace_id constraints for DerivedSamples and ProjectStages
      try {
        await this.pool.query(`
          ALTER TABLE DerivedSamples
          DROP CONSTRAINT IF EXISTS derivedsamples_owner_workspace_id_fkey;
        `);
        await this.pool.query(`
          ALTER TABLE DerivedSamples
          ADD CONSTRAINT derivedsamples_owner_workspace_id_fkey 
          FOREIGN KEY (owner_workspace_id) REFERENCES Organizations(id) ON DELETE CASCADE;
        `);
      } catch (err) {
        console.warn('Note: Could not fix DerivedSamples constraint:', (err as Error).message);
      }

      try {
        await this.pool.query(`
          ALTER TABLE ProjectStages
          DROP CONSTRAINT IF EXISTS projectstages_owner_workspace_id_fkey;
        `);
        await this.pool.query(`
          ALTER TABLE ProjectStages
          ADD CONSTRAINT projectstages_owner_workspace_id_fkey 
          FOREIGN KEY (owner_workspace_id) REFERENCES Organizations(id) ON DELETE CASCADE;
        `);
      } catch (err) {
        console.warn('Note: Could not fix ProjectStages constraint:', (err as Error).message);
      }

      // Fix original_workspace_id constraint for BatchItems
      try {
        await this.pool.query(`
          ALTER TABLE BatchItems
          DROP CONSTRAINT IF EXISTS batchitems_original_workspace_id_fkey;
        `);
        // Only add constraint if column exists
        await this.pool.query(`
          ALTER TABLE BatchItems
          ADD COLUMN IF NOT EXISTS original_workspace_id UUID;
        `);
        await this.pool.query(`
          ALTER TABLE BatchItems
          ADD CONSTRAINT batchitems_original_workspace_id_fkey 
          FOREIGN KEY (original_workspace_id) REFERENCES Organizations(id) ON DELETE SET NULL;
        `);
      } catch (err) {
        console.warn('Note: Could not fix BatchItems constraint:', (err as Error).message);
      }

      // Fix workspace_id constraint for BatchItems
      try {
        await this.pool.query(`
          ALTER TABLE BatchItems
          DROP CONSTRAINT IF EXISTS batchitems_workspace_id_fkey;
        `);
        // Add workspace_id column if it doesn't exist
        await this.pool.query(`
          ALTER TABLE BatchItems
          ADD COLUMN IF NOT EXISTS workspace_id UUID;
        `);
        // Populate workspace_id from related batch if empty
        await this.pool.query(`
          UPDATE BatchItems b
          SET workspace_id = ba.workspace_id
          FROM Batches ba
          WHERE b.batch_id = ba.id AND b.workspace_id IS NULL;
        `);
        // Add the foreign key constraint
        await this.pool.query(`
          ALTER TABLE BatchItems
          ADD CONSTRAINT batchitems_workspace_id_fkey 
          FOREIGN KEY (workspace_id) REFERENCES Organizations(id) ON DELETE CASCADE;
        `);
      } catch (err) {
        console.warn('Note: Could not fix BatchItems constraint:', (err as Error).message);
      }

      // Fix actor_workspace constraint for AuditLog
      try {
        await this.pool.query(`
          ALTER TABLE AuditLog
          DROP CONSTRAINT IF EXISTS auditlog_actor_workspace_fkey;
        `);
        await this.pool.query(`
          ALTER TABLE AuditLog
          ADD CONSTRAINT auditlog_actor_workspace_fkey 
          FOREIGN KEY (actor_workspace) REFERENCES Organizations(id);
        `);
      } catch (err) {
        console.warn('Note: Could not fix AuditLog constraint:', (err as Error).message);
      }

      // Fix organization_id constraint for SecurityLog (make nullable, ON DELETE SET NULL)
      try {
        await this.pool.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'securitylog' AND column_name = 'workspace_id'
            ) AND NOT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'securitylog' AND column_name = 'organization_id'
            ) THEN
              ALTER TABLE "SecurityLog" RENAME COLUMN workspace_id TO organization_id;
            END IF;
          END $$;
        `);
        await this.pool.query(`
          ALTER TABLE SecurityLog
          DROP CONSTRAINT IF EXISTS securitylog_organization_id_fkey;
        `);
        await this.pool.query(`
          ALTER TABLE SecurityLog
          ALTER COLUMN organization_id DROP NOT NULL;
        `);
        await this.pool.query(`
          ALTER TABLE SecurityLog
          ADD CONSTRAINT securitylog_organization_id_fkey 
          FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE SET NULL;
        `);
      } catch (err) {
        console.warn('Note: Could not fix SecurityLog constraint:', (err as Error).message);
      }
      
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('Migration error:', error);
      // Don't throw - let it continue even if migrations fail
    }
  }

  private async runSchemaMigrations(): Promise<void> {
    console.log('📦 Running file-based schema migrations...');

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️  No migrations directory found, skipping');
      return;
    }

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT NOT NULL
      );
    `);

    await this.pool.query('SELECT pg_advisory_lock(4242)');

    try {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        const checksum = crypto.createHash('sha256').update(sql).digest('hex');

        const applied = await this.pool.query(
          'SELECT checksum FROM schema_migrations WHERE version = $1',
          [file]
        );

        if (applied.rows.length > 0) {
          if (applied.rows[0].checksum !== checksum) {
            throw new Error(`Migration checksum mismatch for ${file}`);
          }
          continue;
        }

        await this.pool.query('BEGIN');
        try {
          await this.pool.query(sql);
          await this.pool.query(
            'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
            [file, checksum]
          );
          await this.pool.query('COMMIT');
        } catch (error) {
          await this.pool.query('ROLLBACK');
          throw error;
        }
      }

      console.log('✅ File-based migrations completed');
    } finally {
      await this.pool.query('SELECT pg_advisory_unlock(4242)');
    }
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
      // Note: idx_organization_slug is now created in runMigrations() to ensure slug column exists first
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_workspace_email ON Users(workspace_id, email);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_platform_email ON Users(email) WHERE workspace_id IS NULL;',
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
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON Notifications(created_by);',
      'CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON NotificationPreferences(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_sample_metadata_history_sample ON SampleMetadataHistory(sample_id);',
      'CREATE INDEX IF NOT EXISTS idx_sample_metadata_history_workspace ON SampleMetadataHistory(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_sample_metadata_history_created ON SampleMetadataHistory(created_at);',
      // SecurityLog indexes created conditionally below to support legacy columns
    ];

    for (const sql of indexes) {
      await this.pool.query(sql);
    }

    await this.pool.query(`
      DO $$
      BEGIN
        IF to_regclass('"SecurityLog"') IS NOT NULL THEN
          CREATE INDEX IF NOT EXISTS idx_security_log_type ON "SecurityLog"(event_type);
          CREATE INDEX IF NOT EXISTS idx_security_log_severity ON "SecurityLog"(severity);
          CREATE INDEX IF NOT EXISTS idx_security_log_timestamp ON "SecurityLog"(timestamp);

          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'securitylog' AND column_name = 'organization_id'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_security_log_organization ON "SecurityLog"(organization_id);
          ELSIF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'securitylog' AND column_name = 'workspace_id'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_security_log_workspace ON "SecurityLog"(workspace_id);
          END IF;
        END IF;
      END $$;
    `);

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

    const privilegeRevokes = [
      'REVOKE UPDATE, DELETE ON AuditLog FROM PUBLIC;',
      'REVOKE UPDATE, DELETE ON SecurityLog FROM PUBLIC;'
    ];

    for (const sql of privilegeRevokes) {
      try {
        await this.pool.query(sql);
      } catch (error) {
        console.log('Privilege revoke skipped, continuing...');
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
    if (process.env.SKIP_DB_SEED === 'true') {
      console.log('⚡ Skipping seed/cleanup per SKIP_DB_SEED');
      return;
    }

    console.log('🌱 Inserting initial data...');

    try {
      // Simple cleanup: just delete all data, keeping tenant catalog
      console.log('🧹 Cleaning up old test data...');

      const allowDestructive =
        process.env.ALLOW_DB_RESET === 'true' ||
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test';

      const allowSeed =
        process.env.ALLOW_DB_SEED === 'true' ||
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test';
      
      if (allowDestructive) {
        // Use TRUNCATE with CASCADE for fastest cleanup (requires no active transactions)
        try {
          await this.pool.query(`
            TRUNCATE TABLE BatchItems, Batches, Analyses, DerivedSamples, Samples, 
                          ProjectStages, Projects, Subscriptions, Organizations, 
                          Notifications, NotificationPreferences
            CASCADE;
          `);
          console.log('✅ Old test data cleaned');
        } catch (truncateError) {
          console.log('ℹ️  TRUNCATE skipped, using DELETE instead');
        }
      } else {
        console.log('⚠️  Skipping destructive cleanup outside dev/test');
      }

      // Create or update superadmin user
      const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@mylab.io';
      const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
      console.log('👤 Setting up superadmin user:', superadminEmail);
      
      const passwordHash = await bcrypt.hash(superadminPassword, 10);
      
      const existingAdmin = await this.pool.query(
        `SELECT id FROM Users WHERE email = $1 AND workspace_id IS NULL`,
        [superadminEmail]
      );

      let adminId: string;
      if (existingAdmin.rows.length > 0) {
        const updateResult = await this.pool.query(
          `
            UPDATE Users
            SET password_hash = $2, role = $3::user_role, name = $4, workspace_id = NULL
            WHERE id = $1
            RETURNING id
          `,
          [existingAdmin.rows[0].id, passwordHash, 'platform_admin', 'Super Admin']
        );
        adminId = updateResult.rows[0].id;
      } else {
        const insertResult = await this.pool.query(
          `
            INSERT INTO Users (workspace_id, email, name, role, password_hash)
            VALUES (NULL, $1, $2, $3::user_role, $4)
            RETURNING id
          `,
          [superadminEmail, 'Super Admin', 'platform_admin', passwordHash]
        );
        adminId = insertResult.rows[0].id;
      }
      
      console.log('✅ Superadmin user ready:', adminId);

      if (allowSeed) {
        // Create test organization with complete data
        console.log('🏢 Creating TechLab Solutions organization...');
        const orgResult = await this.pool.query(`
          INSERT INTO Organizations (
            name, slug, type, is_platform_workspace,
            email_domain, website, industry, company_size,
            address, city, state, country, postal_code,
            gst_number, gst_percentage, tax_id,
            primary_contact_name, primary_contact_email, primary_contact_phone,
            billing_contact_name, billing_contact_email, billing_contact_phone,
            contact_info, is_active
          )
          VALUES (
            $1, $2, $3::org_type, $4,
            $5, $6, $7, $8::company_size_type,
            $9, $10, $11, $12, $13,
            $14, $15, $16,
            $17, $18, $19,
            $20, $21, $22,
            $23, $24
          )
          ON CONFLICT (slug) DO UPDATE SET 
            name = EXCLUDED.name,
            email_domain = EXCLUDED.email_domain,
            website = EXCLUDED.website,
            industry = EXCLUDED.industry,
            company_size = EXCLUDED.company_size,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            country = EXCLUDED.country,
            postal_code = EXCLUDED.postal_code,
            primary_contact_name = EXCLUDED.primary_contact_name,
            primary_contact_email = EXCLUDED.primary_contact_email,
            primary_contact_phone = EXCLUDED.primary_contact_phone,
            billing_contact_name = EXCLUDED.billing_contact_name,
            billing_contact_email = EXCLUDED.billing_contact_email,
            billing_contact_phone = EXCLUDED.billing_contact_phone,
            is_active = EXCLUDED.is_active
          RETURNING id
        `, [
          'TechLab Solutions',
          'techlab-solutions',
          'analyzer',
          true,
          'techlab.io',
          'https://www.techlab.io',
          'Life Sciences',
          '51-200',
          'Plot No. 123, Technology Park, Innovation Boulevard',
          'Bangalore',
          'Karnataka',
          'India',
          '560001',
          '29AABCT1234H1Q2',
          18.0,
          'TL-2024-0001',
          'Dr. Rajesh Kumar',
          'rajesh.kumar@techlab.io',
          '+91-80-4141-2000',
          'Billing Department',
          'billing@techlab.io',
          '+91-80-4141-2001',
          JSON.stringify({
            registrationNumber: 'TL-IND-2024-001',
            licenseNumber: 'LABS-2024-00123',
            certifications: ['ISO 9001:2015', 'ISO/IEC 17025'],
            laboratoriesCount: 5,
            equipmentCount: 200,
            annualRevenue: '50-100 Cr'
          }),
          true
        ]);

        const organizationId = orgResult.rows[0]?.id;

        if (!organizationId) {
          throw new Error('Failed to create test organization');
        }

        console.log('✅ TechLab Solutions organization created:', organizationId);

        // Create admin users for TechLab Solutions
        console.log('👥 Creating admin users for TechLab Solutions...');
        const adminUsers = [
          {
            email: 'admin@techlab.io',
            name: 'Admin User',
            password: 'AdminTechLab123!'
          },
          {
            email: 'manager@techlab.io',
            name: 'Lab Manager',
            password: 'ManagerTechLab123!'
          },
          {
            email: 'scientist@techlab.io',
            name: 'Senior Scientist',
            password: 'ScientistTechLab123!'
          }
        ];

        for (const adminUser of adminUsers) {
          const adminHash = await bcrypt.hash(adminUser.password, 10);
          const existingUser = await this.pool.query(
            `SELECT id FROM Users WHERE email = $1 AND workspace_id = $2`,
            [adminUser.email, organizationId]
          );

          if (existingUser.rows.length === 0) {
            const userResult = await this.pool.query(
              `
                INSERT INTO Users (workspace_id, email, name, role, password_hash)
                VALUES ($1, $2, $3, $4::user_role, $5)
                RETURNING id
              `,
              [organizationId, adminUser.email, adminUser.name, 'admin', adminHash]
            );
            console.log(`  ✓ Created: ${adminUser.email} (password: ${adminUser.password})`);
          } else {
            await this.pool.query(
              `UPDATE Users SET password_hash = $1, name = $2, role = $3::user_role WHERE id = $4`,
              [adminHash, adminUser.name, 'admin', existingUser.rows[0].id]
            );
            console.log(`  ✓ Updated: ${adminUser.email}`);
          }
        }

        console.log('✅ Admin users created for TechLab Solutions');

        // Ensure Professional plan exists
        console.log('💳 Setting up Professional plan...');
        await this.pool.query(`
          INSERT INTO Plans (name, tier, max_users, max_projects, max_storage_gb, price_monthly)
          VALUES ('Professional', 'pro', 25, 50, 500, 39999.00)
          ON CONFLICT (name) DO NOTHING
        `);

        const planResult = await this.pool.query(`
          SELECT id FROM Plans WHERE name = 'Professional'
        `);
        
        if (planResult.rows.length === 0) {
          throw new Error('Failed to create Professional plan');
        }

        const planId = planResult.rows[0].id;

        // Create subscription
        console.log('📋 Activating subscription for TechLab Solutions...');
        await this.pool.query(`
          INSERT INTO Subscriptions (workspace_id, plan_id, status, user_count)
          VALUES ($1, $2, 'active'::subscription_status, $3)
          ON CONFLICT (workspace_id) DO UPDATE 
          SET plan_id = $2, status = 'active'::subscription_status, user_count = $3
        `, [organizationId, planId, 3]);

        console.log('✅ Subscription activated for TechLab Solutions');
      } else {
        console.log('⚠️  Skipping seeding outside dev/test');
      }
      console.log('✅ Initial setup complete');

    } catch (error) {
      console.error('⚠️  Error in initial data setup:', error);
      throw error;
    }
  }

  private async createWelcomeNotifications(): Promise<void> {
    if (process.env.SKIP_DB_SEED === 'true') {
      return;
    }

    console.log('🔔 Creating welcome notifications...');

    try {
      // Get all admin users from organizations
      const adminUsers = await this.pool.query(`
        SELECT u.id, u.workspace_id, o.name as workspace_name
        FROM Users u
        JOIN Organizations o ON u.workspace_id = o.id
        WHERE u.role = 'admin' AND o.deleted_at IS NULL
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
            VALUES ($1, $2, 'system', 'Welcome to MyLab!', 'Your organization ${user.workspace_name} has been successfully set up. Explore the platform and start managing your laboratory samples.', 'low')
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
      'Projects', 'Users', 'Organizations', 'SecurityLog', 'CompanyInvitations', 
      'CompanyOnboardingRequests', 'CompanyPayments', 'Notifications'
    ];

    for (const table of tables) {
      await this.pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    console.log('✅ Database reset complete');
  }
}
