# Projects Module Refactoring - Complete Example

This shows exactly how to refactor ONE module from old structure to new architecture.
Follow this pattern for all 12 modules.

---

## Before: Current Structure ❌

```
backend/src/
├── routes/
│   ├── projects.ts          [400+ lines, mixed HTTP + DB]
│   └── ... (other routes)
├── services/
│   └── authService.ts       [only auth service exists]
├── controllers/
│   └── authController.ts    [only auth controller exists]
└── ... (no type definitions for projects)
```

**Problem**: `routes/projects.ts` does everything:
- Defines routes
- Handles HTTP requests
- Validates input
- Queries database
- Formats responses
- Can't be tested without DB

---

## After: New Structure ✅

```
backend/src/api/
├── projects/
│   ├── routes.ts            [Route definitions - 50 lines]
│   ├── controller.ts        [HTTP handlers - 100 lines]
│   ├── service.ts           [Business logic - 200 lines]
│   ├── types.ts             [Interfaces & schemas - 80 lines]
│   └── __tests__/
│       ├── service.test.ts  [Unit tests - 150 lines]
│       └── controller.test.ts
└── ... (same for other modules)
```

**Benefit**:
- ✅ Separation of concerns
- ✅ Unit testable (mock service)
- ✅ Reusable logic
- ✅ Clear dependencies
- ✅ Scalable structure

---

## Step 1: Create Types & Validation Schema

### File: `backend/src/api/projects/types.ts`

```typescript
import Joi from 'joi';

// ============== INTERFACES ==============

/**
 * Request DTOs
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  workspace_id: string;
  status?: 'active' | 'archived';
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

export interface FilterProjectsRequest {
  workspace_id: string;
  status?: 'active' | 'archived';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Response DTOs (what gets sent back to client)
 */
export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  creator_id: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  data: ProjectResponse[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Internal DTOs (database row objects)
 */
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  creator_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

// ============== VALIDATION SCHEMAS ==============

export const createProjectSchema = Joi.object({
  name: Joi.string()
    .required()
    .max(255)
    .messages({ 'string.empty': 'Project name cannot be empty' }),
  description: Joi.string()
    .optional()
    .max(1000),
  workspace_id: Joi.string()
    .uuid()
    .required()
    .messages({ 'string.guid': 'workspace_id must be UUID' }),
  status: Joi.string()
    .optional()
    .valid('active', 'archived')
});

export const updateProjectSchema = Joi.object({
  name: Joi.string()
    .optional()
    .max(255),
  description: Joi.string()
    .optional()
    .max(1000),
  status: Joi.string()
    .optional()
    .valid('active', 'archived')
});

export const filterProjectsSchema = Joi.object({
  workspace_id: Joi.string()
    .uuid()
    .required(),
  status: Joi.string()
    .optional()
    .valid('active', 'archived'),
  search: Joi.string()
    .optional()
    .max(255),
  page: Joi.number()
    .optional()
    .min(1)
    .default(1),
  limit: Joi.number()
    .optional()
    .min(1)
    .max(100)
    .default(10)
});
```

---

## Step 2: Create Service (Business Logic)

### File: `backend/src/api/projects/service.ts`

