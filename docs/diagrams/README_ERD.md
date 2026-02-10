# MyLab Platform Database ERD

## Overview

Note: Legacy "workspace" naming in diagrams refers to the Organization tenant. The column name `workspace_id` is retained for compatibility.

This Entity Relationship Diagram (ERD) represents the complete database schema for the MyLab Platform, a comprehensive laboratory management and collaboration system.

## Database Structure

The database is organized around several key domains:

### 🏢 Core Entities
- **Organizations**: The primary tenant unit containing users, projects, and data
- **External Organizations**: Clients, CROs, vendors that collaborate on projects
- **Users**: Platform users belonging to organizations with role-based permissions

### 🧪 Laboratory Management
- **Projects**: Research projects containing samples and experiments
- **Samples**: Laboratory samples with full traceability
- **DerivedSamples**: Processed/modified samples from original samples
- **Batches**: Collections of derived samples for analysis
- **Analyses**: Test results and analytical data

### 📊 Business & Subscription
- **Plans**: Subscription tiers with feature limits
- **Subscriptions**: Organization billing and feature access
- **Features**: Individual platform capabilities
- **UsageMetrics**: Tracking of platform utilization

### 🔐 Security & Access
- **AccessGrants**: Permission management for data sharing
- **APIKeys**: Programmatic access credentials
- **AuditLog**: Complete audit trail of all actions
- **SecurityLog**: Security-related events

### 💰 Onboarding & Payments
- **CompanyOnboardingRequests**: New organization registration
- **CompanyPayments**: Payment processing and tracking
- **CompanyInvitations**: Invitation management for new users

### 📢 Communication
- **Notifications**: In-app notification system
- **NotificationPreferences**: User notification settings

## Key Relationships

### Organization Hierarchy
```
Organization (1) ──── (M) Users
    │
    ├── (M) Projects
    ├── (M) Samples
    ├── (M) Batches
    ├── (M) Analyses
    └── (1) Subscription
```

### Sample Processing Flow
```
Project ─── (M) Samples ─── (M) DerivedSamples ─── (M) BatchItems ─── (1) Batch ─── (M) Analyses
```

### Organization Collaboration
```
Organizations ─── (M) Projects (as client or executor)
    │
    ├── (M) AccessGrants
    └── (M) APIKeys
```

## Usage

### Viewing the Diagram
1. Open `docs/diagrams/database_erd.mmd` in VS Code
2. Use the Mermaid Preview extension to visualize the diagram
3. Or use any Mermaid-compatible viewer

### Understanding Cardinality
- `||--||`: One-to-one relationship
- `||--o{`: One-to-many relationship (one required)
- `}|--o{`: One-to-many relationship (one optional)
- `}o--o{`: Many-to-many relationship

### Database Schema Files
- `backend/src/database/setup.ts`: Table creation SQL
- `backend/src/database/schemas.ts`: Schema definitions and validation
- `backend/src/database/types.ts`: TypeScript type definitions

## Maintenance

When making database changes:
1. Update `setup.ts` with new tables/columns
2. Update `schemas.ts` with validation rules
3. Update `types.ts` with TypeScript interfaces
4. Update this ERD diagram
5. Run migrations to apply changes

## Last Updated
February 8, 2026 - Complete ERD with all 32 tables and relationships

## Tables Summary

**Total Tables**: 32

**Core Tables**: Organizations, Users
**Lab Tables**: Projects, Trials, TrialParameterTemplates, ProjectStages, Samples, DerivedSamples, Batches, BatchItems, AnalysisTypes, Analyses
**Business Tables**: Plans, Subscriptions, Features, PlanFeatures
**Security Tables**: AccessGrants, DownloadTokens, AuditLog, SecurityLog, APIKeys
**System Tables**: Notifications, NotificationPreferences, UsageMetrics, FeatureUsage, LastLogin, SampleMetadataHistory
**Onboarding Tables**: CompanyOnboardingRequests, CompanyInvitations, CompanyPayments

## Key Features

✅ **Complete Coverage**: All 32 database tables included
✅ **Accurate Relationships**: Based on actual foreign key constraints from setup.ts
✅ **Organized Structure**: Grouped by functional domains
✅ **Clear Cardinality**: Proper one-to-one, one-to-many, and many-to-many relationships
✅ **Descriptive Labels**: Meaningful relationship names for clarity
✅ **Mermaid Format**: Compatible with VS Code Mermaid preview and other viewers</content>
<parameter name="filePath">c:\Users\r.kowdampalli\Documents\MyProjects\mylab-platform\docs\diagrams\README_ERD.md