# Role-Based Access Control (RBAC) Architecture

## System Overview

**The Complete Access Control Flow:**

```
User Logs In
    ↓
✅ Step 1: Check Company Membership
    ├─ Is user in company_id?
    └─ If NO → Access Denied
    
    ↓
✅ Step 2: Check Project Assignment
    ├─ Query: SELECT * FROM ProjectTeam WHERE project_id=? AND user_id=?
    ├─ Get assigned_role (admin, manager, scientist, viewer)
    └─ If NO assignment → Can't access this project
    
    ↓
✅ Step 3: Check Role Permissions
    ├─ Query: SELECT * FROM UserRolePermissions WHERE role=? AND resource_type=? AND action=?
    ├─ Example: Can 'scientist' 'view' a 'sample'? 
    │   Answer: SELECT * WHERE role='scientist' AND resource_type='sample' AND action='view'
    │   Result: allowed=true → YES
    └─ If allowed=false → Action Denied
    
    ↓
✅ Step 4: Check User-Level Overrides
    ├─ Query: SELECT * FROM ReportAccess WHERE report_id=? AND user_id=?
    ├─ Can have higher or lower access than default role
    └─ Specific user exceptions override role defaults

User sees only:
    - Projects they're assigned to
    - Samples in those projects
    - Reports they have explicit access to
    - Based on their role permissions
```

## Four Key Tables

### 1️⃣ ProjectTeam - Project Access Assignment

**Who can access WHAT project and WITH WHAT role**

```typescript
interface ProjectTeam {
  assignment_id: UUID           // Unique id for this assignment
  project_id: UUID              // Which project
  user_id: UUID                 // Which employee
  workspace_id: UUID            // Which workspace
  company_id: UUID              // Which company
  assigned_role: string         // Their role in THIS project: admin, manager, scientist, viewer
  assigned_by: UUID             // Who made the assignment (usually company admin)
  assigned_at: TIMESTAMP
  created_at: TIMESTAMP
}

// UNIQUE constraint: Each user can be assigned to a project only once
// UNIQUE(project_id, user_id)
```

**Example:**
```
ProjectTeam Records:
├─ Alice → Project "ChemAnalysis" → role: 'admin'    (she created it)
├─ Bob → Project "ChemAnalysis" → role: 'scientist'  (he runs experiments)
├─ Carol → Project "ChemAnalysis" → role: 'scientist'
└─ David → Project "PhysicsTests" → role: 'viewer'   (read-only)

When Alice logs in → sees ChemAnalysis + PhysicsTests (if also assigned)
When Bob logs in → sees only ChemAnalysis
When David logs in → sees only PhysicsTests with view-only access
```

### 2️⃣ UserRolePermissions - Permission Matrix

**What ACTIONS each ROLE can perform on RESOURCE TYPES**

```typescript
interface UserRolePermission {
  permission_id: UUID
  role: string                // 'admin', 'manager', 'scientist', 'viewer'
  resource_type: string       // 'sample', 'report', 'project', 'analysis'
  action: string              // 'view', 'create', 'edit', 'delete', 'share'
  allowed: boolean            // true = allowed, false = denied
  created_at: TIMESTAMP
}

// UNIQUE constraint: Each role has one rule per (resource_type, action)
// UNIQUE(role, resource_type, action)
```

**Example Permission Matrix:**

| Role | Sample View | Sample Create | Sample Edit | Sample Delete | Sample Share | Report View | Report Share |
|------|-------------|---------------|-------------|---------------|--------------|------------|--------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| scientist | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

**Pre-populated Default Rules (from migration):**
- **Admin**: Full access - view, create, edit, delete, share everything
- **Manager**: Can view, create, edit, share (NOT delete)
- **Scientist**: Can view, create, edit samples and reports (NOT delete or share)
- **Viewer**: Can only view (READ-ONLY)

### 3️⃣ ReportAccess - User-Level Report Access Override

