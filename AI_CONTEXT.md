# AI Context - MyLab Platform

**Last Updated:** February 10, 2026  
**Purpose:** Maintain AI awareness of database schema, API contracts, and frontend expectations

## 🎯 Core Principles

1. **Single Source of Truth**: Each domain has ONE authoritative source
2. **Sync on Change**: Update this when DB, API, or frontend contracts change
3. **Auto-Discovery**: Use tools to auto-generate schema snapshots
4. **Append-Only Log**: Keep recent changes for historical context

---

## 📊 CANONICAL SOURCES (Always Check First)

| Domain | Source File | What It Contains |
|--------|-------------|------------------|
| **Database Schema** | `backend/src/database/schemas.ts` | All table definitions, columns, types, validation |
| **API OpenAPI Spec** | `openapi-spec.yaml` | Complete REST API contract, all endpoints |
| **Backend API Types** | `backend/src/api/*/types.ts` | TypeScript types for each API module |
| **Frontend Types** | `src/lib/types.ts` | Frontend data models and expectations |
| **Frontend API Contract** | `FRONTEND_API_EXPECTATIONS.md` | How frontend expects to consume APIs |
| **Product Requirements** | `PRD.md` | Business logic and domain rules |
| **Security Model** | `SECURITY.md` | Auth, RBAC, tenant isolation |

---

## 🗄️ DATABASE SCHEMA SNAPSHOT

### Core Tables (Last Verified: 2026-02-10)

#### Users
```typescript
{
  id: UUID (PK),
  email: VARCHAR(255) UNIQUE,
  name: VARCHAR(255),
  password_hash: VARCHAR(255),
  role: user_role ('Admin' | 'Manager' | 'Scientist' | 'Viewer' | 'platform_admin'),
  workspace_id: UUID (FK → Organizations, nullable for platform_admin),
  invitation_token: VARCHAR(255),
  invitation_expires: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deleted_at: TIMESTAMP (soft delete)
}
```

