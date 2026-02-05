# Testing Guide: Company Plans & GST Features

## Quick Start Testing

### Prerequisites
```bash
# Navigate to backend
cd backend

# Ensure database is running
npm run db:reset && npm run db:setup

# Build and start server
npm run build
npm start
# Server runs on http://localhost:3000
```

## 1️⃣ Test Organization List Endpoint

### Request
```bash
curl -X GET "http://localhost:3000/api/admin/organizations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response
```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "Lab Systems Inc",
      "type": "analyzer",
      "gst_number": "18AABCT1234A1Z1",
      "gst_percentage": 18.00,
      "country": "India",
      "state": "Maharashtra",
      "city": "Mumbai",
      "industry": "Laboratory Services",
      "company_size": "51-200",
      "website": "https://labsystems.com",
      "primary_contact_name": "Dr. Anil Sharma",
      "primary_contact_email": "anil@labsystems.com",
      "billing_contact_name": "Priya Desai",
      "billing_contact_email": "billing@labsystems.com",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 15,
  "limit": 50,
  "offset": 0
}
```

### What to Verify
- ✅ GST fields populated correctly
- ✅ Contact information structured (separate primary/billing)
- ✅ Company information (industry, size, website)
- ✅ Address fields complete
- ✅ Timestamps present

---

## 2️⃣ Test Organization Detail Endpoint

### Request
```bash
curl -X GET "http://localhost:3000/api/admin/organizations/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response
```json
{
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "workspace_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Pharma Solutions Ltd",
    "type": "pharma",
    "gst_number": "18AABCU9603R1Z5",
    "gst_percentage": 18.00,
    "tax_id": "TST123456",
    "company_registration_number": "L25199KA2018",
    "country": "India",
    "state": "Karnataka",
    "city": "Bangalore",
    "postal_code": "560001",
    "address": "123 Tech Park, Whitefield",
    "website": "https://pharmasol.com",
    "industry": "Pharmaceuticals",
    "company_size": "201-1000",
    "annual_revenue": "$10M-$50M",
    "logo_url": "https://pharmasol.com/logo.png",
    "primary_contact_name": "Dr. Rajesh Kumar",
    "primary_contact_email": "rajesh@pharmasol.in",
    "primary_contact_phone": "+91-80-1234-5678",
    "billing_contact_name": "Ms. Shabnam Patel",
    "billing_contact_email": "billing@pharmasol.in",
    "billing_contact_phone": "+91-80-1234-5678",
    "notes": "Enterprise customer with volume discount",
    "created_at": "2024-01-10T08:00:00Z",
    "updated_at": "2024-02-04T14:30:00Z",
    "deleted_at": null,
    "subscription": {
      "id": "sub-uuid",
      "plan_name": "Enterprise",
      "plan_tier": "enterprise",
      "status": "active",
      "current_billing_cycle_start": "2024-01-10",
      "current_billing_cycle_end": "2024-02-10",
      "price_monthly": 2999.00,
      "total_with_gst": 3548.82
    }
  }
}
```

### What to Verify
- ✅ All GST and tax fields returned
- ✅ Subscription details included
- ✅ GST applied to monthly price (3548.82 = 2999 × 1.18)
- ✅ Contact information proper JSON structure

---

## 3️⃣ Test Update GST Endpoint

### Request
```bash
curl -X POST "http://localhost:3000/api/admin/organizations/550e8400-e29b-41d4-a716-446655440000/update-gst" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gst_number": "18AABCU9603R1Z5",
    "gst_percentage": 28.00
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "GST information updated successfully",
  "organization": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Pharma Solutions Ltd",
    "gst_number": "18AABCU9603R1Z5",
    "gst_percentage": 28.00,
    "updated_at": "2024-02-04T15:45:00Z"
  },
  "audit_log_id": "audit-uuid"
}
```

