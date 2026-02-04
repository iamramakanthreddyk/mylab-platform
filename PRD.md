# Planning Guide

An enterprise-grade database schema explorer for the MyLab Platform - a comprehensive PostgreSQL schema visualization tool showcasing 25 interconnected tables across 9 functional categories including Core Identity, Project Management, Sample Lifecycle, Analysis, Documents, Access Control, Audit & Compliance, Communication, and Design of Experiments.

**Experience Qualities**:
1. **Enterprise** - Professional, authoritative interface that conveys production-ready database architecture for complex multi-tenant laboratory management systems
2. **Organized** - Clear categorization and filtering that helps database architects, developers, and stakeholders navigate the schema structure efficiently
3. **Comprehensive** - Complete visibility into all entities, relationships, foreign keys, and data types with detailed descriptions and metadata

**Complexity Level**: Light Application (multiple features with basic state)
This is an interactive documentation and visualization tool with search, category filtering, relationship highlighting, and detail views but doesn't require backend integration or complex state management beyond UI interactions.

## Essential Features

**Entity Table Display**
- Functionality: Presents all 25 database entities as card-based tables showing fields with types, primary/foreign keys, category badges, and descriptions
- Purpose: Provides immediate overview of complete MyLab Platform schema structure and entity attributes
- Trigger: Page load
- Progression: Page loads → All entities render as categorized cards → User scans available tables and their purposes
- Success criteria: All 25 entities visible with complete field information, proper category tags, and formatted data types

**Category-Based Filtering**
- Functionality: Filter entities by functional category (Core Identity, Project Management, Sample Lifecycle, Analysis, Documents, Access Control, Audit & Compliance, Communication, DOE)
- Purpose: Helps users focus on specific functional areas of the schema without information overload
- Trigger: Click category badge
- Progression: User clicks category → Grid updates to show only matching entities → Badge highlights active category → Click 'All' to reset
- Success criteria: Smooth filtering, accurate counts per category, clear visual feedback on active category

**Relationship Visualization**
- Functionality: Shows connections between entities with cardinality indicators and relationship labels
- Purpose: Helps users understand how data flows through the system and entity dependencies
- Trigger: Hover over entity card or select entity
- Progression: User hovers/selects entity → Connected relationships highlight → Related entities glow → Details show in panel → User moves away → Returns to normal
- Success criteria: All 54+ relationships visible with correct cardinality, highlighting works smoothly, relationship details accessible

**Entity Search & Filter**
- Functionality: Real-time search to find entities by name, field name, or description
- Purpose: Quick navigation in complex schema with 25 tables and 200+ fields
- Trigger: User types in search field
- Progression: User focuses search → Types query → Matching entities remain → Non-matches fade → Clear search → All visible again
- Success criteria: Search responds instantly (<100ms), highlighting is clear, supports partial matching on multiple attributes

**Relationship Explorer Tab**
- Functionality: Dedicated view showing all relationships as structured list with source, target, type, and labels
- Purpose: Provides alternative view for understanding data flow and foreign key relationships
- Trigger: Click "Relationships" tab
- Progression: User clicks tab → All relationships listed → Shows from/to entities → Displays relationship type → User can click entities to navigate
- Success criteria: All relationships listed with complete metadata, clickable entity names, clear visual hierarchy

## Edge Case Handling

- **Empty Search Results**: Show "No entities found" message with current category context and suggestion to clear filters or switch categories
- **Empty Category**: When filtering by category shows no results (shouldn't happen with valid data), show helpful message
- **Mobile Viewport**: Category badges wrap to multiple rows, cards stack vertically, relationship panel becomes bottom sheet
- **Long Field Names**: Truncate with ellipsis and show full name on hover tooltip
- **Long Descriptions**: Line clamp to 2 lines in card view, show full description on entity selection
- **Self-Referential Relationships**: DerivedSamples parent_id and similar relationships shown with special "self" indicator
- **Multiple Foreign Keys to Same Table**: Organizations → Projects has both client_org_id and executing_org_id, shown as separate relationship entries
- **Nullable Foreign Keys**: Indicated with "(optional)" label in relationship view

## Design Direction

The design should evoke enterprise database authority, laboratory precision, and professional documentation quality. Think enterprise database IDE meets modern technical documentation - the interface should feel like premium database management and schema design software used by senior architects and CTOs. The aesthetic should balance information density with clarity, using subtle depth cues, consistent spacing, and professional typography to distinguish between entity categories, relationship types, and field metadata.

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
