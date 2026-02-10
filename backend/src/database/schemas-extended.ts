/**
 * Extended Database Schemas
 * Additional schemas for file management, invitations, and advanced features
 */

import Joi from 'joi';

// ============================================================================
// FILE UPLOADS / DOCUMENTS SCHEMA
// ============================================================================
export const FILE_DOCUMENT_SCHEMA = {
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    uploaded_by: { type: 'UUID', required: true, foreignKey: 'Users' },
    entity_type: { type: 'VARCHAR(50)', required: true, description: 'sample, analysis, project, etc.' },
    entity_id: { type: 'UUID', required: true, description: 'ID of the related entity' },
    file_name: { type: 'VARCHAR(255)', required: true },
    file_path: { type: 'TEXT', required: true },
    file_size: { type: 'BIGINT', required: true },
    file_type: { type: 'VARCHAR(100)', required: true },
    checksum: { type: 'VARCHAR(64)', required: true, description: 'SHA-256 hash for integrity' },
    description: { type: 'TEXT', required: false },
    metadata: { type: 'JSONB', required: false },
    is_public: { type: 'BOOLEAN', required: false, default: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    deleted_at: { type: 'TIMESTAMP', required: false },
  },

  CreateRequest: Joi.object({
    entityType: Joi.string().required().valid('sample', 'analysis', 'project', 'batch', 'organization'),
    entityId: Joi.string().uuid().required(),
    fileName: Joi.string().required().max(255),
    filePath: Joi.string().required(),
    fileSize: Joi.number().integer().required(),
    fileType: Joi.string().required().max(100),
    checksum: Joi.string().required().length(64),
    description: Joi.string().optional(),
    metadata: Joi.object().optional(),
    isPublic: Joi.boolean().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    description: Joi.string().optional(),
    metadata: Joi.object().optional(),
    isPublic: Joi.boolean().optional(),
  }).unknown(false),

  insertColumns: ['workspace_id', 'uploaded_by', 'entity_type', 'entity_id', 'file_name', 'file_path', 'file_size', 'file_type', 'checksum', 'description', 'metadata', 'is_public'],
  selectColumns: ['id', 'workspace_id', 'uploaded_by', 'entity_type', 'entity_id', 'file_name', 'file_path', 'file_size', 'file_type', 'checksum', 'description', 'metadata', 'is_public', 'created_at', 'updated_at', 'deleted_at'],
  updateColumns: ['description', 'metadata', 'is_public', 'updated_at'],
} as const;

// ============================================================================
// USER INVITATIONS SCHEMA
// ============================================================================
export const USER_INVITATION_SCHEMA = {
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    email: { type: 'VARCHAR(255)', required: true },
    role: { type: 'user_role', required: true },
    invited_by: { type: 'UUID', required: true, foreignKey: 'Users' },
    token: { type: 'VARCHAR(255)', required: true, unique: true },
    expires_at: { type: 'TIMESTAMP', required: true },
    accepted_at: { type: 'TIMESTAMP', required: false },
    status: { type: 'VARCHAR(50)', required: false, default: 'pending' },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  CreateRequest: Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().required().valid('admin', 'manager', 'scientist', 'viewer'),
    expiresInDays: Joi.number().integer().optional().default(7),
  }).unknown(false),

  insertColumns: ['workspace_id', 'email', 'role', 'invited_by', 'token', 'expires_at', 'status'],
  selectColumns: ['id', 'workspace_id', 'email', 'role', 'invited_by', 'token', 'expires_at', 'accepted_at', 'status', 'created_at'],
  updateColumns: ['accepted_at', 'status'],
} as const;

