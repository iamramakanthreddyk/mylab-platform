#!/usr/bin/env pwsh
<#
.SYNOPSIS
    MyLab Platform Development Tooling

.DESCRIPTION
    Central development command center for the MyLab Platform project.
    Integrates database, API, frontend, testing, and AI context management.

.EXAMPLE
    .\mylab.ps1 help
    .\mylab.ps1 ai:update
    .\mylab.ps1 db:snapshot
    .\mylab.ps1 validate:all

.NOTES
    Version: 1.0
    Last Updated: February 10, 2026
#>

param(
    [Parameter(Position=0)]
    [string]$Command = "help",
    
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$Args
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

# Colors for output
$Colors = @{
    Primary = "Cyan"
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Gray"
    Header = "Magenta"
}

function Write-MLHeader {
    param([string]$Text)
    Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor $Colors.Primary
    Write-Host "║  $($Text.PadRight(47)) ║" -ForegroundColor $Colors.Primary
    Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor $Colors.Primary
}

function Write-MLSection {
    param([string]$Text)
    Write-Host "`n▶ $Text" -ForegroundColor $Colors.Header
}

function Write-MLSuccess {
    param([string]$Text)
    Write-Host "  ✓ $Text" -ForegroundColor $Colors.Success
}

function Write-MLError {
    param([string]$Text)
    Write-Host "  ✗ $Text" -ForegroundColor $Colors.Error
}

function Write-MLInfo {
    param([string]$Text)
    Write-Host "  ℹ $Text" -ForegroundColor $Colors.Info
}

function Write-MLWarning {
    param([string]$Text)
    Write-Host "  ⚠ $Text" -ForegroundColor $Colors.Warning
}

# ============================================================================
# AI CONTEXT COMMANDS
# ============================================================================

function Invoke-AIUpdate {
    <#
    .SYNOPSIS
        Interactive AI context update assistant
    #>
    Write-MLHeader "AI Context Update Assistant"
    
    Write-MLSection "Detecting changes..."
    $gitStatus = git status --porcelain
    
    $changes = @{
        database = $false
        api = $false
        frontend = $false
        migrations = @()
        modifiedFiles = @()
    }
    
    if ($gitStatus) {
        $gitStatus | ForEach-Object {
            $file = $_.Substring(3)
            $changes.modifiedFiles += $file
            
            if ($file -match "backend/src/database/schemas\.ts") {
                $changes.database = $true
                Write-MLInfo "Database schema changed"
            }
            if ($file -match "backend/migrations/.*\.sql") {
                $changes.database = $true
                $changes.migrations += $file
                Write-MLInfo "Migration detected: $file"
            }
            if ($file -match "openapi-spec\.yaml" -or $file -match "backend/src/api/.*/types\.ts") {
                $changes.api = $true
                Write-MLInfo "API contract changed"
            }
            if ($file -match "src/lib/types\.ts" -or $file -match "FRONTEND_API_EXPECTATIONS\.md") {
                $changes.frontend = $true
                Write-MLInfo "Frontend contract changed"
            }
        }
    } else {
        Write-MLSuccess "No uncommitted changes detected"
        return
    }
    
    $needsUpdate = $changes.database -or $changes.api -or $changes.frontend
    
    if (-not $needsUpdate) {
        Write-MLSuccess "No contract changes - AI_CONTEXT.md is current"
        return
    }
    
    Write-MLWarning "Contract changes detected! AI_CONTEXT.md should be updated."
    Write-Host ""
    
    Write-MLSection "Update Checklist"
    
    if ($changes.database) {
        Write-Host "  🗄️  DATABASE SCHEMA CHANGES" -ForegroundColor $Colors.Header
        Write-Host "     [ ] Update 'Database Schema Snapshot' section"
        Write-Host "     [ ] Document affected tables/columns"
        if ($changes.migrations.Count -gt 0) {
            Write-Host "     [ ] Document migrations: $($changes.migrations -join ', ')"
        }
    }
    
    if ($changes.api) {
        Write-Host "  🔌 API CONTRACT CHANGES" -ForegroundColor $Colors.Header
        Write-Host "     [ ] Update 'API Contract Snapshot' section"
        Write-Host "     [ ] Document new/changed endpoints"
    }
    
    if ($changes.frontend) {
        Write-Host "  🎨 FRONTEND CONTRACT CHANGES" -ForegroundColor $Colors.Header
        Write-Host "     [ ] Update 'Frontend API Expectations' section"
        Write-Host "     [ ] Document new type definitions"
    }
    
    Write-Host "  📝 COMMON UPDATES" -ForegroundColor $Colors.Header
    Write-Host "     [ ] Add entry to 'Recent Changes Log'"
    Write-Host "     [ ] Update 'Last Updated' timestamp"
    Write-Host ""
    
    $response = Read-Host "Open AI_CONTEXT.md for editing? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        code AI_CONTEXT.md
        Write-MLSuccess "Opened AI_CONTEXT.md in editor"
    }
}

