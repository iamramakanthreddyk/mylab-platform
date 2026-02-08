export type UserRole = 'Admin' | 'Manager' | 'Scientist' | 'Viewer'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: UserRole
  workspaceId: string
  organizationId: string // Link to their organization
}

// Supply Chain Organization - independent labs that can collaborate
export interface Organization {
  id: string
  name: string
  type: 'manufacturer' | 'laboratory' | 'research_institute' | 'testing_facility' | 'Client' | 'Laboratory' | 'Partner' | 'Internal'
  workspaceId?: string
  capabilities?: string[] // What they can do (analysis types, manufacturing processes, etc)
  certifications?: string[] // Quality certifications (ISO 17025, GMP, etc)
  location?: string
  contactInfo?: {
    email: string
    phone?: string
    address?: string
  }
  partnershipStatus?: 'active' | 'pending' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

// Supply Chain Workflow Types
export type WorkflowType = 
  | 'analysis_only'          // Just analysis service, material stays with original org
  | 'material_transfer'      // Physical transfer of material for analysis
  | 'product_continuation'   // Continuing product development in partner org
  | 'supply_chain'           // Product becomes raw material for next manufacturing stage

export interface SupplyChainRequest {
  id: string
  fromOrganizationId: string
  toOrganizationId: string
  fromProjectId: string
  workflowType: WorkflowType
  materialData: {
    id: string
    name: string
    type: string
    description: string
    specifications?: Record<string, any>
    analysisResults?: any[]
    batchInfo?: {
      batchId: string
      quantity: number
      unit: string
      qualityGrade?: string
    }
  }
  requirements: {
    analysisType?: string
    methodology?: string
    timeline?: string
    qualityStandards?: string[]
    deliverables?: string[]
  }
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string
  assignedTo?: string // User ID who will handle this request
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Material Handoff - when materials are transferred between organizations
export interface MaterialHandoff {
  id: string
  supplyChainRequestId: string
  fromOrganizationId: string
  toOrganizationId: string
  materialId: string
  quantity: number
  unit: string
  shippingInfo?: {
    carrier?: string
    trackingNumber?: string
    shippedDate?: string
    expectedDeliveryDate?: string
    actualDeliveryDate?: string
  }
  chainOfCustody: {
    handedOffBy: string
    handedOffAt: string
    receivedBy?: string
    receivedAt?: string
    condition?: string // Condition on receipt
    notes?: string
  }[]
  status: 'preparing' | 'shipped' | 'delivered' | 'received' | 'processed'
  createdAt: string
  updatedAt: string
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
  projectStageId?: string | null // Updated to match component usage
  name: string // Added name property
  sample_id: string
  type?: string | null
  description: string
  source?: string // Added for sample source
  storage_conditions?: string // Added for storage info
  status: string
  notes?: string // Added notes
  metadata?: Record<string, any> | null
  trials?: TrialData[] // Array of trial data
  selectedTrialId?: string // Which trial was chosen as the sample
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

// Core workflow types
export interface ProjectStage {
  id: string
  project_id: string
  name: string
  description?: string
  expected_start_date?: string
  expected_end_date?: string
  status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'
  notes?: string
  order_index?: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TrialData {
  id: string
  name: string
  description: string
  conditions: string
  results: string
  performedBy: string
  performedDate: string
  success: boolean
  notes: string
}

export interface DerivedSample {
  id: string
  parentId: string // Original Sample or another DerivedSample
  rootSampleId: string // Always points to original Sample
  workspaceId: string
  originalWorkspaceId?: string
  derivedId: string // User-facing ID like "S-001-A"
  description: string
  metadata?: Record<string, any>
  status: 'created' | 'processing' | 'ready' | 'shared' | 'analyzed'
  executionMode: 'platform' | 'external'
  executedByOrgId: string
  externalReference?: string
  performedAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Batch {
  id: string
  workspaceId: string
  originalWorkspaceId?: string
  batchId: string // User-facing ID like "BATCH-42"
  description: string
  parameters?: Record<string, any>
  status: 'created' | 'ready' | 'sent' | 'in_progress' | 'completed'
  executionMode: 'platform' | 'external'
  executedByOrgId: string
  externalReference?: string
  performedAt?: string
  createdBy: string
  sentAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BatchItem {
  id: string
  batchId: string
  derivedId: string
  sequence: number
  createdAt: string
}

export interface AnalysisType {
  id: string
  name: string // "NMR", "HPLC", "GC-MS", etc.
  description?: string
  category?: string // "Spectroscopy", "Chromatography", etc.
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Analysis {
  id: string
  sample_id: string // Link to the sample being analyzed
  type_id: string // Link to analysis type
  batchId?: string
  workspaceId: string
  analysisTypeId?: string
  analysisType?: AnalysisType // populated via join
  
  // Analysis details
  description: string
  method?: string
  parameters?: string
  
  // Performer information
  performed_by: string
  performed_date: string
  
  // Results and conclusions
  results?: string // Can be text or structured data
  conclusions?: string
  
  // Status and execution
  status: 'Pending' | 'In Progress' | 'Completed' | 'Failed' | 'Cancelled'
  execution_mode: 'internal' | 'external'
  external_lab?: string
  integrity_check: 'passed' | 'warning' | 'failed'
  
  // File management
  result_files?: any[]
  filePath?: string
  fileChecksum?: string
  fileSizeBytes?: number
  
  // Notes and references
  notes?: string
  executedByOrgId?: string
  sourceOrgId?: string
  externalReference?: string
  receivedAt?: string
  performedAt?: string
  
  // Audit fields
  created_by: string
  uploadedBy?: string
  uploadedAt?: string
  createdAt: string
  updatedAt: string
}
