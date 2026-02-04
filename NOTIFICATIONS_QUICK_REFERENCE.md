# Notification System - Quick Reference
## 5 Key Questions Answered at a Glance

---

## 1️⃣ What Triggers a Notification in the System Today?

```
IMPLEMENTED (5):
├─ Payment Reminders (when payment due/overdue)
├─ System Announcements (admin posts message)
├─ Project Notifications (project updates)
├─ Bulk Notifications (admin targets user groups)
└─ Welcome Notifications (workspace setup)

DOCUMENTED BUT NOT IMPLEMENTED (6):
├─ Sample Shared (when sample access granted)
├─ Derived Sample Created (when derived sample made)
├─ Batch Sent (when batch goes to external lab)
├─ Analysis Uploaded (when results available)
├─ Analysis Revision Needed (when analysis fails)
└─ Sample Accessed (when non-owner views)
```

**Bottom Line**: 5 manual admin-triggered notifications. 6 automatic state-change notifications missing.

---

## 2️⃣ Are Notifications Derived from State Changes or User Actions?

```
TODAY:          User Actions (100% admin-driven)
SHOULD BE:      State Changes (automatic events)

STATUS: ❌ All notifications are manual/admin-triggered
        ✅ No automatic event-driven notifications
```

**Bottom Line**: System is designed for events but implemented for manual posting.

---

## 3️⃣ Can Notifications Leak Object Existence to Unauthorized Users?

```
VULNERABILITY: ✅ YES - CRITICAL

❌ No auth on GET /api/notifications
❌ Object IDs exposed in metadata
❌ Sample/project/batch names in messages
❌ No workspace isolation checks
❌ Metadata is searchable (JSONB)

ATTACK: 
  1. Enumerate other users' notifications
  2. Discover secret projects/samples
  3. Learn business relationships
  4. Extract object UUIDs
  5. Attempt unauthorized access
```

**Bottom Line**: Critical security vulnerability - notifications leak sensitive metadata.

---

## 4️⃣ What Happens if a User Disables Notifications?

```
ANSWER: ❌ NOTHING - NO MECHANISM EXISTS

Missing:
  ❌ NotificationPreferences table (designed, not created)
  ❌ Disable UI controls
  ❌ API endpoints for preferences
  ❌ Logic to check preferences
  ❌ Email opt-out
  ❌ Frequency/digest controls

Result: Users cannot control notifications at all
```

**Bottom Line**: No user control over notifications - system sends everything.

---

## 5️⃣ Are Notifications Auditable?

```
STATUS: ⚠️ PARTIAL WITH CRITICAL GAPS

✅ CAN TRACK:
  - When notification created (created_at)
  - When user read it (read_at)
  - What the message said

❌ CANNOT TRACK:
  - Who created the notification
  - Why it was sent
  - Who all received it (bulk)
  - When it was deleted
  - Full context/reason

RESULT: 🔴 Would FAIL FDA 21 CFR Part 11 audit
```

**Bottom Line**: Created, read timestamps exist but creator/context missing.

---

## Risk Scorecard

```
┌────────────────────────┬──────────┬────────────────────┐
│ Category               │ Risk     │ Compliance Impact   │
├────────────────────────┼──────────┼────────────────────┤
│ Security (leakage)     │ 🔴 CRIT  │ HIPAA violation     │
│ User Control           │ 🟠 HIGH  │ GDPR violation      │
│ Auditability           │ 🟠 HIGH  │ FDA 21 CFR fail     │
│ Feature Completeness   │ 🟡 MED   │ MVP gap             │
│ State-Change Triggers  │ 🟡 MED   │ Design gap          │
└────────────────────────┴──────────┴────────────────────┘
```

---

## Next Steps

**🔴 MUST FIX (Security)**:
1. Add auth to notification API
2. Remove object IDs from messages
3. Add access control checks

**🟠 SHOULD FIX (Compliance)**:
4. Implement user preferences
5. Add audit trail integration
6. Track notification creator

**🟡 NICE TO HAVE**:
7. Auto-generate on state changes
8. Email delivery system

---

**Full Analysis**: See `NOTIFICATION_SYSTEM_ANALYSIS.md`  
**Source**: `backend/src/routes/notifications.ts` (567 lines)
