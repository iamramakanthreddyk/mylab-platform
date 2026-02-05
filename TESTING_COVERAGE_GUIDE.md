# Testing & Coverage Guide: Achieving 85-90%

This guide explains how to systematically test your codebase and reach 85-90% coverage.

---

## Table of Contents

1. [Testing Strategy & Types](#testing-strategy--types)
2. [Coverage Measurement](#coverage-measurement)
3. [Unit Testing (Services)](#unit-testing-services)
4. [Integration Testing (Routes)](#integration-testing-routes)
5. [Error Scenario Testing](#error-scenario-testing)
6. [Reaching 85-90% Coverage](#reaching-85-90-coverage)
7. [Common Patterns](#common-patterns)

---

## Testing Strategy & Types

### Testing Pyramid

```
         E2E Tests (5%)
        Integration Tests (25%)
         Unit Tests (70%)
```

**Goal**: Most tests at unit level (fast, cheap), fewer at integration level, fewest at E2E level.

### Test Types

| Type | What | How | Speed | Cost |
|------|------|-----|-------|------|
| **Unit** | Single function/method | Mock dependencies | ⚡ Fast | 💰 Cheap |
| **Integration** | Service + Controller + Route | Real DB in container | 🐢 Slower | 💵 Moderate |
| **E2E** | Full flow: Frontend to Backend | Real app running | 🐌 Slow | 💸 Expensive |

---

## Coverage Measurement

### View Coverage Report

```bash
npm run test:coverage

# Opens: backend/coverage/
# See: lcov-report/index.html (visual HTML report)
```

### Coverage Thresholds

```
Statements: 85% (how many lines executed)
Branches: 80% (if/else paths tested)
Functions: 85% (functions tested)
Lines: 85% (lines of code tested)
```

### Set in Jest Config

In `backend/jest.config.js`:

```javascript
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // Entry point
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};
```

---

## Unit Testing (Services)

Services are where 70% of your tests should be. They're:
- ✅ Fast (no network)
- ✅ Deterministic (always pass/fail same way)
- ✅ Isolated (mock dependencies)

### Pattern 1: Happy Path

```typescript
test('should return data when successful', async () => {
  // Arrange: Setup mocks
  mockPool.query.mockResolvedValue({ rows: [{ id: '1', name: 'Test' }] });

  // Act: Call the function
  const result = await service.get('1');

  // Assert: Verify output
  expect(result).toEqual({ id: '1', name: 'Test' });
});
```

### Pattern 2: Error Handling

```typescript
test('should throw notFound error when item missing', async () => {
  // Arrange
  mockPool.query.mockResolvedValue({ rows: [] });

  // Act & Assert
  await expect(service.get('invalid-id')).rejects.toThrow(errors.notFound('Item'));
});
```

### Pattern 3: Input Validation

```typescript
test('should throw error for invalid input', async () => {
  await expect(
    service.create({ name: '', workspaceId: null })
  ).rejects.toThrow('Validation failed');
});
```

### Pattern 4: Logging

```typescript
test('should log important events', async () => {
  const loggerSpy = jest.spyOn(logger, 'info');

  await service.create(data);

  expect(loggerSpy).toHaveBeenCalledWith(
    'Item created',
    expect.objectContaining({ itemId: expect.any(String) })
  );
});
```

### Pattern 5: Transactions

```typescript
test('should rollback on error in transaction', async () => {
  const mockClient = { query: jest.fn(), release: jest.fn() };
  mockPool.connect.mockResolvedValue(mockClient);

  mockClient.query
    .mockResolvedValueOnce({}) // BEGIN
    .mockRejectedValueOnce(new Error('DB Error')); // Error

  await expect(service.create(data)).rejects.toThrow();
  expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
});
```

### Service Test Template

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = { query: jest.fn() };
    service = new MyService(mockPool);
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '1' }] });
      const result = await service.create({ name: 'Test' });
      expect(result.id).toBe('1');
    });

    it('should throw error for missing name', async () => {
      await expect(service.create({})).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update item', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: '1', name: 'Updated' }] });
      const result = await service.update('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw notFound for invalid id', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      await expect(service.update('invalid', {})).rejects.toThrow();
    });
  });
});
```

---

## Integration Testing (Routes)

Integration tests (25%) verify the full stack: Route → Controller → Service → Database.

### Pattern: Full Route Test

```typescript
import request from 'supertest';
import app from '../../index';
import { pool } from '../../db';

