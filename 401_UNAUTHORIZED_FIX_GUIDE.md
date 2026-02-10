# 401 Unauthorized Error - Diagnosis & Fix Guide

## Problem Description

You're getting 401 Unauthorized errors when trying to access protected API endpoints:
- `GET /api/samples?projectId=create` → 401
- `GET /api/projects/create/stages` → 401

Error message: `{"error":"Missing or invalid authorization header"}`

---

## Root Causes (Check Each One)

### 1. ❌ User is Not Logged In
**Symptoms:**
- No `authToken` in browser localStorage
- Token is empty or undefined
- User bypassed login page

**Check:**
```javascript
// Open browser console and run:
localStorage.getItem('authToken')
// Should return a JWT token like: "eyJhbGc..."
// If it returns null, user is not authenticated
```

**Fix:**
- User must log in first at `/login`
- Ensure login generates and saves `authToken` to localStorage
- CreateProjectPage should be protected and require login

---

### 2. ❌ Token is Expired
**Symptoms:**
- Token exists in localStorage
- But API returns 401
- User was logged in previously

**Check:**
```javascript
// Decode the token to see expiry:
// Paste token at https://jwt.io (for inspection only, use trusted site)
// Check the 'exp' claim
```

**Fix:**
- User needs to log in again
- Refresh token mechanism if available
- Backend should return 401 for expired tokens

---

### 3. ❌ Authorization Header Not Sent
**Symptoms:**
- Token exists in localStorage
- But network tab shows no `Authorization` header in request

**Root Cause:**
- axiosConfig request interceptor not executing
- Token retrieval failing
- Network timing issue

**Check:**
```javascript
// In browser console, check axiosConfig:
// 1. Look at network requests in browser Dev Tools
// 2. Check "Headers" tab in each request
// 3. Should have: Authorization: Bearer {token}

// If missing, check localStorage again:
localStorage.getItem('authToken')
localStorage.getItem('adminToken')
```

**Fix:**
- Verify token is saved correctly after login:
  ```javascript
  localStorage.setItem('authToken', token)
  ```
- Check axiosConfig is loaded and interceptors are registered
- Verify no JavaScript errors preventing interceptor execution

---

### 4. ❌ Token is Invalid/Malformed
**Symptoms:**
- Token exists and is sent
- But API says "Invalid or expired token"

**Root Cause:**
- Token was generated incorrectly
- Token was tampered with
- JWT_SECRET mismatch between frontend and backend

**Fix:**
- Ensure backend uses same JWT_SECRET for signing and verification
- Check environment variable: `JWT_SECRET`
- Re-login to generate a fresh token

---

### 5. ❌ CreateProjectPage Route Not Registered
**Symptoms:**
- URL shows `/projects/create`
- But components try to access `/projects/{id}` instead

**Root Cause:**
- Route not added to App.tsx
- Route in wrong position (less specific routes before specific ones)

**Fix:**
- Verify in App.tsx:
  ```tsx
  // Must come BEFORE /:id route
  <Route path="/projects/create" element={<CreateProjectPage user={currentUser} onProjectsChange={setProjects} />} />
  <Route path="/projects/:id" element={<ProjectDetails user={currentUser} />} />
  ```

---

### 6. ❌ User Prop Not Passed
**Symptoms:**
- CreateProjectPage loads but shows error
- Missing user information

**Fix:**
- Verify in App.tsx route:
  ```tsx
  <Route path="/projects/create" element={<CreateProjectPage user={currentUser} />} />
  // Must pass user prop
  ```

---

## Debugging Steps

### Step 1: Check Authentication Status
```javascript
// In browser console:
const token = localStorage.getItem('authToken')
const user = localStorage.getItem('user')
console.log('Token:', token ? '✅ Present' : '❌ Missing')
console.log('User:', user ? '✅ Present' : '❌ Missing')
```

### Step 2: Test API Directly
```bash
# Get your token from browser console/localStorage

# Test API endpoint:
curl -X GET http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Should return 200 and project data
# If 401, token is invalid
```

### Step 3: Check Network Tab
1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Make a request to `/api/...`
4. Click on request
5. Check "Headers" tab
6. Look for `authorization` header
7. Should show: `Authorization: Bearer eyJ...`

