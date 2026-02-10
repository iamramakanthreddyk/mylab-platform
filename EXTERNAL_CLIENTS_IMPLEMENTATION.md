# External Clients Implementation Guide

## Quick Summary

Users can now create projects with **external clients** (not on the platform) in addition to registered clients.

**Before:**
- Only registered clients → Required `clientOrgId` UUID

**After:**
- Registered clients → Use `clientOrgId`
- External clients → Use `externalClientName` (free-form text)

## Frontend Changes

### Change 1: Form State

**File:** `src/components/CreateProjectPage.tsx`

Added mode toggle:
```typescript
clientMode: 'registered' | 'external'  // NEW
externalClientName: string              // NEW
```

### Change 2: Two UI Modes

1. **Registered Client Mode** (default):
   - Select from dropdown of registered orgs
   - OR paste UUID if not in dropdown

2. **External Client Mode**:
   - Text field for client name
   - Max 255 characters
   - No existence validation

### Change 3: Validation

Changed from:
```typescript
if (!formData.clientOrgId) {
  toast.error('Client organization is required')
}
```

To:
```typescript
const hasClientOrgId = formData.clientOrgId || formData.clientOrgLookupId;
const hasExternalName = formData.externalClientName.trim();

if (!hasClientOrgId && !hasExternalName) {
  toast.error('...)
}
```

## Backend Changes

### Change 1: Database Schema

**File:** `backend/src/database/setup.ts`

```sql
-- Made nullable
client_org_id UUID REFERENCES Organizations(id),

-- Added new field
external_client_name VARCHAR(255),

-- Added constraint
CHECK (client_org_id IS NOT NULL OR external_client_name IS NOT NULL)
```

### Change 2: Request Validation

**File:** `backend/src/api/projects/types.ts`

```typescript
export interface CreateProjectRequest {
  clientOrgId?: string;              // Optional
  externalClientName?: string;       // NEW: Optional
  // ...
}

export const createProjectSchema = Joi.object({
  // ...
  clientOrgId: Joi.string().uuid().optional(),
  externalClientName: Joi.string().max(255).optional(),
  // ...
}).or('clientOrgId', 'externalClientName')  // NEW: At least one required
```

### Change 3: Project Creation

**File:** `backend/src/routes/projects.ts`

```typescript
// Input extraction
const { clientOrgId, externalClientName, ... } = req.body;

// Validation logic
if (!clientOrgId && !externalClientName) {
  return res.status(400).json({
    error: 'Client information required'
  });
}

// Only validate if clientOrgId is provided
if (clientOrgId) {
  const orgCheck = await pool.query(
    'SELECT id FROM Organizations WHERE id = $1',
    [clientOrgId]
  );
  if (orgCheck.rows.length === 0) {
    return res.status(400).json({
      error: 'Client organization not found'
    });
  }
}

// INSERT includes both fields
const result = await client.query(`
  INSERT INTO Projects (
    ...,
    client_org_id,
    external_client_name,
    ...
  )
  VALUES (
    ...,
    $4,  // clientOrgId (might be null)
    $5,  // externalClientName (might be null)
    ...
  )
  RETURNING *
`, [
  ...,
  clientOrgId || null,
  externalClientName || null,
  ...
]);
```

### Change 4: Query Updates

**LEFT JOIN for client org** (was INNER JOIN):

```typescript
// Before
JOIN Organizations o ON p.client_org_id = o.id

// After
LEFT JOIN Organizations o ON p.client_org_id = o.id
```

This allows projects with NULL `client_org_id` to still be returned.

## Type Updates

**File:** `src/lib/types.ts`

```typescript
export interface Project {
  clientOrgId?: string;           // Now optional
  clientOrgName?: string;         // Now optional
  externalClientName?: string;    // NEW field
  // ...
}
```

**File:** `backend/src/api/projects/types.ts`