describe('POST /api/v1/items', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should create item with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Item',
        description: 'Test Description'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('data.id');
    expect(response.body.data.name).toBe('Test Item');
  });

  it('should return 400 for invalid input', async () => {
    const response = await request(app)
      .post('/api/v1/items')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: '' }); // Empty name

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 without auth', async () => {
    const response = await request(app)
      .post('/api/v1/items')
      .send({ name: 'Test' });

    expect(response.status).toBe(401);
  });
});
```

### Full Integration Test Suite

```typescript
describe('Items API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create test user and get token
    await pool.query('DELETE FROM Items');
    authToken = 'test-token-here';
  });

  afterEach(async () => {
    // Clean up
    await pool.query('DELETE FROM Items');
  });

  describe('GET /api/v1/items', () => {
    it('should list all items', async () => {
      // Insert test data
      await pool.query('INSERT INTO Items (name) VALUES ($1)', ['Item 1']);

      const response = await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/items/:id', () => {
    it('should get item by id', async () => {
      const { rows } = await pool.query(
        'INSERT INTO Items (name) VALUES ($1) RETURNING id',
        ['Test Item']
      );
      const itemId = rows[0].id;

      const response = await request(app)
        .get(`/api/v1/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(itemId);
    });

    it('should return 404 for missing item', async () => {
      const response = await request(app)
        .get('/api/v1/items/nonexistent')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/items', () => {
    it('should create item', async () => {
      const response = await request(app)
        .post('/api/v1/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Item' });

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/items/:id', () => {
    it('should update item', async () => {
      const { rows } = await pool.query(
        'INSERT INTO Items (name) VALUES ($1) RETURNING id',
        ['Old Name']
      );
      const itemId = rows[0].id;

      const response = await request(app)
        .put(`/api/v1/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('New Name');
    });
  });

  describe('DELETE /api/v1/items/:id', () => {
    it('should delete item', async () => {
      const { rows } = await pool.query(
        'INSERT INTO Items (name) VALUES ($1) RETURNING id',
        ['Item to Delete']
      );
      const itemId = rows[0].id;

      const response = await request(app)
        .delete(`/api/v1/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/v1/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(getResponse.status).toBe(404);
    });
  });
});
```

---

## Error Scenario Testing

Critical for reaching 85%+ coverage. Test every error path.

### Error Types to Test

```typescript
describe('Error Scenarios', () => {
  it('should catch and log database errors', async () => {
    mockPool.query.mockRejectedValue(new Error('Connection timeout'));
    await expect(service.get()).rejects.toThrow();
  });

  it('should handle validation errors', async () => {
    await expect(service.create({})).rejects.toThrow('Validation failed');
  });

  it('should handle authorization errors', async () => {
    await expect(service.delete('item-123', 'wrong-workspace')).rejects.toThrow('Access denied');
  });

  it('should handle race conditions', async () => {
    // Simulate item deleted between read and update
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: '1' }] }) // First query
      .mockResolvedValueOnce({ rows: [] }); // Item already deleted
    
    await expect(service.update('1', {})).rejects.toThrow();
  });
});
```

---

## Reaching 85-90% Coverage

### Step 1: Measure Current Coverage

```bash
npm run test:coverage

# Output:
# ├─ src/services/itemService.ts:     75% (need 10% more)
# ├─ src/controllers/itemController.ts: 60% (need 25% more)
# └─ src/routes/items.ts:              80% (need 5% more)
```

### Step 2: Identify Missing Coverage

Look for red (untested) lines in `lcov-report/index.html`:

Common untested areas:
- ❌ Error handling branches (if/else)
- ❌ Edge cases (empty arrays, null values)
- ❌ Logging statements
- ❌ Transaction rollback paths
- ❌ Rate limiting/auth middleware

### Step 3: Write Targeted Tests

For each red line:

```typescript
// ❌ NOT tested: error branch
if (!item) {
  throw errors.notFound('Item');  // ← RED LINE
}

// ✅ Add test:
it('should throw notFound when item missing', async () => {
  mockPool.query.mockResolvedValue({ rows: [] });
  await expect(service.get('invalid')).rejects.toThrow(errors.notFound('Item'));
});
```

### Step 4: Iterate

```bash
# Run tests and check coverage
npm run test:coverage

# For each file under 85%:
# 1. Open lcov-report/{file}.html
# 2. Find red (untested) lines
# 3. Write test to cover that line
# 4. Re-run npm run test:coverage
# 5. Repeat until 85%+
```

### Step 5: Automate Checks

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:enforce-coverage": "jest --coverage --coverageReporters=text-summary && npm run check-coverage"
  }
}
```

Add to `jest.config.js`:

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/services/': {
      branches: 90, // Services: stricter
      functions: 90,
      lines: 90,
    },
  },
};
```

---

## Common Patterns

### Mock Database

```typescript
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};
```

### Mock Logger

```typescript
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
```

### Mock External API

```typescript
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
}));
```

### Test Async/Await

```typescript
it('should handle async errors', async () => {
  mockPool.query.mockRejectedValue(new Error('Timeout'));
  await expect(service.get()).rejects.toThrow('Timeout');
});
```

### Test Middleware

```typescript
it('should authenticate request', async () => {
  const response = await request(app)
    .get('/api/v1/protected')
    .set('Authorization', 'Bearer invalid-token');

  expect(response.status).toBe(401);
});
```

---

## Coverage Goals by Component

| Component | Goal | Why |
|-----------|------|-----|
| Services | **90%** | Business logic, core feature |
| Controllers | **85%** | Request/response parsing |
| Routes | **80%** | Middleware chain (framework) |
| Middleware | **85%** | Auth, validation, error handling |
| Utils | **80%** | Helper functions |
| **Overall** | **85-90%** | Sustainable, realistic |

---

## Quick Cheat Sheet

```bash
# Run all tests
npm test

# Run specific file
npm test authService.test.ts

# Watch mode (re-run on save)
npm run test:watch

# Coverage report
npm run test:coverage

# Update snapshots (if using snapshot testing)
npm test -- -u

# Run only failing tests
npm test -- --testNamePattern="should throw"
```

---

## Before/After Example

**Before** (40% coverage):
```typescript
export class ItemService {
  async get(id: string) {
    const result = await this.pool.query('SELECT * FROM Items WHERE id = $1', [id]);
    return result.rows[0];
    // NOT tested: error handling, logging, auth
  }
}
```

**After** (90% coverage):
```typescript
export class ItemService {
  async get(id: string): Promise<Item> {
    if (!id) throw errors.badRequest('ID required');

    try {
      const result = await this.pool.query('SELECT * FROM Items WHERE id = $1 WHERE workspace_id = $2', [id, this.workspaceId]);

      if (result.rows.length === 0) {
        logger.warn('Item not found', { itemId: id });
        throw errors.notFound('Item', id);
      }

      logger.info('Item retrieved', { itemId: id });
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error retrieving item', { itemId: id, error });
      throw errors.internalServer('Failed to retrieve item');
    }
  }
}

// Tests (90% coverage):
describe('ItemService.get', () => {
  it('should get item successfully', async () => { /* ... */ });
  it('should throw badRequest when id missing', async () => { /* ... */ });
  it('should throw notFound when item missing', async () => { /* ... */ });
  it('should throw internalServer on db error', async () => { /* ... */ });
  it('should log retrieval', async () => { /* ... */ });
  it('should log not found', async () => { /* ... */ });
  it('should log errors', async () => { /* ... */ });
});
```

---

## Next Steps

1. **This week**: Run `npm run test:coverage` and identify files under 85%
2. **Next week**: Write tests to hit 85% for top 3 files
3. **Ongoing**: Maintain 85%+ as new code is added

**Goal**: Every PR should maintain or improve coverage. Use CI/CD to enforce!

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#8-testing)
- [Coverage Thresholds](https://jestjs.io/docs/configuration#coveragethreshold-object)
