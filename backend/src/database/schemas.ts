/**
 * Database Schema Definitions
 * 
 * This is the SINGLE SOURCE OF TRUTH for all database table schemas.
 * All APIs, validators, and type definitions MUST reference this file.
 * 
 * ⚠️ IMPORTANT: Keep this file in sync with setup.ts database creation!
 * After making changes here, update setup.ts and add a migration.
 */

import Joi from 'joi';

// ============================================================================
// SAMPLES TABLE SCHEMA (Source of Truth)
// ============================================================================
/**
 * Samples table - Stores laboratory samples for projects
 * 
 * Database Definition:
 * CREATE TABLE Samples (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id UUID NOT NULL REFERENCES Projects(id),
 *   stage_id UUID REFERENCES ProjectStages(id),
 *   workspace_id UUID NOT NULL REFERENCES Workspace(id),
 *   sample_id VARCHAR(100) NOT NULL,           <-- User-facing identifier
 *   type VARCHAR(50),
 *   description TEXT,
 *   metadata JSONB,
 *   status sample_status DEFAULT 'created',
 *   created_by UUID NOT NULL REFERENCES Users(id),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   deleted_at TIMESTAMP
 * );
 */
export const SAMPLE_SCHEMA = {
  // Database column definitions
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    project_id: { type: 'UUID', required: true, foreignKey: 'Projects' },
    stage_id: { type: 'UUID', required: false, foreignKey: 'ProjectStages' },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Workspace' },
    sample_id: { type: 'VARCHAR(100)', required: true, description: 'User-facing sample identifier' },
    type: { type: 'VARCHAR(50)', required: false },
    description: { type: 'TEXT', required: false },
    metadata: { type: 'JSONB', required: false },
    status: { type: 'sample_status', required: false, default: 'created' },
    created_by: { type: 'UUID', required: true, foreignKey: 'Users' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    deleted_at: { type: 'TIMESTAMP', required: false, description: 'Soft delete timestamp' },
  },

  // TypeScript type definition
  types: {
    // When selecting from database
    Row: {
      id: 'string (UUID)',
      project_id: 'string (UUID)',
      stage_id: 'string | null (UUID)',
      workspace_id: 'string (UUID)',
      sample_id: 'string',
      type: 'string | null',
      description: 'string | null',
      metadata: 'Record<string, any> | null',
      status: 'string',
      created_by: 'string (UUID)',
      created_at: 'Date',
      updated_at: 'Date',
      deleted_at: 'Date | null',
    },
  },

  // Request validation schemas (what APIs accept)
  CreateRequest: Joi.object({
    projectId: Joi.string().uuid().required(),
    sampleId: Joi.string().max(100).required(),
    description: Joi.string().required().max(2000),
    type: Joi.string().optional().max(50),
    stageId: Joi.string().uuid().optional(),
    metadata: Joi.object().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    sampleId: Joi.string().optional().max(100),
    description: Joi.string().optional().max(2000),
    type: Joi.string().optional().max(50),
    status: Joi.string().optional().max(50),
    stageId: Joi.string().uuid().optional(),
    metadata: Joi.object().optional(),
  }).unknown(false).min(1),

  // Database query schemas
  insertColumns: ['workspace_id', 'project_id', 'stage_id', 'sample_id', 'type', 'description', 'metadata', 'created_by'],
  selectColumns: ['id', 'project_id', 'stage_id', 'workspace_id', 'sample_id', 'type', 'description', 'metadata', 'status', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
  updateColumns: ['sample_id', 'type', 'description', 'metadata', 'status', 'stage_id'],
} as const;

// ============================================================================
// DOCUMENTATION
// ============================================================================
/**
 * HOW TO USE THIS FILE:
 * 
 * 1. CREATING SAMPLES:
 *    - Controller receives request with fields from SAMPLE_SCHEMA.CreateRequest
 *    - Service validates against SAMPLE_SCHEMA.CreateRequest Joi schema
 *    - Service inserts using SAMPLE_SCHEMA.insertColumns
 *    - INSERT INTO Samples (workspace_id, project_id, stage_id, sample_id, type, description, metadata, created_by)
 *      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
 *
 * 2. UPDATING SAMPLES:
 *    - Controller receives request with fields from SAMPLE_SCHEMA.UpdateRequest
 *    - Service validates against SAMPLE_SCHEMA.UpdateRequest Joi schema
 *    - Service updates using SAMPLE_SCHEMA.updateColumns
 *    - Only include columns that are being updated
 *
 * 3. SELECTING SAMPLES:
 *    - Always use SAMPLE_SCHEMA.selectColumns for SELECT queries
 *    - SELECT id, project_id, stage_id, workspace_id, sample_id, type, description, metadata, status, created_by, created_at, updated_at, deleted_at
 *      FROM Samples WHERE ...
 *
 * 4. SOFT DELETES:
 *    - Never physical DELETE - always use soft delete
 *    - Include deleted_at IS NULL in WHERE clause
 *    - UPDATE Samples SET deleted_at = NOW() WHERE id = $1
 *
 * 5. ADDING NEW COLUMNS:
 *    Step 1: Update this file (SAMPLE_SCHEMA.columns)
 *    Step 2: Update setup.ts table definition
 *    Step 3: Create migration in migrations.ts
 *    Step 4: Update all API handlers
 */

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that a create request matches the schema
 */
export function validateCreateSampleRequest(data: any) {
  const { error, value } = SAMPLE_SCHEMA.CreateRequest.validate(data);
  return { error, value, isValid: !error };
}

/**
 * Validate that an update request matches the schema
 */
export function validateUpdateSampleRequest(data: any) {
  const { error, value } = SAMPLE_SCHEMA.UpdateRequest.validate(data);
  return { error, value, isValid: !error };
}

// ============================================================================
// ANALYSIS REPORTS TABLE SCHEMA
// ============================================================================
/**
 * AnalysisReports table - Stores analysis results from external labs
 * Tracks which lab performed analysis on a sample and their findings
 * 
 * Database Definition:
 * CREATE TABLE AnalysisReports (
 *   report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   sample_id UUID NOT NULL REFERENCES Samples(id),
 *   lab_id UUID NOT NULL REFERENCES Companies(id),
 *   lab_name VARCHAR(255) NOT NULL,
 *   status VARCHAR(50) DEFAULT 'pending',
 *   analysis_type VARCHAR(100),
 *   results JSONB,
 *   notes TEXT,
 *   received_at TIMESTAMP,
 *   started_at TIMESTAMP,
 *   completed_at TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
export const ANALYSIS_REPORT_SCHEMA = {
  columns: {
    report_id: { type: 'UUID', required: true, primaryKey: true },
    sample_id: { type: 'UUID', required: true, foreignKey: 'Samples' },
    lab_id: { type: 'UUID', required: true, foreignKey: 'Companies' },
    lab_name: { type: 'VARCHAR(255)', required: true },
    status: { type: 'VARCHAR(50)', required: false, default: 'pending', values: ['pending', 'in-progress', 'completed', 'failed'] },
    analysis_type: { type: 'VARCHAR(100)', required: false },
    results: { type: 'JSONB', required: false, description: 'Analysis findings as JSON' },
    notes: { type: 'TEXT', required: false },
    received_at: { type: 'TIMESTAMP', required: false },
    started_at: { type: 'TIMESTAMP', required: false },
    completed_at: { type: 'TIMESTAMP', required: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      report_id: 'string (UUID)',
      sample_id: 'string (UUID)',
      lab_id: 'string (UUID)',
      lab_name: 'string',
      status: 'string',
      analysis_type: 'string | null',
      results: 'Record<string, any> | null',
      notes: 'string | null',
      received_at: 'Date | null',
      started_at: 'Date | null',
      completed_at: 'Date | null',
      created_at: 'Date',
      updated_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    sampleId: Joi.string().uuid().required(),
    labId: Joi.string().uuid().required(),
    labName: Joi.string().max(255).required(),
    analysisType: Joi.string().optional().max(100),
    notes: Joi.string().optional().max(5000),
  }).unknown(false),

  UpdateRequest: Joi.object({
    status: Joi.string().optional().valid('pending', 'in-progress', 'completed', 'failed'),
    analysisType: Joi.string().optional().max(100),
    results: Joi.object().optional(),
    notes: Joi.string().optional().max(5000),
    receivedAt: Joi.date().optional(),
    startedAt: Joi.date().optional(),
    completedAt: Joi.date().optional(),
  }).unknown(false).min(1),

  insertColumns: ['report_id', 'sample_id', 'lab_id', 'lab_name', 'status', 'received_at', 'created_at'],
  selectColumns: ['report_id', 'sample_id', 'lab_id', 'lab_name', 'status', 'analysis_type', 'results', 'notes', 'received_at', 'started_at', 'completed_at', 'created_at', 'updated_at'],
  updateColumns: ['status', 'analysis_type', 'results', 'notes', 'started_at', 'completed_at'],
} as const;

// ============================================================================
// SAMPLE TRANSFERS TABLE SCHEMA
// ============================================================================
/**
 * SampleTransfers table - Tracks samples sent between labs for analysis
 * Controls data visibility and ownership boundaries
 * 
 * Database Definition:
 * CREATE TABLE SampleTransfers (
 *   transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   sample_id UUID NOT NULL REFERENCES Samples(id),
 *   from_lab_id UUID NOT NULL REFERENCES Companies(id),
 *   to_lab_id UUID NOT NULL REFERENCES Companies(id),
 *   project_id UUID NOT NULL REFERENCES Projects(id),
 *   shared_metadata JSONB,
 *   metadata_visibility VARCHAR(50) DEFAULT 'basic',
 *   status VARCHAR(50) DEFAULT 'pending',
 *   sent_date TIMESTAMP,
 *   received_date TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
export const SAMPLE_TRANSFER_SCHEMA = {
  columns: {
    transfer_id: { type: 'UUID', required: true, primaryKey: true },
    sample_id: { type: 'UUID', required: true, foreignKey: 'Samples' },
    from_lab_id: { type: 'UUID', required: true, foreignKey: 'Companies' },
    to_lab_id: { type: 'UUID', required: true, foreignKey: 'Companies' },
    project_id: { type: 'UUID', required: true, foreignKey: 'Projects' },
    shared_metadata: { type: 'JSONB', required: false, description: 'Filtered metadata shared with receiving lab (no trial details)' },
    metadata_visibility: { type: 'VARCHAR(50)', required: false, default: 'basic', values: ['basic', 'full'] },
    status: { type: 'VARCHAR(50)', required: false, default: 'pending', values: ['pending', 'sent', 'received', 'analyzing', 'completed'] },
    sent_date: { type: 'TIMESTAMP', required: false },
    received_date: { type: 'TIMESTAMP', required: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      transfer_id: 'string (UUID)',
      sample_id: 'string (UUID)',
      from_lab_id: 'string (UUID)',
      to_lab_id: 'string (UUID)',
      project_id: 'string (UUID)',
      shared_metadata: 'Record<string, any> | null',
      metadata_visibility: 'string',
      status: 'string',
      sent_date: 'Date | null',
      received_date: 'Date | null',
      created_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    sampleId: Joi.string().uuid().required(),
    fromLabId: Joi.string().uuid().required(),
    toLabId: Joi.string().uuid().required(),
    projectId: Joi.string().uuid().required(),
    sharedMetadata: Joi.object().optional(),
    metadataVisibility: Joi.string().optional().valid('basic', 'full'),
  }).unknown(false),

  UpdateRequest: Joi.object({
    status: Joi.string().optional().valid('pending', 'sent', 'received', 'analyzing', 'completed'),
    receivedDate: Joi.date().optional(),
    sharedMetadata: Joi.object().optional(),
  }).unknown(false).min(1),

  insertColumns: ['transfer_id', 'sample_id', 'from_lab_id', 'to_lab_id', 'project_id', 'shared_metadata', 'metadata_visibility', 'status', 'sent_date', 'created_at'],
  selectColumns: ['transfer_id', 'sample_id', 'from_lab_id', 'to_lab_id', 'project_id', 'shared_metadata', 'metadata_visibility', 'status', 'sent_date', 'received_date', 'created_at'],
  updateColumns: ['status', 'received_date', 'shared_metadata'],
} as const;

// ============================================================================
// REPORT SHARING TABLE SCHEMA
// ============================================================================
/**
 * ReportSharing table - Tracks which clients can access analysis reports
 * Enables sharing of analysis results back to product owners
 * 
 * Database Definition:
 * CREATE TABLE ReportSharing (
 *   sharing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   report_id UUID NOT NULL REFERENCES AnalysisReports(report_id),
 *   shared_with_company_id UUID NOT NULL REFERENCES Companies(id),
 *   access_level VARCHAR(50) DEFAULT 'view',
 *   shared_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
export const REPORT_SHARING_SCHEMA = {
  columns: {
    sharing_id: { type: 'UUID', required: true, primaryKey: true },
    report_id: { type: 'UUID', required: true, foreignKey: 'AnalysisReports' },
    shared_with_company_id: { type: 'UUID', required: true, foreignKey: 'Companies' },
    access_level: { type: 'VARCHAR(50)', required: false, default: 'view', values: ['view', 'download', 'edit'] },
    shared_date: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      sharing_id: 'string (UUID)',
      report_id: 'string (UUID)',
      shared_with_company_id: 'string (UUID)',
      access_level: 'string',
      shared_date: 'Date',
      created_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    reportId: Joi.string().uuid().required(),
    sharedWithCompanyId: Joi.string().uuid().required(),
    accessLevel: Joi.string().optional().valid('view', 'download', 'edit'),
  }).unknown(false),

  UpdateRequest: Joi.object({
    accessLevel: Joi.string().optional().valid('view', 'download', 'edit'),
  }).unknown(false),

  insertColumns: ['sharing_id', 'report_id', 'shared_with_company_id', 'access_level', 'shared_date', 'created_at'],
  selectColumns: ['sharing_id', 'report_id', 'shared_with_company_id', 'access_level', 'shared_date', 'created_at'],
  updateColumns: ['access_level'],
} as const;

// ============================================================================
// PROJECT TEAM TABLE SCHEMA
// ============================================================================
/**
 * ProjectTeam table - Assigns employees to projects for access control
 * Enables granular project-level security
 * 
 * Database Definition:
 * CREATE TABLE ProjectTeam (
 *   assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   project_id UUID NOT NULL REFERENCES Projects(id),
 *   user_id UUID NOT NULL REFERENCES Users(id),
 *   workspace_id UUID NOT NULL REFERENCES Workspace(id),
 *   company_id UUID NOT NULL REFERENCES Companies(id),
 *   assigned_role VARCHAR(50),           <-- role in THIS project
 *   assigned_by UUID NOT NULL REFERENCES Users(id),
 *   assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * UNIQUE(project_id, user_id) - Each user once per project
 */
export const PROJECT_TEAM_SCHEMA = {
  columns: {
    assignment_id: { type: 'UUID', required: true, primaryKey: true },
    project_id: { type: 'UUID', required: true, foreignKey: 'Projects' },
    user_id: { type: 'UUID', required: true, foreignKey: 'Users' },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Workspace' },
    company_id: { type: 'UUID', required: true, foreignKey: 'Companies' },
    assigned_role: { type: 'VARCHAR(50)', required: true, description: 'Role in this project: admin, manager, scientist, viewer' },
    assigned_by: { type: 'UUID', required: true, foreignKey: 'Users', description: 'Who assigned this user' },
    assigned_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      assignment_id: 'string (UUID)',
      project_id: 'string (UUID)',
      user_id: 'string (UUID)',
      workspace_id: 'string (UUID)',
      company_id: 'string (UUID)',
      assigned_role: 'string',
      assigned_by: 'string (UUID)',
      assigned_at: 'Date',
      created_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    projectId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().required(),
    assignedRole: Joi.string().required().valid('admin', 'manager', 'scientist', 'viewer'),
  }).unknown(false),

  UpdateRequest: Joi.object({
    assignedRole: Joi.string().optional().valid('admin', 'manager', 'scientist', 'viewer'),
  }).unknown(false),

  insertColumns: ['assignment_id', 'project_id', 'user_id', 'workspace_id', 'company_id', 'assigned_role', 'assigned_by', 'assigned_at', 'created_at'],
  selectColumns: ['assignment_id', 'project_id', 'user_id', 'workspace_id', 'company_id', 'assigned_role', 'assigned_by', 'assigned_at', 'created_at'],
  updateColumns: ['assigned_role'],
} as const;

