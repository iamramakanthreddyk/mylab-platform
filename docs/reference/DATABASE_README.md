# MyLab Database Setup

This directory contains automated database setup scripts that create all tables, relationships, and initial data based on the central brain configuration.

## Prerequisites

1. **PostgreSQL** installed and running
2. **Database URL** - either as environment variable or command line argument

## Quick Setup

### 1. Create Database
```bash
createdb mylab
# Or using psql:
# psql -U postgres -c "CREATE DATABASE mylab;"
```

### 2. Set Database URL
Update `.env` file with your database connection:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/mylab
```

### 3. Run Setup
```bash
# Install dependencies
npm install

# Setup database (creates all tables, indexes, constraints, and initial data)
npm run db:setup

# Or specify URL directly
npm run db:setup "postgresql://user:pass@localhost:5432/mylab"
```

## Available Commands

```bash
# Setup complete database
npm run db:setup

# Reset database (drop all tables)
npm run db:reset

# Setup with custom URL
npm run db:setup "postgresql://user:pass@host:port/dbname"
```

## What Gets Created

### Tables (14 total)
- **Workspace** - Platform containers
- **Organizations** - External orgs and clients
- **Users** - Platform users
- **Projects** - Research projects
- **ProjectStages** - Project phases
- **Samples** - Original samples
- **DerivedSamples** - Processed samples
- **Batches** - Analysis batches
- **BatchItems** - Batch contents
- **AnalysisTypes** - Available analysis types
- **Analyses** - Analysis results
- **Documents** - File attachments
- **AccessGrants** - Sharing permissions
- **AuditLog** - Activity tracking

### Features
- ✅ **UUID primary keys** with auto-generation
- ✅ **Foreign key relationships** with proper constraints
- ✅ **JSONB metadata fields** for flexibility
- ✅ **Soft deletes** with deleted_at timestamps
- ✅ **Audit trails** with immutable logs
- ✅ **Workspace isolation** for multi-tenancy
- ✅ **Optimized indexes** for performance
- ✅ **Initial data** (analysis types, etc.)

### Extensions Enabled
- `uuid-ossp` - UUID generation
- `pgcrypto` - Additional crypto functions

## Troubleshooting

### Connection Issues
```bash
# Test connection
psql "postgresql://user:pass@localhost:5432/mylab" -c "SELECT 1;"

# Check PostgreSQL status
brew services list | grep postgres  # macOS
sudo systemctl status postgresql    # Linux
```

### Permission Issues
```sql
-- Grant permissions if needed
GRANT ALL PRIVILEGES ON DATABASE mylab TO your_user;
```

### Reset and Retry
```bash
# Reset everything
npm run db:reset

# Then setup again
npm run db:setup
```

## Schema Overview

The database follows these principles:
- **Workspace Isolation**: Data separated by organization
- **Immutable Lineage**: Sample transformations tracked forever
- **Flexible Metadata**: JSONB for custom fields
- **Audit Compliance**: Complete activity logging
- **External Integration**: Support for CROs and external labs

See `src/config/platform.ts` for the complete central brain configuration that drives this setup.