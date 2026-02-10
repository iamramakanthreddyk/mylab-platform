# API-Frontend Contract Synchronization Guide

**Purpose:** Ensure the backend API and frontend expectations remain in sync  
**Last Updated:** February 10, 2026

## 🎯 Overview

This document ensures that:
1. Backend API matches `openapi-spec.yaml`
2. Frontend types match backend API responses
3. API transformers handle all necessary conversions
4. Changes are tracked and documented

---

## 📋 Contract Sync Checklist

### Before Making Changes

- [ ] Check current contract in `openapi-spec.yaml`
- [ ] Review frontend expectations in `FRONTEND_API_EXPECTATIONS.md`
- [ ] Check existing backend types in `backend/src/api/*/types.ts`
- [ ] Check frontend types in `src/lib/types.ts`
- [ ] Verify transformers in `src/lib/endpointTransformers.ts`

### During Implementation

- [ ] Update `openapi-spec.yaml` FIRST (source of truth)
- [ ] Update backend types to match OpenAPI spec
- [ ] Update backend service implementation
- [ ] Update frontend types to match API responses
- [ ] Add/update transformers if field format changes
- [ ] Update validation schemas if needed

### After Implementation

- [ ] Run API validation: `npm run api:validate`
- [ ] Run type checking: `npm run types:check-sync`
- [ ] Test endpoint with actual requests
- [ ] Update integration tests
- [ ] Update `AI_CONTEXT.md` snapshots
- [ ] Update `FRONTEND_API_EXPECTATIONS.md`

---

## 🔄 Common Contract Patterns

### Pattern 1: Adding a New Field to Existing Endpoint

**Example:** Adding `externalClientName` to Projects

#### Step 1: Update OpenAPI Spec
```yaml
# openapi-spec.yaml
components:
  schemas:
    Project:
      properties:
        externalClientName:
          type: string
          nullable: true
          description: External client name when not in organization system
```

#### Step 2: Update Backend Type
```typescript
// backend/src/api/projects/types.ts
export interface ProjectResponse {
  id: string;
  name: string;
  // ... other fields
  externalClientName: string | null;  // ADD THIS
}
```

#### Step 3: Update Backend Service
```typescript
// backend/src/api/projects/service.ts
export async function getProject(id: string): Promise<ProjectResponse> {
  const result = await pool.query(`
    SELECT 
      p.id,
      p.name,
      p.external_client_name  -- ADD THIS
    FROM projects p
    WHERE p.id = $1
  `, [id]);
  
  return {
    id: result.rows[0].id,
    name: result.rows[0].name,
    externalClientName: result.rows[0].external_client_name,  // ADD THIS
  };
}
```

#### Step 4: Update Frontend Type
```typescript
// src/lib/types.ts
export interface Project {
  id: string;
  name: string;
  // ... other fields
  externalClientName?: string;  // ADD THIS
}
```

#### Step 5: Update Transformer (if needed)
```typescript
// src/lib/endpointTransformers.ts
export const transformProject = (apiProject: any): Project => ({
  id: apiProject.id,
  name: apiProject.name,
  externalClientName: apiProject.externalClientName,  // ADD THIS
  // ... other fields
});
```

#### Step 6: Update AI Context
Update the "API Contract Snapshot" section in `AI_CONTEXT.md`:
```markdown
### GET /api/projects/:id
Response includes: externalClientName (string | null)
```

---

### Pattern 2: Creating a New Endpoint

**Example:** Adding POST /api/projects/:id/archive

#### Step 1: OpenAPI Spec
```yaml
/projects/{id}/archive:
  post:
    summary: Archive a project
    parameters:
      - in: path
        name: id
        required: true
        schema:
          type: string
          format: uuid
    responses:
      '200':
        description: Project archived successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Project'
```

#### Step 2: Backend Type
```typescript
// backend/src/api/projects/types.ts
export interface ArchiveProjectRequest {
  reason?: string;
}
```

#### Step 3: Backend Route
```typescript
// backend/src/api/projects/index.ts
router.post('/:id/archive', async (req, res) => {
  const { id } = req.params;
  const project = await archiveProject(id, req.body);
  res.json(project);
});
```

#### Step 4: Backend Service
```typescript
// backend/src/api/projects/service.ts
export async function archiveProject(
  id: string,
  data: ArchiveProjectRequest
): Promise<ProjectResponse> {
  // Implementation
}
```

#### Step 5: Frontend Hook
```typescript
// src/hooks/useProjects.ts
export function useArchiveProject() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await api.post(`/projects/${projectId}/archive`);
      return transformProject(response.data);
    },
  });
}
```

#### Step 6: Documentation Updates
- Add to `API_SPECIFICATION.md`
- Add to `FRONTEND_API_EXPECTATIONS.md`
- Add to `AI_CONTEXT.md` Recent Changes section