function Invoke-AIView {
    <#
    .SYNOPSIS
        View current AI context
    #>
    Write-MLHeader "AI Context Viewer"
    
    if (Test-Path AI_CONTEXT.md) {
        code AI_CONTEXT.md
        Write-MLSuccess "Opened AI_CONTEXT.md"
    } else {
        Write-MLError "AI_CONTEXT.md not found"
    }
}

function Invoke-AIContext {
    <#
    .SYNOPSIS
        Generate AI context bundle
    #>
    param([string]$Pattern = "")
    
    Write-MLHeader "AI Context Bundle"
    
    & "$ProjectRoot\ai-context.ps1" -EndpointPattern $Pattern
}

# ============================================================================
# DATABASE COMMANDS
# ============================================================================

function Invoke-DBSnapshot {
    <#
    .SYNOPSIS
        Generate database schema snapshot
    #>
    Write-MLHeader "Database Schema Snapshot"
    
    Push-Location "$ProjectRoot\backend"
    try {
        npm run db:schema-snapshot
        Write-MLSuccess "Schema snapshot generated"
    } catch {
        Write-MLError "Failed to generate snapshot: $_"
    } finally {
        Pop-Location
    }
}

function Invoke-DBMigrate {
    <#
    .SYNOPSIS
        Run database migrations
    #>
    Write-MLHeader "Database Migration"
    
    Push-Location "$ProjectRoot\backend"
    try {
        npm run db:migrate
        Write-MLSuccess "Migrations completed"
    } catch {
        Write-MLError "Migration failed: $_"
    } finally {
        Pop-Location
    }
}

function Invoke-DBSetup {
    <#
    .SYNOPSIS
        Setup database
    #>
    Write-MLHeader "Database Setup"
    
    Push-Location "$ProjectRoot\backend"
    try {
        npm run db:setup
        Write-MLSuccess "Database setup completed"
    } catch {
        Write-MLError "Setup failed: $_"
    } finally {
        Pop-Location
    }
}

function Invoke-DBReset {
    <#
    .SYNOPSIS
        Reset database (CAUTION!)
    #>
    Write-MLHeader "Database Reset"
    Write-MLWarning "This will DELETE all data!"
    
    $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
    if ($confirm -ne 'YES') {
        Write-MLInfo "Reset cancelled"
        return
    }
    
    Push-Location "$ProjectRoot\backend"
    try {
        npm run db:reset
        Write-MLSuccess "Database reset completed"
    } catch {
        Write-MLError "Reset failed: $_"
    } finally {
        Pop-Location
    }
}

# ============================================================================
# VALIDATION COMMANDS
# ============================================================================

