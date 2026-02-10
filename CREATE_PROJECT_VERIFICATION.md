# Create Project Refactor - Verification Checklist

## ✅ What Was Fixed

- [x] **Project name field is now visible** - Added as first input in the form
- [x] **Project name is required** - Form validates before submission
- [x] **Create Project is now a page** - Navigate to `/projects/create` instead of modal
- [x] **Workspace ID replaced with Organization ID** - All references updated
- [x] **Better form layout** - Full page with descriptions and better spacing
- [x] **Auto-redirect after creation** - Navigate to project detail page
- [x] **Removed modal dependencies** - ProjectsView cleaned up

---

## Testing Checklist

### Frontend UI Tests

- [ ] Navigate to `/projects` page
- [ ] Click "New Project" button
  - Expected: Navigate to `/projects/create` page
  - Not expected: Modal/dialog doesn't appear

- [ ] On Create Project page, verify all fields are visible:
  - [ ] "Project Name" (text input with placeholder)
  - [ ] "Description" (textarea)
  - [ ] "Client Organization" (dropdown)
  - [ ] "Executing Lab" (dropdown)
  - [ ] "Project Workflow" (dropdown)
  - [ ] "Initial Status" (dropdown)

- [ ] Verify descriptions appear under each field
  - [ ] Project Name: "Give your project a clear, descriptive name"
  - [ ] Description: "Optional: Provide context..."
  - [ ] etc.

- [ ] Fill in project form:
  - [ ] Enter project name (e.g., "Test Project")
  - [ ] Select client organization
  - [ ] Select executing lab
  - [ ] Select workflow type
  - [ ] Click "Create Project"

- [ ] Verify success behavior:
  - [ ] Success toast appears: "Project created successfully"
  - [ ] Auto-redirects to `/projects/{projectId}` page
  - [ ] Project detail page shows correct project name

- [ ] Verify back button works:
  - [ ] Click "Back to Projects" button
  - [ ] Navigate back to `/projects` page

### Form Validation Tests

- [ ] Try to submit empty form:
  - [ ] Click "Create Project" without filling name
  - [ ] Error toast appears: "Project name is required"
  - [ ] Form stays open

- [ ] Try without client org:
  - [ ] Fill name only
  - [ ] Click "Create Project"
  - [ ] Error toast appears: "Client organization is required"

- [ ] Try without executing lab:
  - [ ] Fill name and client org
  - [ ] Click "Create Project"
  - [ ] Error toast appears: "Executing lab is required"

### API Integration Tests

- [ ] Verify API endpoint receives correct data:
  - [ ] Should NOT include `workspace_id`
  - [ ] Should include `organizationId` (or map from response)
  - [ ] Field mapping matches API expectations

- [ ] Check API response handling:
  - [ ] Success response redirects correctly
  - [ ] Error response shows error message from API

### Routing Tests

- [ ] Direct URL navigation to `/projects/create` works
- [ ] Breadcrumb/back button navigation works
- [ ] Router correctly maps component to route

### Backward Compatibility Tests

- [ ] Old `workspace_id` references still work (fallbacks):
  - [ ] CreateDerivedSampleDialog: Uses `organizationId || workspace_id`
  - [ ] CreateSamplePage: Uses `organizationId` fallback
  - [ ] No console errors about undefined properties

---

## Code Quality Checks

### File Changes Verification

- [x] Created: `src/components/CreateProjectPage.tsx`
  - [x] Component properly exported
  - [x] All imports correct
  - [x] TypeScript types defined

- [x] Modified: `src/components/ProjectsView.tsx`
  - [x] Removed unused state (newProject, isDialogOpen)
  - [x] Removed organization fetching
  - [x] Removed unused imports (Dialog, Label, Select, Textarea)
  - [x] Button navigates to `/projects/create`

- [x] Modified: `src/lib/config/frontend.ts`
  - [x] Route updated to use CreateProjectPage
  - [x] Component reference updated

- [x] Modified: `backend/src/config/platform.ts`
  - [x] Component definition updated
  - [x] Type changed from 'modal' to 'page'

- [x] Modified: Type definitions
  - [x] Project interface updated with organizationId

- [x] Modified: Component files
  - [x] CreateDerivedSampleDialog
  - [x] CreateSamplePage
  - [x] AdminDashboard

---

## Documentation Verification

- [x] CREATE_PROJECT_REFACTOR_SUMMARY.md created
  - [x] Lists all changes
  - [x] Explains what was fixed
  - [x] Shows file-by-file changes

- [x] CREATE_PROJECT_UI_GUIDE.md created
  - [x] Shows page layout with ASCII diagram
  - [x] Lists all form fields
  - [x] Provides example workflows
  - [x] Documents validation

---

## Known Issues / TODOs

### If tests fail, check:

1. **Form doesn't appear**
   - Check if CreateProjectPage component is exported
   - Check if routing is correct
   - Look for console errors

2. **Organization dropdown is empty**
   - Check if `/organizations` API endpoint exists
   - Check if API returns data in correct format
   - Check network tab in browser dev tools

3. **Form submission fails with API error**
   - Check if `/projects` POST endpoint exists and is correct
   - Check if field names match API expectations
   - Check if authentication token is being sent
   - Look at API response in network tab

4. **Redirect doesn't work after creation**
   - Check if navigate hook is imported correctly
   - Check if `createdProject.id` exists in response
   - Look for console errors in React

5. **Old code still references workspace_id**
   - Search for `workspace_id` in src directory
   - Replace with `organizationId` or add fallback
   - Test backward compatibility

---

## Next Steps After Verification

1. ✅ Complete all UI tests above
2. ✅ Verify API integration works
3. ✅ Test edge cases (missing orgs, network errors, etc.)
4. ✅ Browser dev tools - no console errors
5. ✅ Check network tab - correct API calls
6. ✅ Mobile responsiveness check (if needed)
7. ✅ Delete test projects created during testing

---

## Rollback Plan (If needed)

If you need to rollback these changes:

```bash
# Undo recent commits
git revert HEAD~1 HEAD~2 HEAD~3 ...

# Or restore specific files
git checkout HEAD -- src/components/CreateProjectPage.tsx
git checkout HEAD -- src/components/ProjectsView.tsx
git checkout HEAD -- src/lib/config/frontend.ts
```

---

## Success Criteria

✅ **User can create a project with a visible, required name field**
✅ **Create Project is a full page, not a modal**  
✅ **All organization ID references use organizationId**  
✅ **Form submission works and redirects correctly**  
✅ **No console errors in browser**  
✅ **ProjectsView shows create button instead of inline dialog**

---

## Quick Test Commands

```bash
# Start dev server
npm run dev

# Run tests (if available)
npm test

# Check for TypeScript errors
npx tsc --noEmit

# Check specific file
npx tsc src/components/CreateProjectPage.tsx --noEmit
```

---

## Support

If you encounter any issues:

1. Check the browser console for error messages
2. Look at the network tab for API request/response
3. Check that all file paths are correct
4. Verify the API endpoints exist and respond correctly
5. Check CreateProjectPage component exports properly
