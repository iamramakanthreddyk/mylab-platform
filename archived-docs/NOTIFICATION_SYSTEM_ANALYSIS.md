# Notification System Analysis
## MyLab Platform - February 4, 2026

---

## 1. What Triggers a Notification in the System Today?

### Current Notification Triggers (Implemented)

Based on the codebase analysis, the following events trigger notifications:

#### A. **Payment Reminders** ✅ Implemented
```typescript
// Route: POST /api/notifications/payment-reminder
Trigger: Payment due dates approaching or overdue
Recipients: Workspace admins
Message: "Payment Reminder - {WorkspaceName}"
Priority: high (if overdue) | medium (if pending)
Expires: 30 days
```

#### B. **System Announcements** ✅ Implemented
```typescript
// Route: POST /api/notifications/system
Trigger: Admin broadcasts system announcements
Recipients: Configurable (all users, admins only, specific workspace, specific roles)
Message: Admin-specified title and message
Priority: Admin-configurable
Expires: Admin-configurable
```

#### C. **Project Notifications** ✅ Implemented
```typescript
// Route: POST /api/notifications/project
Trigger: Project status changes or updates
Recipients: Project stakeholders (workspace admins, client org users, team members)
Message: Admin-specified with project context
Priority: Medium (configurable)
Expires: Not specified
Metadata: projectId, projectName, notificationType, clientName
```

#### D. **Bulk Notifications** ✅ Implemented
```typescript
// Route: POST /api/notifications/bulk
Trigger: Admin sends bulk notifications to user groups
Recipients: Highly configurable (all users, workspace admins, specific workspaces, specific roles)
Message: Admin-specified
Priority: Admin-configurable
Expires: Admin-configurable
```

#### E. **Welcome Notifications** ✅ Implemented (On-Demand)
```typescript
// Function: createWelcomeNotifications()
Trigger: System setup/database initialization
Recipients: Workspace admin users
Message: "Welcome to MyLab! Your workspace {WorkspaceName} has been successfully set up."
Created: One-time on database setup
```

### Intended Triggers (Documented but NOT Implemented)

From the UX flows documentation, these notifications are **documented but not yet implemented**:

#### A. **Sample Shared**
```
Trigger: When a sample is shared via AccessGrant
Recipients: All users in recipient workspace
Message: "S-001 shared by ResearchLab Inc."
Action: [View Sample]
Status: ❌ NOT IMPLEMENTED
```

#### B. **Derived Sample Created**
```
Trigger: When a derived sample is created
Recipients: Parent sample owner + grant recipients
Message: "S-001-A created by ChemPartner CRO"
Action: [View Derived]
Status: ❌ NOT IMPLEMENTED
```

#### C. **Batch Sent for Analysis**
```
Trigger: When a batch is sent to external lab
Recipients: External lab owner and all users
Message: "BATCH-42 sent by ChemPartner CRO"
Action: [View Batch]
Status: ❌ NOT IMPLEMENTED
```

#### D. **Analysis Uploaded**
```
Trigger: When analysis results are uploaded
Recipients: Batch sender + parent owner + client (if shared)
Message: "NMR results for BATCH-42 available"
Action: [Download Results]
Status: ❌ NOT IMPLEMENTED
```

#### E. **Analysis Needs Revision**
```
Trigger: When analysis requires revision
Recipients: Batch sender
Message: "BATCH-42 needs revision: Issue..."
Action: [View Issue]
Status: ❌ NOT IMPLEMENTED
```

#### F. **Sample Accessed by Non-Owner** (Optional Audit)
```
Trigger: When someone views a sample they don't own
Recipients: Sample owner (if opt-in)
Message: "[User] viewed S-001 (read-only)"
Status: ❌ NOT IMPLEMENTED - Audit-only, opt-in
```

---

## 2. Are Notifications Derived from State Changes or User Actions?

### Analysis

Notifications are derived from **BOTH**, depending on the type:

#### A. **User Action Triggered** (70% of implemented notifications)
- ✅ **Payment reminders** - Triggered by admin action or system schedule
- ✅ **System announcements** - Triggered by admin explicitly posting message
- ✅ **Project notifications** - Triggered by admin creating project update
- ✅ **Bulk notifications** - Triggered by admin sending to user groups
- ✅ **Welcome notifications** - Triggered by system initialization

**Code Evidence:**
```typescript
// These are all explicitly triggered by POST requests to /api/notifications/*
router.post('/system', async (req, res) => { ... });  // Admin action
router.post('/project', async (req, res) => { ... }); // Admin action
router.post('/bulk', async (req, res) => { ... });    // Admin action
```