// ============================================================================
// ANALYSIS REQUESTS SCHEMA (External Lab Collaboration)
// ============================================================================
export const ANALYSIS_REQUEST_SCHEMA = {
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    workspace_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    from_organization_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    to_organization_id: { type: 'UUID', required: true, foreignKey: 'Organizations' },
    sample_id: { type: 'UUID', required: true, foreignKey: 'Samples' },
    analysis_type_id: { type: 'UUID', required: true, foreignKey: 'AnalysisTypes' },
    description: { type: 'TEXT', required: true },
    methodology_requirements: { type: 'TEXT', required: false },
    parameters: { type: 'JSONB', required: false },
    priority: { type: 'VARCHAR(50)', required: false, default: 'medium' },
    status: { type: 'VARCHAR(50)', required: false, default: 'pending' },
    due_date: { type: 'DATE', required: false },
    estimated_duration: { type: 'VARCHAR(100)', required: false },
    assigned_to: { type: 'UUID', required: false, foreignKey: 'Users' },
    notes: { type: 'TEXT', required: false },
    created_by: { type: 'UUID', required: true, foreignKey: 'Users' },
    accepted_at: { type: 'TIMESTAMP', required: false },
    completed_at: { type: 'TIMESTAMP', required: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  CreateRequest: Joi.object({
    toOrganizationId: Joi.string().uuid().required(),
    sampleId: Joi.string().uuid().required(),
    analysisTypeId: Joi.string().uuid().required(),
    description: Joi.string().required(),
    methodologyRequirements: Joi.string().optional(),
    parameters: Joi.object().optional(),
    priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent'),
    dueDate: Joi.date().optional(),
    estimatedDuration: Joi.string().optional(),
    notes: Joi.string().optional(),
  }).unknown(false),

  UpdateRequest: Joi.object({
    description: Joi.string().optional(),
    methodologyRequirements: Joi.string().optional(),
    parameters: Joi.object().optional(),
    priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent'),
    status: Joi.string().optional().valid('pending', 'accepted', 'in_progress', 'completed', 'rejected'),
    assignedTo: Joi.string().uuid().optional(),
    notes: Joi.string().optional(),
  }).unknown(false),

  insertColumns: ['workspace_id', 'from_organization_id', 'to_organization_id', 'sample_id', 'analysis_type_id', 'description', 'methodology_requirements', 'parameters', 'priority', 'status', 'due_date', 'estimated_duration', 'notes', 'created_by'],
  selectColumns: ['id', 'workspace_id', 'from_organization_id', 'to_organization_id', 'sample_id', 'analysis_type_id', 'description', 'methodology_requirements', 'parameters', 'priority', 'status', 'due_date', 'estimated_duration', 'assigned_to', 'notes', 'created_by', 'accepted_at', 'completed_at', 'created_at', 'updated_at'],
  updateColumns: ['description', 'methodology_requirements', 'parameters', 'priority', 'status', 'assigned_to', 'notes', 'accepted_at', 'completed_at', 'updated_at'],
} as const;

// ============================================================================
// PASSWORD RESET TOKENS SCHEMA
// ============================================================================
export const PASSWORD_RESET_SCHEMA = {
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    user_id: { type: 'UUID', required: true, foreignKey: 'Users' },
    token: { type: 'VARCHAR(255)', required: true, unique: true },
    expires_at: { type: 'TIMESTAMP', required: true },
    used_at: { type: 'TIMESTAMP', required: false },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  CreateRequest: Joi.object({
    email: Joi.string().email().required(),
  }).unknown(false),

  ResetRequest: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }).unknown(false),

  insertColumns: ['user_id', 'token', 'expires_at'],
  selectColumns: ['id', 'user_id', 'token', 'expires_at', 'used_at', 'created_at'],
  updateColumns: ['used_at'],
} as const;

// ============================================================================
// NOTIFICATION SETTINGS SCHEMA (Enhanced)
// ============================================================================
export const NOTIFICATION_SETTINGS_SCHEMA = {
  columns: {
    id: { type: 'UUID', required: true, primaryKey: true },
    user_id: { type: 'UUID', required: true, foreignKey: 'Users', unique: true },
    email_enabled: { type: 'BOOLEAN', required: false, default: true },
    in_app_enabled: { type: 'BOOLEAN', required: false, default: true },
    analysis_complete: { type: 'BOOLEAN', required: false, default: true },
    sample_shared: { type: 'BOOLEAN', required: false, default: true },
    project_update: { type: 'BOOLEAN', required: false, default: true },
    collaboration_request: { type: 'BOOLEAN', required: false, default: true },
    system_announcements: { type: 'BOOLEAN', required: false, default: true },
    created_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', required: false, default: 'CURRENT_TIMESTAMP' },
  },

  UpdateRequest: Joi.object({
    emailEnabled: Joi.boolean().optional(),
    inAppEnabled: Joi.boolean().optional(),
    analysisComplete: Joi.boolean().optional(),
    sampleShared: Joi.boolean().optional(),
    projectUpdate: Joi.boolean().optional(),
    collaborationRequest: Joi.boolean().optional(),
    systemAnnouncements: Joi.boolean().optional(),
  }).unknown(false),

  insertColumns: ['user_id', 'email_enabled', 'in_app_enabled', 'analysis_complete', 'sample_shared', 'project_update', 'collaboration_request', 'system_announcements'],
  selectColumns: ['id', 'user_id', 'email_enabled', 'in_app_enabled', 'analysis_complete', 'sample_shared', 'project_update', 'collaboration_request', 'system_announcements', 'created_at', 'updated_at'],
  updateColumns: ['email_enabled', 'in_app_enabled', 'analysis_complete', 'sample_shared', 'project_update', 'collaboration_request', 'system_announcements', 'updated_at'],
} as const;
