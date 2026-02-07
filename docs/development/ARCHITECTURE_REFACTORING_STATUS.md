# Module Refactoring Status & Checklist

## Quick Visual Reference

```
Current Structure (Messy)          →    Target Structure (Clean)
═══════════════════════════════    →    ═════════════════════════

backend/src/                             backend/src/
├── routes/                             ├── api/
│   ├── auth.ts ✓                       │   ├── auth/
│   ├── projects.ts ⚠️                   │   │   ├── routes.ts ✓
│   ├── samples.ts ⚠️                    │   │   ├── controller.ts ✓
│   ├── analyses.ts ⚠️                   │   │   ├── service.ts ✓
│   ├── company.ts ⚠️                    │   │   ├── types.ts ✓
│   └── ... (7 more) ⚠️                  │   ├── projects/
│                                        │   │   └── ... (same)
├── services/                           │   ├── samples/
│   ├── authService.ts ✓                │   │   └── ... (same)
│   └── (11 missing) ❌                  │   └── ... (12 total)
│                                        │
├── controllers/                        ├── middleware/ ✓
│   ├── authController.ts ✓             ├── database/ ✓
│   └── (11 missing) ❌                  └── utils/ ✓
```

---

## Status: 12 Modules to Refactor

| # | Module | Status | Type | Service | Controller | Tests |
|---|--------|--------|------|---------|------------|-------|
| 1 | Auth | ✅ DONE | ✓ | ✓ | ✓ | ✓ |
| 2 | Projects | ⏳ TODO | - | - | - | - |
| 3 | Samples | ⏳ TODO | - | - | - | - |
| 4 | Analyses | ⏳ TODO | - | - | - | - |
| 5 | Company | ⏳ TODO | - | - | - | - |
| 6 | Workspaces | ⏳ TODO | - | - | - | - |
| 7 | Notifications | ⏳ TODO | - | - | - | - |
| 8 | Admin | ⏳ TODO | - | - | - | - |
| 9 | ApiKeys | ⏳ TODO | - | - | - | - |
| 10 | Access | ⏳ TODO | - | - | - | - |
| 11 | DerivedSamples | ⏳ TODO | - | - | - | - |
| 12 | Integration | ⏳ TODO | - | - | - | - |
| **TOTAL** | | **1/12** | **1** | **1** | **1** | **1** |

---

## Each Module Needs These Files

```
api/{moduleName}/
├── types.ts              [80 lines] - interfaces + Joi schemas
├── service.ts            [200 lines] - database queries + logic
├── controller.ts         [100 lines] - HTTP request/response
├── routes.ts             [50 lines] - endpoint definitions
└── __tests__/
    └── service.test.ts   [150 lines] - unit tests
```

**Total per module**: ~580 lines split across 5 focused files

---

## Refactoring Timeline

### Week 1: Foundation (4 modules)
- **Days 1-2**: Setup & prepare auth (move existing files)
- **Days 3-4**: Refactor projects (first from scratch)
- **Days 5-6**: Refactor samples & analyses
- **Total**: 3-4 hours

### Week 2: Completion (8 modules)
- **Days 1-2**: Refactor company, workspaces, notifications (3 modules × 45 min)
- **Days 3-4**: Refactor admin, apiKeys, access (3 modules × 45 min)
- **Day 5**: Refactor derivedSamples, integration (2 modules × 45 min)
- **Total**: 4-5 hours

**Grand Total**: 7-9 hours to complete all 12 modules

---

## For Each Module: 5-Step Template

### Step 1: Create types.ts (15 min)
```bash
# Copy interface structure
# Add all request/response types
# Create Joi validation schemas
```

### Step 2: Create service.ts (45 min)
```bash
# Extract all database queries from old route
# Organize as static class methods
# Add logging + error handling
# Keep pool as parameter (testable)
```

### Step 3: Create controller.ts (20 min)
```bash
# Create thin HTTP handlers
# Call service methods
# Format responses
# Minimal logic
```

### Step 4: Create routes.ts (10 min)
```bash
# Define endpoints
# Add validation middleware
# Bind controller methods
# Very clean and simple
```

### Step 5: Write tests (30 min)
```bash
# Mock the database pool
# Test service methods
# Test both success & error cases
# Aim for >80% coverage
```

---

## Dependencies & Refactor Order

**Refactor in this sequence** (dependencies first):

1. ✅ **Auth** - no dependencies
2. ⏳ **Workspaces** - depends on Auth
3. ⏳ **Projects** - depends on Workspaces
4. ⏳ **Samples** - depends on Projects
5. ⏳ **Analyses** - depends on Samples, Projects
6. ⏳ **Company** - independent
7. ⏳ **Notifications** - depends on Projects
8. ⏳ **Admin** - depends on others
9. ⏳ **ApiKeys** - independent
10. ⏳ **Access** - independent
11. ⏳ **DerivedSamples** - depends on Samples
12. ⏳ **Integration** - depends on others

---

## What Needs to Happen

### Before You Start

- [ ] Read BACKEND_ARCHITECTURE.md (overview)
- [ ] Read REFACTORING_COMPLETE_EXAMPLE.md (detailed pattern)
- [ ] Create `/api/` directory
- [ ] Understand Request → Controller → Service → DB flow

### Day 1-2: Prepare Auth