### Step 4: Check Console Logs
1. Open browser Console (F12)
2. Look for messages from axiosConfig:
   - `[axios] Added auth header to...` ✅ Good
   - `[axios] No auth token available...` ❌ Bad

### Step 5: Verify Backend JWT_SECRET
```bash
# Check if environment variable is set:
echo $JWT_SECRET

# Or in backend code, ensure both use same secret:
# auth.ts:  JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-change-in-production'
# authService.ts: jwtSecret = process.env.JWT_SECRET || 'your-dev-secret-change-in-production'
```

---

## Solution Summary

### For 401 Errors:

```
┌─ Is user logged in?
│  ├─ NO → User must log in first
│  └─ YES ↓
├─ Is token in localStorage?
│  ├─ NO → Login system not saving token
│  └─ YES ↓
├─ Is Authorization header in network request?
│  ├─ NO → axiosConfig interceptor not working
│  └─ YES ↓
├─ Is token valid/not expired?
│  ├─ NO → User must log in again
│  └─ YES ↓
└─ Is JWT_SECRET same on backend?
   ├─ NO → Fix env variable
   └─ YES → Check backend logs for real error
```

---

## Quick Fixes

### Fix 1: Force User to Login
```tsx
// In CreateProjectPage.tsx
useEffect(() => {
  const token = localStorage.getItem('authToken')
  if (!token) {
    toast.error('Please log in first')
    navigate('/login')
  }
}, [])
```

✅ **Already implemented** in the updated CreateProjectPage

### Fix 2: Verify Route is Registered
```tsx
// In App.tsx (AppContent function)
<Route path="/projects/create" element={<CreateProjectPage user={currentUser} onProjectsChange={setProjects} />} />
```

✅ **Already added**

### Fix 3: Improve Error Messages
```tsx
if (error.response?.status === 401) {
  toast.error('Your session has expired. Please log in again.')
  navigate('/login')
}
```

✅ **Already implemented**

### Fix 4: Check JWT_SECRET
```bash
# In development, ensure these match:
# Backend: process.env.JWT_SECRET || 'your-dev-secret-change-in-production'
# AuthService: process.env.JWT_SECRET || 'your-dev-secret-change-in-production'

# Set in .env if needed:
JWT_SECRET=my-secret-key-123456
```

---

## Testing Checklist

- [ ] Log in at `/login` with valid credentials
- [ ] Check localStorage has `authToken`
- [ ] Navigate to `/projects/create`
- [ ] Check browser console for `[axios] Added auth header...`
- [ ] Check network tab shows `Authorization: Bearer...`
- [ ] Form loads and organizations dropdown populates
- [ ] Submit form successfully creates project
- [ ] Redirected to project detail page
- [ ] Check server logs for any errors

---

## If Problems Persist

### Check Backend Logs
```bash
# Watch backend logs:
npm run dev

# Should show:
# "✅ Database connected"
# No 401 errors for valid tokens
```

### Run Debug Script
```bash
# Test API connectivity and auth:
npx ts-node backend/debug-auth.ts

# Set your admin token:
ADMIN_TOKEN=your-token-here npx ts-node backend/debug-auth.ts
```

### Check Database User
```bash
# User must exist in Users table:
SELECT id, email, name, role, workspace_id FROM Users LIMIT 10;

# If user is deleted (deleted_at IS NOT NULL), they can't log in
```

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Missing or invalid authorization header" | No Bearer token sent | User must be logged in |
| "Invalid or expired token" | Token is malformed or expired | User must log in again |
| "User not found" | User exists in JWT but not in DB | Check DB, recreate user |
| "401 Unauthorized" | Generic auth failure | Check all steps above |
| "Network Error" | API not running | Start backend: `npm run dev` |

---

## Prevention (For Future)

1. ✅ Always check user is logged in before accessing protected routes
2. ✅ Use secure HTTP only for tokens (not shown in this dev setup)
3. ✅ Implement token refresh mechanism if needed
4. ✅ Add loading states while checking auth
5. ✅ Clear old tokens on logout
6. ✅ Handle 401 errors consistently across app

---

## Next Steps

1. Check your token (localStorage): `localStorage.getItem('authToken')`
2. If missing → log in first
3. If present → run debug script above
4. If still failing → check backend logs
5. If all else fails → try fresh login or database reset

Your 401 errors should be resolved with the updated CreateProjectPage that checks for tokens and provides better error messages!
