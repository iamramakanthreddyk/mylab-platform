# 🚀 Quick Reference: Company Plans & GST System

## ⚡ Essential Commands

```bash
# Setup & Run
cd backend
npm install
npm run build
npm start

# Database Operations
npm run db:reset        # Drop all tables (⚠️ Use with caution!)
npm run db:setup        # Create all tables & indexes

# Testing
npm test                # Run test suite
npm run test:admin      # Run admin tests only
```

## 🔑 Environment Variables (`.env.local`)

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secret-key-min-32-chars
SUPERADMIN_EMAIL=admin@company.com
SUPERADMIN_PASSWORD=secure-password
NODE_ENV=development
PORT=3000
```

## 🔐 Admin Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "superadmin@mylab.io",
    "password": "SuperAdmin123!"
  }'
```

## 📋 API Endpoints

### Organizations
```
GET    /api/admin/organizations                    # List all
GET    /api/admin/organizations/:id                # Get one
POST   /api/admin/organizations/:id/update-gst     # Update GST
```

### Plans
```
GET    /api/admin/company-plans                    # Plan analytics
GET    /api/admin/plans                            # List plans
GET    /api/admin/subscriptions                    # List subscriptions
```

## 💾 Database Schema Quick Overview

### Organizations Table (Key Fields)
```
id (UUID)
name (VARCHAR)
gst_number (VARCHAR)              ← Tax ID
gst_percentage (DECIMAL) [18.00%] ← Tax rate
type (org_type)                   ← 'client', 'pharma', 'cro', etc.
country, state, city
industry
company_size                       ← '1-10', '11-50', '51-200', etc.
primary_contact_name/email/phone
billing_contact_name/email/phone
deleted_at                         ← Soft delete
created_at, updated_at
```

### Subscriptions Table (Key Fields)
```
id (UUID)
workspace_id (UUID)
organization_id (UUID)            ← ⭐ LINKS TO ORGANIZATION!
plan_id (UUID)
status (subscription_status)      ← 'active', 'trial', 'suspended'
coupon_code (VARCHAR)
discount_percentage (DECIMAL)
custom_price (DECIMAL)
current_billing_cycle_start/end
trial_ends_at
deleted_at
created_at
```

## 📊 Common Queries

### List Active Subscriptions with GST
```sql
SELECT 
  o.name,
  o.gst_percentage,
  p.name as plan,
  p.price_monthly,
  (p.price_monthly * (1 + o.gst_percentage/100)) as total_with_gst
FROM Subscriptions s
JOIN Organizations o ON s.organization_id = o.id
JOIN Plans p ON s.plan_id = p.id
WHERE s.status = 'active';
```

### Calculate Monthly Revenue by Plan
```sql
SELECT 
  p.name,
  COUNT(DISTINCT s.organization_id) as num_companies,
  SUM(p.price_monthly) as total_monthly,
  SUM(p.price_monthly * (1 + o.gst_percentage/100)) as total_with_gst
FROM Plans p
LEFT JOIN Subscriptions s ON p.id = s.plan_id
LEFT JOIN Organizations o ON s.organization_id = o.id
WHERE s.status = 'active'
GROUP BY p.id, p.name;
```

### Find Organizations by Country
```sql
SELECT 
  name,
  country,
  gst_number,
  industry,
  company_size
FROM Organizations
WHERE country = 'India'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

## 🧮 GST Calculation Formula

```
Total Amount = Base Price × (1 + GST% / 100)

Example:
Base: $999
GST: 18%
Total: 999 × (1 + 18/100) = 999 × 1.18 = $1,178.82
```

## 🔍 Example: Complete Organization Setup

```sql
-- 1. Create Organization
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
  billing_contact_email,
  website
) VALUES (
  'workspace-uuid',
  'Pharma Solutions Ltd',
  'pharma'::org_type,
  '18AABCU9603R1Z5',
  18.00,
  'India',
  'Karnataka',
  'Bangalore',
  'Pharmaceuticals',
  '51-200'::company_size_type,
  'Dr. Rajesh Kumar',
  'rajesh@pharmasol.in',
  'Ms. Priya Desai',
  'priya@pharmasol.in',
  'https://pharmasol.com'
) RETURNING id AS org_id;