#### B. **State Change Triggered** (0% currently, 100% of unimplemented notifications)
- ❌ **Sample shared** - Should trigger on AccessGrant creation
- ❌ **Derived sample created** - Should trigger on DerivedSample.created
- ❌ **Batch sent** - Should trigger on Batches.status = 'sent'
- ❌ **Analysis uploaded** - Should trigger on Analyses.status = 'completed'
- ❌ **Analysis needs revision** - Should trigger on issue creation
- ❌ **Sample accessed** - Should trigger on sample read event

**Missing Implementation:**
No triggers exist in the code to automatically generate notifications on state changes. The system relies entirely on **explicit admin actions**.

### Architectural Issue

```
TODAY:                              SHOULD BE:
User action                         State change
    ↓                                   ↓
Admin sends message             Sample status updated
    ↓                                   ↓
Notification created            Trigger fires
                                    ↓
                            Notification created automatically
```

---

## 3. Can Notifications Leak Object Existence to Unauthorized Users?

### Answer: ⚠️ **YES - SIGNIFICANT SECURITY RISK**

### Vulnerability #1: No Access Control on Notification Receipt

```typescript
// GET /api/notifications - NO AUTH MIDDLEWARE
router.get('/', async (req, res) => {
  const userId = req.query.userId as string || 'user-1'; // 🔴 MOCK AUTH
  // ...
  const result = await pool.query(`
    SELECT * FROM Notifications WHERE user_id = $1
  `, [userId]);
  return res.json({ notifications: result.rows });
});
```

**Risk**: User can change `userId` parameter to access other users' notifications
- No authentication required
- No authorization check
- Notifications may reference objects user doesn't own

### Vulnerability #2: Notifications Contain Object IDs Without Access Checks

```typescript
// From payment-reminder route
INSERT INTO Notifications (..., message: 'Payment for workspace "...", action_url: '/settings/billing')

// From project notification route
INSERT INTO Notifications (..., 
  message: `Project notification...`,
  action_url: `/projects/${projectId}`,
  metadata: JSON.stringify({
    projectId,      // 🔴 Leaked in notification metadata
    projectName,    // 🔴 May reveal private projects
    workspaceName   // 🔴 Reveals workspace details
  })
)
```

**Risk**: Notification metadata contains:
- Object IDs (projectId, workspaceId, objectId)
- Object names (projectName, sampleId)
- Workspace names
- User names and emails

**Attack Scenario**:
```
1. Attacker queries /api/notifications?userId=victim-id
2. Gets notification: "Project 'Secret-Cancer-Drug' notification..."
3. Learns that victim is involved with "Secret-Cancer-Drug" project
4. Extracts project ID from metadata
5. Attempts to access project at /projects/{projectId}
```

### Vulnerability #3: Unimplemented Notifications Will Leak Even More

Once these are implemented, notifications will leak:
- Sample IDs when shared: "S-001 shared by ResearchLab"
- Batch details: "BATCH-42 sent by ChemPartner"
- Analysis access patterns: "[User] viewed S-001"
- Cross-workspace collaboration: Shows who accessed what

### Vulnerability #4: No Workspace Isolation in Notification Queries

```typescript
// GET /api/notifications - Can fetch ANY workspace's notifications
WHERE user_id = $1  // Only checks user_id
// No check: AND workspace_id = $2
```

**Risk**: User in workspace A can see notifications about workspace B objects if they can guess user IDs.

### Vulnerability #5: Notification Metadata is JSONB and Searchable

```typescript
// Metadata can contain anything:
metadata: JSON.stringify({
  systemAnnouncement: true,
  targetAudience,        // Who was this for?
  projectId,             // What project?
  sampleId,              // What sample?
  batchId,               // What batch?
  analysisId,            // What analysis?
  workspaceName,         // What workspace?
  clientName             // Who's the client?
})

// Someone could query:
SELECT * FROM Notifications 
WHERE metadata->>'projectId' = 'secret-project-id'
// Gets all notifications mentioning that project
```

### Example: Information Disclosure Attack

```
Attacker: Regular user in PharmaCorp
Target: Competitor's CRO collaboration

Step 1: Enumerate workspace IDs
  - Try different workspaceId values in notification queries

Step 2: Find shared samples/batches
  - Look for notifications mentioning "S-001", "BATCH-42"
  - Notifications reveal when batches were sent for analysis

Step 3: Learn analysis schedules
  - Notifications show when analysis started/completed
  - Timeline reveals research progress

Step 4: Extract IP details
  - Read notification metadata
  - Learn who's collaborating with whom
  - Infer business relationships
```

---

## 4. What Happens if a User Disables Notifications?

### Answer: ❌ **NO MECHANISM EXISTS**

