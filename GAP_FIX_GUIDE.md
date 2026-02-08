# Gap Fix Implementation - Complete Guide

## 🎯 Overview

This implementation systematically addresses the critical gaps in the MyLab Platform, following the **Database → Backend → UI** methodology to ensure proper layering and no circular dependencies.

## 📦 What Was Implemented

### 1. Database Layer (5 New Tables)
- **UserInvitations** - Token-based user onboarding system
- **PasswordResetTokens** - Secure password reset mechanism
- **FileDocuments** - File management with integrity verification
- **AnalysisRequests** - External lab collaboration workflow
- **NotificationSettings** - User notification preferences

### 2. Backend APIs (24 New Endpoints)
- **User Management** (8 endpoints) - Invitation system, user CRUD
- **Authentication** (2 endpoints) - Password reset flow
- **Analysis Types** (5 endpoints) - Analysis type catalog with auto-seeding
- **File Management** (6 endpoints) - Upload, download, metadata management
- **Analysis Requests** (6 endpoints) - External collaboration requests

### 3. Frontend Components (3 New Pages)
- **Register** - User registration via invitation link
- **ForgotPassword** - Request password reset
- **ResetPassword** - Set new password with token

---

## 🚀 Quick Start

### Step 1: Install Dependencies
```powershell
cd backend
npm install multer @types/multer --save
cd ..
```

### Step 2: Run Database Migration
```powershell
# Option A: Using PowerShell script (recommended)
.\setup-gap-fixes.ps1

# Option B: Manual migration
cd backend
psql $env:DATABASE_URL -f src/database/migration-gap-fixes.sql
```

### Step 3: Start the Backend
```powershell
cd backend
npm run dev
```

### Step 4: Start the Frontend
```powershell
# In a new terminal
npm run dev
```

### Step 5: Test the Implementation
```powershell
# Run API tests
.\test-gap-fixes-api.ps1
```

---

## 📚 User Flows

### 1. User Invitation & Registration Flow

#### As an Admin:
1. Navigate to Users Management
2. Click "Invite User"
3. Enter email, select role (admin/manager/scientist/viewer)
4. System generates invitation token and stores in database
5. *(Future: Email sent automatically to user)*

#### As a New User:
1. Receive invitation link: `https://mylab.com/register?token=xxx&email=xxx`
2. Click link to open registration page
3. Fill in name and password (must meet requirements)
4. Password strength indicator shows real-time feedback
5. Submit registration
6. Account created, NotificationSettings auto-created
7. Redirected to login page

**API Endpoints:**
```
POST   /api/users/invite
POST   /api/users/accept-invitation
GET    /api/users/invitations
DELETE /api/users/invitations/:id
```

**Testing:**
```powershell
# 1. Create invitation (requires auth token)
curl -X POST http://localhost:3001/api/users/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","role":"scientist"}'

# 2. Check database for token
psql -c "SELECT token, email FROM UserInvitations ORDER BY created_at DESC LIMIT 1;"

# 3. Accept invitation
curl -X POST http://localhost:3001/api/users/accept-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<TOKEN_FROM_DB>",
    "name":"John Doe",
    "email":"newuser@example.com",
    "password":"SecurePass123!"
  }'
```

---

### 2. Password Reset Flow

#### As a User:
1. Navigate to login page
2. Click "Forgot your password?"
3. Enter email address
4. Receive generic success message (prevents email enumeration)
5. *(Future: Reset link sent to email)*
6. Access reset link: `https://mylab.com/reset-password?token=xxx`
7. Enter new password (with strength indicator)
8. Submit reset
9. Password updated, redirected to login

**API Endpoints:**
```
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

**Testing:**
```powershell
# 1. Request password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# 2. Check database for reset token
psql -c "SELECT token, user_id FROM PasswordResetTokens ORDER BY created_at DESC LIMIT 1;"

# 3. Reset password
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<TOKEN_FROM_DB>",
    "new_password":"NewSecurePass123!"
  }'
