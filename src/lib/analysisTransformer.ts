/**
 * Simple hash function for generating checksums in browser
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Transform frontend Analysis form data to API CreateAnalysisRequest format
 */
export function transformAnalysisForAPI(
  oldData: any,
  userOrganizationId: string | undefined,
  userWorkspaceId: string | undefined,
  batchId: string, // Now required - must be created first
): any {
  // Use organizationId if available, fall back to workspaceId for internal labs
  // For internal labs, the workspace IS the organization
  const orgId = userOrganizationId || userWorkspaceId;
  
  if (!orgId) {
    throw new Error('Unable to determine organization. Please ensure you are logged in with a valid workspace.');
  }

  if (!batchId) {
    throw new Error('Batch ID is required. Please ensure batch was created successfully.');
  }

  // Build results object from the form data
  const results: Record<string, any> = {
    description: oldData.description || '',
    method: oldData.method || '',
    parameters: oldData.parameters || '',
    status: oldData.status || 'Pending',
    integrity_check: oldData.integrity_check || 'passed',
    notes: oldData.notes || ''
  };

  // Add string results if provided
  if (oldData.results) {
    results.results = oldData.results;
  }
  if (oldData.conclusions) {
    results.conclusions = oldData.conclusions;
  }

  // Generate file metadata from uploaded files or create empty metadata
  let filePath = 'analysis-results';
  let fileChecksum = 'no-files';
  let fileSizeBytes = 1024; // Default to 1KB minimum (API requires positive number)

  if (oldData.result_files && oldData.result_files.length > 0) {
    // If files were uploaded, create a combined file path and checksum
    const fileNames = oldData.result_files.map((f: any) => f.name || f).join(', ');
    filePath = `batch-${batchId}/results/${fileNames}`;
    
    // Calculate total size and generate checksum based on file names
    fileSizeBytes = oldData.result_files.reduce((sum: number, f: any) => 
      sum + (f.size || 1024), 0
    );
    
    // Generate a simple checksum from file names and sizes
    const checksumInput = oldData.result_files
      .map((f: any) => `${f.name}-${f.size || 0}`)
      .join('|');
    fileChecksum = simpleHash(checksumInput).substring(0, 16);
  }

  // Build the new API request format
  return {
    batchId: batchId,
    analysisTypeId: oldData.type_id, // Map old field to new
    results, // Send the complete results object
    filePath,
    fileChecksum,
    fileSizeBytes,
    status: oldData.status || 'Pending',
    executionMode: oldData.execution_mode || 'internal', // Map and camelCase
    executedByOrgId: orgId, // Use organization (from org ID or workspace ID for internal)
    sourceOrgId: orgId, // Source is same as execution org for internal labs
    externalReference: oldData.external_lab || undefined, // Map external_lab if present
    performedAt: oldData.performed_date || new Date().toISOString()
  };
}

/**
 * Reverse transformation: convert API response back to old format (for display)
 */
export function transformAnalysisFromAPI(apiData: any): any {
  return {
    id: apiData.id,
    type_id: apiData.analysis_type_id,
    analysisTypeId: apiData.analysis_type_id,
    description: apiData.results?.description || '',
    method: apiData.results?.method || '',
    parameters: apiData.results?.parameters || '',
    performed_by: apiData.executed_by_org_id,
    performed_date: apiData.performed_at,
    results: apiData.results?.results || '',
    conclusions: apiData.results?.conclusions || '',
    status: apiData.status,
    execution_mode: apiData.execution_mode,
    external_lab: apiData.external_reference,
    integrity_check: apiData.results?.integrity_check || 'passed',
    notes: apiData.results?.notes || '',
    created_by: apiData.uploaded_by,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
    // New fields
    batchId: apiData.batch_id,
    filePath: apiData.file_path,
    fileChecksum: apiData.file_checksum,
    fileSizeBytes: apiData.file_size_bytes,
    executedByOrgId: apiData.executed_by_org_id,
    sourceOrgId: apiData.source_org_id
  };
}

/**
 * Map analysis execution modes between old and new formats
 */
export function mapExecutionMode(oldMode: 'internal' | 'external'): 'platform' | 'external' {
  return oldMode === 'external' ? 'external' : 'platform';
}

/**
 * Check if data is in old format vs new API format
 */
export function isOldAnalysisFormat(data: any): boolean {
  return data.type_id !== undefined || data.performed_by !== undefined;
}
