# 📊 Data Model & Relationships Overview

## 🏗️ Entity Relationship Diagram (Text)

```
┌─────────────────┐
│   Workspace     │
│   (Platform)    │
└────────┬────────┘
         │ (has)
         │ 1:N
         │
    ┌────▼────────────┐
    │ Organizations   │ ◄─── NEW: Full company profiles with GST
    │ (Companies)     │
    └────┬────────────┘
         │ (subscribe to)
         │ 1:N
         │
    ┌────▼────────────┐
    │ Subscriptions   │ ◄─── UPDATED: Now links to Organizations!
    │ (Plan+Company)  │
    └────┬────────────┘
         │ (has)
         │ N:1
         │
    ┌────▼────────────┐
    │     Plans       │
    │ (Tiers)         │
    └─────────────────┘
         │ (includes)
         │ 1:N
         │
    ┌────▼────────────┐
    │  PlanFeatures   │
    │ (Access Control)│
    └─────────────────┘


AUDIT TRAIL:
    ┌─────────────────┐
    │   AuditLog      │ ◄─── Logs all GST updates
    │  (Compliance)   │
    └─────────────────┘
```

## 📋 Organizations Table Structure

```
Organizations Table Schema
├── IDENTIFIERS
│   ├── id (UUID, PK)
│   ├── workspace_id (UUID, FK) → Workspace
│   └── deleted_at (TIMESTAMP) → Soft delete support
│
├── BASIC INFO
│   ├── name (VARCHAR 255)
│   ├── type (org_type ENUM)
│   │   ├── 'client'
│   │   ├── 'cro' (Clinical Research Organization)
│   │   ├── 'analyzer'
│   │   ├── 'vendor'
│   │   └── 'pharma'
│   └── notes (TEXT)
│
├── TAX & GST ⭐ NEW
│   ├── gst_number (VARCHAR 255)
│   │   └── Example: "18AABCU9603R1Z5"
│   ├── gst_percentage (DECIMAL 5,2)
│   │   └── Default: 18.00 (India standard)
│   ├── tax_id (VARCHAR 255)
│   └── company_registration_number (VARCHAR 255)
│
├── ADDRESS ⭐ NEW
│   ├── country (VARCHAR 100)
│   ├── state (VARCHAR 100)
│   ├── city (VARCHAR 100)
│   ├── postal_code (VARCHAR 20)
│   └── address (TEXT)
│
├── COMPANY INFO ⭐ NEW
│   ├── website (VARCHAR 255)
│   ├── industry (VARCHAR 100)
│   │   └── Example: 'Pharmaceuticals', 'CRO'
│   ├── company_size (company_size_type ENUM)
│   │   ├── '1-10'
│   │   ├── '11-50'
│   │   ├── '51-200'
│   │   ├── '201-1000'
│   │   └── '1000+'
│   ├── annual_revenue (VARCHAR 50)
│   │   └── Example: '$1M-$5M'
│   └── logo_url (VARCHAR 255)
│
├── PRIMARY CONTACT ⭐ NEW
│   ├── primary_contact_name (VARCHAR 255)
│   ├── primary_contact_email (VARCHAR 255)
│   └── primary_contact_phone (VARCHAR 20)
│
├── BILLING CONTACT ⭐ NEW
│   ├── billing_contact_name (VARCHAR 255)
│   ├── billing_contact_email (VARCHAR 255)
│   └── billing_contact_phone (VARCHAR 20)
│
└── TIMESTAMPS
    ├── created_at (TIMESTAMP)
    └── updated_at (TIMESTAMP)
```

## 💳 Subscriptions Table Structure

```
Subscriptions Table Schema
├── IDENTIFIERS
│   ├── id (UUID, PK)
│   ├── workspace_id (UUID, FK) → Workspace
│   ├── plan_id (UUID, FK) → Plans
│   └── organization_id (UUID, FK) → Organizations ⭐ NEW KEY!
│
├── SUBSCRIPTION STATUS
│   ├── status (subscription_status ENUM)
│   │   ├── 'trial'
│   │   ├── 'active'
│   │   ├── 'suspended'
│   │   ├── 'cancelled'
│   │   └── 'expired'
│   └── deleted_at (TIMESTAMP) → Soft delete
│
├── BILLING CYCLE
│   ├── current_billing_cycle_start (DATE)
│   ├── current_billing_cycle_end (DATE)
│   ├── next_billing_date (DATE)
│   ├── trial_ends_at (DATE)
│   └── cancelled_at (TIMESTAMP)
│
├── PRICING & DISCOUNTS ⭐ NEW
│   ├── coupon_code (VARCHAR 50)
│   ├── discount_percentage (DECIMAL 5,2)
│   │   └── Applied discount (0-100%)
│   └── custom_price (DECIMAL 12,2)
│       └── Custom negotiated rate
│
├── AUDIT TRAIL ⭐ NEW
│   ├── cancellation_reason (TEXT)
│   └── notes (TEXT)
│
└── TIMESTAMPS
    ├── created_at (TIMESTAMP)
    └── updated_at (TIMESTAMP)
```

