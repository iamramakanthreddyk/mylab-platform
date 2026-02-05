# Route Refactoring Checklist

Use this checklist to refactor each existing route to follow the new architecture pattern.

## Example: Refactoring `/api/projects` Route

### Step 1: Create Service (`src/services/projectService.ts`)

**Copy this template and customize:**

```typescript
import { Pool } from 'pg';
import logger from '../utils/logger';
import { AppError, errors } from '../middleware/errorHandler';

export interface ProjectInput {
  name: string;
  description?: string;
  clientOrgId: string;
  executingOrgId: string;
  workspaceId: string;
  createdBy: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  clientOrgId: string;
  executingOrgId: string;
  workspaceId: string;
  status: string;
  createdAt: Date;
}

export class ProjectService {
  constructor(private pool: Pool) {}

  /**
   * Get all projects for a workspace
   */
  async getAll(workspaceId: string): Promise<Project[]> {
    try {
      const result = await this.pool.query(
        `SELECT p.*, o.name as client_org_name, o2.name as executing_org_name
         FROM Projects p
         JOIN Organizations o ON p.client_org_id = o.id
         JOIN Organizations o2 ON p.executing_org_id = o2.id
         WHERE p.workspace_id = $1
         ORDER BY p.created_at DESC`,
        [workspaceId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching projects', {
        error: error instanceof Error ? error.message : String(error),
        workspaceId
      });
      throw errors.internalServer('Failed to fetch projects');
    }
  }

  /**
   * Get project by ID with access check
   */
  async getById(id: string, workspaceId: string): Promise<Project> {
    try {
      const result = await this.pool.query(
        `SELECT p.* FROM Projects p
         WHERE p.id = $1 AND p.workspace_id = $2`,
        [id, workspaceId]
      );

      if (result.rows.length === 0) {
        throw errors.notFound('Project', id);
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error fetching project', {
        error: error instanceof Error ? error.message : String(error),
        projectId: id
      });
      throw errors.internalServer('Failed to fetch project');
    }
  }

  /**
   * Create new project
   */
  async create(data: ProjectInput): Promise<Project> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO Projects (name, description, client_org_id, executing_org_id, workspace_id, created_by, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [
          data.name,
          data.description || null,
          data.clientOrgId,
          data.executingOrgId,
          data.workspaceId,
          data.createdBy
        ]
      );

      await client.query('COMMIT');

      logger.info('Project created', {
        projectId: result.rows[0].id,
        name: data.name,
        workspaceId: data.workspaceId
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof AppError) throw error;
      logger.error('Error creating project', {
        error: error instanceof Error ? error.message : String(error),
        name: data.name
      });
      throw errors.internalServer('Failed to create project');
    } finally {
      client.release();
    }
  }

  /**
   * Update project
   */
  async update(id: string, workspaceId: string, updates: Partial<ProjectInput>): Promise<Project> {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (updates.name) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.description) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }

      if (fields.length === 0) {
        throw errors.badRequest('No fields to update');
      }

      fields.push(`updated_at = NOW()`);
      values.push(id, workspaceId);

      const query = `UPDATE Projects SET ${fields.join(', ')}
                    WHERE id = $${paramCount++} AND workspace_id = $${paramCount++}
                    RETURNING *`;

      const result = await this.pool.query(query, values);

      if (result.rows.length === 0) {
        throw errors.notFound('Project', id);
      }

      logger.info('Project updated', { projectId: id });
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating project', {
        error: error instanceof Error ? error.message : String(error),
        projectId: id
      });
      throw errors.internalServer('Failed to update project');
    }
  }

  /**
   * Delete project
   */
  async delete(id: string, workspaceId: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'DELETE FROM Projects WHERE id = $1 AND workspace_id = $2 RETURNING id',
        [id, workspaceId]
      );

      if (result.rows.length === 0) {
        throw errors.notFound('Project', id);
      }

      logger.info('Project deleted', { projectId: id });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting project', {
        error: error instanceof Error ? error.message : String(error),
        projectId: id
      });
      throw errors.internalServer('Failed to delete project');
    }
  }
}
```

---

### Step 2: Create Controller (`src/controllers/projectController.ts`)

**Copy this template and customize:**

```typescript
import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService';
import { pool } from '../db';
import { asyncHandler, errors } from '../middleware/errorHandler';
import logger from '../utils/logger';

const projectService = new ProjectService(pool);

export const projectController = {
  /**
   * GET /api/v1/projects
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    logger.info('Fetching projects', { workspaceId: user.workspaceId });
    
    const projects = await projectService.getAll(user.workspaceId);
    
    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  }),

  /**
   * GET /api/v1/projects/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;

    logger.info('Fetching project', { projectId: id, userId: user.id });
    
    const project = await projectService.getById(id, user.workspaceId);
    
    res.json({
      success: true,
      data: project
    });
  }),

  /**
   * POST /api/v1/projects
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { name, description, clientOrgId, executingOrgId } = req.body;

    logger.info('Creating project', { name, workspaceId: user.workspaceId });

    const project = await projectService.create({
      name,
      description,
      clientOrgId,
      executingOrgId,
      workspaceId: user.workspaceId,
      createdBy: user.id
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  }),

  /**
   * PUT /api/v1/projects/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating project', { projectId: id });

    const project = await projectService.update(id, user.workspaceId, updates);

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  }),

  /**
   * DELETE /api/v1/projects/:id
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;

    logger.info('Deleting project', { projectId: id });

    await projectService.delete(id, user.workspaceId);

    res.status(204).send();
  })
};
```

---

