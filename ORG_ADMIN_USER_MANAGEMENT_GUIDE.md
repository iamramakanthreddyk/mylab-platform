# Organization Admin User Management Guide

## Overview

As an **Organization Admin**, you have full control over managing users within your organization, including creating, editing, enabling/disabling access, and assigning users to projects. This guide explains all available user management capabilities.

---

## 🎯 What You Can Do

### 1. **Create Users**
- Add new users directly to your organization
- Set their initial role and credentials
- Control access immediately

### 2. **Edit Users**
- Update user information (name, role)
- Change user roles to match their responsibilities
- Manage user permissions

### 3. **Enable/Disable Access**
- Deactivate users who should no longer have access
- Reactivate previously deactivated users
- Maintain user history without permanent deletion

### 4. **Assign Users to Projects**
- Add team members to specific projects
- Set project-specific roles (different from organization role)
- Remove users from projects when needed

---

## 📋 Database Schema

### Users Table
The system uses a **soft-delete** model for users:

```sql
CREATE TABLE Users (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES Organizations(id),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'scientist',  -- Organization-level role
  require_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP                           -- NULL = active, NOT NULL = inactive
);
```

### ProjectTeam Table
Project assignments are managed separately:

```sql
CREATE TABLE ProjectTeam (
  assignment_id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES Projects(id),
  user_id UUID NOT NULL REFERENCES Users(id),
  workspace_id UUID NOT NULL,
  company_id UUID NOT NULL,
  assigned_role VARCHAR(50) NOT NULL,            -- Project-specific role
  assigned_by UUID NOT NULL REFERENCES Users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)                    -- Each user once per project
);
```

---

## 🔌 Backend APIs

### User Management Endpoints

#### **List All Users**
```http
GET /api/users?includeInactive=true
```
**Authorization:** Authenticated user  
**Query Parameters:**
- `includeInactive` (boolean, admin only): Include deactivated users
- `search` (string): Filter by name or email
- `role` (string): Filter by role

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "scientist",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "deleted_at": null
    }
  ],
  "count": 10
}
```

---

#### **Create User**
```http
POST /api/users
```
**Authorization:** Admin or Manager role  
**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "scientist",           // Optional, defaults to 'scientist'
  "password": "SecurePass123"    // Optional, auto-generated if not provided
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "scientist",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "User created successfully"
}
```

**Plan Validation:**
- Checks workspace subscription plan limits
- Returns error if user limit reached
- Validates max_users from active plan

---

#### **Update User**
```http
PATCH /api/users/:id
```
**Authorization:** Admin role (or own user for name only)  
**Request Body:**
```json
{
  "name": "Updated Name",       // Anyone can update own name
  "role": "manager"             // Only admins can change roles
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Updated Name",
    "role": "manager",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

#### **Deactivate User**
```http
DELETE /api/users/:id
```
**Authorization:** Admin role  
**Notes:**
- Soft delete (sets `deleted_at` timestamp)
- Cannot deactivate yourself
- User data preserved in database
- Logged in audit trail

**Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

#### **Reactivate User**
```http
PATCH /api/users/:id/activate
```
**Authorization:** Admin role  
**Notes:**
- Clears `deleted_at` timestamp
- Checks plan limits before reactivation
- Logged in audit trail

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "scientist"
  },
  "message": "User reactivated successfully"
}
```

---

### Project Team Endpoints

#### **Assign User to Project**
```http
POST /api/projects/:projectId/team
```
**Authorization:** Admin role in project  
**Request Body:**
```json
{
  "userId": "uuid",
  "assignedRole": "scientist"    // admin, manager, scientist, viewer
}
```

**Response:**
```json
{
  "message": "User added to project",
  "assignmentId": "uuid",
  "projectId": "uuid",
  "userId": "uuid",
  "assignedRole": "scientist",
  "isExternal": false
}
```

---

#### **List Project Team Members**
```http
GET /api/projects/:projectId/team
```
**Authorization:** User assigned to project  
**Response:**
```json
[
  {
    "assignmentId": "uuid",
    "userId": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "assignedRole": "scientist",
    "assignedAt": "2024-01-01T00:00:00Z"
  }
]
```

---

#### **Update User Role in Project**
```http
PATCH /api/projects/:projectId/team/:userId
```
**Authorization:** Admin role in project  
**Request Body:**
```json
{
  "assignedRole": "manager"
}
```

---

#### **Remove User from Project**
```http
DELETE /api/projects/:projectId/team/:userId
```
**Authorization:** Admin role in project  

---

## 🖥️ Frontend UI Features

### User Management Page (`/users`)

The **UserManagement** component provides a comprehensive interface for managing organization users.

#### Features:

