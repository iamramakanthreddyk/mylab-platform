/**
 * Database Types - Centralized Type Definitions
 *
 * This file contains ALL database-related types, enums, and interfaces.
 * This is the SINGLE SOURCE OF TRUTH for database types.
 *
 * USAGE:
 * - Import types from this file: `import { UserRow, OrgType } from '../database/types'`
 * - Use type guards for validation: `isValidOrgType(type)`
 * - Use constants for validation: `ORG_TYPES.includes(type)`
 * - Frontend components should import Frontend* types for UI compatibility
 *
 * MAINTENANCE:
 * - Keep enum types in sync with setup.ts database creation
 * - Keep Row types in sync with schemas.ts definitions
 * - Update API types when changing request/response formats
 * - Add new types here, don't scatter them across files
 *
 * - Database enum types (matching setup.ts)
 * - Table row types (matching schemas.ts)
 * - API request/response types
 * - Frontend-compatible types
 */

// ============================================================================
// DATABASE ENUM TYPES (matching setup.ts)
// ============================================================================

export type PaymentStatus = 'trial' | 'pending' | 'completed' | 'overdue' | 'suspended';
export type OrgType = 'client' | 'cro' | 'analyzer' | 'vendor' | 'pharma';
export type UserRole = 'platform_admin' | 'admin' | 'manager' | 'scientist' | 'viewer';
export type StageStatus = 'planned' | 'active' | 'completed';
export type SampleStatus = 'created' | 'shared' | 'processing' | 'analyzed' | 'completed';
export type ExecutionMode = 'platform' | 'external';
export type BatchStatus = 'created' | 'ready' | 'sent' | 'in_progress' | 'completed';
export type AnalysisStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ObjectType = 'Project' | 'Sample' | 'DerivedSample' | 'Batch' | 'Analysis' | 'Document';
export type GrantedRole = 'viewer' | 'processor' | 'analyzer' | 'client';
export type AccessMode = 'platform' | 'offline';
export type DownloadObjectType = 'Document' | 'Analysis' | 'Result';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'share' | 'upload' | 'download';
export type SeverityType = 'low' | 'medium' | 'high' | 'critical';
export type CompanySizeType = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';
export type OnboardingStatus = 'pending' | 'approved' | 'rejected' | 'workspace_created';
export type InvitationRole = 'admin' | 'manager' | 'analyst' | 'viewer';

// ============================================================================
// DATABASE TABLE ROW TYPES (matching schemas.ts)
// ============================================================================

// Users table
export interface UserRow {
  id: string;
  workspace_id: string | null;
  email: string;
  name: string;
  role: UserRole;
  hashed_password?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Organizations table
export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  is_platform_workspace: boolean;
  email_domain?: string;
  payment_status?: PaymentStatus;
  payment_amount?: number;
  payment_due_date?: Date;
  payment_last_reminder?: Date;
  industry?: string;
  company_size?: CompanySizeType;
  website?: string;
  gst_number?: string;
  gst_percentage?: number;
  country?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Plans table
export interface PlanRow {
  id: string;
  name: string;
  tier: string;
  description?: string;
  max_users?: number;
  max_projects?: number;
  max_storage_gb?: number;
  price_monthly: number;
  features?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Subscriptions table
export interface SubscriptionRow {
  id: string;
  workspace_id: string;
  plan_id: string;
  status: PaymentStatus;
  current_period_start: Date;
  current_period_end: Date;
  trial_end?: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

// Projects table
export interface ProjectRow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: StageStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Samples table
export interface SampleRow {
  id: string;
  project_id: string;
  trial_id?: string;
  stage_id?: string;
  workspace_id: string;
  sample_id: string;
  type?: string;
  description?: string;
  metadata?: Record<string, any>;
  status: SampleStatus;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Batches table
export interface BatchRow {
  id: string;
  project_id: string;
  workspace_id: string;
  batch_id: string;
  name: string;
  description?: string;
  status: BatchStatus;
  execution_mode: ExecutionMode;
  metadata?: Record<string, any>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Analyses table
export interface AnalysisRow {
  id: string;
  batch_id: string;
  workspace_id: string;
  analysis_type_id: string;
  status: AnalysisStatus;
  parameters?: Record<string, any>;
  results?: Record<string, any>;
  error_message?: string;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Organization API types
export interface CreateOrganizationRequest {
  name: string;
  type: OrgType;
  industry?: string;
  companySize?: CompanySizeType;
  website?: string;
  gstNumber?: string;
  gstPercentage?: number;
  country?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  type?: OrgType;
  industry?: string;
  companySize?: CompanySizeType;
  website?: string;
  gstNumber?: string;
  gstPercentage?: number;
  country?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug?: string;
  type: OrgType;
  industry?: string;
  companySize?: CompanySizeType;
  website?: string;
  gstNumber?: string;
  gstPercentage?: number;
  country?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

// Admin API types
export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface PlanResponse {
  id: string;
  name: string;
  tier: string;
  description?: string;
  maxUsers?: number;
  maxProjects?: number;
  maxStorageGb?: number;
  priceMonthly: number;
  features?: any;
  isActive?: boolean;
  companiesOnPlan: number;
  activeCompanies: number;
  monthlyRevenue: number;
}

// ============================================================================
// FRONTEND-COMPATIBLE TYPES (for use in React components)
// ============================================================================

// Frontend Organization interface (matches AdminDashboard.tsx)
export interface FrontendOrganization {
  id: string;
  name: string;
  gst_number?: string;
  gst_percentage?: number;
  country?: string;
  industry?: string;
  plan_id?: string;
  plan_name?: string;
  subscription_status?: string;
  admin_user_id?: string;
  admin_user_email?: string;
  admin_user_name?: string;
  created_at?: string;
  type?: string;
  company_size?: string;
  website?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
}

// Frontend Plan interface (matches AdminDashboard.tsx)
export interface FrontendPlan {
  id: string;
  name: string;
  tier: string;
  description?: string;
  max_users?: number;
  max_projects?: number;
  max_storage_gb?: number;
  price_monthly: number;
  features?: any;
  is_active?: boolean;
  companies_on_plan: number;
  active_companies: number;
  monthly_revenue: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Generic database row with timestamps
export interface BaseRow {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

export const isValidOrgType = (type: string): type is OrgType => {
  return ['client', 'cro', 'analyzer', 'vendor', 'pharma'].includes(type);
};

export const isValidUserRole = (role: string): role is UserRole => {
  return ['platform_admin', 'admin', 'manager', 'scientist', 'viewer'].includes(role);
};

export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return ['trial', 'pending', 'completed', 'overdue', 'suspended'].includes(status);
};

// ============================================================================
// CONSTANTS
// ============================================================================
export const ORG_TYPES: readonly OrgType[] = ['client', 'cro', 'analyzer', 'vendor', 'pharma'] as const;
export const USER_ROLES: readonly UserRole[] = ['platform_admin', 'admin', 'manager', 'scientist', 'viewer'] as const;
export const PAYMENT_STATUSES: readonly PaymentStatus[] = ['trial', 'pending', 'completed', 'overdue', 'suspended'] as const;
export const COMPANY_SIZE_TYPES: readonly CompanySizeType[] = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;
