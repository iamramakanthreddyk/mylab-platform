# 🧪 Gap Fixes - Testing Guide

## Quick Start

### 1. Start Backend Server
```powershell
cd backend
npm run dev
```

The migrations will run automatically on startup. You should see:
```
✅ Created UserInvitations table with indexes
✅ Created PasswordResetTokens table with indexes
✅ Created FileDocuments table with indexes
✅ Created AnalysisRequests table with indexes
✅ Created NotificationSettings table with indexes
✅ Created trigger_create_notification_settings trigger
✅ Seeded additional standard analysis types
```

### 2. Run Comprehensive E2E Tests
```powershell
# From project root
.\run-e2e-tests.ps1

# Or manually
cd backend
npm run test:e2e
```

## 📊 Test Coverage (35 Tests)

### 1. User Invitation & Registration (8 tests)
- ✅ Create invitation with valid data
- ✅ Prevent duplicate invitations
- ✅ List pending invitations
- ✅ Accept invitation and create account
- ✅ Auto-create NotificationSettings
- ✅ Login with new account
- ✅ Prevent token reuse
- ✅ Cancel pending invitation

### 2. Password Reset (8 tests)
- ✅ Request password reset
- ✅ Generate reset token in database
- ✅ Reset password with valid token
- ✅ Mark token as used
- ✅ Login with new password
- ✅ Reject old password
- ✅ Prevent token reuse
- ✅ Email enumeration prevention

### 3. Analysis Types (3 tests)
- ✅ Auto-seed on first GET request
- ✅ Create custom analysis type (admin)
- ✅ Prevent non-admin creation

### 4. File Upload/Download (6 tests)
- ✅ Upload file with entity association
- ✅ Get file metadata
- ✅ Download with integrity check
- ✅ List files for entity
- ✅ Update file metadata
- ✅ Soft delete file

### 5. Analysis Requests (7 tests)
- ✅ Create analysis request
- ✅ List incoming requests
- ✅ List outgoing requests
- ✅ Get request details
- ✅ Accept and assign request
- ✅ Update request status
- ✅ Reject request

### 6. Database Verification (3 tests)
- ✅ Verify all tables exist
- ✅ Verify triggers exist
- ✅ Verify indexes exist

## 🎯 Manual Testing Scenarios

### Scenario 1: User Onboarding
1. Login as admin
2. Navigate to Users Management
3. Click "Invite User"
4. Enter: `testuser@example.com`, role: `scientist`
5. Check database for invitation token:
   ```sql
   SELECT token, email FROM UserInvitations 
   WHERE email = 'testuser@example.com';
   ```
6. Copy token and navigate to:
   ```
   http://localhost:5173/register?token=<TOKEN>&email=testuser@example.com
   ```
7. Fill registration form:
   - **Name**: Test User
   - **Password**: ` SecurePass123!`
8. Submit and verify redirect to login
9. Login with new credentials

### Scenario 2: Password Reset
1. Navigate to `/forgot-password`
2. Enter email: `testuser@example.com`
3. Check database for reset token:
   ```sql
   SELECT token FROM PasswordResetTokens 
   WHERE user_id = (SELECT id FROM Users WHERE email = 'testuser@example.com')
   ORDER BY created_at DESC LIMIT 1;
   ```
4. Copy token and navigate to:
   ```
   http://localhost:5173/reset-password?token=<TOKEN>
   ```
5. Enter new password: `NewSecurePass456!`
6. Submit and verify redirect to login
7. Login with new password

### Scenario 3: File Upload
1. Login and navigate to a sample details page
2. Click "Upload Files" (when UI component is added)
3. Select a PDF file
4. Add description
5. Submit upload
6. Verify file appears in file list
7. Click download and verify checksum integrity

### Scenario 4: Analysis Request
1. Login and navigate to sample details
2. Click "Request External Analysis"
3. Select laboratory from dropdown
4. Select analysis type (e.g., "Chemical Analysis")
5. Enter description and requirements
6. Set priority to "high"
7. Submit request
8. Verify request appears in "Outgoing Requests"
9. Login as lab user
10. Verify request appears in "Incoming Requests"
11. Accept and assign request
12. Update status to "in_progress", then "completed"

## 🐛 Common Issues & Solutions

### Migration Doesn't Run
**Problem**: Tables not created on server startup

**Solution**:
```powershell
# Check migration status
curl http://localhost:3001/api/admin/migrations

# Restart backend server
cd backend
npm run dev
```

### Test Fails: "Cannot find module"
**Problem**: Missing dependencies

**Solution**:
```powershell
cd backend
npm install
npm install --save-dev @types/supertest supertest
```

### Test Fails: "Connection refused"
**Problem**: Backend server not running

