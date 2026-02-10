import { CreateProjectRequestPayload, WorkflowMode } from './types'

export interface CreateProjectFormState {
  name: string
  description: string
  clientOrgId: string | null
  clientOrgLookupId: string
  externalClientName: string
  clientMode: 'registered' | 'external'
  executingOrgId: string
  workflowMode: WorkflowMode
}

/**
 * Transform frontend Project data to API CreateProjectRequest format
 */
export function transformProjectForAPI(projectData: CreateProjectFormState): CreateProjectRequestPayload {
  const clientOrgId = projectData.clientOrgId || projectData.clientOrgLookupId.trim() || undefined
  const externalClientName = projectData.externalClientName?.trim() || undefined

  if (!clientOrgId && !externalClientName) {
    throw new Error('Either clientOrgId or externalClientName is required to create a project')
  }

  return {
    name: projectData.name.trim(),
    description: projectData.description?.trim() || undefined,
    clientOrgId,
    externalClientName,
    executingOrgId: projectData.executingOrgId,
    workflowMode: projectData.workflowMode
  }
}

/**
 * Transform frontend Stage data to API CreateStageRequest format
 */
export function transformStageForAPI(stageData: any): any {
  // Remove project_id and created_by - they come from route and auth
  // Convert order_index to orderIndex
  const { project_id, created_by, order_index, ...rest } = stageData;
  
  return {
    name: stageData.name,
    description: stageData.description || undefined,
    orderIndex: stageData.order_index || stageData.orderIndex
  };
}

/**
 * Transform frontend Batch data to API CreateBatchRequest format
 */
export function transformBatchForAPI(batchData: any): any {
  const sampleIds = batchData.derivedSampleIds || batchData.sampleIds || [];
  const result: any = {
    batchId: batchData.batchId,
    description: batchData.description,
    status: batchData.status,
    executionMode: batchData.executionMode,
    executedByOrgId: batchData.executedByOrgId,
    externalReference: batchData.externalReference,
    performedAt: batchData.performedAt,
    sampleIds
  };

  if (batchData.parameters && Object.keys(batchData.parameters).length > 0) {
    result.parameters = batchData.parameters;
  }

  return result;
}

/**
 * Transform frontend DerivedSample data to API CreateDerivedSampleRequest format
 */
export function transformDerivedSampleForAPI(sampleData: any): any {
  // Map frontend field names to API field names
  // parentId -> parent_sample_id
  // derivedId -> name
  // Add derivation_method if missing
  
  return {
    parent_sample_id: sampleData.parentId || sampleData.parent_sample_id,
    name: sampleData.derivedId || sampleData.name,
    derived_id: sampleData.derivedId || sampleData.derived_id || sampleData.name,
    description: sampleData.description || undefined,
    derivation_method: sampleData.derivation_method || sampleData.derivedId || 'unknown',
    execution_mode: sampleData.executionMode || sampleData.execution_mode,
    executed_by_org_id: sampleData.executedByOrgId || sampleData.executed_by_org_id,
    external_reference: sampleData.externalReference || sampleData.external_reference,
    performed_at: sampleData.performedAt || sampleData.performed_at,
    metadata: sampleData.metadata
  };
}

/**
 * Transform frontend Sample data to API CreateSampleRequest format
 * Note: Sample schema looks correct, but adding for consistency
 */
export function transformSampleForAPI(sampleData: any): any {
  return {
    projectId: sampleData.projectId,
    sampleId: sampleData.sampleId || sampleData.name,
    description: sampleData.description || undefined,
    type: sampleData.type || undefined,
    stageId: sampleData.stageId || sampleData.projectStageId || undefined,
    trialId: sampleData.trialId || undefined,
    metadata: sampleData.metadata || undefined
  };
}

/**
 * Reverse transformation: convert API response back to old format
 */
export function transformProjectFromAPI(apiData: any): any {
  return {
    ...apiData,
    clientOrgId: apiData.clientOrgId,
    executingOrgId: apiData.executingOrgId,
    status: apiData.status
  };
}