### Step 3: Create Route (`src/routes/projects.ts` - Updated)

```typescript
import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { auditLog } from '../middleware';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().required().min(3).max(255),
  description: Joi.string().optional().max(1000),
  clientOrgId: Joi.string().uuid().required(),
  executingOrgId: Joi.string().uuid().required(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().optional().min(3).max(255),
  description: Joi.string().optional().max(1000),
}).min(1);

// Routes
router.get('/', authenticate, projectController.getAll);
router.get('/:id', authenticate, projectController.getById);
router.post('/', 
  authenticate, 
  auditLog('create', 'project'),
  validate(createProjectSchema),
  projectController.create
);
router.put('/:id', 
  authenticate,
  auditLog('update', 'project'),
  validate(updateProjectSchema),
  projectController.update
);
router.delete('/:id', 
  authenticate,
  auditLog('delete', 'project'),
  projectController.delete
);

export default router;
```

---

### Step 4: Add Tests (`src/services/__tests__/projectService.test.ts`)

```typescript
import { ProjectService } from '../projectService';
import { errors } from '../../middleware/errorHandler';

describe('ProjectService', () => {
  let mockPool: any;
  let projectService: ProjectService;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };
    projectService = new ProjectService(mockPool);
  });

  describe('getById', () => {
    it('should throw notFound error for non-existent project', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        projectService.getById('invalid-id', 'workspace-123')
      ).rejects.toThrow();
    });

    it('should return project when found', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' };
      mockPool.query.mockResolvedValue({ rows: [mockProject] });

      const result = await projectService.getById('proj-1', 'workspace-123');

      expect(result).toEqual(mockProject);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['proj-1', 'workspace-123']
      );
    });
  });

  describe('create', () => {
    it('should create project with provided data', async () => {
      const client = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(client);

      const mockProject = { id: 'proj-1', name: 'New Project' };
      client.query.mockResolvedValue({ rows: [mockProject] });

      const input = {
        name: 'New Project',
        clientOrgId: 'org-1',
        executingOrgId: 'org-2',
        workspaceId: 'ws-1',
        createdBy: 'user-1'
      };

      const result = await projectService.create(input);

      expect(result).toEqual(mockProject);
      expect(client.query).toHaveBeenCalledWith('BEGIN');
      expect(client.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
```

---

### Step 5: Update `src/index.ts`

Change the route import from:
```typescript
import projectRoutes from './routes/projects';
// ...
app.use('/api/projects', projectRoutes);
```

To:
```typescript
import projectRoutes from './routes/projects';
// ...
app.use('/api/v1/projects', projectRoutes);  // Now versioned!
```

---

### Step 6: Test Locally

```bash
# Run specific test
npm test projectService.test.ts

# Run in watch mode
npm run test:watch

# Try the route
curl http://localhost:3001/api/v1/projects
# Should return: { success: true, count: 0, data: [] }
```

---

### Step 7: Push & Merge

```bash
git add .
git commit -m "refactor: projects route to controller/service pattern"
git push
# Wait for CI/CD to pass
# Merge PR
```

---

## Checklist for Each Route Refactor

Use this for any route (auth, samples, analyses, etc.):

- [ ] **Service Created** (`src/services/{module}Service.ts`)
  - [ ] All business logic moved from routes
  - [ ] Error handling added (throw `AppError`)
  - [ ] Logging added
  - [ ] Transaction handling in place (if needed)

- [ ] **Controller Created** (`src/controllers/{module}Controller.ts`)
  - [ ] All methods wrapped with `asyncHandler`
  - [ ] Request parsing done
  - [ ] Response formatting standardized
  - [ ] Logging added

- [ ] **Routes Updated** (`src/routes/{module}.ts`)
  - [ ] Clean, 3-5 lines per route
  - [ ] Validation schemas added (Joi)
  - [ ] `validate()` middleware used
  - [ ] Controllers imported and used

- [ ] **Tests Written**
  - [ ] Unit tests for service (mock DB)
  - [ ] Integration tests for routes (real DB)
  - [ ] Error scenarios covered
  - [ ] Happy path covered

- [ ] **Integrated**
  - [ ] Updated `src/index.ts` to use versioned routes
  - [ ] Removed old route file (if separate)
  - [ ] `npm run dev` works locally
  - [ ] Manual testing done

- [ ] **Validated**
  - [ ] All tests pass (`npm test`)
  - [ ] Linting passes (`npm run lint`)
  - [ ] Build succeeds (`npm run build`)
  - [ ] CI/CD passes on branch

- [ ] **Merged**
  - [ ] PR reviewed
  - [ ] CI/CD passes
  - [ ] Merged to main

---

## Pro Tips

1. **Start with auth** - It's already refactored! Copy the pattern.
2. **Refactor one route at a time** - Easier to debug, easier to review.
3. **Keep old route working** - Route to old file during refactor, switch after testing.
4. **Add tests first** - Test-driven refactoring is safer.
5. **Lean on the error helpers** - `errors.notFound()`, `errors.badRequest()`, etc.
6. **Log important events** - Creates service, updates, deletes.
7. **Let CI/CD catch issues** - Run locally, but trust the pipeline.

---

## Quick Copy-Paste Commands

```bash
# Create service file
touch backend/src/services/projectService.ts

# Create controller file
touch backend/src/controllers/projectController.ts

# Create test file
touch backend/src/services/__tests__/projectService.test.ts

# Test refactored code
npm test projectService.test.ts

# See it work
npm run dev
# Visit http://localhost:3001/api/v1/projects
```

---

Done! Follow this process for each route and your codebase will be transformed. 🏗️
