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
          expires_at TIMESTAMP,
          created_by UUID NOT NULL REFERENCES Users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
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
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `
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
      'CREATE INDEX IF NOT EXISTS idx_documents_workspace ON Documents(workspace_id);',
      'CREATE INDEX IF NOT EXISTS idx_documents_project ON Documents(project_id);',
      'CREATE INDEX IF NOT EXISTS idx_documents_sample ON Documents(sample_id);',
      'CREATE INDEX IF NOT EXISTS idx_access_grants_org ON AccessGrants(granted_to_org_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_object ON AuditLog(object_type, object_id);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON AuditLog(actor_workspace);',
      'CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON AuditLog(timestamp);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_slug ON Workspace(slug);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_workspace_email ON Users(workspace_id, email);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_workspace_sample_id ON Samples(project_id, sample_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_derived_workspace_derived_id ON DerivedSamples(owner_workspace_id, derived_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_workspace_batch_id ON Batches(workspace_id, batch_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_items_unique ON BatchItems(batch_id, derived_id);',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_access_grants_unique ON AccessGrants(object_type, object_id, granted_to_org_id);'
    ];

    for (const sql of indexes) {
      await this.pool.query(sql);
    }

    console.log('✅ Indexes created');
  }

  private async createConstraints(): Promise<void> {
    console.log('🔗 Creating additional constraints...');

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

  async resetDatabase(): Promise<void> {
    console.log('⚠️  Resetting database...');

    const tables = [
      'AuditLog', 'AccessGrants', 'Documents', 'Analyses', 'AnalysisTypes',
      'BatchItems', 'Batches', 'DerivedSamples', 'Samples', 'ProjectStages',
      'Projects', 'Users', 'Organizations', 'Workspace'
    ];

    for (const table of tables) {
      await this.pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    console.log('✅ Database reset complete');
  }
}