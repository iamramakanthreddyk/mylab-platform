# Create Project Page - User Interface Guide

## Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Projects                                              │
│                                                                 │
│ Create New Project                                              │
│ Set up a new research or testing initiative                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Project Information                                             │
│                                                                 │
│ Define the basic details and organization roles for your      │
│ project                                                         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Project Name *                                              ││
│ │ [e.g., Polymer Stability Study, Flow Chemistry...]         ││
│ │ Give your project a clear, descriptive name                 ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Description                                                  ││
│ │ [Describe the project objectives, scope, and key goals...]  ││
│ │ (textarea, 4 rows)                                          ││
│ │ Optional: Provide context about what this project will       ││
│ │ accomplish                                                   ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌──────────────────────┐ ┌──────────────────────┐             │
│ │ Client Organization *│ │ Executing Lab *      │             │
│ │ [Dropdown]          │ │ [Dropdown]           │             │
│ │ The organization    │ │ The laboratory       │             │
│ │ funding or requesting│ │ performing the       │             │
│ │ the work            │ │ experiments and      │             │
│ │                     │ │ analysis             │             │
│ └──────────────────────┘ └──────────────────────┘             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Project Workflow *                                           ││
│ │ [Dropdown: Trial-first | Analysis-first]                   ││
│ │ Trial-first starts with experiments and then selects       ││
│ │ samples for analysis.                                       ││
│ │ Analysis-first captures samples first, then runs analyses.  ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Initial Status *                                             ││
│ │ [Dropdown: Planning | Active | On Hold]                    ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ─────────────────────────────────────────────────────────────   │
│                                                                 │
│ [Cancel]                            [Create Project →]         │
│ (Navigate back)                      (Submit form)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ What happens next?                                              │
│                                                                 │
│ After creating your project, you'll be able to:                │
│ • Add project stages or trials depending on your workflow      │
│ • Create samples and associate them with the project           │
│ • Assign team members and manage permissions                   │
│ • Track experiments, analyses, and results                     │
│ • Collaborate with other organizations if configured           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Field Descriptions

### 1. Project Name * (Required)
- **Input Type**: Text
- **Placeholder**: "e.g., Polymer Stability Study, Flow Chemistry Optimization"
- **Validation**: Must be non-empty
- **Purpose**: Unique identifier for the research/testing initiative
- **Example**: "Flow Chemistry Optimization for API Synthesis"

### 2. Description (Optional)
- **Input Type**: Textarea (4 rows)
- **Placeholder**: "Describe the project objectives, scope, and key goals..."
- **Validation**: None (optional field)
- **Purpose**: Context about project goals and scope
- **Example**: "Optimize the flow chemistry process for manufacturing the active pharmaceutical ingredient (API). Focus on yield, safety, and scalability."

### 3. Client Organization * (Required)
- **Input Type**: Dropdown Select
- **Options**: All orgs with type = 'Client' or 'Internal'
- **Examples**:
  - "TechLab Solutions"
  - "Acme Pharmaceuticals"
  - "Internal Lab"
- **Purpose**: Who is funding or requesting the work
- **Help Text**: "The organization funding or requesting the work"

### 4. Executing Lab * (Required)
- **Input Type**: Dropdown Select
- **Options**: All orgs with type = 'Laboratory', 'CRO', 'Analyzer', etc.
- **Examples**:
  - "Internal Lab"
  - "Partner Lab"
  - "Flow Chemistry Research Center"
- **Purpose**: Who will perform the experiments
- **Help Text**: "The laboratory performing the experiments and analysis"

### 5. Project Workflow * (Required)
- **Input Type**: Dropdown Select
- **Options**:
  - `trial_first` - "Trial-first (Flow chemistry)"
  - `analysis_first` - "Analysis-first (QC / Routine analysis)"
- **Default**: `trial_first`
- **Purpose**: Determine the project methodology
- **Help Text**: 
  - Trial-first: "starts with experiments and then selects samples for analysis"
  - Analysis-first: "captures samples first, then runs analyses"