---

### Pattern 3: Changing Field Format

**Example:** Converting date strings to ISO format

#### Step 1: Update OpenAPI Spec
```yaml
createdAt:
  type: string
  format: date-time
  description: ISO 8601 timestamp
```

#### Step 2: Update Backend Response
```typescript
// Ensure backend returns ISO strings
createdAt: row.created_at.toISOString()
```

#### Step 3: Update Frontend Transformer
```typescript
// src/lib/endpointTransformers.ts
export const transformProject = (apiProject: any): Project => ({
  createdAt: new Date(apiProject.createdAt),  // Parse to Date object
});
```

#### Step 4: Document in Frontend Expectations
```markdown
## Date Handling
- Backend: ISO 8601 strings (2026-02-10T12:00:00Z)
- Frontend: Date objects for processing, formatted strings for display
```

---

## 🧪 Validation Tools

### Manual Validation Commands

```powershell
# Validate OpenAPI spec syntax
npm run openapi:validate

# Check type consistency between frontend and backend
npm run types:check-sync

# Run integration tests
npm test -- integration

# Test specific endpoint
Invoke-RestMethod -Uri "http://localhost:3001/api/projects" -Headers @{Authorization="Bearer $token"}
```

### Automated Validation Script

Create `validate-api-contract.ps1`:
```powershell
#!/usr/bin/env pwsh
# Validates API contract consistency

Write-Host "🔍 Validating API Contract..." -ForegroundColor Cyan

# 1. Validate OpenAPI spec
Write-Host "`n1️⃣ Checking OpenAPI spec syntax..." -ForegroundColor Yellow
# Add OpenAPI validator command

# 2. Check TypeScript types compile
Write-Host "`n2️⃣ Checking TypeScript compilation..." -ForegroundColor Yellow
npm run type-check

# 3. Run API integration tests
Write-Host "`n3️⃣ Running API integration tests..." -ForegroundColor Yellow
npm test -- integration

Write-Host "`n✅ API contract validation complete!" -ForegroundColor Green
```

---

## 📊 Contract Coverage Matrix

| Domain | OpenAPI | Backend Type | Frontend Type | Transformer | Tests |
|--------|---------|--------------|---------------|-------------|-------|
| Auth | ✅ | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ | ✅ |
| Trials | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Samples | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Analyses | ✅ | ✅ | ✅ | ✅ | ❌ |
| Batches | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |

Legend:
- ✅ Fully implemented and tested
- ⚠️ Implemented but needs tests/review
- ❌ Not yet implemented

---

## 🚨 Common Pitfalls

### 1. Case Mismatches
```typescript
// ❌ Wrong - mixed case
backend: { client_org_id: "..." }
frontend: { clientOrgId: "..." }

// ✅ Correct - consistent camelCase in API responses
backend API: { clientOrgId: "..." }  // Transform in service layer
frontend: { clientOrgId: "..." }
```

### 2. Nullable Fields
```typescript
// ❌ Wrong - nullable not reflected
type Project = { clientName: string }

// ✅ Correct - nullable explicit
type Project = { clientName: string | null }
```

### 3. Missing Transformers
```typescript
// ❌ Wrong - raw API data in components
<div>{project.created_at}</div>

// ✅ Correct - transformed data
<div>{formatDate(project.createdAt)}</div>
```

### 4. Validation Mismatches
```typescript
// ❌ Wrong - frontend allows what backend rejects
frontend: name: string (optional)
backend: name: required

// ✅ Correct - validation matches
frontend: name: string (required with validation)
backend: name: required
```

---

## 📝 Change Documentation Template

When making API changes, document in `AI_CONTEXT.md`:

```markdown
### YYYY-MM-DD: [Feature Name]
**Files Changed:**
- `openapi-spec.yaml` ([endpoint paths])
- `backend/src/api/[module]/types.ts`
- `backend/src/api/[module]/service.ts`
- `src/lib/types.ts`
- `src/lib/endpointTransformers.ts`

**Changes:**
- [List specific changes]

**Impact:**
- [How this affects API consumers]
- [Any breaking changes]
- [Migration steps if needed]
```

---

## 🔗 Related Documentation

- [AI_CONTEXT.md](../AI_CONTEXT.md) - Overall AI context tracking
- [openapi-spec.yaml](../openapi-spec.yaml) - API contract source of truth
- [FRONTEND_API_EXPECTATIONS.md](../FRONTEND_API_EXPECTATIONS.md) - Frontend integration guide
- [API_SPECIFICATION.md](../API_SPECIFICATION.md) - Human-readable API docs

---

**Last Sync Check:** 2026-02-10  
**Contract Version:** 1.1.0  
**Status:** ✅ In Sync
