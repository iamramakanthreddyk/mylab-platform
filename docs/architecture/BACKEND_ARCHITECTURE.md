# Backend Architecture & Structure Guide

## Current State Analysis

### ✅ What's Implemented
```
✓ Main entry point: index.ts
✓ Database layer: db.ts (PostgreSQL pooling)
✓ Migrations: database/migrations.ts (auto-run on startup)
✓ Middleware layer: auth, errorHandler, validation, accessControl
✓ 1 Service: authService
✓ 1 Controller: authController
✓ 12 Route files: auth, projects, samples, analyses, etc.
✓ Utilities: logger, JWT helpers
```

### ❌ What's Missing
```
✗ Services for 11 other routes (projects, samples, analyses, etc.)
✗ Controllers for 11 other routes
✗ Unified API response format
✗ Type definitions for models
✗ API documentation integration
✗ Dependency injection container
✗ Clear folder organization for different API domains
```

---

## Ideal Directory Structure

```
backend/src/
│
├── index.ts                           [Server entry point]
├── preload.ts                         [Env variables]
├── db.ts                              [Database pool]
│
├── config/                            [Configuration]
│   ├── platform.ts
│   ├── database.ts
│   └── constants.ts
│
├── types/                             [TypeScript interfaces] ⭐ MISSING
│   ├── models.ts                      [Entity definitions]
│   ├── request.ts                     [Request DTOs]
│   ├── response.ts                    [Response DTOs]
│   └── index.ts                       [Export all]
│
├── database/                          [Database layer]
│   ├── migrations.ts                  [✓ Ready]
│   ├── setup.ts
│   └── seeders/                       [⭐ Optional]
│       └── index.ts
│
├── middleware/                        [Express middleware]
│   ├── index.ts                       [✓ Export all]
│   ├── auth.ts                        [✓ JWT auth]
│   ├── errorHandler.ts                [✓ Error handling]
│   ├── validation.ts                  [✓ Input validation]
│   ├── accessControl.ts               [✓ Authorization]
│   ├── analytics.ts                   [✓ Tracking]
│   └── rateLimitUtils.ts              [✓ Rate limiting]
│
├── utils/                             [Utilities]
│   ├── logger.ts                      [✓ Winston logging]
│   ├── jwt.ts                         [Token generation]
│   ├── errors.ts                      [Error definitions]
│   └── helpers.ts                     [Helper functions]
│
├── api/                               [API Layer] ⭐ NEW STRUCTURE
│   │
│   ├── auth/                          [Auth domain]
│   │   ├── controller.ts              [HTTP handlers]
│   │   ├── service.ts                 [Business logic]
│   │   ├── routes.ts                  [Endpoints]
│   │   ├── types.ts                   [Auth-specific types]
│   │   └── __tests__/
│   │       └── service.test.ts
│   │
│   ├── projects/                      [Projects domain] ⭐ TO REFACTOR
│   │   ├── controller.ts              [HTTP handlers]
│   │   ├── service.ts                 [Business logic]
│   │   ├── routes.ts                  [Endpoints]
│   │   ├── types.ts                   [Project-specific types]
│   │   └── __tests__/
│   │       └── service.test.ts
│   │
│   ├── samples/                       [Samples domain] ⭐ TO REFACTOR
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── analyses/                      [Analyses domain] ⭐ TO REFACTOR
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── company/                       [Company domain] ⭐ TO REFACTOR
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── workspaces/                    [Workspaces domain] ⭐ TO REFACTOR
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── notifications/                 [Notifications domain] ⭐ TO REFACTOR
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   ├── admin/                         [Admin domain] ⭐ TO REFACTOR
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── __tests__/
│   │
│   └── apiKeys/                       [API Keys domain] ⭐ TO REFACTOR
│       ├── controller.ts
│       ├── service.ts
│       ├── routes.ts
│       ├── types.ts
│       └── __tests__/
│
├── jobs/                              [Background jobs]
│   └── tokenCleanup.ts                [✓ Token cleanup]
│
└── scripts/                           [Utility scripts]
    └── create-indexes.ts              [⭐ Deprecated - use migrations instead]
```