// ============================================================================
// USER ROLE PERMISSIONS TABLE SCHEMA
// ============================================================================
/**
 * UserRolePermissions table - Defines what each role can do
 * Central authority for access control rules
 * 
 * Database Definition:
 * CREATE TABLE UserRolePermissions (
 *   permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   role VARCHAR(50) NOT NULL,
 *   resource_type VARCHAR(50) NOT NULL,    <-- 'sample', 'report', 'project'
 *   action VARCHAR(50) NOT NULL,           <-- 'view', 'create', 'edit', 'delete', 'share'
 *   allowed BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   UNIQUE(role, resource_type, action)
 * );
 */
export const USER_ROLE_PERMISSIONS_SCHEMA = {
  columns: {
    permission_id: { type: 'UUID', required: true, primaryKey: true },
    role: { type: 'VARCHAR(50)', required: true, description: 'Role: admin, manager, scientist, viewer' },
    resource_type: { type: 'VARCHAR(50)', required: true, description: 'What they can access: sample, report, project, analysis' },
    action: { type: 'VARCHAR(50)', required: true, description: 'What they can do: view, create, edit, delete, share' },
    allowed: { type: 'BOOLEAN', required: false, default: 'true' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      permission_id: 'string (UUID)',
      role: 'string',
      resource_type: 'string',
      action: 'string',
      allowed: 'boolean',
      created_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    role: Joi.string().required().valid('admin', 'manager', 'scientist', 'viewer'),
    resourceType: Joi.string().required().valid('sample', 'report', 'project', 'analysis'),
    action: Joi.string().required().valid('view', 'create', 'edit', 'delete', 'share'),
    allowed: Joi.boolean().optional().default(true),
  }).unknown(false),

  UpdateRequest: Joi.object({
    allowed: Joi.boolean().optional(),
  }).unknown(false),

  insertColumns: ['permission_id', 'role', 'resource_type', 'action', 'allowed', 'created_at'],
  selectColumns: ['permission_id', 'role', 'resource_type', 'action', 'allowed', 'created_at'],
  updateColumns: ['allowed'],
} as const;