**Explicit grants for specific users to specific reports**

```typescript
interface ReportAccess {
  access_id: UUID
  report_id: UUID               // Which report
  user_id: UUID                 // Which user
  workspace_id: UUID
  access_level: string          // 'view', 'download', 'edit'
  can_share: boolean            // Can this user share with others?
  shared_by_user_id: UUID       // Who granted this access
  shared_date: TIMESTAMP        // When it was shared
  created_at: TIMESTAMP
}

// UNIQUE constraint: Each user can have access to a report only once
// UNIQUE(report_id, user_id)
```

**Use Cases:**
```
Scenario: Alice (manager) wants to share Report X with External Lab Partner

1. Alice has ProjectTeam assignment: project='ChemAnalysis', role='manager'
2. Role 'manager' can 'share' 'report' ✅ (from UserRolePermissions)
3. Alice creates ReportAccess:
   - report_id='Report-X'
   - user_id='ExternalPartner-UserID'
   - access_level='view'
   - can_share=false (partner can't share further)
   - shared_by_user_id='Alice-ID'

Result: External lab partner can NOW view Report X
```

### 4️⃣ SampleAccess - User-Level Sample Access Override

**Same concept as ReportAccess but for samples**

```typescript
interface SampleAccess {
  access_id: UUID
  sample_id: UUID
  user_id: UUID
  workspace_id: UUID
  access_level: string
  can_share: boolean
  shared_by_user_id: UUID
  shared_date: TIMESTAMP
  created_at: TIMESTAMP
}

// UNIQUE constraint
// UNIQUE(sample_id, user_id)
```

## Access Control Flow: Step-by-Step

### Scenario: Can User X view Sample Y?

```
User X requests: GET /api/samples/Y

Backend checks:
1. ✅ Is X logged in and in same workspace as Sample Y?
   → Query: SELECT company_id FROM Users WHERE id='X'
   
2. ✅ Is X assigned to the project containing Sample Y?
   → Query: SELECT * FROM ProjectTeam 
             WHERE project_id=(Sample Y's project)
             AND user_id='X'
   → If NO result → 403 Forbidden
   → If YES, get assigned_role = 'scientist'
   
3. ✅ Does role 'scientist' have permission to 'view' 'sample'?
   → Query: SELECT allowed FROM UserRolePermissions
             WHERE role='scientist'
             AND resource_type='sample'
             AND action='view'
   → Result: allowed=true → Continue
   → If false → 403 Forbidden
   
4. ✅ Check for user-level overrides (SampleAccess)
   → Query: SELECT * FROM SampleAccess
             WHERE sample_id='Y' AND user_id='X'
   → If exists with access_level='edit' → User can edit (higher than role default)
   → If exists with access_level='drop' → User denied (would be lower)
   → If not exists → Use role default permissions

Result: ✅ Access Granted - User X can view Sample Y
```

### Scenario: Can User X share Report Y with User Z?

```
User X requests: POST /api/report-sharing 
  { reportId: 'Y', userId: 'Z', accessLevel: 'view' }

Backend checks:
1. ✅ Is X assigned to project containing Report Y?
   → Query ProjectTeam
   → Get X's assigned_role = 'manager'
   
2. ✅ Can 'manager' 'share' 'report'?
   → Query UserRolePermissions
   → Role='manager', resource='report', action='share'
   → Result: allowed=true → Continue
   
3. ✅ Create ReportAccess record
   INSERT INTO ReportAccess (
     report_id='Y',
     user_id='Z',
     access_level='view',
     can_share=false,
     shared_by_user_id='X'
   )
   
4. ✅ User Z now has ReportAccess
   → When Z logs in and views reports
   → Z's dashboard shows Report Y
   → Z has 'view' access (can't edit or share)

Result: ✅ Report Y shared with User Z at 'view' level
```

## The Complete Access Check Function