```typescript
export interface ProjectResponse {
  clientOrgId?: string;           // Now optional
  clientOrgName?: string;         // Now optional
  externalClientName?: string;    // NEW field
  // ...
}
```

## API Transformer

**File:** `src/lib/endpointTransformers.ts`

```typescript
export function transformProjectForAPI(projectData: any): any {
  const result = {
    name: projectData.name,
    description: projectData.description,
    executingOrgId: projectData.executingOrgId,
    workflowMode: projectData.workflowMode
  };

  // NEW: Include either clientOrgId or externalClientName
  if (finalClientOrgId) {
    result.clientOrgId = finalClientOrgId;
  } else if (projectData.externalClientName) {
    result.externalClientName = projectData.externalClientName;
  }

  return result;
}
```

## API Behavior

### Creating with Registered Client

```bash
POST /api/projects
{
  "name": "Project A",
  "clientOrgId": "uuid-1234",
  "executingOrgId": "uuid-5678"
}
```

Response:
```json
{
  "id": "proj-123",
  "name": "Project A",
  "clientOrgId": "uuid-1234",
  "clientOrgName": "Acme Corp",
  "externalClientName": null,
  "executingOrgId": "uuid-5678",
  "executingOrgName": "Lab Inc"
}
```

### Creating with External Client

```bash
POST /api/projects
{
  "name": "Project B",
  "externalClientName": "TechStart Co",
  "executingOrgId": "uuid-5678"
}
```

Response:
```json
{
  "id": "proj-456",
  "name": "Project B",
  "clientOrgId": null,
  "clientOrgName": null,
  "externalClientName": "TechStart Co",
  "executingOrgId": "uuid-5678",
  "executingOrgName": "Lab Inc"
}
```

## Error Handling

### Invalid: Neither field provided

```json
{
  "error": "Client information required",
  "statusCode": 400,
  "details": {
    "client": "Either select a registered client organization or provide an external client name"
  }
}
```

### Invalid: Bad registered client UUID

```json
{
  "error": "Client organization not found",
  "statusCode": 400,
  "details": {
    "clientOrgId": "Organization with ID \"bad-uuid\" does not exist..."
  }
}
```

## Testing Checklist

- [ ] Create project with registered client (clientOrgId set)
- [ ] Create project with external client (externalClientName set)
- [ ] Verify error when both are missing
- [ ] Verify error when clientOrgId doesn't exist
- [ ] GET /api/projects returns external clients correctly
- [ ] clientOrgName is null for external clients
- [ ] Can mix projects (some with registered, some with external)

## Migration Path

1. Run SQL migration: `001-add-external-clients.sql`
2. Deploy backend code
3. Deploy frontend code
4. Test with both modes
5. Collect feedback

## Database Verification

```sql
-- Check structure
\d+ Projects

-- Count mixed projects (when both types exist)
SELECT
  COUNT(*) as total,
  COUNT(client_org_id) as with_registered,
  COUNT(external_client_name) as with_external,
  COUNT(CASE WHEN client_org_id IS NULL THEN 1 END) as with_null_registered
FROM Projects;

-- Find all external client projects
SELECT id, name, external_client_name, created_at
FROM Projects
WHERE external_client_name IS NOT NULL
ORDER BY created_at DESC;
```

## Troubleshooting

**Q: API says "Client organization not found" but I provided external client name**
A: You might be in registered mode. Check that you're setting `externalClientName` in the request, not `clientOrgId`.

**Q: Can't see external client projects in the list**
A: Ensure queries use `LEFT JOIN` for client org, not `INNER JOIN`. Database migration may not have been applied.

**Q: Validation says "at least one required" but I provided both**
A: This is OK! Joi's `.or()` allows one or both. Only errors if NEITHER is provided.

## Related Documentation

- Full Feature Doc: `EXTERNAL_CLIENTS_FEATURE.md`
- Migration Script: `backend/migrations/001-add-external-clients.sql`
- Form Component: `src/components/CreateProjectPage.tsx`