### 6. Initial Status * (Required)
- **Input Type**: Dropdown Select
- **Options**:
  - `Planning` - Initial planning phase
  - `Active` - Actively running
  - `On Hold` - Temporarily paused
- **Default**: `Planning`
- **Purpose**: Set initial project status
- **Can be changed**: Yes, later through project edit

---

## Workflow Example

### Scenario: Creating a New Flow Chemistry Study

**User journey**:
1. Click "Projects" in sidebar → Projects page
2. Click "New Project" button (top right)
3. → Navigates to `/projects/create`

**Form filling**:
```
Project Name: "Flow Chemistry Optimization for API Synthesis"

Description: "Optimize the flow chemistry process for manufacturing 
the active pharmaceutical ingredient (API). Focus on yield, safety, 
and scalability. Target timeline: 3 months."

Client Organization: "TechLab Solutions"

Executing Lab: "Internal Lab"

Project Workflow: "Trial-first (Flow chemistry)"
→ "Trial-first starts with experiments and then selects samples 
for analysis."

Initial Status: "Planning"
```

**After submitting**:
```
✅ Success: "Project 'Flow Chemistry Optimization for API Synthesis' 
created successfully"
↓
Auto-redirect to: /projects/{projectId}
↓
User sees: Project Details page
- Can now create trials/stages
- Can add samples
- Can manage team
```

---

## Key Differences from Old Modal

| Aspect | Modal (Old) | Page (New) |
|--------|-----------|----------|
| Component | Dialog/Modal | Full Page |
| Navigation | Stays on Projects page | Navigate to /projects/create |
| Screen space | Limited (popup) | Full page |
| Project Name | ❌ Missing | ✅ Prominent & Required |
| Description | ❌ Missing | ✅ Available |
| Workflow | Cramped | Spacious, clearer |
| Back button | Dialog close | Navigate back to /projects |
| Good for | Quick admin actions | Thorough project setup |

---

## Form Validation

### Client-side
```typescript
// Required fields
- projectName: string (non-empty)
- clientOrgId: string (must select)
- executingOrgId: string (must select)

// Optional fields
- description: string (can be empty)

// Pre-selected
- workflowMode: 'trial_first' (default)
- status: 'Planning' (default)
```

### Error Messages
- "Project name is required"
- "Client organization is required"
- "Executing lab is required"
- (From API if validation fails)

---

## Related Pages

After creating a project, users can:

1. **Project Details Page** (`/projects/{id}`)
   - View full project information
   - Create trials/stages based on workflow
   - Add and manage samples
   - View analysis results

2. **Projects List** (`/projects`)
   - View all projects
   - Search and filter
   - Delete projects
   - Access individual project details

3. **Create Stage Page** (`/projects/{id}/create-stage`)
   - Add analysis stages (if Analysis-first workflow)
   - Define stage parameters

4. **Create Sample/Trial Pages**
   - Add samples to project
   - Create trials for Trial-first workflows

---

## Accessibility Features

- ✅ Form labels with asterisks (*) for required fields
- ✅ Helpful descriptions below each field
- ✅ Clear error messages
- ✅ Disabled state during form submission
- ✅ Back button for easy navigation
- ✅ Toast notifications for user feedback

---

## Developer Notes

### Component Path
`src/components/CreateProjectPage.tsx`

### Props
```typescript
interface CreateProjectPageProps {
  user: User
  onProjectsChange?: (projects: Project[]) => void
}
```

### State Management
- Organizations loaded from `/organizations` endpoint
- Form state in local React state
- Single submission handler

### API Call
```typescript
POST /projects
{
  name: string
  description?: string
  clientOrgId: string
  executingOrgId: string
  workflowMode: 'trial_first' | 'analysis_first'
}
```

### Response Handling
```typescript
{
  success: true,
  data: {
    id: string
    name: string
    organizationId: string
    // ... other fields
  }
}
```
