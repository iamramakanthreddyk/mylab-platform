# Database Schema Updates & Security Improvements

## 📋 Overview
This document outlines comprehensive database schema updates to link plans to companies, add GST/tax information, and improve data relationships. All secrets are now properly protected in git.

## 🔐 Security Improvements

### Environment Variables (.env.local)
- ✅ `.env.local` excluded from git (in .gitignore)
- ✅ `JWT_SECRET` moved to environment variable
- ✅ `SUPERADMIN_PASSWORD` can now be overridden via environment
- ✅ Created `.env.example` for reference

**Updated .gitignore entries:**
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
*.env
backend/.env.local
backend/.env
.env.*.local
```

### Database Credentials
All database connection strings now use `DATABASE_URL` from environment:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

## 📊 Organizations Table Updates

### New Columns Added
```sql
-- Tax & GST Information
gst_number VARCHAR(255)          -- GST registration number
gst_percentage DECIMAL(5,2)      -- Default 18.00% (India standard)
tax_id VARCHAR(255)              -- Additional tax identifier
company_registration_number VARCHAR(255)  -- Company registration

-- Address Information  
country VARCHAR(100)
state VARCHAR(100)
city VARCHAR(100)
postal_code VARCHAR(20)
address TEXT

-- Business Information
industry VARCHAR(100)            -- e.g., 'Pharmaceuticals', 'CRO'
company_size company_size_type   -- '1-10', '11-50', '51-200', '201-1000', '1000+'
annual_revenue VARCHAR(50)       -- e.g., '$1M-$5M'
website VARCHAR(255)

-- Contact Information
primary_contact_name VARCHAR(255)
primary_contact_email VARCHAR(255)
primary_contact_phone VARCHAR(20)
billing_contact_name VARCHAR(255)
billing_contact_email VARCHAR(255)
billing_contact_phone VARCHAR(20)

-- Metadata
logo_url VARCHAR(255)
notes TEXT
deleted_at TIMESTAMP             -- Soft delete support
```

### Key Relationships
- **workspace_id**: Links organization to workspace (NOT NULL)
- **subscription_id**: (via Subscriptions table) Links to active plan
- **type**: org_type enum ('client', 'cro', 'analyzer', 'vendor', 'pharma')

## 💳 Subscriptions Table Updates

### New Columns Added
```sql
-- Better Organization Linking
organization_id UUID REFERENCES Organizations(id)  -- Direct org link

-- Billing & Pricing
coupon_code VARCHAR(50)          -- Promotional code
discount_percentage DECIMAL(5,2) -- Applied discount
custom_price DECIMAL(12,2)       -- Custom negotiated price
cancellation_reason TEXT         -- Why subscription was cancelled

-- Metadata
notes TEXT
deleted_at TIMESTAMP             -- Soft delete support
```

### Subscription Lifecycle
- **status**: 'trial' → 'active' → 'suspended'/'cancelled'/'expired'
- **trial_ends_at**: Trial period end date
- **cancelled_at**: When cancellation occurred
- **current_billing_cycle_start/end**: Billing period dates
- **next_billing_date**: When next charge occurs

## 📈 Company-to-Plan Mapping

### Data Model
```
Company (Workspace)
    ↓
Organizations (with GST, address, contacts)
    ↓
Subscriptions (links company to active plan)
    ↓
Plans (Basic, Pro, Enterprise, Custom)
    ↓
PlanFeatures (feature-level access control)
```

### Views for Reporting

**Company Plans with Revenue:**
```sql
SELECT
  p.name as plan_name,
  COUNT(DISTINCT s.workspace_id) as companies_on_plan,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.workspace_id END) as active_companies,
  SUM(CASE WHEN s.status = 'active' THEN p.price_monthly ELSE 0 END) as monthly_revenue
FROM Plans p
LEFT JOIN Subscriptions s ON p.id = s.plan_id
GROUP BY p.id, p.name;
```

## 🔌 New Admin Endpoints

### Organization Management

**List Organizations with GST**
```
GET /api/admin/organizations
Query params: limit, offset, search (searches by name, GST, country)

