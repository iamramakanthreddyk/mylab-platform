# Notification System - 5 Questions Answered
## Executive Summary

**Document**: NOTIFICATION_SYSTEM_ANALYSIS.md  
**Date**: February 4, 2026  

---

## Question 1: What Triggers a Notification in the System Today?

### Answer: 5 Types Currently, 6 Types Planned

**Currently Implemented** ✅:
1. **Payment Reminders** - When payment is due or overdue
2. **System Announcements** - Admin broadcast messages  
3. **Project Notifications** - Project status updates
4. **Bulk Notifications** - Admin targeted messaging to user groups
5. **Welcome Notifications** - Sent on workspace initialization

**Documented but NOT Implemented** ❌:
1. **Sample Shared** - When sample is shared via access grant
2. **Derived Sample Created** - When derived sample created
3. **Batch Sent** - When batch sent for external analysis
4. **Analysis Uploaded** - When analysis results available
5. **Analysis Revision Needed** - When analysis needs changes
6. **Sample Accessed** - When non-owner views sample (audit)

---

## Question 2: Are Notifications Derived from State Changes or User Actions?

### Answer: **User Actions Only (70% Admin-Driven)**

**Status Today**:
- ✅ **User Actions**: All implemented notifications require explicit admin action
  - Admin posts system message
  - Admin creates project update
  - Admin sends bulk notification
  
- ❌ **State Changes**: Zero notifications triggered automatically
  - No triggers on sample sharing
  - No triggers on batch creation
  - No triggers on analysis completion
  - No triggers on status changes

**Architecture Gap**: System is **event-based in design** but **admin-action based in implementation**

The 6 unimplemented notifications are all state-change triggered:
- Should fire automatically when status changes
- Currently require manual admin notification

---

## Question 3: Can Notifications Leak Object Existence to Unauthorized Users?

### Answer: **⚠️ YES - CRITICAL SECURITY VULNERABILITY**

**5 Vulnerability Classes Identified**:

1. **No Access Control** ❌
   - GET /api/notifications has no authentication
   - Users can enumerate other users' notifications
   - No workspace isolation checks

2. **Object ID Leakage** ❌
   - Notification metadata contains object UUIDs
   - Sample IDs, project IDs, batch IDs all exposed
   - Non-owners can discover what objects exist

3. **Metadata Exploitation** ❌
   - metadata JSONB field searchable
   - Contains projectId, sampleId, clientName, workspace names
   - Enables targeted enumeration attacks

4. **Cross-Workspace Disclosure** ❌
   - Notifications don't enforce workspace_id filtering
   - Could reveal collaboration between workspaces
   - Exposes business relationships

5. **Information Inference** ❌
   - Notification timing reveals research progress
   - Batch sending patterns expose lab collaboration
   - Analysis completion timelines leak project timeline

**Attack Example**:
```
1. Attacker: Queries /api/notifications?userId=victim-123
2. Finds: "Project 'Secret-Cancer-Drug' sent to NMR Lab"
3. Learns: Victim working on secret cancer research
4. Extracts: Project UUID from notification metadata
5. Attempts: /api/projects/{projectUuid} access
```

**Risk Level**: 🔴 **CRITICAL** - Information disclosure vulnerability

---

## Question 4: What Happens if a User Disables Notifications?

### Answer: **❌ NOTHING - NO DISABLE MECHANISM EXISTS**

**Current State**:
- ❌ No NotificationPreferences table (designed but not created)
- ❌ No UI for notification settings
- ❌ No API to manage preferences
- ❌ No logic to check preferences before sending
- ❌ No email opt-out functionality
- ❌ No frequency/digest controls

**What Users Cannot Control**:
- ❌ Cannot disable payment reminders
- ❌ Cannot disable system announcements
- ❌ Cannot disable project updates
- ❌ Cannot choose email vs in-app
- ❌ Cannot choose digest vs real-time
- ❌ Cannot set quiet hours/do not disturb

**System Behavior**:
```
INSERT INTO Notifications (...)  // Always created
SELECT * FROM Notifications WHERE user_id = $1  // Always returned
// No preference checks
// No filtering
// No opt-out logic
```

**Compliance Issue**: Cannot honor "do not contact" requests

---

## Question 5: Are Notifications Auditable?

### Answer: **⚠️ PARTIAL - MAJOR GAPS**

**What IS Auditable**:
- ✅ Notification creation timestamp (created_at)
- ✅ Notification read status (read_at timestamp)
- ✅ Content (title, message visible)

**What IS NOT Auditable** ❌:
- ❌ **Who created notification** - No created_by field
- ❌ **Why notification sent** - No reason/context field
- ❌ **Scope of distribution** - No tracking of target audience
- ❌ **Deletion events** - Deletions are not logged
- ❌ **AuditLog integration** - Notifications not integrated with audit trail
- ❌ **Bulk send tracking** - No single audit entry for bulk operations
- ❌ **Metadata audit** - Metadata not indexed for audit queries

**Specific Gaps**:

| Requirement | Implemented | Missing |
|-----------|-----------|---------|
| Attributable | ❌ | Who created notification? |
| Legible | ✅ | Plaintext visible |
| Contemporaneous | ✅ | Timestamp exists |
| Original | ❌ | Users can delete notifications |
| Accurate | ❌ | No verification/checksums |
| Complete | ❌ | Creator, context missing |
| Consistent | ❌ | No version history |
| Durable | ✅ | Stored in DB |
| Available | ❌ | Cannot reconstruct who created what |

**Audit Trail Example**:
```
Query: "Show me all notifications about Sample-123"
Result: Cannot answer - no query possible
Reason: No sample_id in Notifications table
Reason: Metadata not indexed
Reason: No creator tracking

Query: "Who sent bulk notification X?"
Result: Cannot answer
Reason: No created_by field
Reason: No bulk send log entry
Reason: No AuditLog integration
```

**FDA 21 CFR Part 11**: Would FAIL - No attributable record keeping

---

## Risk Summary

| Issue | Severity | Impact |
|-------|----------|--------|
| No access control | 🔴 **CRITICAL** | Info disclosure |
| Object ID leakage | 🔴 **CRITICAL** | Attacker enumeration |
| No disable mechanism | 🟠 **HIGH** | User UX / Compliance |
| Not auditable | 🟠 **HIGH** | Compliance failure |
| No state triggers | 🟡 **MEDIUM** | Feature gap |

---

## Key Files for Deep Dive

- **Full Analysis**: See `NOTIFICATION_SYSTEM_ANALYSIS.md`
- **Code Location**: `backend/src/routes/notifications.ts` (567 lines)
- **Schema Location**: `backend/src/database/setup.ts` (no Notifications table!)
- **UX Spec**: `docs/architecture/10_UX_FLOWS_AND_MODALS.md` (Part 11)
- **Design Plan**: `src/lib/schema-data.ts` (shows intended structure)

---

## Recommendations (Priority)

🔴 **CRITICAL - Fix First**:
1. Add authentication to notification API
2. Remove object IDs from notification metadata
3. Add created_by tracking to AuditLog

🟠 **HIGH - Fix Soon**:
4. Implement NotificationPreferences table
5. Add state-change triggers
6. Integrate with SecurityLog

🟡 **MEDIUM - Fix Later**:
7. Create notification audit dashboard
8. Implement email delivery system

---

**Status**: System partially built with significant security and compliance gaps identified and ready for remediation.
