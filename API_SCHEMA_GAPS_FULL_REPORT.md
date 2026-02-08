# Comprehensive API-Frontend Schema Gap Report
**Generated: February 8, 2026**

## Executive Summary
Found **5 major API endpoints** with schema mismatches between frontend requests and backend validation. This report documents each gap with specific field-level details and recommended fixes.

---

## 1. ❌ ANALYSES ENDPOINT - `POST /analyses`
**Status:** ✅ FIXED (Applied transformAnalysisForAPI)

**Gap Details:** [See API_SCHEMA_GAP_FIX.md for transformer implementation]

---

## 2. ❌ PROJECTS ENDPOINT - `POST /projects`
**API Location:** `backend/src/api/projects/controller.ts`

### Problem
Frontend sends `status` field in create request, but API `createProjectSchema` does **NOT** allow it.

### Frontend Code
**File:** [src/components/ProjectsView.tsx](src/components/ProjectsView.tsx#L64)
```typescript
await axiosInstance.post('/projects', {
  name: newProject.name,
  description: newProject.description,
  clientOrgId: newProject.clientOrgId,
  executingOrgId: newProject.executingOrgId,
  status: newProject.status  // ❌ NOT ALLOWED IN CREATE
})
```

### API Schema
**File:** [backend/src/api/projects/types.ts](backend/src/api/projects/types.ts#L75)
```typescript
export const createProjectSchema = Joi.object({
  name: Joi.string().required()...,
  description: Joi.string().optional()...,
  clientOrgId: Joi.string().uuid().required()...,
  executingOrgId: Joi.string().uuid().required()...
  // ❌ status is NOT in createProjectSchema
});

export const updateProjectSchema = Joi.object({
  // status IS allowed here
  status: Joi.string().optional().valid('active', 'completed', 'archived')...
});
```

### Fix Required
Remove `status` from create request or use UPDATE endpoint to set status afterward.

---

## 3. ❌ STAGES ENDPOINT - `POST /stages`
**API Location:** `backend/src/api/stages/controller.ts`

### Problem
Frontend sends multiple fields (`project_id`, `created_by`, `order_index`) that don't match API expectations. Frontend uses snake_case, API expects camelCase.

### Frontend Code
**File:** [src/components/CreateStagePage.tsx](src/components/CreateStagePage.tsx#L74)
```typescript
const stageData = {
  ...stage,
  project_id: projectId,           // ❌ ADDED BY FRONTEND
  created_by: user.id,             // ❌ ADDED BY FRONTEND
  order_index: existingStages.length + 1  // ❌ SNAKE_CASE
}

await axiosInstance.post('/stages', stageData)
```

### API Schema
**File:** [backend/src/api/stages/types.ts](backend/src/api/stages/types.ts#L36)
```typescript
export const createStageSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  orderIndex: Joi.number().integer().min(0).required()  // ✅ CAMEL_CASE
  // ❌ NO project_id or created_by expected
  // ❌ orderIndex should be passed, not order_index
});
```

### API Behavior
- `projectId` comes from **route parameter** (`/projects/:projectId/stages`)
- `createdBy` comes from **authenticated user** (middleware)
- Field name is `orderIndex` not `order_index`

### Fix Required
1. Remove `project_id` and `created_by` from payload
2. Rename `order_index` → `orderIndex`
3. Pass `projectId` via route parameter

---

## 4. ❌ BATCHES ENDPOINT - `POST /batches`
**API Location:** `backend/src/api/batches/controller.ts`

### Problem
Frontend sends **7 extra fields** not defined in `createBatchSchema`. The API only expects `sampleIds` and optional `parameters`.

### Frontend Code
**File:** [src/components/CreateBatchDialog.tsx](src/components/CreateBatchDialog.tsx#L137)
```typescript
await axiosInstance.post('/batches', {
  batchId: formData.batchId,                    // ❌ NOT IN SCHEMA
  description: formData.description,            // ❌ NOT IN SCHEMA
  parameters: parsedParameters,                 // ✅ Optional, allowed
  executionMode: formData.executionMode,        // ❌ NOT IN SCHEMA
  executedByOrgId: formData.executedByOrgId,    // ❌ NOT IN SCHEMA
  externalReference: formData.externalReference,// ❌ NOT IN SCHEMA
  analysisTypeId: formData.analysisTypeId,      // ❌ NOT IN SCHEMA
  performedAt: formData.performedAt,            // ❌ NOT IN SCHEMA
  derivedSampleIds: selectedSamples             // ❌ SHOULD BE "sampleIds"
})
```

### API Schema
**File:** [backend/src/api/batches/types.ts](backend/src/api/batches/types.ts#L34)
```typescript
export const createBatchSchema = Joi.object({
  sampleIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  parameters: Joi.object().optional()
  // ❌ NO OTHER FIELDS ALLOWED
});
```

### Fix Required
1. Remove: `batchId`, `description`, `executionMode`, `executedByOrgId`, `externalReference`, `analysisTypeId`, `performedAt`
2. Rename: `derivedSampleIds` → `sampleIds`
3. Keep only: `sampleIds`, `parameters`

---

## 5. ❌ DERIVED SAMPLES ENDPOINT - `POST /derived-samples`
**API Location:** `backend/src/api/derivedSamples/controller.ts`

### Problem
Frontend sends **8 extra fields** not defined in `CreateDerivedSampleRequest`. API expects minimal fields with snake_case.

### Frontend Code
**File:** [src/components/CreateDerivedSampleDialog.tsx](src/components/CreateDerivedSampleDialog.tsx#L99)
```typescript
await axiosInstance.post('/derived-samples', {
  parentId: parentSample.id,                   // ❌ SHOULD BE parent_sample_id
  derivedId: formData.derivedId,               // ❌ SHOULD BE name
  description: formData.description,           // ✅ Optional, allowed (description)
  metadata: parsedMetadata,                    // ❌ NOT IN SCHEMA
  executionMode: formData.executionMode,       // ❌ NOT IN SCHEMA
  executedByOrgId: formData.executedByOrgId,   // ❌ NOT IN SCHEMA
  externalReference: formData.externalReference,// ❌ NOT IN SCHEMA
  performedAt: formData.performedAt            // ❌ NOT IN SCHEMA
})
```

### API Schema
**File:** [backend/src/api/derivedSamples/types.ts](backend/src/api/derivedSamples/types.ts#L1)
```typescript
export interface CreateDerivedSampleRequest {
  parent_sample_id: string;      // ✅ REQUIRED (snake_case)
  name: string;                  // ✅ REQUIRED
  description?: string;          // ✅ OPTIONAL
  derivation_method: string;     // ✅ REQUIRED
  // ❌ NO metadata, executionMode, etc.
}
```

### Fix Required
1. Rename: `parentId` → `parent_sample_id`, `derivedId` → `name`
2. Add: `derivation_method` (currently missing)
3. Remove: `metadata`, `executionMode`, `executedByOrgId`, `externalReference`, `performedAt`

---

## Summary Table

| Endpoint | Status | Issues | Fields to Fix |
|----------|--------|--------|---------------|
| POST /analyses | ✅ FIXED | 0 | (See transformer) |
| POST /projects | ❌ FAIL | 1 | Remove `status` |
| POST /stages | ❌ FAIL | 3 | order_index→orderIndex, remove project_id/created_by |
| POST /batches | ❌ FAIL | 8 | Remove 7 fields, rename derivedSampleIds→sampleIds |
| POST /derived-samples | ❌ FAIL | 8 | Rename fields, add derivation_method, remove 5 fields |

---

## Impact
- **Critical:** 4 endpoints breaking on production
- **High:** Affects core workflows (project, stage, batch, derived sample creation)
- **Medium:** Analyses already fixed

---

## Next Steps
1. Create individual transformer utilities for each endpoint (like analysisTransformer.ts)
2. Update frontend components to use transformers
3. Add integration tests to prevent future gaps
4. Document API contract in OpenAPI/Swagger

---

## Files to Review
- Backend schemas: `backend/src/api/*/types.ts`
- Frontend components: `src/components/*.tsx`
- Frontend transformer: `src/lib/analysisTransformer.ts` (use as template)