1. **User Listing**
   - View all active users in your organization
   - Toggle to include inactive users (admin only)
   - Search and filter capabilities
   - Role badges and status indicators

2. **Create User Dialog**
   - Full name and email (required)
   - Role selection (admin, manager, scientist, viewer)
   - Optional password (auto-generated if not provided)
   - Plan limit validation

3. **Edit User Dialog**
   - Update user name
   - Change user role (admin only)
   - Real-time validation

4. **Enable/Disable Toggle**
   - One-click deactivation
   - One-click reactivation (for inactive users)
   - Cannot deactivate yourself
   - Visual feedback with badges

5. **Project Assignment Dialog**
   - View current project assignments
   - Add user to new projects
   - Set project-specific role
   - Remove from projects
   - Project-level permissions

#### User Roles:

| Role | Permissions |
|------|------------|
| **Admin** | Full organization control, user management, all project access |
| **Manager** | Can invite users, manage projects, limited admin functions |
| **Scientist** | Perform experiments, access assigned projects |
| **Viewer** | Read-only access to assigned projects |

#### Project Roles:
Each user can have a **different role per project**:
- Organization role: `scientist`
- Project A role: `admin`
- Project B role: `viewer`

---

## 🔐 Security & Permissions

### Organization-Level Permissions
- **Admin**: Can create, edit, activate/deactivate all users
- **Manager**: Can create and invite users
- **Scientist/Viewer**: Cannot manage users

### Project-Level Permissions
- **Project Admin**: Can assign/remove team members, change roles
- **Project Manager**: Can view team members
- **Project Scientist/Viewer**: Can view team members

### Audit Logging
All user management actions are logged:
```sql
INSERT INTO AuditLog (
  object_type, object_id, action, 
  actor_id, actor_workspace, details
)
```

---

## 🎯 Common Workflows

### Workflow 1: Add a New User to a Project

1. **Create the user** (if not exists)
   ```
   Navigate to /users → Click "Add User"
   Fill in: Name, Email, Organization Role
   ```

2. **Assign to project**
   ```
   Click "Projects" button on user card
   Select project from dropdown
   Choose project role
   Click "Assign to Project"
   ```

### Workflow 2: Temporarily Disable User Access

1. **Deactivate user**
   ```
   Navigate to /users
   Click disable button on user card
   Confirm action
   ```

2. **Reactivate when needed**
   ```
   Toggle "Show inactive users"
   Click "Reactivate" on user card
   ```

### Workflow 3: Change User Role Across Projects

1. **Update organization role**
   ```
   Click "Edit" on user card
   Change role dropdown
   Save changes
   ```

2. **Update project-specific roles**
   ```
   Click "Projects" button
   For each project, click remove or change role
   Reassign with new role
   ```

---

## 📊 Plan Limits

The system enforces subscription plan limits:

```typescript
// Plan validation example
const plan = await getWorkspacePlanLimits(pool, workspaceId);

if (activeUsers >= plan.maxUsers) {
  return error('User limit reached for current plan');
}
```

**Plan tiers and limits are managed in:**
- `Plans` table: Defines max_users per plan
- `Subscriptions` table: Links workspace to plan
- Plan limits checked on: User creation, User reactivation

---

## 🚀 Getting Started

1. **Access User Management**
   - Navigate to `/users` in the application
   - Or click "Users" in the navigation menu

2. **View Your Users**
   - See all active users immediately
   - Use filters and search as needed

3. **Add Your First User**
   - Click "Add User" button
   - Fill in required information
   - User can log in immediately

4. **Assign to Projects**
   - Open "Projects" dialog on user card
   - Select relevant projects
   - Set appropriate project roles

---

## ⚠️ Important Notes

1. **Soft Delete Model**
   - Users are never permanently deleted
   - Deactivated users maintain data integrity
   - Can be reactivated at any time

2. **Plan Limits**
   - Always check subscription plan limits
   - User creation blocked if limit reached
   - Consider upgrading plan if needed

3. **Project Assignments**
   - Users must be in organization before project assignment
   - Project roles are independent of organization roles
   - Removing user from project doesn't deactivate their account

4. **Email Uniqueness**
   - Emails must be unique within an organization
   - Same email can exist in different organizations
   - Constraint: `UNIQUE(workspace_id, email)`

---

## 🎉 Summary

Organization admins have **complete control** over user management:
- ✅ Create users directly
- ✅ Edit user information and roles
- ✅ Enable/disable user access
- ✅ Assign users to projects with specific roles
- ✅ Full audit trail of all actions
- ✅ Plan limit enforcement
- ✅ Soft-delete preservation of data

All features are fully supported by:
- ✅ Database schema with proper constraints
- ✅ Backend APIs with authorization checks
- ✅ Frontend UI with comprehensive dialogs
- ✅ Real-time validation and feedback
