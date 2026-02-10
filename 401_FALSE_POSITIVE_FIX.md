# Fix: 401 "Session Expired" False Positives

## Problem
Users were getting "Your session has expired. Please log in again" error even when their session was still valid. This was frustrating because:
- Token was valid in localStorage
- User was still logged in
- Error occurred unexpectedly

## Root Cause
The app was treating **all 401 responses** as "session expired", but a 401 can mean many things:
1. Token is invalid/expired ✓ (should show "session expired")
2. Token not provided ✓ (should show "session expired")  
3. Backend validation error ✗ (should show specific error message)
4. Permissions issue ✗ (should show "permission denied")
5. Other 401 errors ✗ (should be handled differently)

## Solution
Updated error handling to distinguish between authorization failures:

### Changes Made

#### 1. Axios Interceptor (`src/lib/axiosConfig.ts`)
**Before:** Automatically cleared token on ANY 401
**After:** Only clears token if server explicitly says token is "invalid", "expired", or "malformed"

```typescript
if (error.response?.status === 401) {
  const serverError = error.response?.data?.error || ''
  const isInvalid Token =
    serverError.toLowerCase().includes('invalid token') ||
    serverError.toLowerCase().includes('expired') ||
    serverError.toLowerCase().includes('malformed')
  
  if (isInvalidToken) {
    // Actually clear the token
    localStorage.removeItem('authToken')
  }
  // Otherwise, leave the token alone - let the component decide
}
```

#### 2. CreateProjectPage (`src/components/CreateProjectPage.tsx`)

**Organization Loading:**
```typescript
if (error.response?.status === 401) {
  const serverError = error.response?.data?.error || ''
  const isTokenError = 
    serverError.toLowerCase().includes('invalid') ||
    serverError.toLowerCase().includes('expired')
  
  if (isTokenError) {
    // Real token problem
    toast.error('Your session has expired. Please log in again.')
  } else {
    // Might not be a token issue
    const hasToken = !!localStorage.getItem('authToken')
    if (hasToken) {
      // User has token, probably a backend issue
      toast.error('Unable to load organizations. Please try refreshing.')
    } else {
      // No token at all
      toast.error('Session ended. Please log in again.')
    }
  }
}
```

**Project Creation:**
```typescript
if (error.response?.status === 401) {
  const serverError = error.response?.data?.error || ''
  const isTokenError = serverError.toLowerCase().includes('invalid') || ...
  const hasToken = !!localStorage.getItem('authToken')
  
  if (isTokenError || !hasToken) {
    // Real session problem
    errorMessage = 'Your session has expired. Please log in again.'
    navigate('/login')
  } else {
    // Probably not a session issue
    errorMessage = 'Authentication check failed. Please try again.'
  }
}
```

## Behavior After Fix

### Scenario 1: Token Expired
```
User action → 401: "invalid token"
Response → "Your session has expired" + Redirect to login ✅
localStorage cleared ✅
```

### Scenario 2: Backend Validation Error (returns 401)
```
User action → 401: "User not found" or other validation error
Response → "Authentication check failed. Please try again" ⚠️
localStorage NOT cleared ✅
User stays logged in ✅
Can retry
```

### Scenario 3: No Token Provided
```
User action → 401: "Missing auth header"
Response → "Session ended. Please log in again" ✅
localStorage cleared ✅
```

### Scenario 4: Valid Token, Permissions Denied
```
User action → 401: "Permission denied"
Response → "Authentication check failed..." ✅
Token stays valid ✅
User can try different action
```

## Testing the Fix

### Test 1: Verify Normal Login Works
1. Clear storage: `localStorage.clear()`
2. Log in
3. Create a project
4. Should work normally ✅

### Test 2: Verify Session Cleanup on Real Expiration
1. Log in
2. Wait for token to expire (or manually edit token to be invalid)
3. Try to create a project
4. Should show "session expired" and redirect to login ✅

### Test 3: Verify Non-Token 401s Don't Clear Session
1. Set up a scenario where backend returns 401 for non-token reason
2. Try the action
3. Check localStorage: `localStorage.getItem('authToken')` should still exist ✅
4. User should still be considered logged in ✅

## Browser Console Debugging

When you see a 401 error, check the console for details:

```javascript
// In browser DevTools console:
localStorage.getItem('authToken')  // Should show token if user logged in

// Check axios logs (development mode):
// Should see messages like:
// "[axios] Added auth header to GET /api/organizations"
// "[axios] Got 401 response: {url, method, message}"
```

## Backend Recommendations

When returning 401 errors, be specific in the message:

### Good Error Messages
```json
{
  "error": "Invalid token",
  "details": "Token has expired. Please log in again."
}
```

```json
{
  "error": "Malformed JWT",
  "details": "Token format is invalid"
}
```

### Bad Error Messages
```json
{
  "error": "Unauthorized"  // Too vague!
}
```

## Files Changed

1. `src/lib/axiosConfig.ts` - Updated interceptor logic
2. `src/components/CreateProjectPage.tsx` - Updated error handling for fetchOrganizations and handleSubmit

## Migration

No database migration needed. This is purely a frontend change to improve error handling.

## Related Issues

- GitHub #401 (if tracking)
- Slack thread about "random session expired errors"

## Error Messages Guide

| Scenario | Old Message | New Message | Action |
|----------|-------------|-------------|--------|
| Token expired | "Your session has expired" | Same | Redirect to login |
| No token | "Your session has expired" | "Session ended" | Redirect to login |
| Backend 401 error | "Your session has expired" | "Auth check failed" | Retry or contact support |
| Valid token, permission denied | "Your session has expired" | "Auth check failed" | Try different action |

## Tracing a 401 Error

If you still see "session has expired" unexpectedly:

1. **Check token exists:**
   ```javascript
   localStorage.getItem('authToken')  // Should be truthy
   ```

2. **Check server error message:**
   - Open DevTools Network tab
   - Find the failed request
   - Look at Response body
   - Check the `error` field

3. **Check if it's really a token issue:**
   - Should say: "invalid", "expired", or "malformed"
   - If not, it's something else

4. **Report the issue with:**
   - Server error message
   - Network request URL
   - 401 response body
   - Steps to reproduce

## FAQ

**Q: Why would I get 401 if my token is valid?**
A: Backend might be returning 401 for business logic reasons (user deleted, permissions changed, etc.)

**Q: Should I clear the token on 401?**
A: Only if the server explicitly says the token is invalid/expired/malformed.

**Q: What if backend always returns "invalid token" even for permission issues?**
A: Then every 401 will clear the token, which is wrong. Backend should return 403 for permissions instead.

**Q: Can I test this without waiting for real token expiration?**
A: Yes - manually edit localStorage authToken to be invalid, then try an action.
