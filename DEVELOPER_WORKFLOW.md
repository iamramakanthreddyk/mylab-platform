# Developer Workflow: Maintaining AI Context

**Purpose:** Practical guide for developers to keep AI context synchronized  
**Audience:** Development team  
**Last Updated:** February 10, 2026

---

## 🎯 Overview

This guide provides daily workflows for maintaining AI context awareness across database, API, and frontend changes.

For AI system guardrails, see [AI_WORKFLOW.md](AI_WORKFLOW.md).

---

## 🔄 Quick Workflows

### Workflow 1: Database Schema Change

```powershell
# 1. Update schema definition (source of truth)
code backend/src/database/schemas.ts

# 2. Create migration
code backend/migrations/006-my-change.sql

# 3. Run migration
cd backend; npm run migrate

# 4. Generate snapshot
npm run db:schema-snapshot

# 5. Update API types
code backend/src/api/*/types.ts

# 6. Update OpenAPI if needed
code openapi-spec.yaml

# 7. Update frontend types
code src/lib/types.ts

# 8. Check for AI context updates needed
.\update-ai-context.ps1

# 9. Validate
npm run validate:all

# 10. Commit
git add .
git commit -m "feat: add column to table"
```

**Checklist:**
- [ ] schemas.ts updated
- [ ] Migration created & run
- [ ] Snapshot generated
- [ ] API types updated
- [ ] OpenAPI spec updated
- [ ] Frontend types updated
- [ ] AI_CONTEXT.md updated
- [ ] Tests passing

### Workflow 2: New API Endpoint

```powershell
# 1. Define in OpenAPI (source of truth)
code openapi-spec.yaml

# 2. Add backend types
code backend/src/api/*/types.ts

# 3. Implement service
code backend/src/api/*/service.ts

# 4. Add route
code backend/src/api/*/index.ts

# 5. Add frontend types
code src/lib/types.ts

# 6. Add/update transformers
code src/lib/endpointTransformers.ts

# 7. Update AI context
.\update-ai-context.ps1
code AI_CONTEXT.md

# 8. Validate
npm run api:validate
npm test

# 9. Commit
git commit -m "feat: add new endpoint"
```

**Checklist:**
- [ ] OpenAPI spec updated
- [ ] Backend types added
- [ ] Service implemented
- [ ] Route registered
- [ ] Frontend types added
- [ ] Transformers updated
- [ ] AI_CONTEXT.md updated
- [ ] Tests added
- [ ] API validated

### Workflow 3: Frontend Type Change

```powershell
# 1. Update frontend types
code src/lib/types.ts

# 2. Update transformers
code src/lib/endpointTransformers.ts

# 3. Update components
code src/components/*.tsx

# 4. Update AI context
.\update-ai-context.ps1
code AI_CONTEXT.md

# 5. Test
npm run dev
npm test

# 6. Commit
git commit -m "refactor: update data structure"
```

**Checklist:**
- [ ] Types updated
- [ ] Transformers updated
- [ ] Components updated
- [ ] AI_CONTEXT.md updated
- [ ] Manual testing done
- [ ] Tests passing

---

## 🛠️ Available Commands

### Schema & Database

```powershell
# Generate current schema snapshot
cd backend
npm run db:schema-snapshot

# Run migrations
npm run migrate

# Reset database (CAUTION!)
npm run db:reset
```

### API Validation

```powershell
# Validate OpenAPI spec
npm run openapi:validate

# Check API contract consistency
npm run api:validate
```

### Type Checking

```powershell
# Check TypeScript compilation
npm run type-check

# Check frontend-backend type sync
npm run types:check-sync
```

### Testing

```powershell
# Run all tests
npm test

# Backend integration tests
cd backend
npm run test:integration

# Frontend tests
npm test
```

### AI Context

```powershell
# Interactive context update assistant
.\update-ai-context.ps1

# View current context
code AI_CONTEXT.md
```

---

## 📅 Daily Routine

### Morning

1. **Pull latest**
   ```powershell
   git pull origin main
   ```

2. **Check context status**
   ```powershell
   .\update-ai-context.ps1
   ```

3. **Review recent changes**
   ```powershell
   code AI_CONTEXT.md
   # Read "Recent Changes Log"
   ```

### Before Coding

1. Review relevant canonical sources
   - DB: `backend/src/database/schemas.ts`
   - API: `openapi-spec.yaml`
   - Frontend: `src/lib/types.ts`

2. Check `AI_CONTEXT.md` for:
   - Current constraints
   - Recent changes
   - Known issues

### Before Committing

1. **Run validations**
   ```powershell
   npm run validate:all
   ```

2. **Update AI context**
   ```powershell
   .\update-ai-context.ps1
   ```

3. **Review checklist** (appropriate to your change)

4. **Commit with clear message**

---

## 📊 Health Indicators

### ✅ Healthy System

- AI_CONTEXT.md updated within 7 days
- Schema snapshot matches database
- OpenAPI spec validates
- All type checks pass
- Tests passing

### ⚠️ Needs Attention

- AI_CONTEXT.md not updated for 7-14 days
- Some type mismatches
- Some tests failing

### 🔴 Critical

- AI_CONTEXT.md not updated for 14+ days
- Schema out of sync
- OpenAPI spec invalid
- Major type mismatches

---

## 🔗 Related Documents

- [AI_CONTEXT.md](AI_CONTEXT.md) - Central AI knowledge base
- [AI_WORKFLOW.md](AI_WORKFLOW.md) - AI system guardrails
- [API_FRONTEND_CONTRACT_SYNC.md](API_FRONTEND_CONTRACT_SYNC.md) - Detailed sync patterns
- [SCHEMA_CHANGE_CHECKLIST.md](backend/SCHEMA_CHANGE_CHECKLIST.md) - DB migration guide

---

**Version:** 1.0  
**Last Updated:** February 10, 2026
