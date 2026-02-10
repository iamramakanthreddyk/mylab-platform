# Backend: Preventing False 401 Errors

## The Issue
Frontend was treating all 401 responses as "session expired", but 401 has several different meanings. This guide helps backend developers return the correct HTTP status code.

## HTTP Status Codes

### 401 Unauthorized
**Meaning:** "Authentication failed" - The user's credentials/token are invalid

**When to use:**
- Token is missing
- Token is malformed/invalid
- Token is expired
- Token signature doesn't match

**Example:**
```typescript
if (!token) return res.status(401).json({ error: 'Missing authorization header' })
if (!jwt.verify(token)) return res.status(401).json({ error: 'Invalid token' })
if (tokenExpired(token)) return res.status(401).json({ error: 'Token expired' })
```

### 403 Forbidden
**Meaning:** "Authentication succeeded, but authorization failed" - User is logged in but doesn't have permission

**When to use:**
- User doesn't have required role
- User doesn't have access to resource
- User's account is disabled/deactivated
- User doesn't have required subscription tier

**Example:**
```typescript
if (!hasRole(user, 'admin')) {
  return res.status(403).json({ error: 'Admin access required' })
}

if (!canAccessProject(user, projectId)) {
  return res.status(403).json({ error: 'You do not have access to this project' })
}
```

### 400 Bad Request
**Meaning:** "The request is invalid" - Data validation failed

**When to use:**
- Missing required fields
- Invalid field format
- Business logic validation failed

**Example:**
```typescript
if (!name || !executingOrgId) {
  return res.status(400).json({ 
    error: 'Missing required fields',
    details: { name: 'required', executingOrgId: 'required' }
  })
}
```

## Current Backend Code Issues

### ✅ Good Examples

[backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts):
```typescript
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  const JWT_SECRET = process.env.JWT_SECRET
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing or invalid authorization header' 
    })
  }
  
  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    // Token is valid, continue...
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid token'  // ✅ Good - tells frontend it's a token issue
    })
  }
}
```

[backend/src/routes/projects.ts](../backend/src/routes/projects.ts):
```typescript
// ✅ Good - uses 403 for permission issues
if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
  return res.status(403).json({ 
    error: 'Insufficient permissions',
    details: 'Only admins and managers can create projects'
  })
}

// ✅ Good - uses 400 for validation errors
if (!clientOrgId && !externalClientName) {
  return res.status(400).json({
    error: 'Client information required',
    statusCode: 400,
    details: { client: 'At least one client field is required' }
  })
}
```

### ❌ Bad Examples to Avoid

