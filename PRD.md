# Planning Guide

An interactive entity-relationship diagram explorer that visualizes a complex multi-tenant workspace database schema with organizations, projects, samples, batches, and analyses.

**Experience Qualities**:
1. **Professional** - Clean, technical interface that conveys authority and precision for database architects and developers
2. **Exploratory** - Intuitive navigation that encourages discovering relationships and understanding data flow patterns
3. **Informative** - Clear presentation of entity structures, relationships, and cardinalities without overwhelming the user

**Complexity Level**: Light Application (multiple features with basic state)
This is an interactive visualization tool with search, filtering, and detail views but doesn't require multi-page navigation or complex state management beyond UI interactions.

## Essential Features

**Entity Table Display**
- Functionality: Presents all database entities as card-based tables showing fields with types, primary/foreign keys
- Purpose: Provides immediate overview of schema structure and entity attributes
- Trigger: Page load
- Progression: Page loads → All entities render as cards → User scans available tables
- Success criteria: All 13 entities visible with complete field information, properly formatted data types

**Relationship Visualization**
- Functionality: Shows connections between entities with cardinality indicators (one-to-many, optional)
- Purpose: Helps users understand how data flows through the system and entity dependencies
- Trigger: Hover over entity or relationship line
- Progression: User hovers entity → Connected relationships highlight → Tooltip shows relationship details → User moves away → Returns to normal state
- Success criteria: All 23+ relationships visible with correct cardinality, highlighting works smoothly

**Entity Search & Filter**
- Functionality: Real-time search to find entities by name or filter by category
- Purpose: Quick navigation in complex schemas with many tables
- Trigger: User types in search field
- Progression: User focuses search → Types entity name → Matching entities highlight → Non-matches dim → Clear search → All visible again
- Success criteria: Search responds instantly, highlighting is clear, supports partial matching

**Field Detail View**
- Functionality: Click entity to expand and show detailed field information, constraints, and relationships
- Purpose: Deep dive into specific entity structure without cluttering main view
- Trigger: Click on entity card
- Progression: User clicks entity → Card expands/modal opens → Shows full schema details → User reviews → Clicks outside/close → Returns to overview
- Success criteria: All fields, types, constraints visible; smooth expand/collapse animation

**Relationship Path Tracing**
- Functionality: Click relationship line to trace data flow between entities
- Purpose: Understand complex multi-hop relationships like workspace → organizations → projects → samples
- Trigger: Click relationship or select "trace from" entity
- Progression: User selects start entity → Clicks trace mode → Clicks target entity → Path highlights → Shows intermediate tables → User exits mode
- Success criteria: Clear visual path, relationship cardinality shown at each step

## Edge Case Handling

- **Empty Search Results**: Show "No entities found" message with suggestion to clear filters
- **Mobile Viewport**: Switch to vertical list view with collapsible entity cards instead of spatial diagram
- **Long Field Names**: Truncate with ellipsis and show full name on hover
- **Self-Referential Relationships**: DerivedSamples parent_id shown with curved connector to avoid overlap
- **Overlapping Connections**: Use bezier curves and smart routing to minimize line crossings

## Design Direction

The design should evoke technical precision, database authority, and analytical clarity. Think database IDE meets modern SaaS - professional developer tooling with contemporary aesthetics. The interface should feel like premium database management software: structured, information-dense but scannable, with subtle depth cues that distinguish entities from relationships.

## Color Selection

A cool, technical palette that suggests databases, logic, and structured data systems.

- **Primary Color**: Deep slate blue `oklch(0.35 0.08 250)` - Represents database tables and primary actions; conveys technical authority and structure
- **Secondary Colors**: 
  - Steel gray `oklch(0.55 0.02 250)` for secondary UI elements and muted backgrounds
  - Light slate `oklch(0.92 0.01 250)` for card backgrounds and surfaces