```typescript
import { Pool, QueryResult } from 'pg';
import logger from '../../utils/logger';
import { errors } from '../../middleware/errorHandler';
import * as types from './types';

/**
 * ProjectService handles all business logic for projects
 * Uses dependency injection (pool passed in)
 * Can be unit tested by mocking the pool
 */
export class ProjectService {
  /**
   * Create a new project
   */
  static async create(
    pool: Pool,
    userId: string,
    data: types.CreateProjectRequest
  ): Promise<types.ProjectResponse> {
    try {
      // Validate workspace exists
      const workspaceCheck = await pool.query(
        `SELECT id FROM "Workspaces" WHERE id = $1`,
        [data.workspace_id]
      );

      if (workspaceCheck.rows.length === 0) {
        throw errors.notFound('Workspace', data.workspace_id);
      }

      // Create project
      const result = await pool.query(
        `INSERT INTO "Projects" 
         (name, description, workspace_id, creator_id, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [data.name, data.description || null, data.workspace_id, userId, data.status || 'active']
      );

      const project = result.rows[0] as types.ProjectRow;

      logger.info('Project created', {
        projectId: project.id,
        workspaceId: data.workspace_id,
        userId
      });

      return this.formatResponse(project);
    } catch (error) {
      logger.error('Failed to create project', { error, userId, data });
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  static async getById(
    pool: Pool,
    projectId: string,
    userId: string
  ): Promise<types.ProjectResponse> {
    try {
      const result = await pool.query(
        `SELECT p.* FROM "Projects" p
         WHERE p.id = $1 
         AND (p.creator_id = $2 OR EXISTS (
           SELECT 1 FROM "Workspaces" 
           WHERE id = p.workspace_id AND user_id = $2
         ))`,
        [projectId, userId]
      );

      if (result.rows.length === 0) {
        throw errors.notFound('Project', projectId);
      }

      return this.formatResponse(result.rows[0] as types.ProjectRow);
    } catch (error) {
      logger.error('Failed to get project', { error, projectId, userId });
      throw error;
    }
  }

  /**
   * List projects with filtering
   */
  static async list(
    pool: Pool,
    userId: string,
    filter: types.FilterProjectsRequest
  ): Promise<types.ProjectListResponse> {
    try {
      const offset = ((filter.page || 1) - 1) * (filter.limit || 10);

      let query = `SELECT * FROM "Projects" 
                   WHERE workspace_id = $1 
                   AND creator_id = $2`;
      const params: any[] = [filter.workspace_id, userId];

      // Add status filter
      if (filter.status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(filter.status);
      }

      // Add search filter
      if (filter.search) {
        query += ` AND name ILIKE $${params.length + 1}`;
        params.push(`%${filter.search}%`);
      }

      // Count total
      const countResult = await pool.query(
        query.replace('SELECT *', 'SELECT COUNT(*)'),
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated results
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(filter.limit || 10, offset);

      const result = await pool.query(query, params);

      return {
        data: result.rows.map(row => this.formatResponse(row as types.ProjectRow)),
        total,
        page: filter.page || 1,
        limit: filter.limit || 10
      };
    } catch (error) {
      logger.error('Failed to list projects', { error, userId, filter });
      throw error;
    }
  }

  /**
   * Update project
   */
  static async update(
    pool: Pool,
    projectId: string,
    userId: string,
    data: types.UpdateProjectRequest
  ): Promise<types.ProjectResponse> {
    try {
      // Check ownership
      const ownerCheck = await pool.query(
        `SELECT id FROM "Projects" WHERE id = $1 AND creator_id = $2`,
        [projectId, userId]
      );

      if (ownerCheck.rows.length === 0) {
        throw errors.forbidden('You do not own this project');
      }

      // Build update query dynamically
      const updates: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        params.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        params.push(data.description);
      }
      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        params.push(data.status);
      }

      if (updates.length === 0) {
        throw errors.badRequest('No fields to update');
      }

      params.push(projectId);

      const query = `UPDATE "Projects" 
                     SET ${updates.join(', ')}, updated_at = NOW()
                     WHERE id = $${paramCount}
                     RETURNING *`;

      const result = await pool.query(query, params);

      logger.info('Project updated', { projectId, userId, updates: data });

      return this.formatResponse(result.rows[0] as types.ProjectRow);
    } catch (error) {
      logger.error('Failed to update project', { error, projectId, userId, data });
      throw error;
    }
  }

  /**
   * Delete project
   */
  static async delete(
    pool: Pool,
    projectId: string,
    userId: string
  ): Promise<void> {
    try {
      const result = await pool.query(
        `DELETE FROM "Projects" 
         WHERE id = $1 AND creator_id = $2 
         RETURNING id`,
        [projectId, userId]
      );

      if (result.rows.length === 0) {
        throw errors.notFound('Project', projectId);
      }

      logger.info('Project deleted', { projectId, userId });
    } catch (error) {
      logger.error('Failed to delete project', { error, projectId, userId });
      throw error;
    }
  }

  /**
   * Helper: Format database row to API response
   */
  private static formatResponse(row: types.ProjectRow): types.ProjectResponse {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      workspace_id: row.workspace_id,
      creator_id: row.creator_id,
      status: row.status as 'active' | 'archived',
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    };
  }
}
```

---

## Step 3: Create Controller (HTTP Handlers)

### File: `backend/src/api/projects/controller.ts`

```typescript
import { Request, Response } from 'express';
import { pool } from '../../db';
import { asyncHandler } from '../../middleware/errorHandler';
import { ProjectService } from './service';
import * as types from './types';

/**
 * ProjectController handles HTTP request/response logic
 * Thin layer - just calls service and formats responses
 */