```

---

### 3. File Upload/Download Flow

#### Upload File:
1. Navigate to sample/analysis/project details
2. Click "Upload File"
3. Select file (PDF, images, Excel, Word, CSV, JSON, text)
4. File validated for type and size (max 50MB)
5. SHA-256 checksum calculated
6. File stored in workspace-isolated directory
7. Metadata saved to FileDocuments table

#### Download File:
1. Click on file name
2. Backend verifies checksum for integrity
3. File streamed to browser with correct headers
4. Download begins

**API Endpoints:**
```
POST   /api/files/upload
GET    /api/files/:id/download
GET    /api/files/:id
GET    /api/files/entity/:entity_type/:entity_id
PATCH  /api/files/:id
DELETE /api/files/:id
```

**Testing:**
```powershell
# Upload file
curl -X POST http://localhost:3001/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "entity_type=sample" \
  -F "entity_id=<SAMPLE_UUID>" \
  -F "description=Test document"

# Download file
curl -X GET http://localhost:3001/api/files/<FILE_ID>/download \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded-file.pdf
```

---

### 4. External Lab Analysis Request Flow

#### Request Analysis from External Lab:
1. Navigate to sample details
2. Click "Request External Analysis"
3. Select target laboratory organization
4. Select analysis type (NMR, HPLC, etc.)
5. Enter description and requirements
6. Set priority (low/medium/high/urgent)
7. Submit request
8. Request appears in "Outgoing Requests"

#### Receive & Accept Analysis Request:
1. Laboratory receives request in "Incoming Requests"
2. Manager/Admin reviews request
3. Accept request and assign to scientist
4. Scientist performs analysis
5. Status updated: pending → accepted → in_progress → completed

**API Endpoints:**
```
POST   /api/analysis-requests
GET    /api/analysis-requests/incoming
GET    /api/analysis-requests/outgoing
GET    /api/analysis-requests/:id
POST   /api/analysis-requests/:id/accept
POST   /api/analysis-requests/:id/reject
PATCH  /api/analysis-requests/:id/status
```

**Testing:**
```powershell
# Create analysis request
curl -X POST http://localhost:3001/api/analysis-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_organization_id":"<LAB_UUID>",
    "sample_id":"<SAMPLE_UUID>",
    "analysis_type_id":"<TYPE_UUID>",
    "description":"Need HPLC analysis for purity testing",
    "priority":"high",
    "due_date":"2024-02-15"
  }'

# View incoming requests
curl -X GET "http://localhost:3001/api/analysis-requests/incoming?status=pending" \
  -H "Authorization: Bearer $TOKEN"

# Accept request
curl -X POST http://localhost:3001/api/analysis-requests/<REQUEST_ID>/accept \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assigned_to":"<USER_UUID>"}'
```

---

### 5. Analysis Types Auto-Seeding

On first GET request to `/api/analysis-types`, the system auto-seeds 6 standard analysis types:

1. **Chemical Analysis** - GC-MS, HPLC, IC
2. **Physical Testing** - Tensile, Hardness, Impact Testing
3. **Microbiological Analysis** - Culture, PCR, MALDI-TOF
4. **Spectroscopy** - NMR, UV-Vis, FTIR
5. **Elemental Analysis** - ICP-MS, XRF, AAS
6. **Thermal Analysis** - DSC, TGA, DMA

**API Endpoints:**
```
GET    /api/analysis-types
POST   /api/analysis-types
GET    /api/analysis-types/:id
PATCH  /api/analysis-types/:id
DELETE /api/analysis-types/:id
```

**Testing:**
```powershell
# Get all analysis types (triggers auto-seed if empty)
curl -X GET http://localhost:3001/api/analysis-types \
  -H "Authorization: Bearer $TOKEN"

