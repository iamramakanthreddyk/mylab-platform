# Planning Guide

MyLab Platform - An enterprise laboratory information management system (LIMS) for managing projects, samples, analyses, and cross-organizational collaboration with built-in schema documentation for administrators and developers.

**Experience Qualities**:
1. **Professional** - Enterprise-grade laboratory management interface that instills confidence in scientists, project managers, and laboratory administrators
2. **Secure** - Role-based access control with clear user authentication, workspace isolation, and admin-only access to sensitive features like schema exploration
3. **Intuitive** - Streamlined workflows for common laboratory tasks like creating projects, managing samples, tracking analyses, and reviewing results

**Complexity Level**: Complex Application (advanced functionality with multiple views, authentication, and role-based access)
This is a full-featured LIMS platform with user authentication, role-based permissions, multi-view navigation, persistent data storage, and an admin-only schema visualization tool for developers and database administrators.

## Essential Features

**User Authentication & Session Management**
- Functionality: Login system using GitHub user info from spark.user() API to authenticate and assign roles (Admin, Manager, Scientist, Viewer)
- Purpose: Secure access control and personalized experience with role-based permissions
- Trigger: App load when no session exists
- Progression: App loads → Check for session → If none, show login → User authenticates → Role assigned → Redirect to dashboard
- Success criteria: Persistent login using useKV, role assignment works, appropriate views shown per role

**Project Dashboard**
- Functionality: Overview of active projects with status, sample counts, recent activity, and quick actions
- Purpose: Central hub for scientists and managers to monitor ongoing laboratory work
- Trigger: User logs in or clicks "Projects" in navigation
- Progression: Dashboard loads → Projects fetched from storage → Cards display with stats → User can filter/sort → Click project to view details
- Success criteria: All projects visible, accurate counts, smooth filtering, responsive layout

**Project Management**
- Functionality: Create, view, edit projects with client organization, executing organization, stages, and linked samples
- Purpose: Organize laboratory work into structured initiatives with multi-stakeholder collaboration
- Trigger: Click "New Project" button or select existing project
- Progression: Click new project → Form appears → Fill name, description, orgs → Save → Project created → Redirects to project view
- Success criteria: Form validation works, project persists, can add/edit stages, link samples

**Sample Tracking**
- Functionality: Register original samples and derived samples with lineage tracking, metadata, status updates
- Purpose: Maintain chain of custody and sample provenance throughout laboratory workflows
- Trigger: Navigate to Samples or click "Add Sample" in project view
- Progression: User creates sample → Links to project → Sets metadata → Sample saved → Can create derived samples → Lineage tree visible
- Success criteria: Sample creation works, lineage displays correctly, metadata searchable, status updates persist

**Admin Schema Explorer (Role-Restricted)**
- Functionality: Complete database schema visualization accessible only to Admin and Manager roles (reuses existing schema viewer)
- Purpose: Provides technical users and developers with schema documentation while keeping it hidden from regular users
- Trigger: Admin/Manager user clicks "Schema" in navigation (hidden from others)
- Progression: Admin clicks Schema → Full schema explorer loads → Browse entities → View relationships → Export documentation
- Success criteria: Only visible to admins/managers, all schema features work, can be toggled on/off

## Edge Case Handling

- **No Active Session**: Show login screen with role selection for demo purposes
- **Empty Projects List**: Dashboard and projects view show helpful empty states with call-to-action to create first project
- **No Samples**: Empty state in samples view encouraging registration
- **Unauthorized Schema Access**: Schema tab only visible to Admin and Manager roles; hidden from Scientists and Viewers
- **Search with No Results**: Clear messaging in all views with suggestion to adjust filters
- **Role Changes**: User can log out and log back in with different role to explore different permission levels
- **Mobile Viewport**: Navigation collapses, cards stack vertically, dialogs take full width
- **Long Project Names**: Text truncates with ellipsis, full text visible on hover
- **First-Time Users**: Seed data automatically loads with sample projects and samples for immediate exploration

## Design Direction

The design should evoke enterprise software authority, laboratory precision, and professional quality. Think modern LIMS (Laboratory Information Management System) meets polished SaaS product - the interface should feel like premium software used by scientists, project managers, and laboratory administrators. The aesthetic balances data density with clarity, using subtle depth cues, consistent spacing, and professional typography suitable for technical users while remaining approachable.

## Color Selection

A cool, technical palette that suggests scientific precision, databases, and structured systems.

- **Primary Color**: Deep slate blue `oklch(0.35 0.08 250)` - Represents authority, database tables, and primary actions; conveys technical professionalism
- **Secondary Colors**: 
  - Steel gray `oklch(0.55 0.02 250)` for secondary UI elements and de-emphasized actions
  - Light slate `oklch(0.92 0.01 250)` for card backgrounds and surfaces
