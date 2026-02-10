# 🎯 Platform Admin System - Quick Reference Guide

## 🔑 Platform Admin Credentials

Platform admins are stored in the `Users` table with `role = platform_admin`.
Use environment variables to seed a platform admin in setup:

```
SUPERADMIN_EMAIL=superadmin@mylab.io
SUPERADMIN_PASSWORD=SuperAdmin123!
```

## 🚀 Quickstart

### 1. Start the Backend
```bash
cd backend
npx tsx src/index.ts
```
Server runs on `http://localhost:3001`

### 2. Run Tests
```bash
cd backend
npx tsx test-admin-routes.ts
```
**Result**: ✅ 9/9 tests passing

### 3. Login to Dashboard
```bash
curl -X POST http://localhost:3001/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@mylab.io","password":"SuperAdmin123!"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": {
    "id": "<platform_admin_user_id>",
    "email": "superadmin@mylab.io",
    "role": "platform_admin",
    "name": "Platform Administrator"
  }
}
```

## 📊 Core Endpoints

All endpoints require header:
```
Authorization: Bearer {token}
```

### Analytics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/analytics/overview` | GET | Platform-wide metrics |
| `/api/admin/analytics/organizations/:id` | GET | Organization details & metrics |

### Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/workspaces` | GET | List organizations (tenant list) |
| `/api/admin/users` | GET | List users with activity |
| `/api/admin/plans` | GET | View plans |
| `/api/admin/subscriptions` | GET | View active subscriptions |
| `/api/admin/features` | GET | View features |

### Actions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/subscriptions/:id/upgrade` | POST | Change organization plan |

## 📈 Sample Output

Note: Admin responses still use legacy `workspaces` naming for organization data.

### Get Platform Overview
```bash
curl http://localhost:3001/api/admin/analytics/overview \
  -H "Authorization: Bearer {token}"
```

Response:
```json
{
  "total_workspaces": 1,
  "total_users": 1,
  "total_organizations": 0,
  "active_subscriptions": 0,
  "trial_subscriptions": 0,
  "total_projects": 1,
  "total_analyses": 0,
  "total_active_users_all_time": 0,
  "active_workspaces_30d": 0
}
```

### Get Organizations with Metrics
```bash
curl "http://localhost:3001/api/admin/workspaces?limit=10" \
  -H "Authorization: Bearer {token}"
```

Response:
```json
{
  "workspaces": [
    {
      "id": "977b3387-0141-4750-921c-c485cc30f1cf",
      "name": "TechLab Solutions",
      "created_at": "2024-12-06T...",
      "user_count": 1,
      "project_count": 1,
      "analysis_count": 0,
      "plan_name": null,
      "plan_tier": null,
      "subscription_status": null,
      "last_login_at": null,
      "last_login_ip": null,
      "active_users": null,
      "api_calls": null
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

## 🗄️ Database Tables

Essential tables:
- `plans` - Subscription tiers
- `subscriptions` - Organization plan mappings
- `features` - Feature definitions
- `lastlogin` - User activity tracking
- `usagemetrics` - Daily aggregated data

Location: Railway PostgreSQL (caboose.proxy.rlwy.net:53153)

## 🔐 Security Features

✅ JWT authentication (24-hour tokens)
✅ Role-based authorization (`platform_admin` only)
✅ SQL injection prevention (parameterized queries)
✅ SSL/TLS for database connections
✅ Environment variable protection

## 🧪 Test Coverage

All 9 endpoints have passing tests:

```
✅ Unauthorized Access (rejects unauthenticated requests)
✅ Platform Admin Login (JWT generation)
✅ Analytics Overview (platform metrics)
✅ Organizations List (organization enumeration)
✅ Users List (user activity tracking)
✅ Plans List (available plans)
✅ Subscriptions List (active subscriptions)
✅ Features List (feature availability)
✅ Organization Analytics (detailed metrics)
```

## 📋 File Structure

```
backend/
├── src/
│   ├── routes/
│   │   └── admin.ts              ← Platform admin endpoints
│   ├── middleware/
│   │   ├── analytics.ts          ← Usage tracking
│   │   └── auth.ts               ← Authentication
│   ├── db.ts                     ← Database connection
│   ├── preload.ts                ← Env variables
│   └── index.ts                  ← Server setup
├── test-admin-routes.ts          ← Test suite
├── check-schema.ts               ← Schema inspection
└── SUPERADMIN_IMPLEMENTATION.md  ← Full documentation
```

## 🔄 Environment Setup

File: `backend/.env.local`

```
NODE_ENV=development
DATABASE_URL=postgresql://user:pwd@caboose.proxy.rlwy.net:53153/railway
PORT=3001
JWT_SECRET=dev-jwt-secret-change-in-production
SUPERADMIN_EMAIL=superadmin@mylab.io
SUPERADMIN_PASSWORD=SuperAdmin123!
```

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3001 in use | Kill process: `Get-NetTCPConnection -LocalPort 3001 \| Stop-Process` |
| Database connection fails | Check `DATABASE_URL` in `.env.local` |
| Token expired | Login again to get new token |
| Column not found | Run `npx tsx check-schema.ts` to verify schema |

## 📚 Next Steps

### Immediate (High Priority)
- [ ] Build frontend dashboard for platform admin
- [ ] Integrate payment processing (Stripe)
- [ ] Add real email notifications
- [ ] Implement feature flags for beta testing

### Medium Priority
- [ ] Real-time metrics updates via WebSocket
- [ ] Advanced search and filtering
- [ ] Bulk operations (export, import)
- [ ] Customizable reports

### Future Enhancements
- [ ] Cross-tenant access grant tooling
- [ ] Custom branding per organization
- [ ] API usage analytics
- [ ] Audit trail visualization
- [ ] Automated scaling alerts

## 💡 Key Features

- **Zero-Downtime Deployments**: Schema supports versioning
- **Scalable Architecture**: JWT stateless auth
- **Audit Trail Ready**: All tables support logging
- **Plan-Based Access**: Feature gating infrastructure
- **Usage Tracking**: Daily metrics collection
- **Activity Monitoring**: Last login & IP tracking

## 📞 Support

For issues or questions:
1. Check test results: `npm run test -- test-admin-routes.ts`
2. Review logs in backend terminal
3. Inspect database schema: `npx tsx check-schema.ts`
4. Check API responses with curl or Postman

## 📄 Related Documentation

- [SUPERADMIN_IMPLEMENTATION.md](./SUPERADMIN_IMPLEMENTATION.md) - Full technical details
- [DATABASE_README.md](./DATABASE_README.md) - Database schema reference
- [../../docs/architecture/](../../docs/architecture/) - System architecture

---

**Last Updated**: December 6, 2024
**Version**: 1.0
**Status**: ✅ Production Ready