# Verify in database
psql -c "SELECT id, name, category, methods FROM AnalysisTypes;"
```

---

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Token Security
- **Invitation Tokens:** 32-byte hex, 7-day expiration
- **Reset Tokens:** 32-byte hex, 24-hour expiration
- **Single-use:** Tokens marked as used/accepted after first use
- **Email Enumeration Prevention:** Generic success messages

### File Security
- **Type Validation:** Only allowed MIME types
- **Size Limit:** 50MB maximum
- **Integrity:** SHA-256 checksum verification on download
- **Workspace Isolation:** Files stored in workspace-specific directories
- **Access Control:** Only authorized users can download files

### Role-Based Access Control
- **Admin:** Full access to all endpoints
- **Manager:** Can invite users, manage requests
- **Scientist:** Can create/update own data
- **Viewer:** Read-only access

---

## 🗄️ Database Schema

### UserInvitations
```sql
id UUID PRIMARY KEY
workspace_id UUID → Workspace(id)
email VARCHAR(255)
role VARCHAR(50) CHECK (admin|manager|scientist|viewer)
invited_by UUID → Users(id)
token VARCHAR(255) UNIQUE
expires_at TIMESTAMP
accepted_at TIMESTAMP
status VARCHAR(50) CHECK (pending|accepted|cancelled|expired)
created_at TIMESTAMP
```

### PasswordResetTokens
```sql
id UUID PRIMARY KEY
user_id UUID → Users(id)
token VARCHAR(255) UNIQUE
expires_at TIMESTAMP
used_at TIMESTAMP
created_at TIMESTAMP
```

### FileDocuments
```sql
id UUID PRIMARY KEY
workspace_id UUID → Workspace(id)
uploaded_by UUID → Users(id)
entity_type VARCHAR(50) CHECK (sample|analysis|project|batch|organization)
entity_id UUID
file_name VARCHAR(255)
file_path TEXT
file_size BIGINT
file_type VARCHAR(100)
checksum VARCHAR(64) -- SHA-256
description TEXT
metadata JSONB
is_public BOOLEAN
created_at, updated_at, deleted_at TIMESTAMP
```

### AnalysisRequests
```sql
id UUID PRIMARY KEY
workspace_id UUID → Workspace(id)
from_organization_id UUID → Organizations(id)
to_organization_id UUID → Organizations(id)
sample_id UUID → Samples(id)
analysis_type_id UUID → AnalysisTypes(id)
description TEXT
methodology_requirements TEXT
parameters JSONB
priority VARCHAR(50) CHECK (low|medium|high|urgent)
status VARCHAR(50) CHECK (pending|accepted|in_progress|completed|rejected)
due_date DATE
estimated_duration VARCHAR(100)
assigned_to UUID → Users(id)
notes TEXT
created_by UUID → Users(id)
accepted_at, completed_at TIMESTAMP
created_at, updated_at TIMESTAMP
```

### NotificationSettings
```sql
id UUID PRIMARY KEY
user_id UUID UNIQUE → Users(id)
email_enabled BOOLEAN
in_app_enabled BOOLEAN
analysis_complete BOOLEAN
sample_shared BOOLEAN
project_update BOOLEAN
collaboration_request BOOLEAN
system_announcements BOOLEAN
created_at, updated_at TIMESTAMP
```

---

## 🧪 Testing Checklist

### Backend API Tests
- [ ] Install multer dependency
- [ ] Run database migration successfully
- [ ] Test user invitation creation (POST /api/users/invite)
- [ ] Test invitation acceptance (POST /api/users/accept-invitation)
- [ ] Verify NotificationSettings auto-created for new user
- [ ] Test password reset request (POST /api/auth/forgot-password)
- [ ] Test password reset completion (POST /api/auth/reset-password)
- [ ] Test analysis types auto-seeding (GET /api/analysis-types)
- [ ] Test file upload (POST /api/files/upload)
- [ ] Test file download with checksum (GET /api/files/:id/download)
- [ ] Test analysis request creation (POST /api/analysis-requests)
- [ ] Test incoming requests (GET /api/analysis-requests/incoming)
- [ ] Test request acceptance (POST /api/analysis-requests/:id/accept)

### Frontend UI Tests
- [ ] Navigate to /register?token=xxx
- [ ] Verify password strength indicator works
- [ ] Submit registration successfully
- [ ] Navigate to /forgot-password
- [ ] Submit forgot password request
- [ ] Navigate to /reset-password?token=xxx
- [ ] Set new password successfully
- [ ] Test login with "Forgot password?" link

### Integration Tests
- [ ] Complete invitation flow: invite → accept → login
- [ ] Complete password reset flow: forgot → reset → login
- [ ] Upload file → download file → verify integrity
- [ ] Create analysis request → accept → update status

---

## 🚨 Known Limitations & Future Work

### Email Service Not Implemented
**Current State:** Tokens generated but emails not sent
**Workaround:** Manually copy tokens from database
**Future:** Integrate SendGrid/AWS SES/Mailgun

**Example Email Service Implementation:**
```typescript
// backend/src/services/email.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendInvitationEmail(email: string, token: string) {
  const inviteUrl = `${process.env.FRONTEND_URL}/register?token=${token}&email=${email}`;
  
  await sgMail.send({
    to: email,
    from: process.env.EMAIL_FROM,
    subject: 'You have been invited to MyLab Platform',
    html: `
      <h2>Welcome to MyLab Platform!</h2>
      <p>You have been invited to join the platform.</p>
      <p><a href="${inviteUrl}">Click here to complete your registration</a></p>
      <p>This link expires in 7 days.</p>
    `
  });
}
```

### Mock Data Still Present
**Affected Components:**
- `PartnerAnalysisRequests.tsx` - 140-line mock array
- `SubmitAnalysisResults.tsx` - Mock request object
- `CreateAnalysisPage.tsx` - Empty analysis types/partners arrays
- `SupplyChainCollaboration.tsx` - Mock collaboration requests

**Resolution:** Replace with API calls (documented in IMPLEMENTATION_STATUS.md)

### File Upload UI Not Created
**Need:** Drag-and-drop file upload component
**Integration Points:** Sample details, Analysis details, Project details

---

## 📖 API Reference

### Complete Endpoint List

#### Authentication & Users
```
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/users/invite
POST   /api/users/accept-invitation
GET    /api/users/invitations
DELETE /api/users/invitations/:id
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