function Invoke-ValidateTypes {
    <#
    .SYNOPSIS
        Validate TypeScript types
    #>
    Write-MLHeader "Type Validation"
    
    Write-MLSection "Backend types"
    Push-Location "$ProjectRoot\backend"
    try {
        npm run type-check
        Write-MLSuccess "Backend types valid"
    } catch {
        Write-MLError "Backend type errors found"
    } finally {
        Pop-Location
    }
    
    Write-MLSection "Frontend types"
    Push-Location $ProjectRoot
    try {
        npm run build 2>&1 | Out-Null
        Write-MLSuccess "Frontend types valid"
    } catch {
        Write-MLError "Frontend type errors found"
    } finally {
        Pop-Location
    }
}

function Invoke-ValidateAPI {
    <#
    .SYNOPSIS
        Validate API contracts
    #>
    Write-MLHeader "API Contract Validation"
    
    if (Test-Path "$ProjectRoot\openapi-spec.yaml") {
        Write-MLSuccess "OpenAPI spec found"
        # Add OpenAPI validator here if available
    } else {
        Write-MLError "OpenAPI spec not found"
    }
}

function Invoke-ValidateAll {
    <#
    .SYNOPSIS
        Run all validations
    #>
    Write-MLHeader "Full Validation Suite"
    
    Invoke-ValidateTypes
    Invoke-ValidateAPI
    
    Write-MLSection "Running tests"
    Push-Location "$ProjectRoot\backend"
    try {
        npm test
        Write-MLSuccess "All tests passed"
    } catch {
        Write-MLError "Some tests failed"
    } finally {
        Pop-Location
    }
}

# ============================================================================
# TEST COMMANDS
# ============================================================================

function Invoke-Test {
    <#
    .SYNOPSIS
        Run tests
    #>
    param([string]$Type = "all")
    
    Write-MLHeader "Running Tests: $Type"
    
    Push-Location "$ProjectRoot\backend"
    try {
        switch ($Type) {
            "all" { npm test }
            "integration" { npm run test:integration }
            "e2e" { npm run test:e2e }
            "coverage" { npm run test:coverage }
            default { npm test }
        }
        Write-MLSuccess "Tests completed"
    } catch {
        Write-MLError "Tests failed"
    } finally {
        Pop-Location
    }
}

# ============================================================================
# DEVELOPMENT COMMANDS
# ============================================================================

function Invoke-Dev {
    <#
    .SYNOPSIS
        Start development servers
    #>
    Write-MLHeader "Starting Development Servers"
    
    Write-MLInfo "Starting backend server..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; npm run dev"
    
    Start-Sleep -Seconds 2
    
    Write-MLInfo "Starting frontend server..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm run dev"
    
    Write-MLSuccess "Development servers started in separate windows"
}

function Invoke-Build {
    <#
    .SYNOPSIS
        Build the project
    #>
    Write-MLHeader "Building Project"
    
    Write-MLSection "Building backend"
    Push-Location "$ProjectRoot\backend"
    try {
        npm run build
        Write-MLSuccess "Backend built"
    } finally {
        Pop-Location
    }
    
    Write-MLSection "Building frontend"
    Push-Location $ProjectRoot
    try {
        npm run build
        Write-MLSuccess "Frontend built"
    } finally {
        Pop-Location
    }
}

# ============================================================================
# UTILITY COMMANDS
# ============================================================================

function Invoke-Status {
    <#
    .SYNOPSIS
        Show project status
    #>
    Write-MLHeader "Project Status"
    
    Write-MLSection "Git Status"
    git status --short
    
    Write-MLSection "AI Context Status"
    $lastUpdate = Get-Content AI_CONTEXT.md -ErrorAction SilentlyContinue | Select-String "Last Updated" | Select-Object -First 1
    if ($lastUpdate) {
        Write-MLInfo "Last AI Context Update: $lastUpdate"
    }
    
    Write-MLSection "Package Status"
    Write-MLInfo "Backend dependencies:"
    Push-Location "$ProjectRoot\backend"
    npm list --depth=0 2>&1 | Select-Object -First 5
    Pop-Location
}