#### Organizations (formerly Workspace)
```typescript
{
  id: UUID (PK),
  name: VARCHAR(255) UNIQUE,
  type: VARCHAR(50) ('Client' | 'Laboratory' | 'Partner' | 'Internal'),
  subscription_id: UUID (FK → Subscriptions),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

#### Projects
```typescript
{
  id: UUID (PK),
  name: VARCHAR(255),
  description: TEXT,
  executing_org_id: UUID (FK → Organizations, NOT NULL),
  client_org_id: UUID (FK → Organizations, nullable),
  external_client_name: VARCHAR(255) (nullable),
  workflow_mode: VARCHAR(50) ('analysis_first' | 'trial_first'),
  status: project_status ('active' | 'completed' | 'archived'),
  created_by: UUID (FK → Users),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deleted_at: TIMESTAMP,
  
  CONSTRAINT: (client_org_id IS NOT NULL OR external_client_name IS NOT NULL)
}
```

#### Trials
```typescript
{
  id: UUID (PK),
  project_id: UUID (FK → Projects),
  name: VARCHAR(255),
  description: TEXT,
  status: trial_status ('planned' | 'active' | 'completed'),
  workspace_id: UUID (FK → Organizations),
  created_by: UUID (FK → Users),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

#### Samples
```typescript
{
  id: UUID (PK),
  project_id: UUID (FK → Projects),
  trial_id: UUID (FK → Trials, nullable),
  stage_id: UUID (FK → ProjectStages, nullable),
  workspace_id: UUID (FK → Organizations),
  sample_id: VARCHAR(100) (user-facing identifier),
  type: VARCHAR(50),
  description: TEXT,
  metadata: JSONB,
  status: sample_status ('created' | 'in_analysis' | 'completed'),
  created_by: UUID (FK → Users),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deleted_at: TIMESTAMP
}
```

#### Analyses
```typescript
{
  id: UUID (PK),
  sample_id: UUID (FK → Samples),
  analysis_type_id: UUID (FK → AnalysisTypes),
  status: analysis_status ('pending' | 'in_progress' | 'completed' | 'failed'),
  assigned_to: UUID (FK → Users, nullable),
  results: JSONB,
  workspace_id: UUID (FK → Organizations),
  created_by: UUID (FK → Users),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

#### Batches
```typescript
{
  id: UUID (PK),
  project_id: UUID (FK → Projects),
  batch_number: VARCHAR(100),
  type: VARCHAR(50) ('production' | 'pilot' | 'experimental'),
  quantity: DECIMAL,
  unit: VARCHAR(50),
  status: batch_status ('created' | 'in_progress' | 'completed' | 'failed'),
  workspace_id: UUID (FK → Organizations),
  metadata: JSONB,
  created_by: UUID (FK → Users),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
}
```

### Enums
- `user_role`: 'Admin', 'Manager', 'Scientist', 'Viewer', 'platform_admin'
- `project_status`: 'active', 'completed', 'archived'
- `trial_status`: 'planned', 'active', 'completed'
- `sample_status`: 'created', 'in_analysis', 'completed'
- `analysis_status`: 'pending', 'in_progress', 'completed', 'failed'
- `batch_status`: 'created', 'in_progress', 'completed', 'failed'

### Key Constraints
1. Projects: MUST have `executing_org_id`; MUST have EITHER `client_org_id` OR `external_client_name`
2. Users with `platform_admin` role: `workspace_id` is nullable
3. All resources: Scoped to `workspace_id` (tenant isolation) EXCEPT platform admin operations
4. Soft Deletes: Use `deleted_at` timestamp, include `WHERE deleted_at IS NULL` in queries

---

## 🔌 API CONTRACT SNAPSHOT

### Authentication Endpoints

#### POST /api/auth/login
```typescript
Request: { email: string, password: string }
Response: { token: string, user: User }
Status: 200 OK | 401 Unauthorized
```

#### POST /api/auth/change-password
```typescript
Request: { currentPassword: string, newPassword: string }
Response: { message: string }
Status: 200 OK | 401 Unauthorized
Auth: Required
```

### Projects API

#### GET /api/projects
```typescript
Query: { page?: number, limit?: number, status?: string }
Response: { projects: Project[], total: number, page: number, limit: number }
Status: 200 OK | 401 Unauthorized
Auth: Required
```

#### POST /api/projects
```typescript
Request: {
  name: string (required),
  description?: string,
  executingOrgId: string (required),
  clientOrgId?: string,
  externalClientName?: string,
  workflowMode: 'analysis_first' | 'trial_first' (required)
}
Response: { project: Project }
Status: 201 Created | 400 Bad Request | 401 Unauthorized
Auth: Required
Constraint: MUST provide either clientOrgId OR externalClientName (not both)
```

#### GET /api/projects/:id
```typescript
Response: {
  id: string,
  name: string,
  description: string,
  executingOrgId: string,
  executingOrgName: string,
  clientOrgId: string | null,
  clientOrgName: string | null,
  externalClientName: string | null,
  workflowMode: string,
  status: string,
  createdBy: string,
  createdAt: string,
  updatedAt: string
}
Status: 200 OK | 404 Not Found | 401 Unauthorized
Auth: Required
```

### Trials API

#### POST /api/projects/:projectId/trials
```typescript
Request: {
  name: string (required),
  description?: string
}
Response: { trial: Trial }
Status: 201 Created | 400 Bad Request | 404 Not Found
Auth: Required
```

### Samples API

#### POST /api/samples
```typescript
Request: {
  projectId: string (required),
  sampleId: string (required, max 100 chars),
  description: string (required, max 2000 chars),
  type?: string (max 50 chars),
  trialId?: string,
  stageId?: string,
  metadata?: Record<string, any>
}
Response: { sample: Sample }
Status: 201 Created | 400 Bad Request | 401 Unauthorized
Auth: Required
```

---

## 🎨 FRONTEND API EXPECTATIONS

### Data Transformation Rules

#### Date Handling
- Backend sends: ISO 8601 strings (`2026-02-10T12:00:00Z`)
- Frontend displays: Local timezone formatted (`Feb 10, 2026, 12:00 PM`)
- Transformers: `src/lib/endpointTransformers.ts`

#### API Field Naming
- Backend: `snake_case` in DB, `camelCase` in API responses
- Frontend: `camelCase` everywhere
- Transformation: Applied in backend API layer and frontend transformers

#### Project Client Handling
```typescript
// Backend response
{
  clientOrgId: string | null,
  clientOrgName: string | null,
  externalClientName: string | null
}

// Frontend display logic
const clientDisplay = clientOrgName || externalClientName || 'No Client';
```

### Error Handling Contract

```typescript
// Standard error response
{
  error: string,          // Error message
  code?: string,          // Error code (VALIDATION_ERROR, NOT_FOUND, etc.)
  details?: any           // Additional error context
}
```

### Loading States
- All async operations MUST show loading indicator
- Optimistic updates for create/update operations
- Error states with retry capability

---

## 📝 RECENT CHANGES LOG (Append-Only)

### 2026-02-10: Migration 005 - Platform Admin Nullable Workspace
**Files Changed:**
- `backend/migrations/005-platform-admin-nullable-workspace.sql`
- `backend/src/database/schemas.ts` (updated User schema)
- `backend/src/api/auth/service.ts` (platform admin login logic)

**Changes:**
- Made `workspace_id` nullable in Users table for platform_admin role
- Added CHECK constraint: `(role != 'platform_admin' OR workspace_id IS NULL)`
- Platform admins bypass workspace scoping in queries

**Impact:**
- Auth: Platform admins can login without workspace assignment
- Queries: Must handle `workspace_id IS NULL` for platform admin users
- Frontend: Show workspace selector for platform admins

### 2026-02-10: External Client Support
**Files Changed:**
- `backend/migrations/001-add-external-clients.sql`
- `backend/src/database/schemas.ts`
- `openapi-spec.yaml` (Projects endpoints)
- `backend/src/api/projects/types.ts`
- `backend/src/api/projects/service.ts`
- `src/lib/types.ts`
- `src/components/CreateProjectPage.tsx`

**Changes:**
- Added `external_client_name` column to Projects table
- Added CHECK constraint: `(client_org_id IS NOT NULL OR external_client_name IS NOT NULL)`
- Updated CreateProject API to accept `externalClientName`
- Updated Project responses to include `externalClientName`

**Impact:**
- Projects can now be created for external clients not in the system
- Frontend must validate: provide either clientOrgId OR externalClientName
- Project list/detail responses include externalClientName field

### 2026-02-10: Testing infra
**Files Changed:**
- `backend/src/app.ts` (exported Express app)
- `backend/src/index.ts` (guarded server start)
- `backend/package.json` (added supertest)
- `backend/src/api/integration/__tests__/project-flow.e2e.test.ts`

**Changes:**
- Exported Express app for tests, guarded server start in index.ts for Jest
- Added end-to-end project flow test (uses real DB, creates orgs/project/trial/sample, cleans up)

---

## ✅ CHANGE CHECKLIST (Use This When Modifying)

### When Changing Database Schema

- [ ] 1. Update `backend/src/database/schemas.ts` (FIRST - source of truth)
- [ ] 2. Create migration file in `backend/migrations/`
- [ ] 3. Update `backend/src/database/setup.ts` if new table
- [ ] 4. Run migration and verify schema
- [ ] 5. Update THIS FILE (AI_CONTEXT.md) "Database Schema Snapshot" section
- [ ] 6. Update affected API types in `backend/src/api/*/types.ts`
- [ ] 7. Update `openapi-spec.yaml` if API responses change
- [ ] 8. Update frontend types in `src/lib/types.ts`
- [ ] 9. Update transformers in `src/lib/endpointTransformers.ts`
- [ ] 10. Add entry to "Recent Changes Log" in THIS FILE
- [ ] 11. Update tests for affected APIs
- [ ] 12. Document in `SCHEMA_CHANGE_CHECKLIST.md` if complex

### When Changing API Endpoints

- [ ] 1. Update `openapi-spec.yaml` (FIRST - source of truth for API contract)
- [ ] 2. Update backend types in `backend/src/api/*/types.ts`
- [ ] 3. Update backend service/controller in `backend/src/api/*/service.ts`
- [ ] 4. Update THIS FILE (AI_CONTEXT.md) "API Contract Snapshot" section
- [ ] 5. Update `API_SPECIFICATION.md` if major changes
- [ ] 6. Update frontend types in `src/lib/types.ts`
- [ ] 7. Update `FRONTEND_API_EXPECTATIONS.md`
- [ ] 8. Update frontend API clients/hooks
- [ ] 9. Add entry to "Recent Changes Log" in THIS FILE
- [ ] 10. Update integration tests
- [ ] 11. Update API documentation

### When Changing Frontend Contract

- [ ] 1. Update `src/lib/types.ts` (FIRST - source of truth for frontend)
- [ ] 2. Update `FRONTEND_API_EXPECTATIONS.md`
- [ ] 3. Update THIS FILE (AI_CONTEXT.md) "Frontend API Expectations" section
- [ ] 4. Update transformers in `src/lib/endpointTransformers.ts`
- [ ] 5. Update affected components
- [ ] 6. Add entry to "Recent Changes Log" in THIS FILE
- [ ] 7. Test data flow end-to-end

---

## 🤖 AUTO-SYNC TOOLS

### Database Schema Snapshot Generator
```bash
# Run this to generate current DB schema snapshot
npm run db:schema-snapshot
# Output: backend/schema-snapshot.json
```

### API Contract Validator
```bash
# Validate openapi-spec.yaml against actual backend
npm run api:validate
```

### Frontend-Backend Type Sync Check
```bash
# Check for type mismatches between frontend and backend
npm run types:check-sync
```

---

## 🔍 QUICK REFERENCE

### Finding Schema Information
1. Database columns/types → `backend/src/database/schemas.ts`
2. API request/response types → `openapi-spec.yaml` or `backend/src/api/*/types.ts`
3. Frontend data models → `src/lib/types.ts`
4. Business rules → `PRD.md` and `SECURITY.md`

### Schema Validation Patterns
```typescript
// Always use schemas.ts validation
import { SAMPLE_SCHEMA } from '@/database/schemas';
const { error, value } = SAMPLE_SCHEMA.CreateRequest.validate(data);
```

### Tenant Isolation Pattern
```sql
-- Always filter by workspace_id (except platform admin)
SELECT * FROM samples 
WHERE workspace_id = $1 
  AND deleted_at IS NULL;
```

### External Client Check
```typescript
// Projects must have either client_org_id OR external_client_name
if (!clientOrgId && !externalClientName) {
  throw new Error('Must provide either clientOrgId or externalClientName');
}
```

---

## 📚 RELATED DOCUMENTATION

- [PRD.md](PRD.md) - Product requirements and business logic
- [SECURITY.md](SECURITY.md) - Authentication and authorization
- [API_SPECIFICATION.md](API_SPECIFICATION.md) - Complete API reference
- [FRONTEND_API_EXPECTATIONS.md](FRONTEND_API_EXPECTATIONS.md) - Frontend integration guide
- [SCHEMA_CHANGE_CHECKLIST.md](backend/SCHEMA_CHANGE_CHECKLIST.md) - Database migration guide
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Testing strategies

---

**🔄 Sync Status:** ✅ Current as of 2026-02-10  
**📊 Schema Version:** Migration 005  
**🎯 API Version:** 1.1.0
