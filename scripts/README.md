# MyLab Development Tooling

This directory contains development scripts and tooling for the MyLab Platform project, accessible via the `mylab.ps1` command-line interface.

## Quick Start

```powershell
# Show all available commands
.\mylab.ps1 help

# Update AI context after making changes
.\mylab.ps1 ai:update

# Generate database schema snapshot
.\mylab.ps1 db:snapshot

# Validate everything
.\mylab.ps1 validate:all

# Run tests
.\mylab.ps1 test
```

## Command Categories

### AI Context Management
- `ai:update` - Interactive update assistant (detects changes, shows checklist)
- `ai:view` - Open AI_CONTEXT.md in editor
- `ai:context` - Generate AI context bundle for analysis

### Database Operations
- `db:snapshot` - Generate current schema snapshot
- `db:migrate` - Run pending migrations
- `db:setup` - Initial database setup
- `db:reset` - Reset database (with confirmation)

### Validation
- `validate:types` - Check TypeScript types (backend + frontend)
- `validate:api` - Validate OpenAPI specification
- `validate:all` - Run all validations + tests

### Testing
- `test` - Run all tests
- `test:integration` - Integration tests only
- `test:e2e` - End-to-end tests only
- `test:coverage` - Tests with coverage report

### Development
- `dev` - Start both backend and frontend dev servers
- `build` - Build production bundles
- `status` - Show project status overview

## Installation

The MyLab tooling is ready to use - just call `.\mylab.ps1` from the project root.

For convenience, you can create an alias:

```powershell
# Add to your PowerShell profile
Set-Alias mylab "C:\path\to\mylab-platform\mylab.ps1"

# Or use relative path from project root
Set-Alias mylab "$PWD\mylab.ps1"

# Then simply use:
mylab status
mylab ai:update
```

## Workflow Examples

### After Database Schema Changes
```powershell
.\mylab.ps1 db:snapshot      # Generate updated snapshot
.\mylab.ps1 ai:update        # Update AI context
.\mylab.ps1 validate:types   # Verify types
.\mylab.ps1 test            # Run tests
```

### After API Changes
```powershell
.\mylab.ps1 ai:update        # Update AI context
.\mylab.ps1 validate:api     # Validate OpenAPI spec
.\mylab.ps1 test:integration # Test API endpoints
```

### Daily Development
```powershell
.\mylab.ps1 dev             # Start servers
.\mylab.ps1 status          # Check project status
```

### Before Committing
```powershell
.\mylab.ps1 validate:all    # Full validation
.\mylab.ps1 ai:update       # Update AI context
```

## System Requirements

- PowerShell 7+ (recommended)
- Node.js & npm
- Git

## Related Documentation

- [AI_CONTEXT.md](../AI_CONTEXT.md) - AI knowledge base
- [DEVELOPER_WORKFLOW.md](../DEVELOPER_WORKFLOW.md) - Development workflows
- [AI_CONTEXT_README.md](../AI_CONTEXT_README.md) - Quick start guide