### Verify Database Audit Log
```sql
SELECT 
  id, 
  action, 
  resource_type, 
  resource_id, 
  details, 
  created_at 
FROM AuditLog 
WHERE action = 'ADMIN_UPDATE_GST' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected output:**
```
id: audit-uuid
action: ADMIN_UPDATE_GST
resource_type: organization
resource_id: 550e8400-e29b-41d4-a716-446655440000
details: {"gst_number": "18AABCU9603R1Z5", "gst_percentage": 28.00}
created_at: 2024-02-04T15:45:00Z
```

### What to Verify
- ✅ GST percentage updated (18.00 → 28.00)
- ✅ Audit log created with ADMIN_UPDATE_GST action
- ✅ Updated_at timestamp changed
- ✅ Response confirms changes

---

## 4️⃣ Test Company Plans Mapping Endpoint

### Request
```bash
curl -X GET "http://localhost:3000/api/admin/company-plans" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response
```json
{
  "plans": [
    {
      "id": "plan-uuid-basic",
      "name": "Basic",
      "tier": "basic",
      "max_users": 5,
      "price_monthly": 99.00,
      "companies_on_plan": 8,
      "active_companies": 6,
      "monthly_revenue": 594.00,
      "company_list": [
        {
          "name": "Startup Lab",
          "gst_percentage": 18.00,
          "gst_adjusted_revenue": 700.92
        },
        {
          "name": "Research Center",
          "gst_percentage": 5.00,
          "gst_adjusted_revenue": 519.45
        }
      ]
    },
    {
      "id": "plan-uuid-pro",
      "name": "Pro",
      "tier": "pro",
      "max_users": 20,
      "price_monthly": 499.00,
      "companies_on_plan": 12,
      "active_companies": 11,
      "monthly_revenue": 5489.00,
      "company_list": [...]
    },
    {
      "id": "plan-uuid-enterprise",
      "name": "Enterprise",
      "tier": "enterprise",
      "max_users": null,
      "price_monthly": 2999.00,
      "companies_on_plan": 5,
      "active_companies": 5,
      "monthly_revenue": 14995.00,
      "company_list": [...]
    }
  ],
  "total": 3,
  "platform_monthly_revenue": 21078.00
}
```

### What to Verify
- ✅ All plans listed (Basic, Pro, Enterprise)
- ✅ Company counts accurate
- ✅ Monthly revenue calculated correctly
- ✅ GST applied to revenue calculations
- ✅ Response includes company-level breakdown

---

## 5️⃣ Integration Test: Create Organization & Link to Plan

### Step 1: Insert New Organization
```sql
INSERT INTO Organizations (
  workspace_id,
  name,
  type,
  gst_number,
  gst_percentage,
  country,
  state,
  city,
  industry,
  company_size,
  primary_contact_name,
  primary_contact_email,
  billing_contact_name,
  billing_contact_email
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Test Pharma Corp',
  'pharma'::org_type,
  '18AABCT9999Z9Z9',
  18.00,
  'India',
  'Tamil Nadu',
  'Chennai',
  'Pharmaceuticals',
  '51-200'::company_size_type,
  'Dr. Test Kumar',
  'test@testpharma.in',
  'Billing Dept',
  'billing@testpharma.in'
)
RETURNING id;
```

### Step 2: Create Subscription
```sql
INSERT INTO Subscriptions (
  workspace_id,
  organization_id,
  plan_id,
  status,
  current_billing_cycle_start,
  current_billing_cycle_end
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  (SELECT id FROM Organizations WHERE gst_number = '18AABCT9999Z9Z9'),
  (SELECT id FROM Plans WHERE tier = 'enterprise'::plan_tier),
  'active'::subscription_status,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days'
)
RETURNING id;
```

### Step 3: Verify via API
```bash
curl -X GET "http://localhost:3000/api/admin/organizations?search=Test%20Pharma" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Result
- ✅ New organization appears in list
- ✅ Linked subscription shows in detail view
- ✅ GST correctly applied to revenue calculations
- ✅ Plan mapping endpoint includes new company

---

## 🔒 Authentication Testing

### Get Admin JWT Token
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@mylab.io",
    "password": "SuperAdmin123!"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin-uuid",
    "email": "superadmin@mylab.io",
    "role": "superadmin"
  }
}
```