Response:
{
  "organizations": [
    {
      "id": "uuid",
      "name": "Company Name",
      "gst_number": "18AABCU9603R1Z5",
      "gst_percentage": 18.00,
      "country": "India",
      "industry": "Pharmaceuticals",
      "plan_name": "Enterprise",
      "subscription_status": "active",
      ...
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

**Get Organization Details**
```
GET /api/admin/organizations/:organizationId

Response includes:
- Organization details (all fields)
- Subscription information
- Current plan details
```

**Update GST Information**
```
POST /api/admin/organizations/:organizationId/update-gst

Body:
{
  "gst_number": "18AABCU9603R1Z5",
  "gst_percentage": 18.00
}

Automatically logged in AuditLog with ADMIN_UPDATE_GST action
```

### Plan-to-Company Analytics

**Get Company Plan Mappings**
```
GET /api/admin/company-plans

Response:
{
  "plans": [
    {
      "id": "uuid",
      "plan_name": "Basic",
      "tier": "basic",
      "max_users": 5,
      "price_monthly": 99.00,
      "companies_on_plan": 15,
      "active_companies": 12,
      "monthly_revenue": 1188.00
    }
  ],
  "total": 4
}
```

## 📋 Admin Routes Summary

| Endpoint | Method | Purpose | New |
|----------|--------|---------|-----|
| `/api/admin/organizations` | GET | List all organizations | ✅ |
| `/api/admin/organizations/:id` | GET | Get organization details | ✅ |
| `/api/admin/organizations/:id/update-gst` | POST | Update GST information | ✅ |
| `/api/admin/company-plans` | GET | Get plan-to-company mappings | ✅ |
| `/api/admin/workspaces` | GET | List workspaces (updated with GST) | Updated |
| `/api/admin/subscriptions` | GET | List subscriptions (updated) | Updated |
| `/api/admin/plans` | GET | List available plans | ✓ |
| `/api/admin/analytics/overview` | GET | Platform overview | ✓ |
| `/api/admin/analytics/workspace/:id` | GET | Workspace analytics | ✓ |

## 🔍 Data Migration Considerations

### For Existing Data
If migrating from previous schema:

1. **Organizations table**: Add GST information
   ```sql
   ALTER TABLE Organizations 
   ADD COLUMN gst_number VARCHAR(255),
   ADD COLUMN gst_percentage DECIMAL(5,2) DEFAULT 18.00;
   ```

2. **Subscriptions table**: Add organization_id
   ```sql
   ALTER TABLE Subscriptions 
   ADD COLUMN organization_id UUID REFERENCES Organizations(id);
   ```

3. **Update references**:
   ```sql
   UPDATE Subscriptions s
   SET organization_id = o.id
   FROM Organizations o
   WHERE s.workspace_id = o.workspace_id;
   ```

## 💾 Audit Logging

All organization and subscription changes are logged:

**Audit Log Entries:**
- `ADMIN_UPDATE_GST`: GST information updated
- `ADMIN_UPGRADE_PLAN`: Subscription plan changed
- `ADMIN_CREATE_ORGANIZATION`: New organization created
- `ADMIN_CANCEL_SUBSCRIPTION`: Subscription cancelled

**Example Entry:**
```json
{
  "action": "ADMIN_UPDATE_GST",
  "resource_type": "organization",
  "resource_id": "uuid",
  "workspace_id": "uuid",
  "details": {
    "gst_number": "18AABCU9603R1Z5",
    "gst_percentage": 18.00
  },
  "created_at": "2024-12-06T10:00:00Z"
}
```

## 🧮 GST Calculation Example

**Scenario: Company in India with 18% GST**

```
Company: TechCorp
Plan: Enterprise ($999/month)
GST: 18%

Calculation:
Base Amount: $999.00
GST (18%): $179.82
Total Monthly: $1,178.82
```

**Database Query:**
```sql
SELECT 
  s.id,
  o.name,
  p.price_monthly,
  o.gst_percentage,
  p.price_monthly * (o.gst_percentage / 100) as gst_amount,
  p.price_monthly + (p.price_monthly * o.gst_percentage / 100) as total_amount
FROM Subscriptions s
JOIN Organizations o ON s.organization_id = o.id
JOIN Plans p ON s.plan_id = p.id
WHERE s.status = 'active';
```

## 🔐 Environment Setup

### Development
```bash
cd backend
cp .env.example .env.local

# Edit .env.local with your values:
DATABASE_URL=postgresql://user:password@localhost:5432/mylab
JWT_SECRET=your-development-secret-key
SUPERADMIN_EMAIL=admin@company.com
SUPERADMIN_PASSWORD=secure-password
```

### Production Checklist
- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Set strong `SUPERADMIN_PASSWORD` with hash storage
- [ ] Use RDS/Cloud database for `DATABASE_URL`
- [ ] Enable SSL for database connections
- [ ] Rotate credentials regularly
- [ ] Never commit `.env` files
- [ ] Use secrets management (AWS Secrets Manager, etc.)

## 📊 Example Company Setup

```sql
-- Create organization with full details including GST
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
  primary_contact_email
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Pharma Solutions Ltd',
  'pharma'::org_type,
  '18AABCU9603R1Z5',       -- GST Number (India)
  18.00,                    -- GST Percentage
  'India',
  'Tamil Nadu',
  'Chennai',
  'Pharmaceuticals',
  '51-200'::company_size_type,
  'Dr. Rajesh Kumar',
  'rajesh@pharmasol.in'
);

-- Link to plan (creates subscription)
INSERT INTO Subscriptions (
  workspace_id,
  organization_id,
  plan_id,
  status,
  current_billing_cycle_start,
  current_billing_cycle_end,
  trial_ends_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- Same workspace
  (SELECT id FROM Organizations WHERE gst_number = '18AABCU9603R1Z5'),  -- Org
  (SELECT id FROM Plans WHERE name = 'Enterprise'),  -- Plan
  'active'::subscription_status,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  NULL  -- Not trial
);
```

## ✅ Testing the Schema

### Test Queries
```bash
# List all organizations with their plans and GST
GET /api/admin/organizations

# Get company-to-plan mapping
GET /api/admin/company-plans

# Get organization details  
GET /api/admin/organizations/{id}

# Update GST for organization
POST /api/admin/organizations/{id}/update-gst
```

## 📝 Related Files Updated

1. **backend/src/database/setup.ts**
   - Updated Organizations table schema
   - Updated Subscriptions table schema
   - Added plan_tier enum for subscription tracking

2. **backend/src/routes/admin.ts**
   - New organization management endpoints
   - Company-to-plan analytics
   - GST update functionality
   - Updated workspace list to include GST info

3. **.env.example**
   - Reference for all environment variables
   - Security recommendations

4. **.gitignore**
   - Expanded to prevent all env files
   - Includes database and credential files

## 🚀 Deployment Notes

1. **Database Migration**:
   - Run migrations in order
   - Backup database before applying
   - Test on staging first

2. **Zero-Downtime Deployment**:
   - New columns added with defaults
   - No breaking changes to existing queries
   - Backward compatible

3. **Monitoring**:
   - Track failed GST updates in logs
   - Monitor subscription plan changes
   - Alert on sensitive admin operations

## 📚 See Also

- [SUPERADMIN_IMPLEMENTATION.md](./SUPERADMIN_IMPLEMENTATION.md) - Full superadmin system
- [SUPERADMIN_QUICKSTART.md](../SUPERADMIN_QUICKSTART.md) - Quick reference guide
- [DATABASE_README.md](./DATABASE_README.md) - Complete database documentation

---

**Updated**: February 4, 2026
**Version**: 2.0
**Status**: ✅ Production Ready