#### Analysis Types
```
GET    /api/analysis-types
POST   /api/analysis-types
GET    /api/analysis-types/:id
PATCH  /api/analysis-types/:id
DELETE /api/analysis-types/:id
```

#### Files
```
POST   /api/files/upload
GET    /api/files/:id
GET    /api/files/:id/download
GET    /api/files/entity/:entity_type/:entity_id
PATCH  /api/files/:id
DELETE /api/files/:id
```

#### Analysis Requests
```
POST   /api/analysis-requests
GET    /api/analysis-requests/incoming
GET    /api/analysis-requests/outgoing
GET    /api/analysis-requests/:id
POST   /api/analysis-requests/:id/accept
POST   /api/analysis-requests/:id/reject
PATCH  /api/analysis-requests/:id/status
```

---

## 🛠️ Troubleshooting

### Migration Fails
```powershell
# Check if tables already exist
psql -c "\dt" | grep -E "UserInvitations|PasswordResetTokens|FileDocuments|AnalysisRequests|NotificationSettings"

# If tables exist, drop them first (CAUTION: loses data)
psql -c "DROP TABLE IF EXISTS UserInvitations, PasswordResetTokens, FileDocuments, AnalysisRequests, NotificationSettings CASCADE;"

# Re-run migration
psql $env:DATABASE_URL -f backend/src/database/migration-gap-fixes.sql
```

### File Upload Fails
```powershell
# Check multer installed
cd backend
npm list multer

# If not installed
npm install multer@types/multer --save

# Check uploads directory permissions
mkdir -p uploads
chmod 755 uploads
```

### Analysis Types Not Auto-Seeding
```powershell
# Manually seed (if auto-seed fails)
psql -c "SELECT * FROM AnalysisTypes"

# If empty, insert manually
psql -c "INSERT INTO AnalysisTypes (name, category, methods) VALUES 
  ('Chemical Analysis', 'Chemistry', ARRAY['GC-MS', 'HPLC']),
  ('Physical Testing', 'Physical', ARRAY['Tensile Testing'])
  ON CONFLICT (name) DO NOTHING;"
```

### Token Expired Errors
```powershell
# Check token expiration in database
psql -c "SELECT token, expires_at, created_at FROM UserInvitations WHERE token = '<TOKEN>';"
psql -c "SELECT token, expires_at, created_at FROM PasswordResetTokens WHERE token = '<TOKEN>';"

# Extend expiration (for testing only)
psql -c "UPDATE UserInvitations SET expires_at = NOW() + INTERVAL '7 days' WHERE token = '<TOKEN>';"
```

---

## 📞 Support

For detailed implementation status, see: **IMPLEMENTATION_STATUS.md**

For API testing scripts, run: **test-gap-fixes-api.ps1**

For setup automation, run: **setup-gap-fixes.ps1**

---

**Created:** 2024
**Status:** Backend Complete, UI Complete, Testing Pending
