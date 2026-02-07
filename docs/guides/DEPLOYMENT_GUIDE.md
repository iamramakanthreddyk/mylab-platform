# Deployment Guide: Railway + Vercel

This guide covers deploying the MyLab platform using:
- **Backend**: Railway (PostgreSQL database + Node.js API)
- **Frontend**: Vercel (React/TypeScript SPA)
- **CI/CD**: GitHub Actions (testing & triggering deployments)

---

## Table of Contents

1. [Railway Setup (Backend)](#railway-setup-backend)
2. [Vercel Setup (Frontend)](#vercel-setup-frontend)
3. [GitHub Actions Integration](#github-actions-integration)
4. [Environment Variables](#environment-variables)
5. [Monitoring & Rollback](#monitoring--rollback)
6. [Alternative Deployments](#alternative-deployments)

---

## Railway Setup (Backend)

### Prerequisites
- GitHub account (for connecting repo)
- Railway account (free tier available at railway.app)
- PostgreSQL database connection string

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Select your `mylab-platform` repository
6. Choose `backend` as the service root (or leave empty for monorepo)

### Step 2: Configure PostgreSQL Database

1. In Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway will provision a PostgreSQL instance
4. Note the `DATABASE_URL` (shown in Variables tab)

### Step 3: Set Environment Variables

In Railway project dashboard:

1. Go to **Variables** tab
2. Add these variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<your-secret-key>
   DATABASE_URL=<auto-populated by Railway>
   PORT=3001
   LOG_LEVEL=warn
   ```
3. Click **Save**

### Step 4: Configure Build & Start Commands

In Railway **Settings**:

1. **Build Command**: `npm ci && npm run build`
2. **Start Command**: `npm start`
3. **Root Directory**: `backend/` (if monorepo)

### Step 5: Auto-Deploy on Git Push

Railway automatically deploys on:
- Push to `main` branch
- Successful build & no errors

**Disable auto-deploy** (optional, for manual deployments):
- Settings → Deployments → Uncheck "Auto Deploy"

### Step 6: View Deployment Status

```
Dashboard → Deployments tab
  ├── View build logs
  ├── View runtime logs
  └── Rollback to previous version
```

### Testing Railway Deployment

```bash
# Get your Railway URL from dashboard
curl https://{railway-app-id}.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"2026-02-05T...","platform":{...}}
```

---

## Vercel Setup (Frontend)

### Prerequisites
- Vercel account (free at vercel.com)
- GitHub account connected to Vercel

### Step 1: Create Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. **Import Git Repository**
4. Select your `mylab-platform` repo from GitHub (authorize if needed)

### Step 2: Configure Project Settings

**Project Name**: `mylab-platform-frontend` (or similar)

**Framework Preset**: Select **Vite** (or **Other** if not listed)

**Root Directory**: Leave empty (or set to root if frontend is there)

**Build Settings**:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

### Step 3: Set Environment Variables

In Vercel **Settings** → **Environment Variables**:

Add the following for each environment (Development, Preview, Production):

```
VITE_API_URL=https://{railway-app-id}.up.railway.app/api/v1
VITE_APP_NAME=MyLab Platform
```

**Example**:
```
Development:  VITE_API_URL=http://localhost:3001/api/v1
Preview:      VITE_API_URL=https://staging-{railway-id}.up.railway.app/api/v1
Production:   VITE_API_URL=https://{railway-app-id}.up.railway.app/api/v1
```

### Step 4: Connect to Custom Domain (Optional)

In Vercel **Settings** → **Domains**:

1. Add your domain
2. Follow DNS configuration instructions
3. Wait for DNS propagation (5-30 minutes)

### Step 5: Auto-Deploy on Git Push

Vercel automatically deploys on:
- Push to `main` branch → Production
- Push to `develop` branch → Preview
- Pull requests → Preview

**Disable for specific branches** (if needed):
- Settings → Git → Ignored Build Step

### Step 6: View Deployment Status

```
Dashboard → Deployments tab
  ├── View build logs
  ├── View function logs
  ├── View environment variables
  └── Trigger manual redeploy
```

### Testing Vercel Deployment

```bash
# Get deployment URL from Vercel dashboard
curl https://{vercel-project}.vercel.app

# Should return the React app homepage
```

---

## GitHub Actions Integration

### Step 1: Add Secrets to GitHub

Go to your repository **Settings** → **Secrets and variables** → **Actions**

Add these secrets (needed by CI/CD workflow):

```
VERCEL_TOKEN=<your-vercel-auth-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>
```

**How to get Vercel tokens**:

1. Go to [Vercel Settings](https://vercel.com/account/settings/personal) → **Tokens**
2. Create new token: **Personal Access Token**
3. Copy the token to `VERCEL_TOKEN`
4. For `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`:
   - Go to your Vercel project
   - Settings → look for IDs in the URL or settings

### Step 2: Update CI/CD Workflow

The workflow in `.github/workflows/ci-cd.yml` is already configured for Railway + Vercel:

```yaml
# Tests run on all PRs and pushes
- Backend Lint
- Backend Tests  
- Backend Build
- Frontend Lint
- Frontend Build
- Security Scan

# Deployment happens ONLY on main branch after successful tests
- Deploy Backend to Railway (auto via git push)
- Deploy Frontend to Vercel (via Vercel action)
```

### Step 3: Verify Workflow

1. Make a commit and push to `main`
2. Go to GitHub **Actions** tab
3. Watch the workflow run:
   - ✅ Tests pass
   - ✅ Builds succeed
   - ✅ Deployments trigger

### Workflow Behavior

| Event | Behavior |
|-------|----------|
| **PR to develop/main** | Run tests only (no deployment) |
| **Push to develop** | Run tests + deploy frontend preview |
| **Push to main** | Run tests + deploy backend (Railway) + deploy frontend (Vercel) |
| **Failed tests** | ❌ Block deployment |

---

## Environment Variables

### Backend (Railway)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/mylab

# Server
NODE_ENV=production
PORT=3001

# Authentication
JWT_SECRET=your-secret-key-here

# Logging
LOG_LEVEL=warn  # Use 'info' for debugging, 'warn' for production

# Optional: Monitoring
SENTRY_DSN=https://key@sentry.io/project-id
```

### Frontend (Vercel)

```env
# API Connection
VITE_API_URL=https://mylab-backend.up.railway.app/api/v1

# App Config
VITE_APP_NAME=MyLab Platform
VITE_APP_VERSION=1.0.0

# Optional: Analytics
VITE_SEGMENT_KEY=sxxxxxxxxxx
```

### GitHub Secrets (for CI/CD)

```
VERCEL_TOKEN=<auth-token>
VERCEL_ORG_ID=<org-id>
VERCEL_PROJECT_ID=<project-id>
```

---

## Monitoring & Rollback

### Monitor Backend (Railway)

1. **Logs**: Dashboard → Logs tab (real-time logs)
2. **Metrics**: Dashboard → Metrics (CPU, memory, requests)
3. **Deployments**: Dashboard → Deployments (history & status)

### Monitor Frontend (Vercel)

1. **Logs**: Deployments → Selected deployment → Function logs
2. **Analytics**: Real User Monitoring (RUM)
3. **Deployments**: Deployments tab (history)

### Rollback Backend (Railway)

If something breaks:

```
Dashboard → Deployments tab
  ↓
Select previous successful deployment
  ↓
Click "Select as Live"
```

Service is back to previous version in seconds.

### Rollback Frontend (Vercel)

If something breaks:

```
Dashboard → Deployments tab
  ↓
Select previous successful deployment
  ↓
Click "Promote to Production"
```

Site reverts instantly.

### Health Checks

**Backend endpoint** (Railway):
```bash
curl https://{railway-app}.up.railway.app/health
# Response: {"status":"ok","platform":{...}}
```

**Frontend endpoint** (Vercel):
```bash
curl https://{vercel-project}.vercel.app
# Response: HTML (React app)
```

Monitor in GitHub Actions or use uptime service (e.g., UptimeRobot).

---

## Alternative Deployments

If you want to use different platforms:

### Backend Alternatives to Railway

| Platform | Pros | Cons |
|----------|------|------|
| **Railway** | Simple, auto-deploy, free tier | Limited free tier |
| **Heroku** | Great UI, easy setup | Moved to paid-only |
| **AWS (EC2)** | Scalable, full control | Complex setup |
| **DigitalOcean** | Affordable, simple droplets | Manual updates |
| **Render** | Railway alternative, free tier | Smaller community |

**To use Heroku instead of Railway**:
- Connect GitHub repo
- Add Procfile: `web: npm start`
- Deploy manually or auto-deploy on git push

### Frontend Alternatives to Vercel

| Platform | Pros | Cons |
|----------|------|------|
| **Vercel** | Purpose-built for Next.js/React, free tier | Free tier limited |
| **Netlify** | Simple, great for static sites | Fewer features than Vercel |
| **GitHub Pages** | Free, simple | Limited to static sites |
| **AWS S3 + CloudFront** | Very scalable | Complex setup |

**To use Netlify instead of Vercel**:
- Connect GitHub repo
- Set build command: `npm run build`
- Set output directory: `dist`
- Deploy on push

### Using Docker + Any Platform

If you want maximum flexibility, containerize both:

```dockerfile
# backend/Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

Then deploy to:
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform

---

## Cost Estimates (Feb 2026 Pricing)

### Railway
- **Free tier**: 500 MB memory/month + limited database
- **Paid**: $5+ per service/month
- **Estimate**: $10-50/month for small project

### Vercel
- **Free tier**: Build minutes + bandwidth limits
- **Pro**: $20/month (for advanced features)
- **Estimate**: $0-20/month (often free for small projects)

### Total: $10-70/month for production setup

---

## Troubleshooting

### Backend won't deploy on Railway
- [ ] Check build logs for errors
- [ ] Verify `npm ci && npm run build` succeeds locally
- [ ] Check environment variables are set
- [ ] Ensure `backend/` root directory is configured

### Frontend won't deploy on Vercel
- [ ] Check build logs for errors
- [ ] Verify `npm run build` succeeds locally
- [ ] Check `VITE_API_URL` environment variable is set
- [ ] Verify Node version matches (18+)

### Deployments don't trigger automatically
- [ ] Check GitHub Actions workflow is enabled (Settings → Actions)
- [ ] Verify commit is to `main` branch
- [ ] Check workflow file is at `.github/workflows/ci-cd.yml`
- [ ] Review workflow logs for errors

### API calls from frontend to backend fail
- [ ] Check `VITE_API_URL` points to Railway backend
- [ ] Check CORS is configured in backend
- [ ] Test Railway backend is running: `curl {railway-url}/health`
- [ ] Check browser console for error details

---

## Next Steps

1. **Immediate**:
   - Set up Railway account and PostgreSQL
   - Set up Vercel account
   - Add GitHub secrets
   - Push to main and watch deployments

2. **Short-term**:
   - Test end-to-end: frontend → backend → database
   - Set up monitoring alerts
   - Configure custom domain (if applicable)

3. **Long-term**:
   - Add database backups (Railway handles this)
   - Set up log aggregation (Sentry, DataDog, etc.)
   - Plan scaling strategy

---

## Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Django/Express Deployment Checklist](https://github.com/goldbergyoni/nodebestpractices#6-production-best-practices)