- **Accent Color**: Bright cyan `oklch(0.70 0.15 200)` - Highlights active states, important metrics, and interactive elements; suggests scientific analysis and data connections
- **Foreground/Background Pairings**:
  - Background (White) `oklch(0.99 0 0)`: Foreground (Deep Slate) `oklch(0.25 0.05 250)` - Ratio 12.8:1 ✓
  - Primary (Deep Slate Blue) `oklch(0.35 0.08 250)`: White text `oklch(0.99 0 0)` - Ratio 8.2:1 ✓
  - Accent (Bright Cyan) `oklch(0.70 0.15 200)`: Dark text `oklch(0.20 0.05 250)` - Ratio 9.1:1 ✓
  - Card (Light Slate) `oklch(0.92 0.01 250)`: Body text `oklch(0.30 0.04 250)` - Ratio 10.5:1 ✓

## Font Selection

Technical precision with excellent readability - professional sans-serif for UI, monospace for identifiers and data types.

- **Typographic Hierarchy**:
  - H1 (App Title): Space Grotesk Bold/24px/tight tracking - Strong brand presence in navigation
  - H2 (Page Titles): Space Grotesk Bold/32px/tight tracking - Clear page headers
  - H3 (Card Titles): Space Grotesk Semibold/18px/normal - Project names, section headers
  - Body (Labels & Text): Inter Medium/14px/normal - Readable UI labels and descriptions
  - Code (Sample IDs): JetBrains Mono Regular/14px/normal - Sample identifiers, technical codes
  - Small (Metadata): Inter Regular/12px/normal - Timestamps, secondary information

## Animations

Animations should feel responsive and professional - quick state changes with purposeful motion.

- **Page Transitions**: Instant view switching with content fade-in (no slides or complex transitions)
- **Card Hover**: 100ms scale(1.02) on project/sample cards with subtle shadow increase
- **Button States**: 150ms color transition for all interactive elements
- **Dialog Open**: 200ms fade-in with subtle scale for modals and forms
- **Stats Counter**: Staggered fade-in (100ms delay between each) for dashboard metrics on mount
- **Login Screen**: 500ms fade-in from bottom with subtle bounce on mount

## Component Selection

- **Components**:
  - Card: Project cards, sample cards, stat cards, entity cards (schema view)
  - Button: Primary actions (create project, register sample), navigation tabs, role selector
  - Dialog: Project creation form, sample registration forms
  - Input: Search bars, text inputs in forms
  - Textarea: Multi-line descriptions in project forms
  - Select: Dropdowns for organizations, status, roles
  - Badge: Status indicators (Active, Planning, In Progress), role tags, data type tags
  - Dropdown Menu: User profile menu with logout
  - Tabs: Schema explorer view switching (Grid/Relationships)
  - Separator: Visual breaks in forms and entity cards
  - Toast (Sonner): Success/error notifications for actions

- **Customizations**:
  - Custom empty states with icons and call-to-action buttons
  - Role-based navigation visibility (Schema tab conditional)
  - Stat cards with icon backgrounds and color-coded metrics
  - Project/sample cards with hover states and clickable areas

- **States**:
  - Navigation: Active tab highlighted with default variant, others use ghost
  - Project Cards: Default → Hover (shadow) → Click (navigate to details in future)
  - Status Badges: Color-coded (Active=primary, Planning=secondary, etc.)
  - Buttons: Disabled state for forms without required fields
  - Login: Loading state during sign-in transition

- **Icon Selection**:
  - Flask: Laboratory/platform branding, samples
  - FolderOpen: Projects
  - Database: Schema explorer
  - ChartLine: Analytics, analyses
  - Users: Collaborators, organizations
  - User: Profile menu
  - SignOut: Logout action
  - Plus: Create actions
  - MagnifyingGlass: Search
  - Calendar: Timestamps
  - ArrowRight: Navigation hints

- **Spacing**:
  - Page container padding: px-6 py-8
  - Card grid gap: gap-6
  - Section margins: mb-6, mb-8
  - Form field spacing: space-y-4
  - Navigation padding: px-6 py-4
  - Button padding: px-4 (standard), h-10/h-12 for heights

- **Mobile**:
  - Single column grid for all card layouts at <768px
  - Navigation user name hidden on small screens, shows only icon
  - Dialogs take full width on mobile with appropriate padding
  - Stats grid collapses to 2 columns on tablet, 1 column on phone
  - Dashboard quick actions stack vertically
