# Quick Deployment Setup Checklist

Use this checklist to get Railway + Vercel deployed in under 30 minutes.

## Pre-requisites (5 min)

- [ ] GitHub account with `mylab-platform` repository pushed
- [ ] Railway account (signup at railway.app - FREE)
- [ ] Vercel account (signup at vercel.com - FREE)

---

## Backend Deployment to Railway (10 min)

### 1. Create Railway Project
- [ ] Go to [railway.app](https://railway.app)
- [ ] Click **New Project**
- [ ] Select **Deploy from GitHub repo**
- [ ] Choose `mylab-platform` repository
- [ ] Click **Deploy**

### 2. Add PostgreSQL Database
- [ ] Click **+ New** in project
- [ ] Select **Database** → **PostgreSQL**
- [ ] Railway creates DB automatically
- [ ] Note the `DATABASE_URL` (shown in Variables tab)

### 3. Set Environment Variables
- [ ] Go to **Variables** tab
- [ ] Add these variables:
  ```
  NODE_ENV=production
  JWT_SECRET=<generate-a-random-secret-key>
  PORT=3001
  LOG_LEVEL=warn
  ```
- [ ] Click **Save**

### 4. Configure Build Commands
- [ ] Go to **Settings** tab
- [ ] **Build Command**: `npm ci && npm run build`
- [ ] **Start Command**: `npm start`
- [ ] **Root Directory**: `backend/` (if monorepo)
- [ ] Click **Save**

### 5. Deploy
- [ ] Railway auto-deploys on push
- [ ] Or click **Deploy** manually
- [ ] Go to **Deployments** tab to monitor
- [ ] Once green ✅, get URL from Railway dashboard

### 6. Test Backend
```bash
# Copy your Railway URL from dashboard
curl https://{railway-app-id}.up.railway.app/health

# Should return: {"status":"ok","timestamp":"...","platform":{...}}
```

**Railway backend is live!** 🎉

---

## Frontend Deployment to Vercel (10 min)

### 1. Create Vercel Project
- [ ] Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- [ ] Click **Add New** → **Project**
- [ ] Click **Import Git Repository**
- [ ] Select `mylab-platform` (authorize if needed)
- [ ] Click **Import**

### 2. Configure Build Settings
- [ ] **Framework Preset**: Select **Vite**
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`
- [ ] **Install Command**: `npm ci`
- [ ] Click **Deploy**

### 3. Add Environment Variables
- [ ] While deploying, go to **Settings** → **Environment Variables**
- [ ] Add for **Production**:
  ```
  VITE_API_URL=https://{railway-app-id}.up.railway.app/api/v1
  ```
  (Replace with your actual Railway URL)
- [ ] Click **Save**

### 4. Trigger Redeploy
- [ ] Go to **Deployments** tab
- [ ] Select latest deployment
- [ ] Click **Redeploy** (to use new env vars)
- [ ] Wait for ✅ green status

### 5. Test Frontend
```bash
# Get deployment URL from Vercel dashboard
// Copy URL and open in browser
https://{vercel-project}.vercel.app

# Should show: MyLab Platform login page
```

**Vercel frontend is live!** 🎉

---

## GitHub Actions Secrets (5 min)

### 1. Get Vercel Tokens
- [ ] Go to [Vercel Account Settings](https://vercel.com/account/settings/personal)
- [ ] Click **Tokens** → **Create New Token**
- [ ] Select **Personal Access Token**
- [ ] Create and copy token

### 2. Get Vercel IDs
- [ ] Go to your Vercel project
- [ ] Settings → Copy `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` from URL or page
- [ ] Or use: `vercel whoami` and `vercel link` commands

### 3. Add to GitHub Secrets
- [ ] Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
- [ ] Click **New repository secret**
- [ ] Add these three secrets:

| Secret Name | Value |
|------------|-------|
| `VERCEL_TOKEN` | Your Vercel auth token |
| `VERCEL_ORG_ID` | Your Vercel org ID |
| `VERCEL_PROJECT_ID` | Your Vercel project ID |

### 4. Verify Pipeline
- [ ] Go to GitHub **Actions** tab
- [ ] Make a commit to `main` branch
- [ ] Watch workflow run:
  - ✅ Tests pass
  - ✅ Builds succeed
  - ✅ Deploys trigger

---

## Post-Deployment Checklist

### Test End-to-End
- [ ] Frontend loads: `https://{vercel-project}.vercel.app`
- [ ] Can reach backend: API calls work (check browser console)
- [ ] Database: Can create/read data
- [ ] Health check: `{railway-url}/health` returns 200

### Monitor Deployments
- [ ] **Railway Logs**: Dashboard → Logs tab (real-time logs)
- [ ] **Vercel Logs**: Deployments tab → Function logs
- [ ] **GitHub Actions**: Actions tab (workflow status)

### Setup Monitoring (Optional)
- [ ] Set up alerts for deployment failures
- [ ] Enable Railway metrics (CPU, memory, requests)
- [ ] Enable Vercel analytics

### Customize Domains (Optional)
- [ ] **Railway**: Add custom domain in Settings
- [ ] **Vercel**: Add domain in Settings → Domains

---

## Rollback Procedure

**If something breaks after deployment:**

### Rollback Backend (Railway)
1. Go to Railway dashboard
2. **Deployments** → Click previous successful deployment
3. Click **Select as Live**
4. ✅ Service reverted in seconds

### Rollback Frontend (Vercel)
1. Go to Vercel dashboard
2. **Deployments** → Click previous successful deployment
3. Click **Promote to Production**
4. ✅ Site reverted instantly

**Why rollback?** It's faster than fixing and re-deploying.

---

## Environment Variables Summary

### Railway (Backend)
```
DATABASE_URL=(auto-set by Railway)
NODE_ENV=production
JWT_SECRET=your-secret-key
PORT=3001
LOG_LEVEL=warn
```

### Vercel (Frontend)
```
VITE_API_URL=https://your-railway-app.up.railway.app/api/v1
```

### GitHub Secrets
```
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Railway won't build** | Check `npm ci && npm run build` succeeds locally |
| **Vercel won't build** | Check `npm run build` succeeds locally |
| **Frontend can't reach backend** | Check `VITE_API_URL` env var, check CORS in backend |
| **Deployments don't auto-trigger** | Check GitHub Actions enabled, workflow in `.github/workflows/` |
| **Deployment secrets wrong** | Verify `VERCEL_*` secrets in GitHub Settings |

**Get help**: See `DEPLOYMENT_GUIDE.md` for full troubleshooting.

---

## What Happens on Git Push

**To `develop` branch**:
1. ✅ Run tests (no deployment)

**To `main` branch** (after tests pass):
1. ✅ Run all tests
2. 🚀 Deploy backend to Railway (auto via git)
3. 🚀 Deploy frontend to Vercel (via GitHub Actions)
4. 📧 Get notification on Vercel dashboard

**CI/CD Pipeline**: Automatic from commit to live in ~5 minutes

---

## Cost (Feb 2026)

- **Railway**: $0-50/month (free tier available)
- **Vercel**: $0-20/month (free for most projects)
- **Total**: Usually free or $10-20/month

---

## Next Steps

1. ✅ Complete this checklist today
2. ✅ Test end-to-end (frontend → backend → database)
3. ✅ Make a test commit to verify auto-deployment works
4. ✅ Share deployment URLs with team
5. 📖 Read `DEPLOYMENT_GUIDE.md` for advanced config

---

## Success Criteria

You're done when:
- ✅ Frontend URL works in browser
- ✅ Backend health check returns 200
- ✅ API calls from frontend to backend work
- ✅ GitHub Actions workflow completes successfully
- ✅ Any git push to `main` auto-deploys

**Estimated Time**: 30 minutes from zero to production ✨

---

**Need help?** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete setup instructions and alternatives.