-- 2. Create Subscription to Plan
INSERT INTO Subscriptions (
  workspace_id,
  organization_id,
  plan_id,
  status,
  current_billing_cycle_start,
  current_billing_cycle_end
) VALUES (
  'workspace-uuid',
  'org-id-from-above',
  (SELECT id FROM Plans WHERE tier = 'enterprise'::plan_tier),
  'active'::subscription_status,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days'
);

-- 3. Verify via API
GET /api/admin/organizations?search=Pharma%20Solutions
GET /api/admin/company-plans
```

## 🔐 Security Best Practices

✅ **DO**:
- Store sensitive values in `.env.local`
- Use strong JWT_SECRET (32+ characters)
- Rotate credentials regularly
- Check `.gitignore` is working (`git status`)
- Use staging to test before production

❌ **DON'T**:
- Commit `.env` files to git
- Share credentials in code/comments
- Use default passwords in production
- Push to main without testing
- Store customers' GST numbers in logs

## 🧪 Quick Test

```bash
# 1. Start server
npm run develop

# 2. In another terminal
curl http://localhost:3000/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@mylab.io","password":"SuperAdmin123!"}'

# 3. Copy token, use in headers
curl http://localhost:3000/api/admin/organizations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📊 Admin Dashboard Key Metrics

**From `/api/admin/company-plans`:**
- Total Companies: Sum of all companies_on_plan
- Active Subscriptions: Sum where status = 'active'
- Monthly Revenue: Sum of (price × active_companies)
- GST Adjusted Revenue: Sum with GST percentages applied

## 📦 Plan Tiers Reference

| Tier | Users | Price | GST @ 18% | Features |
|------|-------|-------|-----------|----------|
| Basic | 5 | $99 | $116.82 | Core features |
| Pro | 20 | $499 | $588.82 | Advanced |
| Enterprise | ∞ | $2,999 | $3,548.82 | Full access |
| Custom | Custom | Custom | Custom | Negotiated |

## 🎯 Common Tasks

### Update an Organization's GST
```bash
POST /api/admin/organizations/{id}/update-gst
{
  "gst_number": "18AABCU9603R1Z5",
  "gst_percentage": 28.00
}
```

### Search Organizations
```bash
# By name
GET /api/admin/organizations?search=Pharma

# Pagination
GET /api/admin/organizations?limit=10&offset=20
```

### Check Audit Logs
```sql
SELECT * FROM AuditLog 
WHERE action = 'ADMIN_UPDATE_GST'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## 📞 Emergency Debugging

### Database Connection Failed?
```bash
# Check variables
echo $DATABASE_URL
echo "psql $DATABASE_URL -c 'SELECT 1'"
```

### JWT Token Invalid?
```bash
# Verify JWT Secret matches .env.local
grep JWT_SECRET .env.local
```

### Endpoints Not Found?
```bash
# Check admin.ts is in routes
ls -la src/routes/admin.ts

# Check routes are imported
grep admin src/index.ts
```

### GST Calculation Wrong?
```sql
-- Verify GST percentage in database
SELECT name, gst_percentage FROM Organizations LIMIT 1;

-- Test calculation
SELECT 999 * (1 + 18.00/100) AS total_with_18pct;
-- Should return: 1178.82
```

## 🔗 Related Documentation

| File | Purpose |
|------|---------|
| COMPANY_PLANS_GST_GUIDE.md | Full feature documentation |
| TESTING_COMPANY_PLANS_GST.md | Complete testing guide |
| CHANGELOG_COMPANY_PLANS.md | All changes made |
| DATABASE_README.md | Database schema reference |
| SUPERADMIN_QUICKSTART.md | Admin system overview |

## 📱 Support Checklist

Before asking for help:
- [ ] Checked `.env.local` has all required variables
- [ ] Ran `npm run build` successfully
- [ ] Database is running and accessible
- [ ] `.gitignore` excludes `.env*`
- [ ] No hardcoded secrets in code
- [ ] JWT token is valid and not expired
- [ ] Tested endpoint with same token in browser

---

**Version**: 2.0  
**Last Updated**: February 4, 2026  
**Status**: ✅ Production Ready

**Quick Links**: [Setup Guide](./COMPANY_PLANS_GST_GUIDE.md) | [Testing](./TESTING_COMPANY_PLANS_GST.md) | [Database](./DATABASE_README.md) | [Admin](../SUPERADMIN_QUICKSTART.md)
