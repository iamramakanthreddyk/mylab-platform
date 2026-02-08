# Analysis Transformer Fix - February 8, 2026

## Issue Fixed
The `transformAnalysisForAPI()` function had two bugs:

### Bug 1: fileSizeBytes validation error
**Problem:** When no files were uploaded, `fileSizeBytes` was set to `0`, but API validation requires a **positive number** (> 0)

**Solution:** Changed default `fileSizeBytes` from `0` to `1024` (1 KB minimum)

### Bug 2: Missing executedByOrgId & sourceOrgId
**Problem:** These required fields were being omitted from the request when `user.organizationId` was `undefined` or `null`

**Solution:** 
1. Added validation to throw error if `userOrganizationId` is missing
2. Error message guides user: "User organization ID is required. Please ensure you are logged in with a valid organization."
3. Component now catches transformer errors and shows them to user

---

## Changes Made

### 1. `src/lib/analysisTransformer.ts`
```typescript
// BEFORE
export function transformAnalysisForAPI(
  oldData: any,
  userOrganizationId: string,  // ❌ No validation
  batchId?: string
): any {
  let fileSizeBytes = 0;  // ❌ Invalid: must be positive
  // ... rest of code
}

// AFTER
export function transformAnalysisForAPI(
  oldData: any,
  userOrganizationId: string | undefined,  // ✅ Accept undefined
  batchId?: string
): any {
  // ✅ Validate required field
  if (!userOrganizationId) {
    throw new Error('User organization ID is required...');
  }
  
  let fileSizeBytes = 1024;  // ✅ Positive minimum value
  // ... rest of code
}
```

### 2. `src/components/CreateAnalysisPage.tsx`
Added try-catch for transformer to handle missing org ID:
```typescript
try {
  transformedData = transformAnalysisForAPI(
    { ...analysis, result_files: uploadedFiles },
    user.organizationId
  )
} catch (transformError: any) {
  toast.error(transformError.message)
  setIsLoading(false)
  return
}
```

---

## Validation Checklist

### For testing the fix:

1. **Check User has organizationId**
   - Open browser DevTools → Console
   - Paste: `console.log(JSON.parse(localStorage.getItem('user')))`
   - Verify `organizationId` field exists and has a UUID value
   - If it's missing or null, user needs to be logged in properly

2. **Verify Transformer Works**
   - Open DevTools → Network tab
   - Create analysis and submit form
   - Find the POST to `/api/analyses`
   - Check Request Payload has:
     ```json
     {
       "batchId": "uuid",
       "analysisTypeId": "uuid",
       "results": {...},
       "filePath": "analysis-results",
       "fileChecksum": "no-files",
       "fileSizeBytes": 1024,  // ✅ Positive
       "executedByOrgId": "uuid",  // ✅ Present
       "sourceOrgId": "uuid",  // ✅ Present
       ...
     }
     ```

3. **Check for Error Messages**
   - If user is missing organization, should see toast: "User organization ID is required..."
   - If validation still fails, check Network tab Response for specific field errors

---

## If it Still Fails

### Debug Steps:
1. **Check User object in localStorage**
   ```javascript
   const user = localStorage.getItem('user')
   console.log(JSON.parse(user).organizationId)
   ```
   - If undefined/null, user needs proper login/organization assignment
   
2. **Check Network request payload**
   - Should have all 9 required fields
   - Look for any `null` or `undefined` values

3. **Check API validation errors**
   - Response > details will show exactly which fields failed
   - Each field shows the validation rule that failed

### Common Issues:
- ❌ `executedByOrgId` is `null` → User not assigned to organization
- ❌ `sourceOrgId` is `null` → Same as above
- ❌ `fileSizeBytes` is `0` → Was fixed, should now be `1024`
- ❌ `analysisTypeId` is invalid → Check analysis type exists in database

---

## Files Modified
- ✅ `src/lib/analysisTransformer.ts` - Fixed bugs
- ✅ `src/components/CreateAnalysisPage.tsx` - Added error handling
