/**
 * Workspace request/response types and validation schemas
 */

export interface WorkspaceSummaryResponse {
  id: string;
  name: string;
  description?: string;
  user_count: number;
  project_count: number;
  sample_count: number;
  is_active: boolean;
  created_at: string;
}

export interface WorkspaceDetailResponse {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// ============ Custom Error Classes ============

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace ${workspaceId} not found`);
    this.name = 'WorkspaceNotFoundError';
  }
}

export class UnauthorizedWorkspaceAccessError extends Error {
  constructor(workspaceId: string) {
    super(`Unauthorized access to workspace ${workspaceId}`);
    this.name = 'UnauthorizedWorkspaceAccessError';
  }
}

export class InvalidWorkspaceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidWorkspaceDataError';
  }
}
