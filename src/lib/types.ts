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
  projectId: string
  workspaceId: string
  sampleId: string
  type: string
  description: string
  status: 'Registered' | 'In Progress' | 'Analyzed' | 'Archived'
  metadata?: Record<string, any>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  type: 'Client' | 'Laboratory' | 'Partner' | 'Internal'
  workspaceId?: string
  contactInfo?: Record<string, any>
}