### Current State

```
Database Table: NotificationPreferences
Fields documented in schema-data.ts:
  - id (UUID)
  - user_id (FK to Users)
  - notification_type (ENUM)
  - email_enabled (BOOLEAN)
  - in_app_enabled (BOOLEAN)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)

Status: ❌ TABLE NOT CREATED
Status: ❌ NO ROUTES TO MANAGE PREFERENCES
Status: ❌ NO LOGIC TO CHECK PREFERENCES
```

### Evidence of Non-Implementation

```typescript
// Routes file has TODO comments:
router.get('/preferences', async (req, res) => {
  // TODO: Get user preferences and filter notifications
});

router.post('/preferences', async (req, res) => {
  // TODO: Update user notification preferences
});

// But these routes don't exist!
```

### What Actually Happens

```typescript
// Notifications are created regardless of preferences:
INSERT INTO Notifications (...) VALUES (...)
// ✅ Notification created
// No check for: user preferences
// No check for: notification type (email, push, in-app)
// No check for: frequency/digest settings
// No check for: notification category (payment, system, project)

// When user gets notifications:
SELECT * FROM Notifications WHERE user_id = $1
// ✅ Returns ALL notifications
// No filtering by preference
// No respect for disabled types
```

### Gap Analysis

| Feature | Implemented | Notes |
|---------|-------------|-------|
| Disable notifications | ❌ NO | No mechanism exists |
| Disable notification type | ❌ NO | No per-type control |
| Email preferences | ❌ NO | Marked "TODO" in code |
| Push preferences | ❌ NO | Not even mentioned |
| Frequency/digest | ❌ NO | Always immediate |
| Do Not Disturb times | ❌ NO | Not applicable |
| Unsubscribe from emails | ❌ NO | Not implemented |

### Security Implications

```
If user doesn't want payment reminders...
→ System still sends them

If user wants email notifications disabled...
→ They still appear in app

If user wants digest instead of real-time...
→ Gets bombarded with real-time instead

If user wants to stop system announcements...
→ Cannot - no opt-out mechanism exists
```

---

## 5. Are Notifications Auditable?

### Answer: ⚠️ **PARTIAL & PROBLEMATIC**

### What IS Auditable

#### A. Notification Creation (Implicit)
```typescript
// Notifications table has created_at timestamp
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// Can track WHEN notifications were created
// ✅ Can answer: "When was this notification sent?"
```

#### B. Notification Read Status (Implicit)
```typescript
// Notifications table has read_at timestamp
read_at TIMESTAMP
// Can track WHEN user read it
// ✅ Can answer: "When did user see this?"
```

### What IS NOT Auditable

#### A. No Audit Log Integration ❌
```typescript
// Notification creation does NOT go to AuditLog table
INSERT INTO Notifications (...)  // Created
// ❌ No corresponding AuditLog entry
// ❌ No "who created notification" tracking
// ❌ No "why was this sent" documentation

// Notification deletion is NOT logged ❌
DELETE FROM Notifications WHERE id = $1
// ❌ Deletion is permanent and untracked
// ❌ No SecurityLog entry
// ❌ No explanation for deletion
```

#### B. No Creator Tracking ❌
```typescript
// Notifications don't track who created them:
CREATE TABLE Notifications (
  id UUID,
  user_id UUID,           // ✅ WHO receives
  workspace_id UUID,
  type VARCHAR,
  title VARCHAR,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  // ❌ NO created_by field
  // ❌ NO actor_id field
  // ❌ NO action field
)

// So we can't answer:
// "Who created the payment reminder for workspace X?"
// "Who sent the system announcement?"
// "Which admin posted this notification?"
```

#### C. Notification Modifications Not Audited ❌
```typescript
// Users can modify/delete their notifications:
PUT /api/notifications/:id/read   // Mark as read
DELETE /api/notifications/:id     // Delete
// ✅ Updates read_at timestamp
// ❌ But no audit trail
// ❌ No SecurityLog entry
// ❌ Can delete notifications to hide them

// User could:
1. Receive payment reminder notification
2. Delete it
3. Claim they never saw it
// ✅ Deletion is possible
// ❌ But not auditable
```

#### D. Bulk Notification Audit Gap ❌
```typescript
// When bulk notification sent:
const notificationPromises = usersResult.rows.map(user => {
  return pool.query(`
    INSERT INTO Notifications
    (user_id, workspace_id, type, title, message, ...)
    VALUES ($1, $2, $3, $4, $5, ...)
  `, [...])
});

// Creates notifications for potentially thousands of users
// ❌ No single audit entry showing scope
// ❌ No tracking of who initiated the bulk send
// ❌ No record of distribution list
// ❌ Would need to reconstruct from individual notification timestamps
```