### Test Unauthorized Access
```bash
curl -X GET "http://localhost:3000/api/admin/organizations" \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Expected Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

---

## 🧪 Test Script (PowerShell)

Save as `test-company-plans.ps1`:

```powershell
param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AdminEmail = "superadmin@mylab.io",
    [string]$AdminPassword = "SuperAdmin123!"
)

# Colors for output
$success = 'Green'
$error = 'Red'
$info = 'Cyan'

Write-Host "=== Company Plans & GST Testing ===" -ForegroundColor $info

# Step 1: Login
Write-Host "`n[1] Logging in as superadmin..." -ForegroundColor $info
$loginBody = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
    -Uri "$BaseUrl/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.token
Write-Host "✓ Logged in successfully" -ForegroundColor $success

# Step 2: Get Organizations
Write-Host "`n[2] Fetching organizations..." -ForegroundColor $info
$orgsResponse = Invoke-RestMethod `
    -Uri "$BaseUrl/api/admin/organizations?limit=5" `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token" }

Write-Host "✓ Found $($orgsResponse.total) organizations" -ForegroundColor $success
Write-Host "  Sample: $($orgsResponse.organizations[0].name) (GST: $($orgsResponse.organizations[0].gst_number))"

# Step 3: Get Company Plans
Write-Host "`n[3] Fetching company plans..." -ForegroundColor $info
$plansResponse = Invoke-RestMethod `
    -Uri "$BaseUrl/api/admin/company-plans" `
    -Method GET `
    -Headers @{ Authorization = "Bearer $token" }

Write-Host "✓ Found $($plansResponse.total) plans" -ForegroundColor $success
foreach ($plan in $plansResponse.plans) {
    Write-Host "  - $($plan.name): $($plan.companies_on_plan) companies, Monthly Revenue: `$$($plan.monthly_revenue)" 
}

# Step 4: Get Organization Detail
if ($orgsResponse.organizations.Count -gt 0) {
    Write-Host "`n[4] Fetching organization detail..." -ForegroundColor $info
    $orgId = $orgsResponse.organizations[0].id
    $detailResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/admin/organizations/$orgId" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $token" }
    
    $org = $detailResponse.organization
    Write-Host "✓ Organization: $($org.name)" -ForegroundColor $success
    Write-Host "  GST: $($org.gst_percentage)% on $($org.subscription.price_monthly)`$/mo"
    Write-Host "  Total with GST: `$$($org.subscription.total_with_gst)`/mo"
}

Write-Host "`n=== All Tests Completed ===" -ForegroundColor $success
```

**Run the test:**
```bash
.\test-company-plans.ps1 -BaseUrl "http://localhost:3000"
```

---

## ✅ Checklist: What to Test

### Database Level
- [ ] Organizations table has 40+ columns
- [ ] Subscriptions table has organization_id FK
- [ ] GST defaults to 18.00% for new organizations
- [ ] Soft deletes work (deleted_at column)
- [ ] Audit logs created for GST updates

### API Level
- [ ] Organizations endpoint returns all fields
- [ ] Organization detail includes subscription info
- [ ] GST calculations correct (price * (1 + gst/100))
- [ ] Company plans show revenue with GST applied
- [ ] Search functionality works (by name, GST, country)
- [ ] Authentication required (no unauthorized access)

### Data Integrity
- [ ] Orphaned subscriptions are linked to organizations
- [ ] Revenue calculations match database aggregates
- [ ] Timestamps accurate
- [ ] Contact information properly structured
- [ ] Tax information complete for all orgs

### Edge Cases
- [ ] Organization with no subscription (shows null)
- [ ] Subscription before organization created (foreign key error)
- [ ] Update GST for non-existent org (404)
- [ ] Invalid GST percentage (0-100 validation)
- [ ] Very large organization list (pagination works)

---

**Test Date**: _________________
**Tester**: _________________
**Status**: ✅ All Tests Passed / ❌ Issues Found

**Notes**:
```
[Space for notes]
```

---

**Last Updated**: February 4, 2026
