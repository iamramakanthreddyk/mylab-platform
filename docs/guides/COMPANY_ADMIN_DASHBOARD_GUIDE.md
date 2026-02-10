# Company Admin Dashboard - Complete Guide

**Status**: ✅ Complete  
**Version**: 1.0  
**Date**: February 2026

---

## 📋 Overview

The **Company Admin Dashboard** allows company owners and administrators to manage:
- ✅ **Company Profile** - Settings and information
- ✅ **Employees** - Invite, manage, and remove team members
- ✅ **Employee Roles** - View and manage roles across projects
- ✅ **Dashboard Stats** - Overview of company activity

---

## 🏗️ Role Structure

```
Superadmin (Platform Level)
  └─ Creates company profiles
  └─ Approves onboarding requests
  
  Company Owner/Admin (Company Level)
    ├─ Manages company profile and settings
    ├─ Invites and manages employees
    ├─ Assigns employees to projects
    ├─ Manages project access and roles
    └─ Views company activity and analytics
    
    Employees (User Level)
      ├─ Can view assigned projects
      ├─ Can perform actions based on assigned role
      └─ Can be granted additional permissions
```

---

## 🔑 Authentication

All dashboard endpoints require authentication with `company admin` role:

```
Authorization: Bearer {jwt_token}
User must have role: "admin" or "owner"
```

---

## 📊 Dashboard Endpoints

### 1. Dashboard Overview

**GET `/api/company/dashboard`**

View company statistics and recent activity.

```bash
curl -X GET http://localhost:3001/api/company/dashboard \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "company": {
    "id": "company-uuid",
    "name": "My Lab",
    "slug": "my-lab",
    "type": "company",
    "emailDomain": "mylab.com",
    "createdAt": "2026-01-15T10:30:00Z"
  },
  "stats": {
    "totalEmployees": 12,
    "totalProjects": 5,
    "assignedMembers": 10
  },
  "recentActivity": [
    {
      "action": "join_team",
      "entityType": "ProjectTeam",
      "entityId": "assignment-uuid",
      "userId": "user-uuid",
      "createdAt": "2026-02-05T14:22:00Z"
    }
  ]
}
```

---

### 2. Company Profile Management

**GET `/api/company/profile`**

Get current company profile settings.

```bash
curl -X GET http://localhost:3001/api/company/profile \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "id": "company-uuid",
  "name": "My Lab",
  "slug": "my-lab",
  "type": "company",
  "emailDomain": "mylab.com",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-02-05T10:30:00Z"
}
```

---

**PATCH `/api/company/profile`**

Update company profile settings.

```bash
curl -X PATCH http://localhost:3001/api/company/profile \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Lab Name",
    "emailDomain": "newdomain.com"
  }'
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "emailDomain": "string (optional)"
}
```

---

## 👥 Employee Management

### 1. List All Employees

**GET `/api/company/employees`**

Get paginated list of company employees.

```bash
curl -X GET "http://localhost:3001/api/company/employees?status=active&limit=50&offset=0" \
  -H "Authorization: Bearer {token}"
```

