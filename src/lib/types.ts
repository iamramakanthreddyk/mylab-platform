export type UserRole = 'Admin' | 'Manager' | 'Scientist' | 'Viewer'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: UserRole
  workspaceId: string
}

export interface Project {
  id: string
  workspaceId: string
  name: string
  description: string
  clientOrgId: string
  clientOrgName: string
  executingOrgId: string
  executingOrgName: string
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Sample {
  id: string
  project_id: string
  workspace_id: string
  stage_id?: string | null
  sample_id: string
  type?: string | null
  description: string
  status: string
  metadata?: Record<string, any> | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface AnalysisReport {
  report_id: string
  sample_id: string
  lab_id: string
  lab_name: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  analysis_type?: string | null
  results?: Record<string, any> | null
  notes?: string | null
  received_at?: string | null
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface SampleTransfer {
  transfer_id: string
  sample_id: string
  from_lab_id: string
  to_lab_id: string
  project_id: string
  shared_metadata?: Record<string, any> | null
  metadata_visibility: 'basic' | 'full'
  status: 'pending' | 'sent' | 'received' | 'analyzing' | 'completed'
  sent_date?: string | null
  received_date?: string | null
  created_at: string
}

export interface ReportSharing {
  sharing_id: string
  report_id: string
  shared_with_company_id: string
  access_level: 'view' | 'download' | 'edit'
  shared_date: string
  created_at: string
}

export interface ProjectTeam {
  assignment_id: string
  project_id: string
  user_id: string
  workspace_id: string
  company_id: string
  assigned_role: 'admin' | 'manager' | 'scientist' | 'viewer'
  assigned_by: string
  assigned_at: string
  created_at: string
}

export interface UserRolePermission {
  permission_id: string
  role: 'admin' | 'manager' | 'scientist' | 'viewer'
  resource_type: 'sample' | 'report' | 'project' | 'analysis'
  action: 'view' | 'create' | 'edit' | 'delete' | 'share'
  allowed: boolean
  created_at: string
}

export interface ReportAccess {
  access_id: string
  report_id: string
  user_id: string
  workspace_id: string
  access_level: 'view' | 'download' | 'edit'
  can_share: boolean
  shared_by_user_id?: string | null
  shared_date?: string | null
  created_at: string
}

export interface SampleAccess {
  access_id: string
  sample_id: string
  user_id: string
  workspace_id: string
  access_level: 'view' | 'download' | 'edit'
  can_share: boolean
  shared_by_user_id?: string | null
  shared_date?: string | null
  created_at: string
}

export interface Organization {
  id: string
  name: string
  type: 'Client' | 'Laboratory' | 'Partner' | 'Internal'
  workspaceId?: string
  contactInfo?: Record<string, any>
}
