# API Architecture & Best Practices Guide

This guide documents the improvements made to the MyLab platform architecture and how to extend them.

## Table of Contents

1. [Logging & Error Handling](#logging--error-handling)
2. [Controller/Service Architecture](#controllerservice-architecture)
3. [API Versioning Strategy](#api-versioning-strategy)
4. [Input Validation](#input-validation)
5. [Testing Patterns](#testing-patterns)
6. [CI/CD Pipeline](#cicd-pipeline)

---

## Logging & Error Handling

### Winston Logger Setup

All logging is now centralized using Winston. Log files are stored in the `logs/` directory:
- `error.log` - Error messages only
- `combined.log` - All messages
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

### Usage

```typescript
import logger from './utils/logger';

// Different log levels
logger.info('Info message', { userId: user.id });
logger.warn('Warning message', { action: 'something' });
logger.error('Error message', { error: err.message });
logger.debug('Debug message', { data: object });
logger.http('HTTP request', { method, path }); // Morgan uses this
```

### Global Error Handler

All route handlers should throw `AppError` for consistent error responses:

```typescript
import { AppError, errors, asyncHandler } from '../middleware/errorHandler';

// Use asyncHandler to catch promise rejections
router.get('/path', asyncHandler(async (req, res) => {
  const item = await service.getItem(id);
  
  if (!item) {
    throw errors.notFound('Item', id);
  }
  
  if (!hasPermission(req.user)) {
    throw errors.forbidden('You do not have permission to access this');
  }
  
  res.json(item);
}));
```

### Available Error Helpers

```typescript
errors.notFound(resource, id?)        // 404
errors.unauthorized(reason?)          // 401
errors.forbidden(reason?)             // 403
errors.badRequest(message, details?)  // 400
errors.conflict(message)              // 409
errors.unprocessable(message)         // 422
errors.tooManyRequests()              // 429
errors.internalServer(message?)       // 500
```

---

## Controller/Service Architecture

### Pattern: Route → Controller → Service → Database

```
routes/authRefactored.ts          # Route definitions
    ↓
controllers/authController.ts     # HTTP request/response handling
    ↓
services/authService.ts           # Business logic & transactions
    ↓
db.ts (pool.query)               # Database queries
```

### Service Example

Services contain pure business logic with no Express dependencies:

```typescript
// src/services/projectService.ts
import { Pool } from 'pg';
import { AppError, errors } from '../middleware/errorHandler';

export class ProjectService {
  constructor(private pool: Pool) {}

  async createProject(data: ProjectInput): Promise<Project> {
    // Validation
    if (!data.name) {
      throw errors.badRequest('Project name is required');
    }

    // Business logic in a transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        'INSERT INTO Projects (name, workspace_id) VALUES ($1, $2) RETURNING *',
        [data.name, data.workspaceId]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProject(id: string, updates: object): Promise<Project> {
    const result = await this.pool.query(
      'UPDATE Projects SET ... WHERE id = $1 RETURNING *',
      [id, ...]
    );

    if (result.rows.length === 0) {
      throw errors.notFound('Project', id);
    }

    return result.rows[0];
  }
}
```

### Controller Example

Controllers handle HTTP concerns (request parsing, response formatting):

```typescript
// src/controllers/projectController.ts
import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService';
import { asyncHandler, errors } from '../middleware/errorHandler';
import logger from '../utils/logger';

const service = new ProjectService(pool);

export const projectController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    logger.info('Creating project', { workspaceId: req.user.workspaceId });
    
    const project = await service.createProject({
      name: req.body.name,
      description: req.body.description,
      workspaceId: req.user.workspaceId,
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const project = await service.updateProject(req.params.id, req.body);
    res.json({ success: true, data: project });
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await service.deleteProject(req.params.id, req.user.workspaceId);
    res.status(204).send();
  }),
};
```

### Route Definition

```typescript
// src/routes/projects.ts
import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authenticate, validate } from '../middleware';

const router = Router();

router.post('/', authenticate, validate(createProjectSchema), projectController.create);
router.put('/:id', authenticate, validate(updateProjectSchema), projectController.update);
router.delete('/:id', authenticate, projectController.delete);

export default router;
```

---

## API Versioning Strategy

### Recommended Approach: URL-based Versioning

Version your API in the URL path:

```
/api/v1/projects      ← Current version
/api/v2/projects      ← Future version with breaking changes
```

### Implementation

Update `src/index.ts`:

```typescript
// Instead of: app.use('/api/auth', authRoutes);
// Use versioned routes:

import v1 from './routes/v1';
import v2 from './routes/v2';

app.use('/api/v1', v1.router);
app.use('/api/v2', v2.router);
```

### Router Structure

```
src/routes/
├── v1/
│   ├── index.ts          # Exports combined v1 router
│   ├── auth.ts
│   ├── projects.ts
│   ├── samples.ts
│   └── ...
└── v2/
    ├── index.ts
    └── ...
```

### v1 Router Index Example

```typescript
// src/routes/v1/index.ts
import { Router } from 'express';
import auth from './auth';
import projects from './projects';
import samples from './samples';

const router = Router();

router.use('/auth', auth);
router.use('/projects', projects);
router.use('/samples', samples);

export default { router };
```

### Migration Path

1. **Stable APIs**: Current routes remain at `/api/v1/...`
2. **Breaking Changes**: Create v2 routes with new signatures
3. **Deprecation**: Add `Deprecation` header to v1 responses
4. **Sunset Date**: Provide timeline for v1 removal

```typescript
res.setHeader('Deprecation', 'true');
res.setHeader('Sunset', 'Sun, 01 Jan 2025 00:00:00 GMT');
res.setHeader('Link', '</api/v2/projects>; rel="successor-version"');
```

---

## Input Validation

### Using Joi for Validation Middleware

Install: Already has Joi in dependencies.

### Validation Example

```typescript
import Joi from 'joi';

// Define schemas
const createProjectSchema = Joi.object({
  name: Joi.string().required().min(3).max(255),
  description: Joi.string().optional().max(1000),
  clientOrgId: Joi.string().uuid().required(),
  executingOrgId: Joi.string().uuid().required(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().optional().min(3).max(255),
  description: Joi.string().optional().max(1000),
  status: Joi.string().valid('active', 'completed', 'archived').optional(),
}).min(1); // At least one field required
```

### Validation Middleware

```typescript
// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { errors } from './errorHandler';

export const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {} as Record<string, string>);

      throw errors.badRequest('Validation failed', details);
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};
```

### Usage in Routes

```typescript
router.post(
  '/',
  authenticate,
  validate(createProjectSchema),  // Validation happens before controller
  projectController.create
);
```

---

## Testing Patterns

### Unit Testing Services

Services should be tested in isolation with mocked database:

```typescript
// src/services/__tests__/authService.test.ts
import { AuthService } from '../authService';
import { errors } from '../../middleware/errorHandler';

describe('AuthService', () => {
  let mockPool: any;
  let authService: AuthService;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    };
    authService = new AuthService(mockPool);
  });

  describe('login', () => {
    it('should throw error for missing email', async () => {
      await expect(
        authService.login({ email: '', password: 'test' })
      ).rejects.toThrow(errors.badRequest('Email and password are required'));
    });

    it('should return token for valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: '$2b$10$...',
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
```

### Integration Testing Routes

Test the full stack with real database:

```typescript
// src/routes/__tests__/auth.integration.test.ts
import request from 'supertest';
import app from '../../index';
import { pool } from '../../db';

describe('Auth Routes', () => {
  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toMatch(/Invalid/i);
    });

    it('should return token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeDefined();
    });
  });
});
```

---

## CI/CD Pipeline

### Workflow Details

The `.github/workflows/ci-cd.yml` file runs on every push and PR:

1. **Lint**: ESLint for code quality
2. **Test**: Jest with coverage (backend + database)
3. **Build**: TypeScript compilation and Vite bundling
4. **Security**: npm audit
5. **Artifact Upload**: Build artifacts for deployment

**Deployment** (triggered on `main` branch success):
- **Backend**: Auto-deploys to Railway (if configured)
- **Frontend**: Auto-deploys to Vercel (if configured)

### Local Testing Before Push

```bash
# Backend
cd backend
npm run lint
npm test -- --coverage
npm run build

# Frontend
npm run lint
npm run build
```

### Monitoring Build Status

Check the "Actions" tab in GitHub:
- ✅ All checks passed → Safe to merge
- ❌ Some checks failed → Fix issues before merging

### Deployment Options

**Current Configuration**: Railway (backend) + Vercel (frontend)

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for:
- Complete Railway setup (PostgreSQL + Node.js)
- Complete Vercel setup (React frontend)
- GitHub Actions integration
- Environment configuration
- Monitoring & rollback procedures
- Alternative platforms (Heroku, Netlify, AWS, DigitalOcean, etc.)

The CI/CD pipeline is **deployment-agnostic**—you can swap platforms anytime without changing the workflow.

---

## Quick Refactoring Checklist

To refactor existing routes to follow best practices:

- [ ] Create `src/services/{module}Service.ts` with business logic
- [ ] Create `src/controllers/{module}Controller.ts` with HTTP handlers
- [ ] Create `src/routes/{module}Refactored.ts` using controller
- [ ] Add Joi validation schemas
- [ ] Add error handling with `asyncHandler` and `errors`
- [ ] Add comprehensive logging
- [ ] Create unit tests for service
- [ ] Create integration tests for routes
- [ ] Update `src/index.ts` to use new routes
- [ ] Remove old route file
- [ ] Test manually: `npm run dev`
- [ ] Test with CI pipeline
- [ ] Review and merge

---

## Resources

- [Winston Logger Docs](https://github.com/winstonjs/winston)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Joi Validation](https://joi.dev/api/)
- [Testing Node.js](https://jestjs.io/docs/getting-started)
- [REST API Versioning](https://restfulapi.net/versioning/)