## 📊 Plans Table Structure

```
Plans Table Schema
├── IDENTIFIERS
│   ├── id (UUID, PK)
│   ├── workspace_id (UUID, FK)
│   └── deleted_at (TIMESTAMP)
│
├── PLAN DETAILS
│   ├── name (VARCHAR 255)
│   │   ├── 'Basic'
│   │   ├── 'Pro'
│   │   ├── 'Enterprise'
│   │   └── 'Custom'
│   ├── tier (plan_tier ENUM)
│   │   ├── 'basic'
│   │   ├── 'pro'
│   │   ├── 'enterprise'
│   │   └── 'custom'
│   └── description (TEXT)
│
├── CAPACITY
│   ├── max_users (INTEGER)
│   │   └── NULL = unlimited (Enterprise)
│   └── max_projects (INTEGER)
│
├── PRICING
│   ├── price_monthly (DECIMAL 12,2)
│   │   ├── Basic: $99.00
│   │   ├── Pro: $499.00
│   │   └── Enterprise: $2,999.00
│   ├── price_annually (DECIMAL 12,2)
│   ├── price_setup (DECIMAL 12,2)
│   └── currency (VARCHAR 3)
│       └── Default: 'USD'
│
├── FEATURES
│   ├── status (plan_status ENUM)
│   │   ├── 'active'
│   │   ├── 'beta'
│   │   ├── 'deprecated'
│   │   └── 'retired'
│   └── (links to PlanFeatures)
│
└── TIMESTAMPS
    ├── created_at (TIMESTAMP)
    └── updated_at (TIMESTAMP)
```

## 🔄 Data Flow Examples

### Example 1: Company Subscribes to Enterprise Plan

```
Workspace (mylab-workspace-001)
    │
    └─► Organization
         ├─ name: "Pharma Solutions Ltd"
         ├─ gst_number: "18AABCU9603R1Z5"
         ├─ gst_percentage: 18.00
         ├─ country: "India"
         ├─ industry: "Pharmaceuticals"
         └─ primary_contact_email: "rajesh@pharmasol.in"
            │
            └─► Subscription
                 ├─ status: "active"
                 ├─ organization_id: (links back to above)
                 ├─ plan_id: (enterprise plan)
                 ├─ current_billing_cycle_start: 2024-02-01
                 ├─ current_billing_cycle_end: 2024-03-01
                 └─► Plan (Enterprise)
                      ├─ name: "Enterprise"
                      ├─ price_monthly: 2999.00
                      └─► PlanFeatures
                           ├─ unlimited_users
                           ├─ advanced_analytics
                           └─ ...
```

**Calculate Total Monthly Cost:**
```
Base: $2,999.00
GST (18%): $539.82
Total: $3,548.82
```

### Example 2: Bulk Order with Discount

```
Organization
├─ name: "Research Corp"
├─ gst_percentage: 18.00
└─► Subscription
     ├─ plan_id: Enterprise
     ├─ coupon_code: "BULK2024"
     ├─ discount_percentage: 15.00
     ├─ custom_price: null (use base price)
     └─ Calculation:
         Base: $2,999.00
         Discount (15%): -$449.85
         Subtotal: $2,549.15
         GST (18%): $458.85
         Total: $3,008.00
```

## 🎯 Query Patterns

### Pattern 1: Get Company with Active Plan
```sql
SELECT 
  o.name,
  o.gst_number,
  o.gst_percentage,
  p.name as plan_name,
  p.price_monthly,
  (p.price_monthly * (1 + o.gst_percentage/100)) as total_with_gst,
  s.status
FROM Organizations o
LEFT JOIN Subscriptions s ON o.id = s.organization_id
LEFT JOIN Plans p ON s.plan_id = p.id
WHERE o.id = ?
  AND s.status = 'active'
  AND o.deleted_at IS NULL;
```

### Pattern 2: Company Plan Distribution
```sql
SELECT 
  p.name,
  COUNT(DISTINCT s.organization_id) as num_companies,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.organization_id END) as active,
  SUM(p.price_monthly) as total_base,
  SUM(p.price_monthly * (1 + COALESCE(o.gst_percentage, 0)/100)) as total_with_gst
FROM Plans p
LEFT JOIN Subscriptions s ON p.id = s.plan_id
LEFT JOIN Organizations o ON s.organization_id = o.id
GROUP BY p.id, p.name
ORDER BY num_companies DESC;
```

