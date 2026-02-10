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
    trial_id: { type: 'UUID', required: false, foreignKey: 'Trials' },
    stage_id: { type: 'UUID', required: false, foreignKey: 'ProjectStages' },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
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
      trial_id: 'string | null (UUID)',
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
    trialId: Joi.string().uuid().optional(),
    stageId: Joi.string().uuid().optional(),
    metadata: Joi.object().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    sampleId: Joi.string().optional().max(100),
    description: Joi.string().optional().max(2000),
    type: Joi.string().optional().max(50),
    status: Joi.string().optional().max(50),
    trialId: Joi.string().uuid().optional(),
    stageId: Joi.string().uuid().optional(),
    metadata: Joi.object().optional(),
  }).unknown(false).min(1),

  // Database query schemas
  insertColumns: ['workspace_id', 'project_id', 'trial_id', 'stage_id', 'sample_id', 'type', 'description', 'metadata', 'created_by'],
  selectColumns: ['id', 'project_id', 'trial_id', 'stage_id', 'workspace_id', 'sample_id', 'type', 'description', 'metadata', 'status', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
  updateColumns: ['sample_id', 'type', 'description', 'metadata', 'status', 'trial_id', 'stage_id'],
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
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
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
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
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
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
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

// ============================================================================
// SUPPLY CHAIN ORGANIZATIONS TABLE SCHEMA
// ============================================================================
/**
 * Organizations table - Stores partner organizations for supply chain collaboration
 * 
 * Database Definition:
 * CREATE TABLE Organizations (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name VARCHAR(255) NOT NULL,
 *   type VARCHAR(50) NOT NULL,
 *   capabilities TEXT[],
 *   certifications TEXT[],
 *   location VARCHAR(255),
 *   contact_email VARCHAR(255),
 *   contact_phone VARCHAR(50),
 *   contact_address TEXT,
 *   partnership_status VARCHAR(20) DEFAULT 'active',
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   deleted_at TIMESTAMP
 * );
 */
export const ORGANIZATION_SCHEMA = {
  // Database column definitions
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    name: { type: 'VARCHAR(255)', required: true },
    type: { type: 'VARCHAR(50)', required: true, description: 'manufacturer, laboratory, research_institute, testing_facility' },
    capabilities: { type: 'TEXT[]', required: false, description: 'Array of capabilities like analysis types, manufacturing processes' },
    certifications: { type: 'TEXT[]', required: false, description: 'Quality certifications like ISO 17025, GMP, etc' },
    location: { type: 'VARCHAR(255)', required: false },
    contact_email: { type: 'VARCHAR(255)', required: false },
    contact_phone: { type: 'VARCHAR(50)', required: false },
    contact_address: { type: 'TEXT', required: false },
    partnership_status: { type: 'VARCHAR(20)', required: false, default: 'active', description: 'active, pending, inactive' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    deleted_at: { type: 'TIMESTAMP', required: false },
  },

  // TypeScript types for runtime validation
  types: {
    Row: {
      id: 'string (UUID)',
      name: 'string',
      type: 'string',
      capabilities: 'string[] | null',
      certifications: 'string[] | null',
      location: 'string | null',
      contact_email: 'string | null',
      contact_phone: 'string | null',
      contact_address: 'string | null',
      partnership_status: 'string',
      created_at: 'Date',
      updated_at: 'Date',
      deleted_at: 'Date | null',
    },
  },

  CreateRequest: Joi.object({
    name: Joi.string().required().max(255),
    type: Joi.string().required().valid('manufacturer', 'laboratory', 'research_institute', 'testing_facility'),
    capabilities: Joi.array().items(Joi.string()).optional(),
    certifications: Joi.array().items(Joi.string()).optional(),
    location: Joi.string().optional().max(255),
    contactEmail: Joi.string().email().optional().max(255),
    contactPhone: Joi.string().optional().max(50),
    contactAddress: Joi.string().optional(),
    partnershipStatus: Joi.string().optional().valid('active', 'pending', 'inactive'),
  }).unknown(false),

  UpdateRequest: Joi.object({
    name: Joi.string().optional().max(255),
    type: Joi.string().optional().valid('manufacturer', 'laboratory', 'research_institute', 'testing_facility'),
    capabilities: Joi.array().items(Joi.string()).optional(),
    certifications: Joi.array().items(Joi.string()).optional(),
    location: Joi.string().optional().max(255),
    contactEmail: Joi.string().email().optional().max(255),
    contactPhone: Joi.string().optional().max(50),
    contactAddress: Joi.string().optional(),
    partnershipStatus: Joi.string().optional().valid('active', 'pending', 'inactive'),
  }).unknown(false),

  insertColumns: ['id', 'name', 'type', 'capabilities', 'certifications', 'location', 'contact_email', 'contact_phone', 'contact_address', 'partnership_status', 'created_at', 'updated_at'],
  selectColumns: ['id', 'name', 'type', 'capabilities', 'certifications', 'location', 'contact_email', 'contact_phone', 'contact_address', 'partnership_status', 'created_at', 'updated_at', 'deleted_at'],
  updateColumns: ['name', 'type', 'capabilities', 'certifications', 'location', 'contact_email', 'contact_phone', 'contact_address', 'partnership_status', 'updated_at'],
} as const;

// ============================================================================
// SUPPLY CHAIN REQUESTS TABLE SCHEMA
// ============================================================================
/**
 * SupplyChainRequests table - Stores collaboration requests between organizations
 * 
 * Database Definition:
 * CREATE TABLE SupplyChainRequests (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   from_organization_id UUID NOT NULL REFERENCES Organizations(id),
 *   to_organization_id UUID NOT NULL REFERENCES Organizations(id),
 *   from_project_id UUID NOT NULL REFERENCES Projects(id),
 *   workflow_type VARCHAR(50) NOT NULL,
 *   material_data JSONB NOT NULL,
 *   requirements JSONB,
 *   status VARCHAR(20) DEFAULT 'pending',
 *   priority VARCHAR(10) DEFAULT 'medium',
 *   due_date TIMESTAMP,
 *   assigned_to UUID REFERENCES Users(id),
 *   notes TEXT,
 *   created_by UUID NOT NULL REFERENCES Users(id),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   deleted_at TIMESTAMP
 * );
 */
export const SUPPLY_CHAIN_REQUEST_SCHEMA = {
  // Database column definitions
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    from_organization_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    to_organization_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    from_project_id: { type: 'UUID', required: true, foreignKey: 'Projects' },
    workflow_type: { type: 'VARCHAR(50)', required: true, description: 'analysis_only, material_transfer, product_continuation, supply_chain' },
    material_data: { type: 'JSONB', required: true, description: 'Material specifications, analysis results, batch info' },
    requirements: { type: 'JSONB', required: false, description: 'Analysis type, methodology, timeline, quality standards' },
    status: { type: 'VARCHAR(20)', required: false, default: 'pending', description: 'pending, accepted, in_progress, completed, rejected' },
    priority: { type: 'VARCHAR(10)', required: false, default: 'medium', description: 'low, medium, high, urgent' },
    due_date: { type: 'TIMESTAMP', required: false },
    assigned_to: { type: 'UUID', required: false, foreignKey: 'Users' },
    notes: { type: 'TEXT', required: false },
    created_by: { type: 'UUID', required: true, foreignKey: 'Users' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    deleted_at: { type: 'TIMESTAMP', required: false },
  },

  // TypeScript types for runtime validation
  types: {
    Row: {
      id: 'string (UUID)',
      from_organization_id: 'string (UUID)',
      to_organization_id: 'string (UUID)',
      from_project_id: 'string (UUID)',
      workflow_type: 'string',
      material_data: 'Record<string, any>',
      requirements: 'Record<string, any> | null',
      status: 'string',
      priority: 'string',
      due_date: 'Date | null',
      assigned_to: 'string (UUID) | null',
      notes: 'string | null',
      created_by: 'string (UUID)',
      created_at: 'Date',
      updated_at: 'Date',
      deleted_at: 'Date | null',
    },
  },

  CreateRequest: Joi.object({
    fromOrganizationId: Joi.string().uuid().required(),
    toOrganizationId: Joi.string().uuid().required(),
    fromProjectId: Joi.string().uuid().required(),
    workflowType: Joi.string().required().valid('analysis_only', 'material_transfer', 'product_continuation', 'supply_chain'),
    materialData: Joi.object().required(),
    requirements: Joi.object().optional(),
    priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent'),
    dueDate: Joi.date().optional(),
    notes: Joi.string().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    status: Joi.string().optional().valid('pending', 'accepted', 'in_progress', 'completed', 'rejected'),
    assignedTo: Joi.string().uuid().optional(),
    notes: Joi.string().optional(),
    materialData: Joi.object().optional(),
    requirements: Joi.object().optional(),
    priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent'),
    dueDate: Joi.date().optional(),
  }).unknown(false),

  insertColumns: ['id', 'from_organization_id', 'to_organization_id', 'from_project_id', 'workflow_type', 'material_data', 'requirements', 'status', 'priority', 'due_date', 'assigned_to', 'notes', 'created_by', 'created_at', 'updated_at'],
  selectColumns: ['id', 'from_organization_id', 'to_organization_id', 'from_project_id', 'workflow_type', 'material_data', 'requirements', 'status', 'priority', 'due_date', 'assigned_to', 'notes', 'created_by', 'created_at', 'updated_at', 'deleted_at'],
  updateColumns: ['status', 'assigned_to', 'notes', 'material_data', 'requirements', 'priority', 'due_date', 'updated_at'],
} as const;

// ============================================================================
// MATERIAL HANDOFFS TABLE SCHEMA
// ============================================================================
/**
 * MaterialHandoffs table - Tracks physical material transfers between organizations
 * 
 * Database Definition:
 * CREATE TABLE MaterialHandoffs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   supply_chain_request_id UUID NOT NULL REFERENCES SupplyChainRequests(id),
 *   from_organization_id UUID NOT NULL REFERENCES Organizations(id),
 *   to_organization_id UUID NOT NULL REFERENCES Organizations(id),
 *   material_id UUID,
 *   quantity DECIMAL(10,3),
 *   unit VARCHAR(50),
 *   shipping_info JSONB,
 *   chain_of_custody JSONB NOT NULL,
 *   status VARCHAR(20) DEFAULT 'preparing',
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   deleted_at TIMESTAMP
 * );
 */
export const MATERIAL_HANDOFF_SCHEMA = {
  // Database column definitions
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    supply_chain_request_id: { type: 'UUID', required: true, foreignKey: 'SupplyChainRequests' },
    from_organization_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    to_organization_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    material_id: { type: 'UUID', required: false, description: 'Reference to material/sample ID' },
    quantity: { type: 'DECIMAL(10,3)', required: false },
    unit: { type: 'VARCHAR(50)', required: false },
    shipping_info: { type: 'JSONB', required: false, description: 'Carrier, tracking number, dates' },
    chain_of_custody: { type: 'JSONB', required: true, description: 'Array of handoff records' },
    status: { type: 'VARCHAR(20)', required: false, default: 'preparing', description: 'preparing, shipped, delivered, received, processed' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    deleted_at: { type: 'TIMESTAMP', required: false },
  },

  // TypeScript types for runtime validation
  types: {
    Row: {
      id: 'string (UUID)',
      supply_chain_request_id: 'string (UUID)',
      from_organization_id: 'string (UUID)',
      to_organization_id: 'string (UUID)',
      material_id: 'string (UUID) | null',
      quantity: 'number | null',
      unit: 'string | null',
      shipping_info: 'Record<string, any> | null',
      chain_of_custody: 'Record<string, any>',
      status: 'string',
      created_at: 'Date',
      updated_at: 'Date',
      deleted_at: 'Date | null',
    },
  },

  CreateRequest: Joi.object({
    supplyChainRequestId: Joi.string().uuid().required(),
    fromOrganizationId: Joi.string().uuid().required(),
    toOrganizationId: Joi.string().uuid().required(),
    materialId: Joi.string().uuid().optional(),
    quantity: Joi.number().optional(),
    unit: Joi.string().optional().max(50),
    shippingInfo: Joi.object().optional(),
    chainOfCustody: Joi.array().items(Joi.object()).required(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    status: Joi.string().optional().valid('preparing', 'shipped', 'delivered', 'received', 'processed'),
    shippingInfo: Joi.object().optional(),
    chainOfCustody: Joi.array().items(Joi.object()).optional(),
    quantity: Joi.number().optional(),
    unit: Joi.string().optional().max(50),
  }).unknown(false),

  insertColumns: ['id', 'supply_chain_request_id', 'from_organization_id', 'to_organization_id', 'material_id', 'quantity', 'unit', 'shipping_info', 'chain_of_custody', 'status', 'created_at', 'updated_at'],
  selectColumns: ['id', 'supply_chain_request_id', 'from_organization_id', 'to_organization_id', 'material_id', 'quantity', 'unit', 'shipping_info', 'chain_of_custody', 'status', 'created_at', 'updated_at', 'deleted_at'],
  updateColumns: ['status', 'shipping_info', 'chain_of_custody', 'quantity', 'unit', 'updated_at'],
} as const;

// ============================================================================
// ANALYSIS TYPES TABLE SCHEMA
// ============================================================================
/**
 * AnalysisTypes table - Stores types of analyses that can be performed
 * 
 * Database Definition:
 * CREATE TABLE AnalysisTypes (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   name VARCHAR(255) NOT NULL,
 *   description TEXT,
 *   category VARCHAR(100),
 *   methods TEXT[],
 *   typical_duration VARCHAR(50),
 *   equipment_required TEXT[],
 *   is_active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
export const ANALYSIS_TYPE_SCHEMA = {
  // Database column definitions
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    name: { type: 'VARCHAR(255)', required: true },
    description: { type: 'TEXT', required: false },
    category: { type: 'VARCHAR(100)', required: false },
    methods: { type: 'TEXT[]', required: false, description: 'Array of analysis methods/techniques' },
    typical_duration: { type: 'VARCHAR(50)', required: false },
    equipment_required: { type: 'TEXT[]', required: false, description: 'Array of required equipment' },
    is_active: { type: 'BOOLEAN', required: false, default: true },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  // TypeScript types for runtime validation
  types: {
    Row: {
      id: 'string (UUID)',
      name: 'string',
      description: 'string | null',
      category: 'string | null',
      methods: 'string[] | null',
      typical_duration: 'string | null',
      equipment_required: 'string[] | null',
      is_active: 'boolean',
      created_at: 'Date',
      updated_at: 'Date',
    },
  },

  CreateRequest: Joi.object({
    name: Joi.string().required().max(255),
    description: Joi.string().optional(),
    category: Joi.string().optional().max(100),
    methods: Joi.array().items(Joi.string()).optional(),
    typicalDuration: Joi.string().optional().max(50),
    equipmentRequired: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    name: Joi.string().optional().max(255),
    description: Joi.string().optional(),
    category: Joi.string().optional().max(100),
    methods: Joi.array().items(Joi.string()).optional(),
    typicalDuration: Joi.string().optional().max(50),
    equipmentRequired: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional(),
  }).unknown(false),

  insertColumns: ['id', 'name', 'description', 'category', 'methods', 'typical_duration', 'equipment_required', 'is_active', 'created_at', 'updated_at'],
  selectColumns: ['id', 'name', 'description', 'category', 'methods', 'typical_duration', 'equipment_required', 'is_active', 'created_at', 'updated_at'],
  updateColumns: ['name', 'description', 'category', 'methods', 'typical_duration', 'equipment_required', 'is_active', 'updated_at'],
} as const;
