# AI Context System - Quick Start

## 📚 What is This?

An automated system to keep AI assistants aware of your database, API contracts, and frontend expectations - so they always have accurate, up-to-date context when helping you code.

## 🎯 Key Files

| File | Purpose |
|------|---------|
| **[AI_CONTEXT.md](AI_CONTEXT.md)** | Central AI knowledge base - read this first! |
| **[AI_WORKFLOW.md](AI_WORKFLOW.md)** | Guardrails for AI assistants |
| **[DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md)** | Quick workflows for developers |
| **[API_FRONTEND_CONTRACT_SYNC.md](API_FRONTEND_CONTRACT_SYNC.md)** | Detailed contract sync patterns |
| **[mylab.ps1](mylab.ps1)** | MyLab development tooling (command center) |

## ⚡ Quick Commands

```powershell
# Check if AI context needs updating
.\mylab.ps1 ai:update

# Generate database schema snapshot
.\mylab.ps1 db:snapshot

# Validate all contracts
.\mylab.ps1 validate:all

# Run tests
.\mylab.ps1 test

# Show all commands
.\mylab.ps1 help
```

## 📋 Common Workflows

### When changing database schema:
```powershell
# Update schema → Create migration → Run migration
.\mylab.ps1 db:snapshot      # Generate snapshot
.\mylab.ps1 ai:update        # Update AI context
.\mylab.ps1 validate:types   # Verify types
```

### When adding API endpoint:
```powershell
# Update openapi-spec.yaml → Add backend → Add frontend
.\mylab.ps1 ai:update        # Update AI context
.\mylab.ps1 validate:api     # Validate spec
.\mylab.ps1 test:integration # Test endpoints
```

### When changing frontend types:
```powershell
# Update types.ts → Update transformers → Update components
.\mylab.ps1 ai:update        # Update AI context
.\mylab.ps1 validate:types   # Verify types
```

### Before committing:
```powershell
.\mylab.ps1 validate:all     # Full validation
.\mylab.ps1 ai:update        # Update AI context
```

## 🔍 For AI Assistants

- [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) - Detailed workflows
- [API_FRONTEND_CONTRACT_SYNC.md](API_FRONTEND_CONTRACT_SYNC.md) - Synchronization patterns
- [scripts/README.md](scripts/README.md) - MyLab tooling reference

## 🚀 MyLab Tooling

All AI context and development commands are integrated into the MyLab command system:

```powershell
.\mylab.ps1 help            # Show all commands

# AI Context
.\mylab.ps1 ai:update       # Update AI context
.\mylab.ps1 ai:view         # View current context
.\mylab.ps1 ai:context      # Generate context bundle

# Database
.\mylab.ps1 db:snapshot     # Schema snapshot
.\mylab.ps1 db:migrate      # Run migrations
.\mylab.ps1 db:setup        # Setup database

# Validation
.\mylab.ps1 validate:all    # Full validation
.\mylab.ps1 validate:types  # Type checking
.\mylab.ps1 validate:api    # API validation

# Testing
.\mylab.ps1 test            # All tests
.\mylab.ps1 test:integration
.\mylab.ps1 test:e2e

# Development
.\mylab.ps1 dev             # Start dev servers
.\mylab.ps1 build           # Build project
.\mylab.ps1 status          # Project status
```

### Create Alias (Optional)

```powershell
# Add to your PowerShell profile for short 'mylab' command
Set-Alias mylab "$PWD\mylab.ps1"

# Then use:
mylab status
mylab ai:update
mylab test
```

---

**Status:** ✅ Active  
**Last Updated:** February 10, 2026  
**Version:** 1.0

## 📖 Full Documentation

See [DEVELOPER_WORKFLOW.md](DEVELOPER_WORKFLOW.md) for detailed workflows and [API_FRONTEND_CONTRACT_SYNC.md](API_FRONTEND_CONTRACT_SYNC.md) for synchronization patterns.

---

**Status:** ✅ Active  
**Last Updated:** February 10, 2026