```typescript
// ❌ BAD - Returns 401 for validation error (should be 400)
if (!projectName) {
  return res.status(401).json({ error: 'Project name is required' })
}

// ❌ BAD - Returns 401 for permission issue (should be 403)
if (projectOwnerId !== req.user.id) {
  return res.status(401).json({ error: 'Not authorized to edit this project' })
}

// ❌ BAD - Vague error message (frontend can't tell if token is invalid)
if (tokenError) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

## Error Message Guidelines

### For 401 (Token Issues)
Make it clear that the token itself is the problem:
```json
{
  "error": "Invalid token",
  "details": "Token is malformed or has invalid signature"
}
```

```json
{
  "error": "Token expired",
  "details": "Your authentication token has expired. Please log in again."
}
```

```json
{
  "error": "Invalid authentication header",
  "details": "Authorization header must start with 'Bearer '"
}
```

### For 403 (Permission Issues)
Make it clear the user is logged in but doesn't have access:
```json
{
  "error": "Access denied",
  "details": "You do not have permission to view this project"
}
```

```json
{
  "error": "Insufficient permissions",
  "details": "Admin role is required for this action"
}
```

### For 400 (Validation Issues)
Describe what's wrong with the request:
```json
{
  "error": "Missing required fields",
  "details": {
    "projectName": "Project name is required",
    "executingOrgId": "Lab organization ID is required"
  }
}
```

## Checklist: Audit Your Endpoints

For each endpoint that returns 401:

- [ ] Is the token/authentication actually invalid?
  - **YES** → Keep as 401
  - **NO** → Change to 400 or 403

- [ ] Can you improve the error message?
  - Current: "Unauthorized"
  - Better: "Invalid token" or "Token expired"

- [ ] Is the frontend handling it correctly?
  - Frontend looks for: "invalid", "expired", "malformed" in error message
  - If your message doesn't contain these, frontend won't know it's a token issue

## Real-World Example: Fix a Common Bug

**Current Code (BAD):**
```typescript
router.post('/api/projects', authenticate, async (req, res) => {
  const { name, executingOrgId } = req.body
  
  // This validation runs AFTER authenticate middleware
  // If it fails, we're returning 401 conceptually
  // But the user IS authenticated - they just sent bad data
  
  if (!name) {
    return res.status(401).json({ 
      error: 'Invalid request: missing name'  // ❌ Wrong status code
    })
  }
  
  // ...continue processing
})
```

**Fixed Code (GOOD):**
```typescript
router.post('/api/projects', authenticate, async (req, res) => {
  const { name, executingOrgId } = req.body
  
  // Validation error - the user IS authenticated
  // They just sent bad data
  if (!name) {
    return res.status(400).json({  // ✅ Correct status code
      error: 'Missing required fields',
      details: { name: 'Project name is required' }
    })
  }
  
  // Permission check - still authenticated, but not allowed
  if (req.user.role !== 'admin') {
    return res.status(403).json({  // ✅ Correct status code
      error: 'Insufficient permissions',
      details: 'Only admins can create projects'
    })
  }
  
  // ...continue processing
})
```

## Common Patterns

### Pattern 1: Validate Token (401)
```typescript
const authenticate = async (req, res, next) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })  // ✅ Correct
  }
}
```

### Pattern 2: Validate Permission (403)
```typescript
const requireAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({  // ✅ Correct
      error: 'Insufficient permissions'
    })
  }
  next()
}
```

### Pattern 3: Validate Input (400)
```typescript
if (!name || !email) {
  return res.status(400).json({  // ✅ Correct
    error: 'Missing required fields'
  })
}
```

### Pattern 4: Resource Not Found (404)
```typescript
const org = await getOrganization(orgId)
if (!org) {
  return res.status(404).json({  // ✅ Correct
    error: 'Organization not found'
  })
}
```

## Testing Your Status Codes

### Test with cURL
```bash
# Test 401 - No token
curl -X GET http://localhost:3001/api/projects
# Expect: 401 with "Missing authorization header"

# Test 401 - Invalid token  
curl -X GET http://localhost:3001/api/projects \
  -H "Authorization: Bearer invalid.token.here"
# Expect: 401 with "Invalid token"

# Test 403 - Valid token, bad permissions
curl -X GET http://localhost:3001/api/admin \
  -H "Authorization: Bearer $VALID_TOKEN"
# Expect: 403 with "Access denied" (if user isn't admin)

# Test 400 - Missing data
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $VALID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "no name"}'
# Expect: 400 with "Missing required fields"
```

## Frontend Expectations

The frontend error handler in `src/components/CreateProjectPage.tsx` looks for these keywords:
- "invalid" → Shows "session expired"
- "expired" → Shows "session expired"
- "malformed" → Shows "session expired"

**For all other 401 errors**, the frontend will show: "Authentication check failed. Please try again."

So if you're returning 401 for a business logic error, **don't use those keywords** in your error message.

## Summary

| Status | Meaning | Example |
|--------|---------|---------|
| **401** | Token/auth invalid | "Invalid token", "Token expired" |
| **403** | Auth OK, but no permission | "Access denied", "Admin required" |
| **400** | Request data invalid | "Missing fields", "Invalid format" |
| **404** | Resource not found | "Project not found", "Org not found" |

## Files to Review

- [backend/src/middleware/auth.ts](../backend/src/middleware/auth.ts) - Authentication middleware
- [backend/src/routes/projects.ts](../backend/src/routes/projects.ts) - Project endpoints with proper status codes
- [src/lib/axiosConfig.ts](../src/lib/axiosConfig.ts) - Frontend error handling