export const projectController = {
  /**
   * POST /api/projects
   * Create new project
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await ProjectService.create(
      pool,
      req.user?.id!,
      req.body as types.CreateProjectRequest
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: result
    });
  }),

  /**
   * GET /api/projects/:id
   * Get project by ID
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const result = await ProjectService.getById(
      pool,
      req.params.id,
      req.user?.id!
    );

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * GET /api/projects
   * List projects with filtering
   */
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await ProjectService.list(
      pool,
      req.user?.id!,
      {
        workspace_id: req.query.workspace_id as string,
        status: req.query.status as 'active' | 'archived',
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      }
    );

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      }
    });
  }),

  /**
   * PUT /api/projects/:id
   * Update project
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const result = await ProjectService.update(
      pool,
      req.params.id,
      req.user?.id!,
      req.body as types.UpdateProjectRequest
    );

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: result
    });
  }),

  /**
   * DELETE /api/projects/:id
   * Delete project
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await ProjectService.delete(
      pool,
      req.params.id,
      req.user?.id!
    );

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  })
};
```

---

## Step 4: Create Routes (Endpoint Definitions)

### File: `backend/src/api/projects/routes.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { projectController } from './controller';
import * as types from './types';

const router = Router();

/**
 * All project routes require authentication
 */
router.use(authenticate);

/**
 * POST /api/projects
 * Create new project
 */
router.post('/',
  validate(types.createProjectSchema),
  projectController.create
);

/**
 * GET /api/projects
 * List projects
 */
router.get('/',
  validate(types.filterProjectsSchema, 'query'),
  projectController.list
);

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get('/:id',
  projectController.getById
);

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id',
  validate(types.updateProjectSchema),
  projectController.update
);

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id',
  projectController.delete
);

export default router;
```

---

## Step 5: Update Server Entry Point

### File: `backend/src/index.ts` (Changes Only)

```typescript
// Remove old import
// import projectRoutes from './routes/projects';

// Add new import
import projectRoutes from './api/projects/routes';

// Rest stays the same
app.use('/api/projects', projectRoutes);
```

---

## Step 6: Create Unit Tests

### File: `backend/src/api/projects/__tests__/service.test.ts`

```typescript
import { ProjectService } from '../service';
import * as types from '../types';
import { errors } from '../../../middleware/errorHandler';

// Mock the database pool
const mockPool = {
  query: jest.fn()
};

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const userId = 'user-123';
      const data: types.CreateProjectRequest = {
        name: 'Test Project',
        workspace_id: 'ws-123',
        description: 'A test project'
      };

      // Mock workspace check
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'ws-123' }] });

      // Mock project creation
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'proj-123',
          name: data.name,
          description: data.description,
          workspace_id: data.workspace_id,
          creator_id: userId,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const result = await ProjectService.create(mockPool as any, userId, data);

      expect(result.id).toBe('proj-123');
      expect(result.name).toBe('Test Project');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if workspace does not exist', async () => {
      const userId = 'user-123';
      const data: types.CreateProjectRequest = {
        name: 'Test Project',
        workspace_id: 'ws-invalid'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        ProjectService.create(mockPool as any, userId, data)
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return project if user is creator', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'proj-123',
          name: 'Test Project',
          creator_id: 'user-123',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const result = await ProjectService.getById(
        mockPool as any,
        'proj-123',
        'user-123'
      );

      expect(result.id).toBe('proj-123');
    });

    it('should throw 404 if project not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        ProjectService.getById(mockPool as any, 'proj-invalid', 'user-123')
      ).rejects.toThrow();
    });
  });
});
```

---

## Summary: What Changed

| Aspect | Before | After |
|--------|--------|-------|
| File Location | `/routes/projects.ts` | `/api/projects/{routes,controller,service,types}.ts` |
| File Size | 400+ lines | 50 + 100 + 200 + 80 = 430 lines (split) |
| Testability | Needs DB | Mocks pool, unit testable |
| Reusability | Can't reuse | Service calls from anywhere |
| Type Safety | Partial | Full types for requests/responses |
| Organization | By layer | By domain |
| Dependency Flow | Mixed | Clear: routes → controller → service → db |

---

## Apply This Pattern to All 12 Modules

Use the structure above for:
1. ✅ **auth** (already done)
2. **projects** (this example)
3. **samples**
4. **analyses**
5. **company**
6. **workspaces**
7. **notifications**
8. **admin**
9. **apiKeys**
10. **access**
11. **derivedSamples**
12. **integration** (or others)

---

## Validation: Checklist for Each Module

After refactoring a module:
- [ ] Service file created with all CRUD methods
- [ ] Controller file created with thin HTTP handlers
- [ ] Types file created with interfaces and Joi schemas
- [ ] Routes file updated to use new structure
- [ ] Old routes file deleted
- [ ] index.ts updated with new import path
- [ ] Unit tests written for service methods
- [ ] npm run build succeeds
- [ ] npm test passes
- [ ] Manual API testing works

---

**Next Action**: Copy this structure for projects, then apply to all remaining modules.
