# API Schema Gap Fixes - Analysis Endpoint

## Problem Statement
The frontend was sending analysis data to the `/api/analyses` endpoint using the old schema format, while the API expects a new, more structured format.

## Schema Mapping

### Old Frontend Format (INCORRECT)
```json
{
  "sample_id": "uuid",
  "type_id": "uuid",
  "description": "text",
  "method": "text",
  "parameters": "text",
  "performed_by": "uuid",
  "performed_date": "date",
  "status": "Pending",
  "results": "empty string",
  "conclusions": "text",
  "external_lab": "uuid",
  "execution_mode": "internal|external",
  "integrity_check": "passed|warning|failed",
  "notes": "text",
  "created_by": "uuid",
  "result_files": [{ name, size, type }]
}
```

### New API Format (CORRECT)
```json
{
  "batchId": "uuid (required)",
  "analysisTypeId": "uuid (required)",
  "results": {
    "object (required) - contains: description, method, parameters, results, conclusions, status, integrity_check, notes"
  },
  "filePath": "string (required)",
  "fileChecksum": "string (required)",
  "fileSizeBytes": "number (required)",
  "status": "string (optional)",
  "executionMode": "string (optional)",
  "executedByOrgId": "uuid (required)",
  "sourceOrgId": "uuid (required)",
  "externalReference": "string (optional)",
  "performedAt": "date (optional)"
}
```

## Field Mapping

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `type_id` | `analysisTypeId` | Direct mapping |
| `performed_by` | `executedByOrgId` | Maps to user's organization |
| `execution_mode` | `executionMode` | Camel case + value mapping: internal→platform, external→external |
| `external_lab` | `externalReference` | Optional reference |
| `result_files` | `filePath`, `fileChecksum`, `fileSizeBytes` | Transformed from array to metadata |
| N/A | `batchId` | Generated as UUID v4 |
| N/A | `sourceOrgId` | Set to user's organization |
| N/A | `results` (object) | Created from: description, method, parameters, results string, conclusions, status, integrity_check, notes |
| N/A | `executedByOrgId` | Set to user's organization |

## Solution Implementation

### 1. Created `analysisTransformer.ts`
- `transformAnalysisForAPI()` - Converts old frontend format to new API format
- `transformAnalysisFromAPI()` - Converts API response back to old format for display
- `mapExecutionMode()` - Maps execution mode values
- `isOldAnalysisFormat()` - Checks if data is in old format

### 2. Updated `CreateAnalysisPage.tsx`
- Imported the transformer utility
- Modified `handleSubmit()` to use `transformAnalysisForAPI()` before posting
- Added error detail parsing to show validation errors to users

### 3. Key Transformations
- **Results Object**: Consolidates all result-related fields into a single object
- **Batch ID**: Auto-generated UUID if not provided
- **Organization IDs**: Uses `user.organizationId` for both `executedByOrgId` and `sourceOrgId`
- **File Metadata**: Generates from uploaded files array
  - `filePath`: Constructed as `batch-{batchId}/results/{fileNames}`
  - `fileChecksum`: Hash based on file names and sizes
  - `fileSizeBytes`: Sum of all uploaded file sizes

## Testing

To test the fix:

1. Create a new analysis via the CreateAnalysisPage UI
2. Fill out the form with analysis details
3. Submit should now succeed without validation errors
4. Check network tab to verify the payload matches the new schema

## Files Modified
- `/src/lib/analysisTransformer.ts` (new)
- `/src/components/CreateAnalysisPage.tsx` (updated)

## Files Still Needing Updates (Future)
- `/src/components/SubmitAnalysisResults.tsx` - Uses `/partner/analysis-requests/{id}/results` endpoint
- `/src/components/PartnerAnalysisRequests.tsx` - Currently uses mock data
