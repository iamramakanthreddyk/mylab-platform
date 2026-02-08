# Quick Reference: API-Frontend Schema Fixes

## What Was Fixed

| # | Endpoint | Problem | Fix |
|---|----------|---------|-----|
| 1 | POST /analyses | Missing required fields in request | ✅ Transformer created |
| 2 | POST /projects | Invalid `status` in create request | ✅ Removed from payload |
| 3 | POST /stages | Wrong field names & endpoint | ✅ Transformer + route fix |
| 4 | POST /batches | 7 extra fields sent | ✅ Removed, renamed sampleIds |
| 5 | POST /derived-samples | Field naming & extra fields | ✅ Proper mapping applied |

## How It Works Now

### New Transformer Pattern
```typescript
// 1. Import transformer
import { transformXxxForAPI } from '@/lib/endpointTransformers'

// 2. Transform before sending
const transformedData = transformXxxForAPI(formData)

// 3. Send cleaned request
await axiosInstance.post('/endpoint', transformedData)
```

## Common Issues Fixed

### ❌ BEFORE (Old Way)
```typescript
// Wrong field names, extra fields, missing fields
await axiosInstance.post('/projects', {
  name, description, clientOrgId, executingOrgId,
  status: 'Planning'  // ❌ Not allowed in create!
})
```

### ✅ AFTER (New Way)
```typescript
// Clean, validated, schema-compliant
const transformedData = transformProjectForAPI(newProject)
await axiosInstance.post('/projects', transformedData)
// Sends: { name, description, clientOrgId, executingOrgId }
```

## API Contracts Quick View

### Projects
```
POST /projects
REQUIRED: name, clientOrgId, executingOrgId
OPTIONAL: description
❌ NO: status (use PUT for updates)
```

### Stages  
```
POST /projects/{projectId}/stages
REQUIRED: name, orderIndex
OPTIONAL: description
❌ NO: project_id, created_by (from route/auth)
```

### Batches
```
POST /batches
REQUIRED: sampleIds
OPTIONAL: parameters
❌ NO: executionMode, analysisTypeId, etc.
```

### Derived Samples
```
POST /derived-samples
REQUIRED: parent_sample_id, name, derivation_method
OPTIONAL: description
❌ NO: metadata, executionMode, etc.
```

### Samples
```
POST /samples
REQUIRED: projectId, sampleId, description
OPTIONAL: type, stageId, metadata
```

### Analyses
```
POST /analyses
REQUIRED: batchId, analysisTypeId, results, filePath, fileChecksum, fileSizeBytes, executedByOrgId, sourceOrgId
OPTIONAL: performedAt, executionMode, externalReference
```

## Debugging Tips

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by XHR requests
3. Look for your API call
4. Check Request body matches schema
5. Verify Response status (201 for success)

### Error Messages
```
If you see validation errors, they now show like:
"\"name\" is required, \"description\" must be a string"
```

### Logs
All components now log:
```typescript
console.error('Failed to create X:', error)
// Shows full error object for debugging
```

## Files to Know

| File | Purpose |
|------|---------|
| `src/lib/endpointTransformers.ts` | All API transformers |
| `src/lib/analysisTransformer.ts` | Analysis-specific transformer |
| `API_SCHEMA_GAPS_FULL_REPORT.md` | Detailed audit report |
| `SCHEMA_FIXES_IMPLEMENTATION_COMPLETE.md` | Implementation summary |

## What Needs Testing

- [ ] Create project from UI
- [ ] Create stage under project
- [ ] Create batch with derived samples
- [ ] Create derived sample
- [ ] Create sample with metadata
- [ ] Create analysis via form
- [ ] Verify no validation errors
- [ ] Check Network tab requests match schemas

---

**Need help?** Check the detailed reports for specific endpoint documentation.