```typescript
/**
 * Check if user can perform action on resource
 * Returns: { allowed, reason }
 */
async function checkAccess(
  userId: UUID,
  projectId: UUID,
  resourceType: 'sample' | 'report' | 'project',
  action: 'view' | 'create' | 'edit' | 'delete' | 'share',
  resourceId?: UUID
): Promise<{ allowed: boolean; reason: string }> {

  // Step 1: Check project assignment
  const assignment = await db.query(
    'SELECT assigned_role FROM ProjectTeam WHERE user_id=$1 AND project_id=$2',
    [userId, projectId]
  );
  
  if (!assignment.rows.length) {
    return { allowed: false, reason: 'User not assigned to project' };
  }
  
  const userRole = assignment.rows[0].assigned_role;
  
  // Step 2: Check role permissions
  const permission = await db.query(
    'SELECT allowed FROM UserRolePermissions WHERE role=$1 AND resource_type=$2 AND action=$3',
    [userRole, resourceType, action]
  );
  
  if (!permission.rows.length) {
    return { allowed: false, reason: `Role ${userRole} has no permission defined` };
  }
  
  if (!permission.rows[0].allowed) {
    return { allowed: false, reason: `Role ${userRole} cannot ${action} ${resourceType}` };
  }
  
  // Step 3: Check user-level overrides (if resourceId provided)
  if (resourceId) {
    const override = await db.query(
      `SELECT access_level FROM ${resourceType === 'sample' ? 'SampleAccess' : 'ReportAccess'}
       WHERE ${resourceType}_id=$1 AND user_id=$2`,
      [resourceId, userId]
    );
    
    if (override.rows.length) {
      const accessLevel = override.rows[0].access_level;
      // Handle access level logic
      // 'view' < 'download' < 'edit'
      if (action === 'view' && ['view', 'download', 'edit'].includes(accessLevel)) {
        return { allowed: true, reason: 'User has explicit access' };
      }
      if (action === 'edit' && accessLevel === 'edit') {
        return { allowed: true, reason: 'User has explicit edit access' };
      }
    }
  }
  
  return { allowed: true, reason: 'Role permissions allow action' };
}
```

## Default Role Hierarchy

```
ADMIN (Full Control)
    ├─ Can create projects
    ├─ Can assign employees to projects
    ├─ Can edit all samples/reports
    ├─ Can delete samples/reports
    ├─ Can share with anyone
    └─ Can change other users' roles

MANAGER (Create & Share)
    ├─ Can create samples/reports
    ├─ Can edit own and team samples/reports
    ├─ Can share with others
    ├─ Can view all project data
    └─ Cannot delete (prevents accidents)

SCIENTIST (Create & Use)
    ├─ Can create samples/reports
    ├─ Can edit own samples/reports
    ├─ Can view all project data
    ├─ Cannot delete
    └─ Cannot share directly

VIEWER (Read-Only)
    ├─ Can view all samples/reports
    ├─ Cannot create, edit, delete, or share
    └─ Used for stakeholders, clients, auditors
```

## Real-World Example: Multi-Lab Chemistry Project

```
Company: "LabCo" (Executing Lab)
Workspace: "chemistry-2026"
Project: "Polymer-Analysis"

Team Structure:
├─ Alice (Company Admin)
│   ├─ ProjectTeam: Polymer-Analysis, role='admin'
│   └─ Can do everything
│
├─ Bob (Lead Scientist)
│   ├─ ProjectTeam: Polymer-Analysis, role='manager'
│   ├─ Can create samples, run trials
│   ├─ Can share reports with external labs
│   └─ Cannot delete results (prevents accidents)
│
├─ Charlie (Technician)
│   ├─ ProjectTeam: Polymer-Analysis, role='scientist'
│   ├─ Can create and run samples
│   ├─ Can view all results
│   └─ Cannot share directly with external parties
│
└─ David (Client Representative)
    ├─ ProjectTeam: Polymer-Analysis, role='viewer'
    ├─ Can view all samples and reports
    ├─ Receives updates on progress
    └─ Cannot modify anything

Flow:
1. Charlie creates Sample "POLY-001" → stored in Samples table
2. Charlie runs analysis → creates AnalysisReport
3. Bob views report and decides to send to ExternalLab
4. Bob creates:
   - SampleTransfer (POLY-001 to ExternalLab, filtered metadata)
   - ReportAccess (for ExternalLabUser)
5. David (viewer) sees the project but cannot edit
6. When results come back, Bob shares with David via ReportAccess
7. David gets notified and can view the analysis results
```