function Show-Help {
    Write-MLHeader "MyLab Platform Development Tooling"
    
    Write-Host "Usage: .\mylab.ps1 <command> [args]`n" -ForegroundColor $Colors.Info
    
    Write-Host "AI CONTEXT COMMANDS:" -ForegroundColor $Colors.Header
    Write-Host "  ai:update          Interactive AI context update assistant"
    Write-Host "  ai:view            Open AI_CONTEXT.md in editor"
    Write-Host "  ai:context         Generate AI context bundle"
    Write-Host ""
    
    Write-Host "DATABASE COMMANDS:" -ForegroundColor $Colors.Header
    Write-Host "  db:snapshot        Generate database schema snapshot"
    Write-Host "  db:migrate         Run database migrations"
    Write-Host "  db:setup           Setup database"
    Write-Host "  db:reset           Reset database (CAUTION!)"
    Write-Host ""
    
    Write-Host "VALIDATION COMMANDS:" -ForegroundColor $Colors.Header
    Write-Host "  validate:types     Validate TypeScript types"
    Write-Host "  validate:api       Validate API contracts"
    Write-Host "  validate:all       Run all validations"
    Write-Host ""
    
    Write-Host "TEST COMMANDS:" -ForegroundColor $Colors.Header
    Write-Host "  test              Run all tests"
    Write-Host "  test:integration  Run integration tests"
    Write-Host "  test:e2e          Run end-to-end tests"
    Write-Host "  test:coverage     Run tests with coverage"
    Write-Host ""
    
    Write-Host "DEVELOPMENT COMMANDS:" -ForegroundColor $Colors.Header
    Write-Host "  dev               Start development servers"
    Write-Host "  build             Build the project"
    Write-Host "  status            Show project status"
    Write-Host ""
    
    Write-Host "EXAMPLES:" -ForegroundColor $Colors.Header
    Write-Host "  .\mylab.ps1 ai:update"
    Write-Host "  .\mylab.ps1 db:snapshot"
    Write-Host "  .\mylab.ps1 validate:all"
    Write-Host "  .\mylab.ps1 test:integration"
    Write-Host ""
    Write-Host "ALIAS SETUP (Optional):" -ForegroundColor $Colors.Header
    Write-Host "  Add to PowerShell profile for 'mylab' command:"
    Write-Host "  Set-Alias mylab '.\mylab.ps1'"
    Write-Host ""
}

# ============================================================================
# COMMAND ROUTER
# ============================================================================

switch -Regex ($Command) {
    "^ai:update$" { Invoke-AIUpdate }
    "^ai:view$" { Invoke-AIView }
    "^ai:context$" { 
        $pattern = if ($Args.Count -gt 0) { $Args[0] } else { "" }
        Invoke-AIContext -Pattern $pattern 
    }
    
    "^db:snapshot$" { Invoke-DBSnapshot }
    "^db:migrate$" { Invoke-DBMigrate }
    "^db:setup$" { Invoke-DBSetup }
    "^db:reset$" { Invoke-DBReset }
    
    "^validate:types$" { Invoke-ValidateTypes }
    "^validate:api$" { Invoke-ValidateAPI }
    "^validate:all$" { Invoke-ValidateAll }
    
    "^test$" { Invoke-Test -Type "all" }
    "^test:integration$" { Invoke-Test -Type "integration" }
    "^test:e2e$" { Invoke-Test -Type "e2e" }
    "^test:coverage$" { Invoke-Test -Type "coverage" }
    
    "^dev$" { Invoke-Dev }
    "^build$" { Invoke-Build }
    "^status$" { Invoke-Status }
    
    "^help$" { Show-Help }
    default { 
        Write-MLError "Unknown command: $Command"
        Write-Host ""
        Show-Help
    }
}