- [ ] Move `services/authService.ts` → `api/auth/service.ts`
- [ ] Move `controllers/authController.ts` → `api/auth/controller.ts`
- [ ] Move `routes/auth.ts` → `api/auth/routes.ts`
- [ ] Create `api/auth/types.ts` with all interfaces
- [ ] Create `api/auth/__tests__/service.test.ts`
- [ ] Update `index.ts` imports
- [ ] Test: `npm run build && npm test`

### Day 3-4: Refactor Projects (First from scratch)

- [ ] Create `api/projects/` folder
- [ ] Create `types.ts` (use REFACTORING_COMPLETE_EXAMPLE.md as template)
- [ ] Create `service.ts` (extract from old `routes/projects.ts`)
- [ ] Create `controller.ts` (move HTTP logic)
- [ ] Create `routes.ts` (simplified endpoints)
- [ ] Create `__tests__/service.test.ts` (copy pattern)
- [ ] Update `index.ts` import
- [ ] Delete old `routes/projects.ts`
- [ ] Test: `npm run build && npm test && npm run dev`

### Repeat Process

For each remaining 10 modules:
1. Copy types/service/controller/routes structure
2. Extract old route logic
3. Write tests
4. Delete old file
5. Update imports

---

## Key Files to Reference

| File | Purpose | Read Time |
|------|---------|-----------|
| [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) | Overall structure & philosophy | 15 min |
| [REFACTORING_COMPLETE_EXAMPLE.md](./REFACTORING_COMPLETE_EXAMPLE.md) | Full projects module example with code | 20 min |
| [api/auth/](./backend/src/api/auth/) | Example: auth module already refactored | 10 min |

---

## Command Cheat Sheet

```bash
# Create module directory
mkdir -p backend/src/api/{moduleName}/__tests__

# Check build (catches TypeScript errors)
cd backend && npm run build

# Run tests
npm test

# See coverage report
npm run test:coverage

# Watch mode (auto-reload on file changes)
npm run dev

# Check one specific test file
npm test service.test.ts

# Check linting
npm run lint
```

---

## Success Criteria (For Each Module)

✅ All of these must be true:

1. `npm run build` succeeds (no TypeScript errors)
2. `npm test` passes (all tests green)
3. API endpoints work with manual testing
4. Module has >80% test coverage
5. Service doesn't import controller
6. Controller only calls service methods
7. Routes only maps endpoints
8. Types separated into types.ts
9. All database logic in service.ts
10. Old route file deleted

---

## Quick Example: Projects Module

### Files After Refactoring
```
backend/src/api/projects/
├── types.ts           [Interfaces + Joi schemas]
├── service.ts         [Database queries + logic]
├── controller.ts      [HTTP handlers]
├── routes.ts          [Endpoint definitions]
└── __tests__/
    └── service.test.ts [Unit tests]
```

### Size Comparison
- **Before**: `routes/projects.ts` = 400 lines (mixed)
- **After**: Split into 5 files = 430 lines (separated concerns)

---

## Progress Tracker

Copy and update as you go:

```
Date        Module          Time    Build  Test   Coverage  Status
────────────────────────────────────────────────────────────────
-           Auth            -       ✅     ✅     ✅         ✅ DONE
[START]     Projects        1:30    ?      ?      ?          ⏳ NOW
            Samples         -       -      -      -          ❌ TODO
            Analyses        -       -      -      -          ❌ TODO
            Company         -       -      -      -          ❌ TODO
            ...
```

---

## Remember The Pattern

**Every module follows the same structure:**

1. **types.ts** = Data contracts (interfaces, validation)
2. **service.ts** = Business logic (database, calculation)
3. **controller.ts** = HTTP logic (request, response)
4. **routes.ts** = Endpoint mapping (just URL patterns)
5. **tests** = Unit tests (with mocked pool)

This pattern scales to 100+ modules without confusion.

---

## What to Do Right Now

### Pick one of these paths:

**Option A: Read & Learn First** (Recommended)
1. Read BACKEND_ARCHITECTURE.md (15 min)
2. Read REFACTORING_COMPLETE_EXAMPLE.md (20 min)
3. Look at existing auth module (10 min)
4. Then start implementing projects module

**Option B: Jump In** (If familiar with TypeScript)
1. Create `api/projects/` folder
2. Copy structure from REFACTORING_COMPLETE_EXAMPLE.md
3. Adapt to your projects route
4. Test and iterate

**Option C: Get Help** 
Ask me to refactor projects module while you watch the pattern.

---

## FAQ

**Q: How long per module?**  
A: First one (projects) = 2 hours. After that = 45 min each. Total = 9 hours.

**Q: Do I need all 5 files?**  
A: Yes - separation of concerns is the whole point. Each file has one job.

**Q: What if I have nested routes?**  
A: Create sub-folders: `api/workspaces/projects/` if needed.

**Q: Can I do this incrementally?**  
A: Yes! Do one module at a time. All modules are independent.

**Q: What if tests fail?**  
A: Check: (1) Mock pool syntax, (2) Service method signatures, (3) Joi schema. Most issues are simple.

**Q: When should I delete old files?**  
A: Only after: build passes + tests pass + manual API testing works.

---

## You've Got This! 🚀

The structure is:
- Clear & consistent
- Proven by 1000s of projects
- Scalable
- Testable
- Easy to onboard new developers

Start with projects module. Once you do one, the rest flow naturally.

**Estimated completion**: 2 weeks if you do 1-2 modules per day.

Let's go! 💪