## Access Control at API Level

### Example: GET /api/projects/:projectId/samples

```typescript
router.get('/api/projects/:projectId/samples', async (req, res) => {
  const userId = req.user.id;
  const projectId = req.params.projectId;
  
  // Check access
  const access = await checkAccess(userId, projectId, 'sample', 'view');
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason });
  }
  
  // Get user's project assignment to find their role
  const assignment = await db.query(
    'SELECT assigned_role FROM ProjectTeam WHERE user_id=$1 AND project_id=$2',
    [userId, projectId]
  );
  const role = assignment.rows[0].assigned_role;
  
  // Now user can only see samples they have permission for
  const samples = await db.query(
    `SELECT * FROM Samples WHERE project_id=$1
     AND (
       -- Check role permissions
       EXISTS (
         SELECT 1 FROM UserRolePermissions
         WHERE role=$2 AND resource_type='sample' AND action='view' AND allowed=true
       )
       OR
       -- Check user-level access overrides
       EXISTS (
         SELECT 1 FROM SampleAccess
         WHERE sample_id=Samples.id AND user_id=$3
       )
     )`,
    [projectId, role, userId]
  );
  
  res.json(samples);
});
```

## Database Indexes for Performance

```sql
-- ProjectTeam
CREATE INDEX idx_project_team_project ON ProjectTeam(project_id);
CREATE INDEX idx_project_team_user ON ProjectTeam(user_id);
CREATE INDEX idx_project_team_role ON ProjectTeam(assigned_role);

-- UserRolePermissions (frequently queried for permission checks)
CREATE INDEX idx_role_permissions_role ON UserRolePermissions(role);
CREATE INDEX idx_role_permissions_resource ON UserRolePermissions(resource_type);

-- ReportAccess (frequently queried when user views reports)
CREATE INDEX idx_report_access_report ON ReportAccess(report_id);
CREATE INDEX idx_report_access_user ON ReportAccess(user_id);

-- SampleAccess (frequently queried when user views samples)
CREATE INDEX idx_sample_access_sample ON SampleAccess(sample_id);
CREATE INDEX idx_sample_access_user ON SampleAccess(user_id);
```

## Implementation Checklist

- [x] ProjectTeam table - Employee project assignments
- [x] UserRolePermissions table - Role permission matrix
- [x] ReportAccess table - User-level report sharing
- [x] SampleAccess table - User-level sample sharing
- [x] Schemas defined in database/schemas.ts
- [x] Migration #006 created
- [x] TypeScript interfaces added
- [ ] Access check middleware implementation
- [ ] API endpoints for ProjectTeam management
- [ ] API endpoints for access granting/revoking
- [ ] Login flow: Filter projects by assignment
- [ ] Dashboard: Show only assigned projects
- [ ] Audit logging for all access changes

## Migration Path

When a user logs in:
```
1. Load user from Users table
2. Load user's company_id
3. Query: SELECT * FROM ProjectTeam WHERE user_id=X AND workspace_id=Y
4. User can access only these projects
5. When viewing project, load teams via ProjectTeam
6. When accessing resource, check UserRolePermissions + user-level overrides
7. Return filtered view based on permissions
```

---

**Status**: ✅ **COMPLETE** - All tables, migrations, and documentation ready
**Next**: Implement access check middleware and API endpoints