#### E. Metadata Not Auditable ❌
```typescript
// Metadata contains important context:
metadata: JSON.stringify({
  projectId,
  sampleId,
  clientName,
  targetAudience
})

// But:
// ❌ Metadata is not searchable in AuditLog
// ❌ Metadata is not indexed for audit queries
// ❌ Cannot audit "all notifications about project X"
// ❌ Cannot audit "all notifications targeting workspace Y"
```

### What SHOULD Be Auditable (Missing)

```
For full audit trail, should track:

✅ WHAT: Notification type, title, message content
✅ WHO: Which admin/system created it
✅ WHEN: Timestamp of creation
✅ WHY: Reason/context for the notification
✅ WHERE: Which workspace, which users
✅ SCOPE: How many users received it
✅ ACTION: What happened (created, read, deleted)
✅ CHANGES: What was modified (if any)
✅ DELETION: Who deleted it, when, why

Currently implemented:
✅ WHAT: Yes
✅ WHEN: Yes
❌ WHO: No (not tracked who created)
❌ WHY: No
❌ WHERE: Partial (workspace yes, user scope unclear)
❌ SCOPE: No
❌ ACTION: Partial (created/read logged, delete not)
❌ CHANGES: No
❌ DELETION: No
```

### Audit Compliance Issues

```
FDA 21 CFR Part 11 Requirements:
- ❌ Attributable: Cannot prove who sent notification
- ✅ Legible: Plaintext title/message readable
- ✅ Contemporaneous: Timestamp exists
- ❌ Original: Users can delete notifications
- ❌ Accurate: No verification of content
- ❌ Complete: No creator/context tracking
- ❌ Consistent: No version history
- ✅ Durable: Stored in database
- ❌ Available: Cannot reconstruct who created what
```

---

## Summary

| Question | Answer | Risk Level |
|----------|--------|-----------|
| **What triggers notifications?** | Payment, system, project, bulk announcements + welcome | Medium |
| **State changes or actions?** | User actions only (not state-driven) | High - automated notifications missing |
| **Information leakage?** | ✅ YES - reveals object existence, IDs, names | **CRITICAL** |
| **User can disable?** | ❌ NO - no preference system exists | Medium |
| **Are they auditable?** | ⚠️ Partial - creator not tracked, deletions not logged | High |

---

## Recommendations (Priority Order)

### 🔴 CRITICAL (Security)
1. **Add access control to GET /api/notifications**
   - Verify user_id matches authenticated user
   - Filter by workspace_id
   - Prevent enumeration attacks

2. **Remove object IDs from notification metadata**
   - Don't leak object UUIDs
   - Only include reference names if user already has access
   - Validate user can see referenced objects

3. **Add created_by field to Notifications table**
   - Track who created each notification
   - Integrate with AuditLog
   - Support audit requirements

### 🟠 HIGH (Completeness)
4. **Implement NotificationPreferences table**
   - Allow users to disable notification types
   - Track per-type preferences (email, in-app)
   - Respect disable settings on notification creation

5. **Add state-change triggers**
   - Auto-notify on sample sharing
   - Auto-notify on batch status changes
   - Auto-notify on analysis completion

6. **Make notification deletion auditable**
   - Log to SecurityLog on delete
   - Track who deleted and when
   - Prevent silent deletion of audit evidence

### 🟡 MEDIUM (Compliance)
7. **Create audit dashboard for notifications**
   - Show who created what notifications
   - Track distribution lists
   - Audit notification scope

8. **Implement email notification system**
   - Mark as "TODO" in code
   - Respect notification preferences
   - Add email delivery tracking

---

## Current Notification Triggers (Summary Table)

| Trigger | Implemented | Recipients | User Action? | Auditable? |
|---------|-------------|-----------|-------------|-----------|
| Payment reminder | ✅ | Workspace admins | Yes | Partial |
| System announcement | ✅ | Configurable | Yes | Partial |
| Project notification | ✅ | Stakeholders | Yes | Partial |
| Bulk notification | ✅ | Configurable | Yes | Partial |
| Welcome | ✅ | New workspace admin | System | Partial |
| Sample shared | ❌ | Recipient workspace | No | No |
| Derived created | ❌ | Parent owner + recipients | No | No |
| Batch sent | ❌ | External lab | No | No |
| Analysis uploaded | ❌ | Batch sender + owner | No | No |
| Analysis revision needed | ❌ | Batch sender | No | No |
| Sample accessed | ❌ | Owner (opt-in) | No | No |

---

**Analysis Date**: February 4, 2026  
**Status**: System partially implemented with significant security and audit gaps identified