**Solution**:
```powershell
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Run tests
npm run test:e2e
```

### File Upload Fails
**Problem**: Missing multer dependency

**Solution**:
```powershell
cd backend
npm install multer @types/multer --save
# Restart server
```

### Analysis Request Creation Fails
**Problem**: No organizations or samples exist

**Solution**:
```sql
-- Check organizations
SELECT * FROM Organizations WHERE type = 'laboratory';

-- Check samples
SELECT * FROM Samples LIMIT 5;

-- If empty, create test data via API or UI
```

## 📈 Test Execution Command Reference

```powershell
# Run all E2E tests
npm run test:e2e

# Run with verbose output
npm run test:e2e:verbose

# Run specific test suite
npm test -- gap-fixes.e2e.test.ts

# Run single test
npm test -- gap-fixes.e2e.test.ts -t "should create user invitation"

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 🔍 Database Verification Queries

```sql
-- Check UserInvitations
SELECT id, email, role, status, expires_at 
FROM UserInvitations 
ORDER BY created_at DESC 
LIMIT 10;

-- Check PasswordResetTokens
SELECT id, token, used_at, expires_at 
FROM PasswordResetTokens 
ORDER BY created_at DESC 
LIMIT 10;

-- Check FileDocuments
SELECT id, file_name, entity_type, entity_id, checksum 
FROM FileDocuments 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- Check AnalysisRequests
SELECT id, from_organization_id, to_organization_id, status, priority 
FROM AnalysisRequests 
ORDER BY created_at DESC 
LIMIT 10;

-- Check NotificationSettings
SELECT ns.*, u.email 
FROM NotificationSettings ns 
JOIN Users u ON ns.user_id = u.id 
LIMIT 10;

-- Check AnalysisTypes (should have 6+ seeded)
SELECT id, name, category, is_active 
FROM AnalysisTypes 
ORDER BY name;

-- Verify trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_create_notification_settings';

-- Verify all indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN (
  'userinvitations', 
  'passwordresettokens', 
  'filedocuments', 
  'analysisrequests', 
  'notificationsettings'
)
ORDER BY tablename, indexname;
```

## ✅ Success Criteria

All tests should pass ✅

### Backend Tests (35 tests)
- [x] All E2E tests pass (`npm run test:e2e`)
- [x] No TypeScript errors (`npx tsc --noEmit`)
- [x] Server starts without errors
- [x] Migrations execute successfully

### Database
- [x] 5 new tables created
- [x] All indexes created
- [x] Trigger functional
- [x] Analysis types seeded (6 minimum)

### API Endpoints
- [x] POST /api/users/invite (201)
- [x] POST /api/users/accept-invitation (201)
- [x] POST /api/auth/forgot-password (200)
- [x] POST /api/auth/reset-password (200)
- [x] GET /api/analysis-types (200, auto-seeds)
- [x] POST /api/files/upload (201)
- [x] GET /api/files/:id/download (200)
- [x] POST /api/analysis-requests (201)
- [x] GET /api/analysis-requests/incoming (200)
- [x] POST /api/analysis-requests/:id/accept (200)

### UI Routes
- [ ] /register?token=xxx works
- [ ] /forgot-password works
- [ ] /reset-password?token=xxx works
- [ ] Password strength indicator functional
- [ ] Form validations work

## 📝 Test Environment Setup

```powershell
# 1. Set environment variables (optional)
$env:TEST_ADMIN_EMAIL = "admin@test.com"
$env:TEST_ADMIN_PASSWORD = "Admin123!"
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/mylab_test"

# 2. Create test database (if using separate test DB)
psql -U postgres -c "CREATE DATABASE mylab_test;"

# 3. Run migrations
cd backend
npm run dev  # Migrations run automatically

# 4. Seed test data (if needed)
psql -d mylab_test -c "
  INSERT INTO Users (email, password, role, name, workspace_id) 
  VALUES ('admin@test.com', '<hashed_password>', 'admin', 'Test Admin', '<workspace_id>');
"

# 5. Run tests
npm run test:e2e
```

## 🎓 Test Debugging

Enable debug output:
```powershell
$env:DEBUG = "*"
npm run test:e2e:verbose
```

Check specific API endpoint:
```powershell
# Test invitation creation
curl -X POST http://localhost:3001/api/users/invite `
  -H "Authorization: Bearer <TOKEN>" `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","role":"scientist"}'

# Test password reset
curl -X POST http://localhost:3001/api/auth/forgot-password `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com"}'
```

---

**For full implementation details, see:**
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Complete status
- [GAP_FIX_GUIDE.md](GAP_FIX_GUIDE.md) - User guide with examples
