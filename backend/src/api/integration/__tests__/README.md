# Integration Tests Documentation

## Overview
Integration tests have been split into separate, focused test files for easier maintenance, debugging, and independent execution.

## Test Files

### 1. **`01-auth.test.ts`** - Authentication Tests
Tests user registration, login, and token validation.
- ✅ Register new org admin
- ✅ Login and get token
- ✅ Reject invalid credentials
- ✅ Prevent duplicate registration

Run: `npm test -- "01-auth.test.ts"`

### 2. **`02-organizations.test.ts`** - Organization Management
Tests creating different organization types (client, laboratory, etc.)
- ✅ Create client organization
- ✅ Create laboratory organization
- ✅ Require authorization
- ✅ Create multiple orgs by same user

Run: `npm test -- "02-organizations.test.ts"`

### 3. **`03-projects.test.ts`** - Project Management
Tests project creation with client/executing org relationships.
- ✅ Create project with clientOrgId and executingOrgId
- ✅ Create project with externalClientName
- ✅ Validate client info requirement
- ✅ Create multiple projects

Run: `npm test -- "03-projects.test.ts"`

### 4. **`04-trials.test.ts`** - Trial Creation
Tests creating trials within projects.
- ✅ Create trial with required fields
- ✅ Create trial with optional fields
- ✅ Require authorization
- ✅ Create multiple trials in same project

Run: `npm test -- "04-trials.test.ts"`

### 5. **`05-samples.test.ts`** - Sample Creation
Tests creating samples linked to projects and trials.
- ✅ Create sample with projectId and trialId
- ✅ Create sample with metadata
- ✅ Create sample without trialId
- ✅ Require authorization
- ✅ Create multiple samples per trial

Run: `npm test -- "05-samples.test.ts"`

## Shared Setup (`_setup.ts`)

All test files use a **shared database setup** that:
- ✅ **Checks if tables exist** before running setup
- ✅ **First run only**: Creates schema, enums, tables, indexes, constraints (~60 seconds)
- ✅ **Subsequent runs**: Skips setup entirely, just connects to existing DB (~1 second)
- ✅ Skips expensive seeding (SKIP_DB_SEED=true)
- ✅ Reuses pool connection across tests
- ✅ Cleans up specific test records after each test

**Key benefit:** Database setup runs **once ever** when tables don't exist. All future test runs are fast.

## How to Run Tests

### Run All Integration Tests
```bash
npm test -- "src/api/integration/__tests__/0[1-5]"
```
All tests run sequentially with shared DB setup.

### Run Single Test File
```bash
npm test -- "01-auth.test.ts"
```

### Run Multiple Specific Tests
```bash
npm test -- "0[1-3]"  # Auth, Orgs, Projects only
```

### Run with Verbose Output
```bash
npm test -- "01-auth.test.ts" --verbose
```

### Run with Coverage
```bash
npm test -- "01-auth.test.ts" --coverage
```

## Test Structure

Each test file follows this pattern:

```typescript
describe('Feature Area', () => {
  let pool: any
  let app: any
  let token: string
  
  beforeAll(async () => {
    // Initialize shared test environment once
    const env = await initializeTestEnv()
    pool = env.pool
    app = env.app
    
    // Setup test-specific data (user, orgs, etc.)
  })
  
  afterEach(async () => {
    // Optional: cleanup specific records
    await cleanupRecords([...])
  })
  
  afterAll(async () => {
    // Cleanup test-specific data
    await cleanupRecords([...])
  })
  
  it('should test feature', async () => {
    const res = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send({ /* data */ })
      .expect(201)
    
    expect(res.body.data).toBeTruthy()
  })
})
```

## Environment Variables

Tests automatically set:
- `NODE_ENV=test`
- `JWT_SECRET=test-secret-key`
- `SKIP_DB_SEED=true`

Override or add more in `_setup.ts` if needed.

## Debugging Failed Tests

If a test file fails:

1. **Run just that file:**
   ```bash
   npm test -- "02-organizations.test.ts"
   ```

2. **Check error logs** in terminal output

3. **Verify shared setup:**
   - If DB setup fails, see `_setup.ts` stdout
   - Check enum values match your API payloads

4. **Check test data cleanup:**
   - Use `cleanupRecords()` in `afterEach` to prevent test pollution

## Performance Notes

- **Total runtime:** ~7 mins for all 5 test files (50+ tests)
- **DB Setup:** ~60 seconds (runs once, not repeated)
- **Individual test file:** ~10-20 seconds
- **Sequential execution:** Required for shared DB pool

## Common Issues

### "Cannot use pool after end" Error
- **Cause:** Pool being closed in one test, used by another
- **Fix:** Don't call `pool.end()` until all tests complete (handled by jest teardown)

### "invalid input value for enum org_type"
- **Cause:** Using wrong enum value (e.g., 'Client' instead of 'client')
- **Fix:** Use lowercase enum values: 'client', 'laboratory', 'analyzer', etc.

### Test Timeout
- **Cause:** Long DB setup on first test run
- **Fix:** Jest timeout is 120 seconds; this is normal on first run
- **Next runs:** Faster because schema already exists

## Next Steps

1. Run a single test file to verify setup works
2. Run all tests together to confirm DB reuse works
3. Add more tests for additional features (batches, analyses, sharing)
4. Create separated test files for each API feature as they grow

---

For questions or issues, check test file syntax and ensure enum values are lowercase.
