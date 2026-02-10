# External Clients Feature

## Overview

The mylab-platform now supports creating projects with **external clients** who are not registered on the platform. This allows for more flexibility when dealing with one-off projects or clients who haven't gone through the full onboarding process yet.

## Changes Made

### 1. Database Schema
- Modified `Projects` table:
  - Made `client_org_id` column **nullable** (was required)
  - Added `external_client_name` column (VARCHAR 255, nullable)
  - Added CHECK constraint: `client_org_id IS NOT NULL OR external_client_name IS NOT NULL`
  - This ensures that **every project has either a registered client org OR an external client name**

### 2. Backend Validation

#### Updated File: `backend/src/api/projects/types.ts`

**CreateProjectRequest Interface:**
```typescript
export interface CreateProjectRequest {
  name: string;
  description?: string;
  clientOrgId?: string;        // Optional: UUID of registered client
  externalClientName?: string; // Optional: Name of external client
  executingOrgId: string;      // Required: Lab org ID
  workflowMode?: 'analysis_first' | 'trial_first';
}
```

**Validation Schema:**
- Added `.or('clientOrgId', 'externalClientName')` constraint
- Ensures at least ONE client field is provided
- Both are optional individually, but one is required together

#### Updated File: `backend/src/routes/projects.ts`

**Project Creation Endpoint (`POST /api/projects`):**
- Validates that either `clientOrgId` or `externalClientName` is provided
- If `clientOrgId` is provided, verifies the organization exists in the database
- If `externalClientName` is provided, no existence check is needed (it's a free-form string)
- INSERT statement includes both `client_org_id` and `external_client_name` columns

**GET Endpoints:**
- Changed `Projects` table JOINs to use `LEFT JOIN` for client organizations
- This allows queries to return projects with NULL `client_org_id` (external clients)

### 3. Frontend

#### Updated File: `src/components/CreateProjectPage.tsx`

**Form State:**
```typescript
const [formData, setFormData] = useState<{
  clientMode: 'registered' | 'external'; // NEW: Toggle between modes
  clientOrgId: string | null;             // Registered client
  externalClientName: string;             // NEW: External client name
  // ... other fields
}>
```

**UI Features:**
1. **Toggle Buttons:**
   - "Registered Client" - Select from existing organizations
   - "External Client" - Enter a custom client name

2. **Registered Client Mode:**
   - Dropdown to select from pre-registered organizations
   - Alternative: Paste UUID if organization not in dropdown

3. **External Client Mode:**
   - Text input for client name (max 255 chars)
   - Helper text: "This client can be formally registered later by your admin"

#### Updated File: `src/lib/endpointTransformers.ts`

**Project Transformer:**
```typescript
export function transformProjectForAPI(projectData: any): any {
  const result: any = {
    name: projectData.name,
    description: projectData.description || undefined,
    executingOrgId: projectData.executingOrgId,
    workflowMode: projectData.workflowMode
  };

  // Include either clientOrgId or externalClientName
  if (finalClientOrgId) {
    result.clientOrgId = finalClientOrgId;
  } else if (projectData.externalClientName) {
    result.externalClientName = projectData.externalClientName;
  }

  return result;
}
```

#### Updated File: `src/lib/types.ts`

**Project Interface:**
```typescript
export interface Project {
  id: string;
  name: string;
  clientOrgId?: string;        // Now optional
  clientOrgName?: string;      // Now optional
  externalClientName?: string; // NEW: External client name
  executingOrgId: string;      // Still required
  executingOrgName: string;
  // ... other fields
}
```

## Usage Examples

### Example 1: Creating a Project with a Registered Client

```typescript
{
  "name": "Phase 3 Clinical Trial",
  "description": "Multi-center trial for new drug",
  "clientOrgId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "executingOrgId": "a1234567-89ab-cdef-0123-456789abcdef",
  "workflowMode": "analysis_first"
}
```

**API Response:**
```json
{
  "id": "uuid-here",
  "name": "Phase 3 Clinical Trial",
  "clientOrgId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "clientOrgName": "Pharma Corp Inc",
  "externalClientName": null,
  "executingOrgId": "a1234567-89ab-cdef-0123-456789abcdef",
  "executingOrgName": "Lab Solutions LLC",
  "status": "active"
}
```

### Example 2: Creating a Project with an External Client

```typescript
{
  "name": "Custom Analysis Project",
  "description": "One-off analysis for external partner",
  "externalClientName": "TechStart Innovations",
  "executingOrgId": "a1234567-89ab-cdef-0123-456789abcdef",
  "workflowMode": "trial_first"
}
```

**API Response:**
```json
{
  "id": "uuid-here",
  "name": "Custom Analysis Project",
  "clientOrgId": null,
  "clientOrgName": null,
  "externalClientName": "TechStart Innovations",
  "executingOrgId": "a1234567-89ab-cdef-0123-456789abcdef",
  "executingOrgName": "Lab Solutions LLC",
  "status": "active"
}
```

## Migration Steps

### For PostgreSQL Databases

Run this migration:

```sql
-- Step 1: Add new columns to existing Projects table
ALTER TABLE Projects
ADD COLUMN external_client_name VARCHAR(255) DEFAULT NULL;

-- Step 2: Make client_org_id nullable
ALTER TABLE Projects
ALTER COLUMN client_org_id DROP NOT NULL;

-- Step 3: Add constraint to ensure at least one client field
ALTER TABLE Projects
ADD CONSTRAINT client_required CHECK (client_org_id IS NOT NULL OR external_client_name IS NOT NULL);

-- Step 4: Verify migration
SELECT COUNT(*) as total_projects,
       COUNT(client_org_id) as with_registered_client,
       COUNT(external_client_name) as with_external_client
FROM Projects;
```

### Rollback (if needed)

```sql
ALTER TABLE Projects DROP CONSTRAINT client_required;
ALTER TABLE Projects ALTER COLUMN client_org_id SET NOT NULL;
ALTER TABLE Projects DROP COLUMN external_client_name;
```

## Error Handling

### Validation Errors

1. **Both fields missing:**
   ```json
   {
     "error": "Client information required",
     "statusCode": 400,
     "details": {
       "client": "Either select a registered client organization or provide an external client name"
     }
   }
   ```

2. **Invalid registered client ID:**
   ```json
   {
     "error": "Client organization not found",
     "statusCode": 400,
     "details": {
       "clientOrgId": "Organization with ID \"xxxx\" does not exist. Please ask your admin to register this organization on the platform first."
     }
   }
   ```

## Future Enhancements

1. **Onboarding Workflow:**
   - Add button to create project with external client, auto-generate onboarding request
   - Track which projects created with external clients

2. **Client Registration:**
   - Allow registering external clients directly from project view
   - Auto-link registered client when admin completes onboarding

3. **Reporting & Analytics:**
   - Report on external vs. registered clients
   - Identify which external clients should be formally registered

4. **Integrations:**
   - Send external client name to CRM/ERP systems
   - Track communication history with external clients

## Related Files

- Database Schema: `backend/src/database/setup.ts`
- Project Types: `backend/src/api/projects/types.ts`
- Project Routes: `backend/src/routes/projects.ts`
- Frontend Component: `src/components/CreateProjectPage.tsx`
- API Transformers: `src/lib/endpointTransformers.ts`
- Frontend Types: `src/lib/types.ts`

## Testing

### Test Cases

1. ✅ Create project with registered client (no external name)
2. ✅ Create project with external client (no registered client)
3. ✅ Reject project with neither (validation error)
4. ✅ List/get projects with external clients
5. ✅ GET endpoint returns external_client_name field

### Manual Testing

```bash
# 1. Create project with external client
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "External Client Project",
    "externalClientName": "ACME Corp",
    "executingOrgId": "lab-uuid-here"
  }'

# 2. Get the project
curl http://localhost:3001/api/projects/project-id \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. List all projects
curl http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For issues or questions about external clients:
1. Check the error message - it provides specific guidance
2. Verify both registered and external client modes work in UI
3. Check database for constraints: `SELECT * FROM Projects WHERE client_org_id IS NULL LIMIT 5`