**Query Parameters:**
- `status`: `active` | `inactive` | `all` (default: `active`)
- `limit`: Number of results per page (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "employees": [
    {
      "id": "user-uuid",
      "email": "john@mylab.com",
      "name": "John Doe",
      "role": "scientist",
      "status": "active",
      "createdAt": "2026-01-20T10:30:00Z",
      "updatedAt": "2026-02-03T15:45:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 2. Get Employee Details

**GET `/api/company/employees/:userId`**

Get detailed information about a specific employee.

```bash
curl -X GET http://localhost:3001/api/company/employees/user-uuid \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "john@mylab.com",
  "name": "John Doe",
  "role": "scientist",
  "status": "active",
  "createdAt": "2026-01-20T10:30:00Z",
  "updatedAt": "2026-02-03T15:45:00Z",
  "projects": [
    {
      "id": "project-uuid",
      "name": "Project Alpha",
      "assignedRole": "analyst"
    },
    {
      "id": "project-uuid-2",
      "name": "Project Beta",
      "assignedRole": "viewer"
    }
  ]
}
```

---

### 3. Invite New Employee

**POST `/api/company/employees`**

Create a new employee account.

```bash
curl -X POST http://localhost:3001/api/company/employees \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@mylab.com",
    "name": "Jane Smith",
    "role": "scientist"
  }'
```

**Request Body:**
```json
{
  "email": "string (required)",
  "name": "string (optional)",
  "role": "string (optional, default: user)"
}
```

**Response:**
```json
{
  "id": "new-user-uuid",
  "email": "jane@mylab.com",
  "name": "Jane Smith",
  "role": "scientist",
  "createdAt": "2026-02-06T10:30:00Z",
  "message": "Employee added successfully. They can now log in with their email."
}
```

---

### 4. Update Employee

**PATCH `/api/company/employees/:userId`**

Update employee information.

```bash
curl -X PATCH http://localhost:3001/api/company/employees/user-uuid \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith Updated",
    "role": "manager"
  }'
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "role": "string (optional)"
}
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "jane@mylab.com",
  "name": "Jane Smith Updated",
  "role": "manager",
  "updatedAt": "2026-02-06T11:30:00Z"
}
```

---

### 5. Remove Employee

**DELETE `/api/company/employees/:userId`**

Remove an employee from the company (soft delete).

```bash
curl -X DELETE http://localhost:3001/api/company/employees/user-uuid \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "message": "Employee removed successfully",
  "employeeId": "user-uuid"
}
```

**Note:** Cannot remove yourself. Only soft deletes (marks as deleted).

---

### 6. View Employee Project Roles

**GET `/api/company/employees/:userId/roles`**

View all roles assigned to an employee across company projects.

```bash
curl -X GET http://localhost:3001/api/company/employees/user-uuid/roles \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "employee": {
    "id": "user-uuid",
    "email": "john@mylab.com",
    "name": "John Doe"
  },
  "roles": [
    {
      "projectId": "project-uuid-1",
      "projectName": "Project Alpha",
      "assignedRole": "manager",
      "assignedAt": "2026-01-25T10:30:00Z"
    },
    {
      "projectId": "project-uuid-2",
      "projectName": "Project Beta",
      "assignedRole": "scientist",
      "assignedAt": "2026-02-01T14:20:00Z"
    }
  ],
  "totalProjects": 2
}
```

---

## 🔐 Employee Roles & Permissions

### Available Company-Level Roles

```
- owner          → Full control, can manage all company settings
- admin          → Can manage employees and projects
- manager        → Can manage projects and team assignments
- scientist      → Can perform data analysis tasks
- user           → Default user role
- viewer         → Read-only access
```

### Project-Level Roles (Assigned per project)

When assigning employees to projects, use:

```
- admin          → Full control of project
- manager        → Manage samples and team
- scientist      → Analyze samples
- viewer         → View-only access
```

---

## 📋 Common Workflows

### Scenario 1: Invite New Employee

1. **Create employee account**
   ```bash
   POST /api/company/employees
   {
     "email": "newemployee@company.com",
     "name": "New Employee",
     "role": "scientist"
   }
   ```

2. **Assign to project** (using team routes)
   ```bash
   POST /api/projects/{projectId}/team
   {
     "userId": "{new-employee-id}",
     "assignedRole": "scientist"
   }
   ```

3. **Grant specific access** (if needed)
   ```bash
   POST /api/reports/{reportId}/share
   {
     "userId": "{new-employee-id}",
     "accessLevel": "view",
     "canShare": false
   }
   ```

---

### Scenario 2: Promote Employee to Manager

1. **Update employee role**
   ```bash
   PATCH /api/company/employees/{userId}
   {
     "role": "manager"
   }
   ```

2. **Update project role**
   ```bash
   PATCH /api/projects/{projectId}/team/{userId}
   {
     "assignedRole": "manager"
   }
   ```

---

### Scenario 3: Remove Employee from Company

1. **Check their project assignments**
   ```bash
   GET /api/company/employees/{userId}/roles
   ```

2. **Remove from all projects** (optional, or can keep for audit)
   ```bash
   DELETE /api/projects/{projectId}/team/{userId}
   ```

3. **Deactivate employee**
   ```bash
   DELETE /api/company/employees/{userId}
   ```

---

## 🔄 Workflow - Admin Dashboard Flow

```
Admin Login
    ↓
GET /api/company/dashboard
    ↓ (View stats & recent activity)
├─ Check employee count & project count
├─ Review recent team changes
└─ See activity log
    ↓
GET /api/company/employees
    ↓ (Browse employees)
├─ View all company employees
├─ Filter by status (active/inactive)
└─ Check employee count
    ↓
GET /api/company/employees/{userId}
    ↓ (View employee details)
├─ See employee information
├─ View all assigned projects
└─ Check project roles
    ↓
PATCH /api/company/employees/{userId}
    ↓ (Update if needed)
├─ Change name
├─ Change role
└─ Re-login to apply changes
```

---

## 📊 Database Relationships

**Company Dashboard connects:**

```
Organization (Company)
  ├─ Users (Company Employees)
  │  └─ ProjectTeam (Project Assignments)
  │     └─ Projects (Company Projects)
  └─ Projects
     └─ ProjectTeam
        └─ Users (Team Members)
```

---

## ⚙️ Configuration

### Required Database Tables

- `Organizations` - Company information (tenant)
- `Users` - Company employees
- `Projects` - Company projects
- `ProjectTeam` - User-project assignments
- `AuditLog` - Activity tracking

### Required Middleware

All endpoints require:
- ✅ `authenticate` middleware (valid JWT token)
- ✅ `requireCompanyAdmin` middleware (admin or owner role)

---

## 🚨 Error Responses

### 401 Not Authenticated
```json
{
  "error": "Not authenticated"
}
```

### 403 Access Denied
```json
{
  "error": "Company admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Employee not found"
}
```

### 409 Conflict
```json
{
  "error": "Employee with this email already exists"
}
```

### 400 Bad Request
```json
{
  "error": "Email is required"
}
```

---

## 📝 API Summary

| Endpoint | Method | Purpose | Role |
|----------|--------|---------|------|
| `/api/company/dashboard` | GET | View company overview | Admin |
| `/api/company/profile` | GET | Get company settings | Admin |
| `/api/company/profile` | PATCH | Update company settings | Admin |
| `/api/company/employees` | GET | List employees | Admin |
| `/api/company/employees/:userId` | GET | Get employee details | Admin |
| `/api/company/employees` | POST | Create employee | Admin |
| `/api/company/employees/:userId` | PATCH | Update employee | Admin |
| `/api/company/employees/:userId` | DELETE | Remove employee | Admin |
| `/api/company/employees/:userId/roles` | GET | View employee roles | Admin |

---

## 🔗 Related Endpoints

These endpoints work together with the dashboard:

**Team/Project Management** (from Access Control):
- `GET /api/projects/:projectId/team` - View project team
- `POST /api/projects/:projectId/team` - Add employee to project
- `PATCH /api/projects/:projectId/team/:userId` - Change role
- `DELETE /api/projects/:projectId/team/:userId` - Remove from project

**Sharing** (from Access Control):
- `POST /api/reports/:reportId/share` - Share report
- `PATCH /api/reports/:reportId/share/:userId` - Update access
- `DELETE /api/reports/:reportId/share/:userId` - Revoke access

---

## 🧪 Testing

### Test Dashboard Access

```bash
# Login as admin
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"password"}' \
  | jq -r '.token')

# View dashboard
curl -X GET http://localhost:3001/api/company/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

### Test Employee Management

```bash
# Create employee
curl -X POST http://localhost:3001/api/company/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "name": "Test User",
    "role": "scientist"
  }'

# List employees
curl -X GET http://localhost:3001/api/company/employees \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📞 Support

For questions about the admin dashboard:

1. Check this guide for endpoint documentation
2. Review the implementation file: `backend/src/api/company/dashboard-routes.ts`
3. Check company routes in: `backend/src/api/company/routes.ts`
4. Review access control docs: `ACCESS_CONTROL_INTEGRATION.md`

---

**Status**: ✅ PRODUCTION READY  
**Last Updated**: February 2026  
**Version**: 1.0