// ============================================================================
// REPORT ACCESS TABLE SCHEMA
// ============================================================================
/**
 * ReportAccess table - User-level access control for analysis reports
 * Enables sharing specific reports with individual users
 * 
 * Database Definition:
 * CREATE TABLE ReportAccess (
 *   access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   report_id UUID NOT NULL REFERENCES AnalysisReports(report_id),
 *   user_id UUID NOT NULL REFERENCES Users(id),
 *   workspace_id UUID NOT NULL REFERENCES Workspace(id),
 *   access_level VARCHAR(50) DEFAULT 'view',  <-- view, download, edit
 *   can_share BOOLEAN DEFAULT false,
 *   shared_by_user_id UUID REFERENCES Users(id),
 *   shared_date TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 * UNIQUE(report_id, user_id) - Each user once per report
 */
export const REPORT_ACCESS_SCHEMA = {
  columns: {
    access_id: { type: 'UUID', required: true, primaryKey: true },
    report_id: { type: 'UUID', required: true, foreignKey: 'AnalysisReports' },
    user_id: { type: 'UUID', required: true, foreignKey: 'Users' },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Workspace' },
    access_level: { type: 'VARCHAR(50)', required: false, default: 'view', values: ['view', 'download', 'edit'] },
    can_share: { type: 'BOOLEAN', required: false, default: 'false', description: 'Can this user share with others' },
    shared_by_user_id: { type: 'UUID', required: false, foreignKey: 'Users', description: 'Who granted this access' },
    shared_date: { type: 'TIMESTAMP', required: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      access_id: 'string (UUID)',
      report_id: 'string (UUID)',
      user_id: 'string (UUID)',
      workspace_id: 'string (UUID)',
      access_level: 'string',
      can_share: 'boolean',
      shared_by_user_id: 'string (UUID) | null',
      shared_date: 'Date | null',
      created_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    reportId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().required(),
    accessLevel: Joi.string().optional().valid('view', 'download', 'edit'),
    canShare: Joi.boolean().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    accessLevel: Joi.string().optional().valid('view', 'download', 'edit'),
    canShare: Joi.boolean().optional(),
  }).unknown(false),

  insertColumns: ['access_id', 'report_id', 'user_id', 'workspace_id', 'access_level', 'can_share', 'shared_by_user_id', 'shared_date', 'created_at'],
  selectColumns: ['access_id', 'report_id', 'user_id', 'workspace_id', 'access_level', 'can_share', 'shared_by_user_id', 'shared_date', 'created_at'],
  updateColumns: ['access_level', 'can_share'],
} as const;

