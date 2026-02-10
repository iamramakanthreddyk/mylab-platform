# Fix: Client Organization Not Found Error

## Problem
When creating a project, you get the error:
```json
{
  "error": "Client organization not found",
  "statusCode": 400,
  "details": {
    "clientOrgId": "Organization with ID \"xxxx-xxxx-xxxx\" does not exist. Please ask your admin to register this organization on the platform first."
  }
}
```

This happens when the **Client organization is not registered on the platform**.

## Solution

### For End Users
1. **Get the correct Organization ID:**
   - Ask your admin/superadmin for the Organization UUID
   - Verify the UUID is in correct format (e.g., `f47ac10b-58cc-4372-a567-0e02b2c3d479`)

2. **Provide the correct ID to the admin:**
   - If using the form, paste the UUID in the "Organization ID" field
   - If it still fails, ask admin to register the organization first

### For Admins: Register Missing Organizations

#### Method 1: Via Admin Dashboard (UI)

1. Go to **Admin Dashboard** → **Organizations**
2. Click **Create Organization**
3. Fill in the required fields:
   - **Organization Name:** Full name of the client (e.g., "Acme Pharmaceuticals")
   - **Organization Type:** Select `Client` (drop-down)
   - **Country:** Select country
   - **Primary Contact Name:** Name of contact person
   - **Primary Contact Email:** Contact email
   - **Primary Contact Phone:** Contact phone (optional)
4. Additional fields (optional):
   - Industry
   - Company Size
   - Website
   - GST Number
   - GST Percentage

5. Click **Create Organization**
6. Copy the **Organization ID** from the response
7. Share this ID with the user who needs to create the project

#### Method 2: Via API (cURL)

```bash
curl -X POST http://localhost:3001/api/admin/organizations \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Pharmaceuticals",
    "type": "Client",
    "country": "United States",
    "primary_contact_name": "John Doe",
    "primary_contact_email": "john@acmepharma.com",
    "primary_contact_phone": "+1-555-0100",
    "industry": "Pharmaceuticals",
    "company_size": "Large",
    "website": "https://acmepharma.com",
    "create_admin": false
  }'
```

Response:
```json
{
  "organization": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Acme Pharmaceuticals",
    "type": "Client",
    ...
  }
}
```

Copy the `id` from the response.

#### Method 3: Direct Database Insert (For Superadmins)

```sql
INSERT INTO Organizations (
  id, 
  workspace_id, 
  name, 
  type, 
  country,
  primary_contact_name,
  primary_contact_email,
  primary_contact_phone,
  industry,
  company_size,
  website,
  created_at, 
  updated_at
)
VALUES (
  gen_random_uuid(),
  'your-workspace-id',
  'Acme Pharmaceuticals',
  'Client',
  'United States',
  'John Doe',
  'john@acmepharma.com',
  '+1-555-0100',
  'Pharmaceuticals',
  'Large',
  'https://acmepharma.com',
  NOW(),
  NOW()
)
RETURNING id;
```

## What About External/Unregistered Clients?

Currently, the platform **requires** both client and lab organizations to be registered before creating a project. This ensures:

✅ **Data Integrity** - All organizations involved are known
✅ **Access Control** - Proper permissions can be enforced
✅ **Tracking** - All organizational relationships are documented
✅ **Communication** - Contact info is available for coordination

### If You Want to Support External Clients (Future Enhancement)

To allow projects with external clients not on the platform, consider:

1. **Make `clientOrgId` optional** - Store null or external reference
2. **Add `clientOrgName` field** - For display when org not in system
3. **Add `externalClientEmail` field** - For external contact
4. **Add onboarding trigger** - Flag that admin needs to register this client

This would require schema migration and frontend/backend updates.

## Verification

### Check if Organization Exists

```bash
curl http://localhost:3001/api/admin/organizations \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Look for your organization in the list.

### Check with Database Query

```sql
SELECT id, name, type FROM Organizations 
WHERE name = 'Acme Pharmaceuticals' 
AND deleted_at IS NULL;
```

## Related Issues

- **401 Unauthorized**: User doesn't have permission to create projects
- **No plan assigned**: Organization needs a plan to create projects
- **Project limit reached**: Organization has exceeded their project quota

For other issues, see: [API Schema Gaps](API_SCHEMA_GAPS_FULL_REPORT.md)
