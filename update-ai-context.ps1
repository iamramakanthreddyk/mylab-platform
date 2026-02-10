#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated AI Context Updater

.DESCRIPTION
    Detects changes in database schema, API contracts, and frontend types,
    then prompts to update AI_CONTEXT.md accordingly.

.EXAMPLE
    .\update-ai-context.ps1
    
.EXAMPLE
    .\update-ai-context.ps1 -AutoCommit

.NOTES
    Run this after making changes to DB, API, or frontend contracts
#>

param(
    [switch]$AutoCommit,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host @"
╔══════════════════════════════════════════════════╗
║     AI Context Update Assistant                 ║
║     Keeping AI aware of your architecture       ║
╚══════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host ""

# Track what changed
$changes = @{
    database = $false
    api = $false
    frontend = $false
    migrations = @()
    modifiedFiles = @()
}

# Get git status to detect changes
Write-Host "🔍 Detecting changes..." -ForegroundColor Yellow
$gitStatus = git status --porcelain

if ($gitStatus) {
    $gitStatus | ForEach-Object {
        $file = $_.Substring(3)
        $changes.modifiedFiles += $file
        
        # Categorize changes
        if ($file -match "backend/src/database/schemas\.ts") {
            $changes.database = $true
            Write-Host "  📊 Database schema changed" -ForegroundColor Magenta
        }
        if ($file -match "backend/migrations/.*\.sql") {
            $changes.database = $true
            $changes.migrations += $file
            Write-Host "  🔄 Migration detected: $file" -ForegroundColor Magenta
        }
        if ($file -match "openapi-spec\.yaml" -or $file -match "backend/src/api/.*/types\.ts") {
            $changes.api = $true
            Write-Host "  🔌 API contract changed" -ForegroundColor Blue
        }
        if ($file -match "src/lib/types\.ts" -or $file -match "FRONTEND_API_EXPECTATIONS\.md") {
            $changes.frontend = $true
            Write-Host "  🎨 Frontend contract changed" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ℹ️  No uncommitted changes detected" -ForegroundColor Gray
}

Write-Host ""

# Check if AI_CONTEXT.md needs updating
$needsUpdate = $changes.database -or $changes.api -or $changes.frontend

if (-not $needsUpdate) {
    Write-Host "✅ No contract changes detected - AI_CONTEXT.md is current" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Contract changes detected! AI_CONTEXT.md should be updated." -ForegroundColor Yellow
Write-Host ""

# Show what needs updating
Write-Host "📋 Update Checklist:" -ForegroundColor Cyan
Write-Host ""

if ($changes.database) {
    Write-Host "  🗄️  DATABASE SCHEMA CHANGES" -ForegroundColor Magenta
    Write-Host "     [ ] Update 'Database Schema Snapshot' section" -ForegroundColor White
    Write-Host "     [ ] Document affected tables/columns" -ForegroundColor White
    Write-Host "     [ ] Note any constraint changes" -ForegroundColor White
    if ($changes.migrations.Count -gt 0) {
        Write-Host "     [ ] Document migrations: $($changes.migrations -join ', ')" -ForegroundColor White
    }
    Write-Host ""
}

if ($changes.api) {
    Write-Host "  🔌 API CONTRACT CHANGES" -ForegroundColor Blue
    Write-Host "     [ ] Update 'API Contract Snapshot' section" -ForegroundColor White
    Write-Host "     [ ] Document new/changed endpoints" -ForegroundColor White
    Write-Host "     [ ] Update request/response examples" -ForegroundColor White
    Write-Host ""
}

if ($changes.frontend) {
    Write-Host "  🎨 FRONTEND CONTRACT CHANGES" -ForegroundColor Green
    Write-Host "     [ ] Update 'Frontend API Expectations' section" -ForegroundColor White
    Write-Host "     [ ] Document new type definitions" -ForegroundColor White
    Write-Host "     [ ] Update transformer examples if needed" -ForegroundColor White
    Write-Host ""
}

Write-Host "  📝 COMMON UPDATES" -ForegroundColor Yellow
Write-Host "     [ ] Add entry to 'Recent Changes Log'" -ForegroundColor White
Write-Host "     [ ] Update 'Last Updated' timestamp" -ForegroundColor White
Write-Host "     [ ] Update 'Schema Version' if migration added" -ForegroundColor White
Write-Host ""

# Generate change log entry template
$today = Get-Date -Format "yyyy-MM-dd"
$changeLogEntry = @"

### $today: [Feature/Change Name]
**Files Changed:**
$(
    $changes.modifiedFiles | ForEach-Object { "- ``$_``" }
)

**Changes:**
- [Describe what changed]

**Impact:**
- [How this affects the system]
- [Any breaking changes]

"@

Write-Host "📄 Suggested changelog entry for AI_CONTEXT.md:" -ForegroundColor Cyan
Write-Host $changeLogEntry -ForegroundColor Gray
Write-Host ""

# Offer to open files for editing
Write-Host "🛠️  Quick Actions:" -ForegroundColor Cyan
Write-Host "  1. Open AI_CONTEXT.md for editing" -ForegroundColor White
Write-Host "  2. Generate schema snapshot: npm run db:schema-snapshot" -ForegroundColor White
Write-Host "  3. Validate API contract: npm run api:validate" -ForegroundColor White
Write-Host "  4. Check type sync: npm run types:check-sync" -ForegroundColor White
Write-Host ""

$response = Read-Host "Would you like to open AI_CONTEXT.md now? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    code AI_CONTEXT.md
    Write-Host "  ✓ Opened AI_CONTEXT.md in editor" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 Tip: Run this script after any DB, API, or frontend changes" -ForegroundColor Yellow
Write-Host "    to keep AI context up to date!" -ForegroundColor Yellow
Write-Host ""

# Save change summary for reference
$changeSummary = @{
    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    changes = $changes
    suggestedEntry = $changeLogEntry
}

$changeSummary | ConvertTo-Json -Depth 10 | Out-File -FilePath ".ai-context-changes.json" -Encoding UTF8
Write-Host "💾 Change summary saved to .ai-context-changes.json" -ForegroundColor Gray