---

## Data Flow & Connections

### Request Lifecycle

```
1. HTTP Request comes in
   ↓
2. middleware/auth.ts
   ├─ Verify JWT token
   ├─ Attach user to req
   └─ Continue or reject
   ↓
3. middleware/validation.ts
   ├─ Validate request body/params
   └─ Continue or 400 error
   ↓
4. middleware/accessControl.ts
   ├─ Check user permissions
   └─ Continue or 403 error
   ↓
5. api/{domain}/routes.ts (e.g., projects/routes.ts)
   ├─ Match URL pattern
   ├─ Call appropriate controller method
   └─ Pass req, res to controller
   ↓
6. api/{domain}/controller.ts (e.g., projects/controller.ts)
   ├─ Extract data from request
   ├─ Call service method
   ├─ Handle response formatting
   └─ Send JSON response
   ↓
7. api/{domain}/service.ts (e.g., projects/service.ts)
   ├─ Get database pool from db.ts
   ├─ Execute queries
   ├─ Business logic validation
   ├─ Call other services if needed
   └─ Return result
   ↓
8. database/migrations.ts + db.ts
   ├─ Execute SQL
   ├─ Map rows to objects
   └─ Return data
   ↓
9. Response returned through:
   controller → route → middleware (logging) → browser
```

---

## Component Responsibilities

### Route Files (`api/{domain}/routes.ts`)
**Responsibility**: Define endpoints and connect to controllers

```typescript
// Example: api/projects/routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { projectController } from './controller';
import * as schemas from './types';

const router = Router();

router.post('/', 
  authenticate,
  validate(schemas.createSchema),
  projectController.create
);

router.get('/:id',
  authenticate,
  projectController.getById
);

export default router;
```

**Responsibility**: ✓ Route mapping only

---

### Controllers (`api/{domain}/controller.ts`)
**Responsibility**: Handle HTTP request/response cycle

```typescript
// Example: api/projects/controller.ts
import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { projectService } from './service';

export const projectController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await projectService.create(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Project created'
    });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const result = await projectService.getById(req.params.id, req.user.id);
    res.json({
      success: true,
      data: result
    });
  })
};
```

**Responsibility**:
- ✓ Extract data from request
- ✓ Call service method
- ✓ Format response
- ✓ Handle HTTP status codes
- ✓ NO database queries

---

### Services (`api/{domain}/service.ts`)
**Responsibility**: Business logic and database queries

```typescript
// Example: api/projects/service.ts
import { pool } from '../../db';
import * as types from './types';
import logger from '../../utils/logger';

export class ProjectService {
  static async create(userId: string, data: types.CreateProjectRequest) {
    // Validate business rules
    const workspace = await this.getWorkspace(data.workspace_id); 
    if (!workspace) throw errors.notFound('Workspace');

    // Execute query
    const result = await pool.query(
      `INSERT INTO Projects (name, creator_id, workspace_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [data.name, userId, data.workspace_id]
    );

    logger.info('Project created', { projectId: result.rows[0].id, userId });
    return result.rows[0];
  }

  static async getById(projectId: string, userId: string) {
    // Check permissions
    const project = await pool.query(
      `SELECT * FROM Projects 
       WHERE id = $1 AND creator_id = $2`,
      [projectId, userId]
    );

    if (project.rows.length === 0) {
      throw errors.notFound('Project');
    }

    return project.rows[0];
  }
}
```

**Responsibility**:
- ✓ Business logic
- ✓ Database queries
- ✓ Data validation
- ✓ Caller authentication checks
- ✗ NO HTTP handling
- ✗ NO middleware

---

### Types (`api/{domain}/types.ts`)
**Responsibility**: TypeScript interfaces and validation schemas

```typescript
// Example: api/projects/types.ts
import Joi from 'joi';