// ============================================================================
// SAMPLE ACCESS TABLE SCHEMA
// ============================================================================
/**
 * SampleAccess table - User-level access control for samples
 * Mirrors ReportAccess but for samples
 * 
 * Database Definition:
 * CREATE TABLE SampleAccess (
 *   access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   sample_id UUID NOT NULL REFERENCES Samples(id),
 *   user_id UUID NOT NULL REFERENCES Users(id),
 *   workspace_id UUID NOT NULL REFERENCES Workspace(id),
 *   access_level VARCHAR(50) DEFAULT 'view',
 *   can_share BOOLEAN DEFAULT false,
 *   shared_by_user_id UUID REFERENCES Users(id),
 *   shared_date TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
export const SAMPLE_ACCESS_SCHEMA = {
  columns: {
    access_id: { type: 'UUID', required: true, primaryKey: true },
    sample_id: { type: 'UUID', required: true, foreignKey: 'Samples' },
    user_id: { type: 'UUID', required: true, foreignKey: 'Users' },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Workspace' },
    access_level: { type: 'VARCHAR(50)', required: false, default: 'view' },
    can_share: { type: 'BOOLEAN', required: false, default: 'false' },
    shared_by_user_id: { type: 'UUID', required: false, foreignKey: 'Users' },
    shared_date: { type: 'TIMESTAMP', required: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  types: {
    Row: {
      access_id: 'string (UUID)',
      sample_id: 'string (UUID)',
      user_id: 'string (UUID)',
      workspace_id: 'string (UUID)',
      access_level: 'string',
      can_share: 'boolean',
      shared_by_user_id: 'string (UUID) | null',
      shared_date: 'Date | null',
      created_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    sampleId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().required(),
    accessLevel: Joi.string().optional().valid('view', 'download', 'edit'),
    canShare: Joi.boolean().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    accessLevel: Joi.string().optional().valid('view', 'download', 'edit'),
    canShare: Joi.boolean().optional(),
  }).unknown(false),

  insertColumns: ['access_id', 'sample_id', 'user_id', 'workspace_id', 'access_level', 'can_share', 'shared_by_user_id', 'shared_date', 'created_at'],
  selectColumns: ['access_id', 'sample_id', 'user_id', 'workspace_id', 'access_level', 'can_share', 'shared_by_user_id', 'shared_date', 'created_at'],
  updateColumns: ['access_level', 'can_share'],
} as const;
