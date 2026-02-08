# MyLab Platform - Setup Script for Gap Fixes
# This script installs dependencies and prepares the environment for the new features

Write-Host "================================" -ForegroundColor Cyan
Write-Host "MyLab Platform - Gap Fix Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install Backend Dependencies
Write-Host "[1/4] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location -Path "backend"

Write-Host "  → Installing multer and types..." -ForegroundColor Gray
npm install multer @types/multer --save

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Backend dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Check Database Connection
Write-Host "[2/4] Checking database connection..." -ForegroundColor Yellow
Write-Host "  → Verifying PostgreSQL connection..." -ForegroundColor Gray

# You may need to update these with your actual database credentials
$env:PGPASSWORD = $env:DB_PASSWORD

# Test connection (adjust as needed for your environment)
# psql -h localhost -U your_user -d your_db -c "SELECT 1" 2>&1 | Out-Null

Write-Host "  ℹ Database connection check skipped - please verify manually" -ForegroundColor Yellow
Write-Host ""

# Step 3: Run Database Migration
Write-Host "[3/4] Database migration preparation..." -ForegroundColor Yellow
Write-Host "  → Migration file: src/database/migration-gap-fixes.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "  To execute the migration, run ONE of the following commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Option 1 - Using psql CLI:" -ForegroundColor White
Write-Host "    psql -h <host> -U <user> -d <database> -f src/database/migration-gap-fixes.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option 2 - Using environment variable:" -ForegroundColor White
Write-Host "    psql `$env:DATABASE_URL -f src/database/migration-gap-fixes.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option 3 - Using pgAdmin:" -ForegroundColor White
Write-Host "    1. Open pgAdmin" -ForegroundColor Gray
Write-Host "    2. Connect to your database" -ForegroundColor Gray
Write-Host "    3. Open Query Tool" -ForegroundColor Gray
Write-Host "    4. Load and execute: src/database/migration-gap-fixes.sql" -ForegroundColor Gray
Write-Host ""

$runMigration = Read-Host "Would you like to attempt auto-migration now? (y/N)"

if ($runMigration -eq 'y' -or $runMigration -eq 'Y') {
    if ($env:DATABASE_URL) {
        Write-Host "  → Executing migration..." -ForegroundColor Gray
        psql $env:DATABASE_URL -f src/database/migration-gap-fixes.sql
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Migration executed successfully" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Migration failed - please run manually" -ForegroundColor Red
        }
    } else {
        Write-Host "  ✗ DATABASE_URL environment variable not set" -ForegroundColor Red
        Write-Host "  → Please run migration manually using one of the options above" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Skipping auto-migration - remember to run it manually!" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Verification Checklist
Write-Host "[4/4] Post-setup verification checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend Dependencies:" -ForegroundColor Cyan
Write-Host "    [✓] multer installed" -ForegroundColor Green
Write-Host "    [✓] @types/multer installed" -ForegroundColor Green
Write-Host ""
Write-Host "  Database Tables (verify these were created):" -ForegroundColor Cyan
Write-Host "    [ ] UserInvitations" -ForegroundColor Gray
Write-Host "    [ ] PasswordResetTokens" -ForegroundColor Gray
Write-Host "    [ ] FileDocuments" -ForegroundColor Gray
Write-Host "    [ ] AnalysisRequests" -ForegroundColor Gray
Write-Host "    [ ] NotificationSettings" -ForegroundColor Gray
Write-Host ""
Write-Host "  Verification Queries (run these in psql or pgAdmin):" -ForegroundColor Cyan
Write-Host "    SELECT COUNT(*) FROM UserInvitations;" -ForegroundColor Gray
Write-Host "    SELECT COUNT(*) FROM AnalysisTypes; -- Should return 6 after first API call" -ForegroundColor Gray
Write-Host "    SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_notification_settings';" -ForegroundColor Gray
Write-Host ""

# Step 5: Next Steps
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Verify database migration completed successfully" -ForegroundColor White
Write-Host "2. Start backend server: npm run dev" -ForegroundColor White
Write-Host "3. Test new endpoints:" -ForegroundColor White
Write-Host "   • POST /api/users/invite" -ForegroundColor Gray
Write-Host "   • POST /api/auth/forgot-password" -ForegroundColor Gray
Write-Host "   • GET /api/analysis-types (auto-seeds 6 types)" -ForegroundColor Gray
Write-Host "   • POST /api/files/upload" -ForegroundColor Gray
Write-Host "   • POST /api/analysis-requests" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test UI flows:" -ForegroundColor White
Write-Host "   • Navigate to /register?token=xxx" -ForegroundColor Gray
Write-Host "   • Navigate to /forgot-password" -ForegroundColor Gray
Write-Host "   • Navigate to /reset-password?token=xxx" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Review IMPLEMENTATION_STATUS.md for detailed status" -ForegroundColor White
Write-Host ""

Set-Location -Path ".."

Write-Host "Setup complete! 🎉" -ForegroundColor Green
Write-Host ""