- **Accent Color**: Bright cyan `oklch(0.70 0.15 200)` - Highlights active relationships, foreign keys, and interactive elements; suggests data connections
- **Foreground/Background Pairings**:
  - Background (White) `oklch(0.99 0 0)`: Foreground (Deep Slate) `oklch(0.25 0.05 250)` - Ratio 12.8:1 ✓
  - Primary (Deep Slate Blue) `oklch(0.35 0.08 250)`: White text `oklch(0.99 0 0)` - Ratio 8.2:1 ✓
  - Accent (Bright Cyan) `oklch(0.70 0.15 200)`: Dark text `oklch(0.20 0.05 250)` - Ratio 9.1:1 ✓
  - Card (Light Slate) `oklch(0.92 0.01 250)`: Body text `oklch(0.30 0.04 250)` - Ratio 10.5:1 ✓

## Font Selection

Technical precision with excellent code readability - monospace for data types, clean sans-serif for labels and descriptions.

- **Typographic Hierarchy**:
  - H1 (Page Title): Space Grotesk Bold/32px/tight tracking - Strong technical presence
  - H2 (Entity Names): Space Grotesk Semibold/18px/normal - Clear table headers
  - H3 (Section Headers): Space Grotesk Medium/14px/wide tracking - Category labels
  - Body (Field Names): Inter Medium/13px/normal - Readable attribute labels
  - Code (Data Types): JetBrains Mono Regular/12px/normal - Monospace for ENUM, UUID, VARCHAR
  - Small (Metadata): Inter Regular/11px/normal - Timestamps, secondary info

## Animations

Animations should feel precise and database-like - snappy state changes with subtle connection pulses.

- **Relationship Highlighting**: 200ms ease-out color transition when hovering entities, with gentle pulse on connected lines
- **Card Expansion**: 300ms spring animation (slight bounce) when expanding entity details
- **Search Filter**: 150ms fade on non-matching entities, stagger by 20ms for cascade effect
- **Path Tracing**: 500ms animated stroke-dashoffset along relationship lines showing data flow direction
- **Hover States**: 100ms scale(1.02) on entity cards with subtle shadow increase

## Component Selection

- **Components**:
  - Card: Entity containers with header (table name) and body (fields list)
  - Badge: Data type indicators (UUID, VARCHAR, ENUM, etc.) with color coding
  - Input: Search field with clear button and search icon
  - Separator: Visual breaks between field groups (PK, FK, regular fields)
  - Tooltip: Relationship details and full field information on hover
  - Tabs: Switch between "Diagram View", "List View", and "Dependencies" views
  - ScrollArea: Smooth scrolling for entity detail panels
  - Popover: Detailed entity information without losing context
  - Command: Quick entity search with keyboard navigation (Cmd+K style)

- **Customizations**:
  - Custom SVG relationship connectors with cardinality symbols (crow's foot notation)
  - Interactive canvas/SVG for draggable entity positioning
  - Custom Badge variants for PK (gold), FK (cyan), Regular (gray)
  - Animated connection lines using framer-motion path drawing

- **States**:
  - Entity Cards: Default (white bg) → Hover (shadow+lift) → Active/Selected (border highlight) → Connected (accent glow)
  - Relationship Lines: Default (gray) → Hover (accent color) → Active trace (animated gradient)
  - Search Input: Empty → Typing (accent border) → Has results → No results (muted state)
  - Badges: Static with hover showing full type definition in tooltip

- **Icon Selection**:
  - Database (database icon) for main title
  - MagnifyingGlass for search
  - Key for primary/foreign key indicators
  - ArrowRight for one-to-many relationships
  - Circle (dot) for optional relationships
  - Graph for relationship tracing mode
  - X for clearing search
  - Info for entity details

- **Spacing**:
  - Entity card padding: p-4
  - Grid gap between cards: gap-6
  - Field list spacing: space-y-2
  - Section margins: mb-6
  - Inline badge gaps: gap-1.5
  - Container padding: p-6 (desktop), p-4 (mobile)

- **Mobile**:
  - Switch from spatial diagram to vertical list at 768px
  - Collapsible entity cards showing just name + field count
  - Bottom sheet for entity details instead of popover
  - Stacked relationship view showing connected entities as a linear flow
  - Floating action button for search instead of persistent header