// Request DTOs
export interface CreateProjectRequest {
  name: string;
  workspace_id: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

// Response DTOs
export interface ProjectResponse {
  id: string;
  name: string;
  workspace_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const createSchema = Joi.object({
  name: Joi.string().required().max(255),
  workspace_id: Joi.string().uuid().required(),
  description: Joi.string().optional().max(1000)
});

export const updateSchema = Joi.object({
  name: Joi.string().optional().max(255),
  description: Joi.string().optional().max(1000)
});
```

---

## Middleware Flow

### 1. Authentication (`middleware/auth.ts`)
```
Request → Validate JWT
         ↓
         Extract user from token
         ↓
         Attach user to req.user
         ↓
         Continue or 401 error
```

### 2. Validation (`middleware/validation.ts`)
```
Request → Validate against schema
         ↓
         Body/Params valid?
         ↓
         Continue or 400 error
```

### 3. Access Control (`middleware/accessControl.ts`)
```
Request → Check user permissions
         ↓
         Has role/permission?
         ↓
         Continue or 403 error
```

### 4. Error Handler (`middleware/errorHandler.ts`)
```
Any error → Catch and log
           ↓
           Format as JSON
           ↓
           Return with status code
```

---

## Current Issues & How to Fix

### Issue 1: Routes without services/controllers
**Current**: `routes/projects.ts` does everything (HTTP + DB)
**Problem**: Can't unit test without DB, code duplication
**Fix**: Extract into `api/projects/{controller, service, types}.ts`

### Issue 2: No type definitions
**Current**: Types scattered or missing
**Problem**: No IDE autocomplete, hard to track data contracts
**Fix**: Create `api/{domain}/types.ts` for each module

### Issue 3: No clear separation of concerns
**Current**: Route files mix HTTP logic with business logic
**Problem**: Hard to test, hard to reuse logic
**Fix**: Use controller → service → database pattern

### Issue 4: Scripts folder has deprecated migration script
**Current**: `scripts/create-indexes.ts` (manual)
**Problem**: Redundant now that migrations auto-run
**Fix**: Delete after confirming migrations work

### Issue 5: No domain organization
**Current**: All routes at same level
**Problem**: Doesn't scale as codebase grows
**Fix**: Group related endpoints: `api/{domain}/{controller,service,routes}.ts`

---

## Refactoring Roadmap

### Phase 1: Standardize Existing (This Week)
```
❌ Current
routes/
├── auth.ts
├── projects.ts
├── samples.ts
├── analyses.ts
└── ...

✅ Goal: Reorganize into domains
api/
├── auth/
│   ├── routes.ts
│   ├── controller.ts ← Extract
│   ├── service.ts ← Extract
│   └── types.ts ← Create
├── projects/
│   ├── routes.ts ← Refactor
│   ├── controller.ts ← Extract
│   ├── service.ts ← Extract
│   └── types.ts ← Create
└── ... (10 more domains)
```

### Phase 2: Create Type Definitions
```
For each domain (11 total):
1. Create /api/{domain}/types.ts
2. Define interfaces for requests/responses
3. Define Joi schemas for validation
4. Export all for use in controller/service
```

### Phase 3: Extract Services
```
For each domain (11 total):
1. Create /api/{domain}/service.ts
2. Move database queries from routes.ts
3. Add business logic handling
4. Make unit-testable with mocked pool
```

### Phase 4: Extract Controllers
```
For each domain (11 total):
1. Create /api/{domain}/controller.ts
2. Move HTTP handlers from routes.ts
3. Add request/response formatting
4. Remove database logic (move to service)
```

### Phase 5: Update Routes
```
For each domain (11 total):
1. Update /api/{domain}/routes.ts
2. Import controller methods
3. Add validation middleware
4. Add auth middleware
5. Delete old route logic
```

---

## File Naming Conventions

### Controllers
```
❌ authController.ts (inconsistent)
✅ controller.ts (within api/auth folder)

Reference: api/auth/controller.ts
```

### Services
```
❌ authService.ts (inconsistent)
✅ service.ts (within api/auth folder)

Reference: api/auth/service.ts
```

### Routes
```
❌ auth.ts, projects.ts (at root level)
✅ routes.ts (within each domain folder)

Reference: api/auth/routes.ts
```

### Types
```
❌ No standard yet
✅ types.ts (within each domain folder)

Reference: api/projects/types.ts
Exports: interfaces, Joi schemas, DTOs
```

---

## Connection Map

```
HTTP Request
    ↓
index.ts (app setup)
    ├─ app.use(helmet, cors, morgan)
    ├─ app.use(errorHandler)
    ├─ app.use('/api/auth', authRoutes)
    ├─ app.use('/api/projects', projectRoutes)
    └─ ...
    ↓
middleware/ (checks)
    ├─ auth.ts (JWT verification)
    ├─ validation.ts (schema validation)
    ├─ accessControl.ts (permissions)
    └─ errorHandler.ts (error formatting)
    ↓
api/{domain}/routes.ts (endpoint mapping)
    └─ Calls controller methods
    ↓
api/{domain}/controller.ts (HTTP handlers)
    └─ Calls service methods
    ↓
api/{domain}/service.ts (business logic)
    ├─ Query database via db.ts
    ├─ Call other services
    └─ Return formatted data
    ↓
db.ts (connection pool)
    ├─ Manages PostgreSQL connections
    └─ Executes queries
    ↓
database/migrations.ts (schema)
    └─ Creates tables, indexes
    ↓
HTTP Response
```

---

## Dependencies Between Modules

### Auth Module
```
auth/routes.ts
  ↓ imports
auth/controller.ts
  ↓ imports
auth/service.ts
  ↓ imports
├─ db.ts (pool)
├─ utils/logger.ts
├─ utils/jwt.ts
└─ types.ts (interfaces)
```

### Projects Module
```
projects/routes.ts
  ↓ imports
projects/controller.ts
  ↓ imports
projects/service.ts
  ├─ db.ts (pool)
  ├─ auth/service.ts (check auth)
  ├─ workspaces/service.ts (validate workspace)
  ├─ utils/logger.ts
  └─ types.ts (interfaces)
```

### Cross-Module Dependencies
```
projects/service.ts
  ├─ workspaces/service.ts (validates workspace exists)
  ├─ auth/service.ts (may verify user)
  └─ notifications/service.ts (create notification)

analyses/service.ts
  ├─ samples/service.ts (get sample data)
  ├─ projects/service.ts (validate project exists)
  └─ notifications/service.ts (notify on completion)
```

---

## Summary: Where Things Go

| Component | Location | Responsibility |
|-----------|----------|-----------------|
| HTTP routes | `api/{domain}/routes.ts` | URL patterns |
| Request handlers | `api/{domain}/controller.ts` | HTTP request/response |
| Business logic | `api/{domain}/service.ts` | Data processing |
| Type definitions | `api/{domain}/types.ts` | Interfaces, validation |
| Database | `db.ts` | Connection pool |
| Migrations | `database/migrations.ts` | Schema changes |
| Authentication | `middleware/auth.ts` | JWT verification |
| Validation | `middleware/validation.ts` | Body/param validation |
| Permissions | `middleware/accessControl.ts` | Role checking |
| Error handling | `middleware/errorHandler.ts` | Error formatting |
| Logging | `utils/logger.ts` | Winston logging |
| Server setup | `index.ts` | Express app initialization |

---

## Next Steps

1. **Today**: Review this structure
2. **Tomorrow**: 
   - Create `api/` folder structure
   - Move existing auth files there
   - Create types for auth module
3. **This Week**:
   - Refactor 3 modules (projects, samples, analyses)
   - Create types for each
   - Extract services and controllers
4. **Next Week**:
   - Complete remaining 8 modules
   - All following same pattern
   - Run tests to verify

**Result**: Scalable, testable, maintainable architecture ✅