### Pattern 3: GST Revenue by Country
```sql
SELECT 
  o.country,
  SUM(p.price_monthly) as base_revenue,
  AVG(o.gst_percentage) as avg_gst,
  SUM(p.price_monthly * (1 + o.gst_percentage/100)) as revenue_with_gst
FROM Organizations o
JOIN Subscriptions s ON o.id = s.organization_id
JOIN Plans p ON s.plan_id = p.id
WHERE s.status = 'active'
  AND o.deleted_at IS NULL
GROUP BY o.country
ORDER BY revenue_with_gst DESC;
```

## 🔐 Authentication & Authorization Flow

```
┌──────────────────┐
│  Admin User      │
│  superadmin@...  │
└────────┬─────────┘
         │
         │ POST /api/auth/login
         │ (email, password)
         │
    ┌────▼──────────┐
    │ JWT Token     │
    │ (Signed)      │
    └────┬──────────┘
         │
         │ Header: Authorization: Bearer {token}
         │
    ┌────▼────────────────────────┐
    │ Route Handler               │
    │ Verify JWT signature        │
    │ Extract user info           │
    │ Check permissions           │
    │ Execute query               │
    └────┬────────────────────────┘
         │
    ┌────▼────────────────────────┐
    │ Response                    │
    │ Organizations with GST info │
    │ or error (401/403)          │
    └─────────────────────────────┘
```

## 📊 Admin Dashboard Metrics

```
COMPANY PLANS DASHBOARD
│
├─── Total Companies: 45
│    ├─ On Basic: 15
│    ├─ On Pro: 20
│    └─ On Enterprise: 10
│
├─── Monthly Revenue (Base): $21,000
│    └─ From /api/admin/company-plans
│
├─── Monthly Revenue (with GST): $24,850
│    └─ Calculated as: base × (1 + avg_gst%)
│
├─── Countries: 12
│    ├─ India (18%): $8,500
│    ├─ USA (0%): $6,200
│    ├─ Mexico (16%): $4,150
│    └─ ...
│
├─── GST Collected: $3,850
│    └─ Revenue - Base Revenue = $24,850 - $21,000
│
└─── Subscription Health:
     ├─ Active: 42 (93%)
     ├─ Trial: 2 (4%)
     ├─ Suspended: 1 (2%)
     └─ Cancelled: 0 (0%)
```

## 🔌 API Response Hierarchy

```
GET /api/admin/organizations/{id}
│
└─► 200 OK
    └─► {
        "organization": {
            "id": "uuid",
            "name": "Company Name",
            
            ├─ BASIC INFO
            │  ├─ type: "pharma"
            │  └─ notes: "..."
            │
            ├─ GST & TAX
            │  ├─ gst_number: "18AABCU..."
            │  ├─ gst_percentage: 18.00
            │  ├─ tax_id: "..."
            │  └─ company_registration_number: "..."
            │
            ├─ ADDRESS
            │  ├─ country: "India"
            │  ├─ state: "Tamil Nadu"
            │  ├─ city: "Chennai"
            │  ├─ postal_code: "600001"
            │  └─ address: "..."
            │
            ├─ COMPANY
            │  ├─ industry: "Pharmaceuticals"
            │  ├─ company_size: "51-200"
            │  ├─ annual_revenue: "$10M-$50M"
            │  ├─ website: "https://..."
            │  └─ logo_url: "https://..."
            │
            ├─ CONTACTS
            │  ├─ primary_contact_name: "..."
            │  ├─ primary_contact_email: "..."
            │  ├─ primary_contact_phone: "..."
            │  ├─ billing_contact_name: "..."
            │  ├─ billing_contact_email: "..."
            │  └─ billing_contact_phone: "..."
            │
            └─ SUBSCRIPTION
               ├─ plan_name: "Enterprise"
               ├─ status: "active"
               ├─ price_monthly: 2999.00
               ├─ total_with_gst: 3548.82
               └─ billing_cycle_end: "2024-03-01"
        }
    }
```

## ✅ Data Validation Rules

### Organizations Table
```
gst_number:
  - Optional unless org is in India
  - Format: 2-digit-state + 10-digit-PAN + Z + 1-digit-check
  
gst_percentage:
  - Range: 0 to 100
  - If NULL: defaults to 18.00
  
country:
  - Required for address lookup
  - Should match ISO 3166-1 standards
  
company_size:
  - Must be one of: '1-10', '11-50', '51-200', '201-1000', '1000+'
  
email_fields:
  - Valid email format
  - Should be company email (not personal)
```

### Subscriptions Table
```
organization_id:
  - Required (FK constraint)
  - Must reference existing Organizations
  
gst_percentage:
  - Pulled from Organizations at subscription creation
  - Can be overridden if needed
  
discount_percentage:
  - Range: 0 to 100
  - Combined with base price
  
custom_price:
  - If set: overrides plan base price
  - If NULL: use plan price_monthly
```

---

**Visual Guide Created**: February 4, 2026  
**Last Updated**: February 4, 2026  
**Status**: Complete & Reference Ready
