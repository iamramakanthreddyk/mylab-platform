# Quick Fix Checklist for 401 Errors on Create Project Page

## What Changed

✅ Added `/projects/create` route to App.tsx  
✅ Imported CreateProjectPage component  
✅ Added token validation in CreateProjectPage  
✅ Improved error handling with clear messages  
✅ Added console logging to debug auth issues  

---

## Step-by-Step Resolution

### Step 1: Make Sure Backend is Running
```bash
cd backend
npm run dev
```
✅ You should see: `🚀 Server running at http://localhost:3001`

### Step 2: Stop Any Existing Frontend Server
```bash
# Press Ctrl+C in frontend terminal if it's running
```

### Step 3: Start Fresh Frontend
```bash
cd source-root  # Go to frontend directory
npm run dev
```

### Step 4: Clear Browser Cache and LocalStorage
```javascript
// In browser console:
localStorage.clear()
location.reload()
```

### Step 5: Fresh Login
1. Navigate to `http://localhost:5173` (or your frontend URL)
2. Go to `/login`
3. Enter credentials:
   - Email: `admin@example.com` (or your user)
   - Password: `password` (or your password)
4. Click "Login"
5. You should see success message and redirect to dashboard

### Step 6: Verify Token is Saved
```javascript
// In browser console, run:
const token = localStorage.getItem('authToken')
console.log('Token exists:', token ? '✅ YES' : '❌ NO')
console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None')
```
Should show: `Token exists: ✅ YES`

### Step 7: Navigate to Create Project
1. Go to Projects page: `/projects`
2. Click "New Project" button
3. Browser should navigate to `/projects/create`

### Step 8: Check Browser Console
Look for message: `[axios] Added auth header to GET /api/organizations`

### Step 9: Verify Organizations Load
- Organization dropdown shouldpopulate with data
- If empty, check API response in Network tab

### Step 10: Fill Form and Submit
1. Fill in all required fields:
   - Project Name: "Test Project"
   - Client Org: Select from dropdown
   - Executing Lab: Select from dropdown
   - Workflow: Select one
   - Status: Select one
2. Click "Create Project"
3. Should see success: `"Project 'Test Project' created successfully"`
4. Auto-redirects to project detail page

---

## Troubleshooting If Still Getting 401

### Check 1: Token Missing After Login
**Problem**: No token in localStorage after login
```javascript
localStorage.getItem('authToken')  // Returns null
```

**Solutions**:
- Check if login form submitted (Network tab)
- Check backend logs for login endpoint errors
- Try different email/password
- Check database has the user: `SELECT * FROM Users LIMIT 1;`

### Check 2: Token Exists But API Still Returns 401
**Problem**: Token in localStorage but requests get 401
```javascript
localStorage.getItem('authToken')  // Returns token
// But requests still 401
```

**Solutions**:
1. Check Network tab in DevTools:
   - Click on failed API request (GET /api/organizations)
   - Go to "Headers" section
   - See if `Authorization: Bearer ...` is present
   - If NOT present → axiosConfig interceptor not working
   - If present but 401 → token is invalid

2. Verify token format:
```javascript
const token = localStorage.getItem('authToken')
// Should start with "eyJ"
// Should have 3 parts separated by dots: xxxxx.yyyyy.zzzzz
```

3. Check JWT secret matches:
   ```bash
   # Terminal:
   echo $JWT_SECRET
   # If empty, both frontend and backend use: 'your-dev-secret-change-in-production'
   ```

### Check 3: Frontend Shows Error Message
**Problem**: Page loads but shows error like "Failed to load organizations"

**Solution**:
Check the actual error in Network tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Find the failed request to `/api/organizations`
4. Click on it
5. Go to "Response" tab
6. Read the error message
7. Common errors:
   - `Invalid or expired token` → Re-login
   - `User not found` → User deleted from database
   - `Missing or invalid authorization header` → Token not sent

### Check 4: Route Not Found (404)
**Problem**: Navigate to `/projects/create` but get 404

**Solution**:
1. Verify in App.tsx that route is added:
   ```tsx
   <Route path="/projects/create" element={<CreateProjectPage user={currentUser} onProjectsChange={setProjects} />} />
   ```
2. Make sure component is imported:
   ```tsx
   import { CreateProjectPage } from '@/components/CreateProjectPage'
   ```
3. Restart frontend server:
   ```bash
   Ctrl+C in terminal
   npm run dev
   ```

---

## Complete Test Scenario

Follow this exact sequence to test:

```
1. Backend running ✓
2. Frontend running ✓
3. Browser at http://localhost:5173 ✓
4. localStorage cleared ✓
5. Not logged in ✓
        ↓
6. Click "LoginLink" (if on home) or go to /login
7. Enter admin@example.com / password
8. Click "Login"
9. See success message
10. Redirected to /dashboard ✓
        ↓
11. Click "Projects" in sidebar
12. At /projects page ✓
        ↓
13. Click "New Project" button
14. Navigate to /projects/create ✓
        ↓
15. Form loads with:
    - Project Name input ✓
    - Description textarea ✓
    - Client Organization dropdown (populated) ✓
    - Executing Lab dropdown (populated) ✓
    - Workflow dropdown ✓
    - Status dropdown ✓
        ↓
16. Fill in form:
    - Name: "Test Project 123"
    - Description: "Testing the new create page"
    - Client: "TechLab Solutions"
    - Lab: "Internal Lab"
    - Workflow: "Trial-first"
    - Status: "Planning"
        ↓
17. Click "Create Project"
18. See success toast ✓
19. Redirected to /projects/{projectId} ✓
20. Project detail page loads ✓
        ↓
✅ ALL WORKING!
```

---

## If Test Passes

Great! The 401 errors are fixed. The issue was:
1. Missing route in App.tsx ✓ Fixed
2. No token validation ✓ Fixed
3. Poor error messages ✓ Fixed

---

## If Test Still Fails

Run the debug script:
```bash
# From backend directory:
npx ts-node debug-auth.ts

# Or with admin token:
ADMIN_TOKEN="your-token-here" npx ts-node debug-auth.ts
```

This will tell you:
- Is API running?
- Are endpoints accessible?
- Do endpoints require auth?
- Is JWT secret correct?

---

## Files Modified

1. ✅ `src/App.tsx` - Added CreateProjectPage import and route
2. ✅ `src/components/CreateProjectPage.tsx` - Added token validation and better errors
3. ✅ `src/lib/axiosConfig.ts` - Added debug logging
4. ✅ Documentation files created

---

## Quick Reference

**If getting 401:**
1. First → Check if user is logged in (`localStorage.getItem('authToken')`)
2. Then → Check Network tab for Authorization header
3. Then → Check backend logs for why token is invalid
4. Finally → Try fresh login

**If getting 404:**
→ Restart frontend server after code changes

**If form won't load organizations:**
→ Check browser console for error message

**If form submits but nothing happens:**
→ Check Network tab for POST request response

---

## Support

If still having issues, provide:
1. Backend console output (any errors?)
2. Frontend console output (any errors?)
3. Network tab screenshot (showing failed request)
4. `localStorage.getItem('authToken')` output (first 20 chars)
5. Backend logs from attempted request

Then issue can be diagnosed quickly!
