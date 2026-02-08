# MyLab Platform - Comprehensive End-to-End Test Runner
# Tests all gap fix flows automatically

Write-Host "================================" -ForegroundColor Cyan
Write-Host "MyLab Platform - E2E Test Suite" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Test Coverage:" -ForegroundColor Yellow
Write-Host "  ✓ User Invitation & Registration (8 tests)" -ForegroundColor Gray
Write-Host "  ✓ Password Reset Flow (8 tests)" -ForegroundColor Gray
Write-Host "  ✓ Analysis Types Auto-Seeding (3 tests)" -ForegroundColor Gray
Write-Host "  ✓ File Upload & Download (6 tests)" -ForegroundColor Gray
Write-Host "  ✓ Analysis Requests (7 tests)" -ForegroundColor Gray
Write-Host "  ✓ Database Verification (3 tests)" -ForegroundColor Gray
Write-Host "  Total: 35 end-to-end tests" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "[1/4] Checking backend server..." -ForegroundColor Yellow

try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "  ✓ Backend server is running" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Backend server not running!" -ForegroundColor Red
    Write-Host "  💡 Start the backend server first:" -ForegroundColor Yellow
    Write-Host "     cd backend" -ForegroundColor Gray
    Write-Host "     npm run dev" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""

# Check environment variables
Write-Host "[2/4] Checking test configuration..." -ForegroundColor Yellow

if (-not $env:DATABASE_URL) {
    Write-Host "  ⚠ DATABASE_URL not set, using default" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ DATABASE_URL configured" -ForegroundColor Green
}

if (-not $env:TEST_ADMIN_EMAIL) {
    Write-Host "  ℹ Using default test credentials" -ForegroundColor Gray
    $env:TEST_ADMIN_EMAIL = "admin@test.com"
    $env:TEST_ADMIN_PASSWORD = "Admin123!"
}

Write-Host ""

# Run migrations if needed
Write-Host "[3/4] Verifying database migrations..." -ForegroundColor Yellow

$migrationCheck = Invoke-WebRequest -Uri "http://localhost:3001/api/admin/migrations" -UseBasicParsing -TimeoutSec 5
$migrations = $migrationCheck.Content | ConvertFrom-Json

if ($migrations.migrations -match "008.*gap_fix_tables") {
    Write-Host "  ✓ Migration 008 (gap fix tables) executed" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Migration 008 may not be executed" -ForegroundColor Yellow
    Write-Host "  💡 Migrations run automatically on server startup" -ForegroundColor Gray
}

Write-Host ""

# Run the tests
Write-Host "[4/4] Running end-to-end tests..." -ForegroundColor Yellow
Write-Host ""

Set-Location -Path "backend"

# Run Jest E2E tests
npm run test:e2e:verbose

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

if ($exitCode -eq 0) {
    Write-Host "  ✓ All tests passed! 🎉" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next Steps:" -ForegroundColor Cyan
    Write-Host "    1. Test UI flows manually (/register, /forgot-password, /reset-password)" -ForegroundColor Gray
    Write-Host "    2. Set up email service for production" -ForegroundColor Gray
    Write-Host "    3. Replace mock data in UI components" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "  ✗ Some tests failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "    1. Check that database migrations ran successfully" -ForegroundColor Gray
    Write-Host "    2. Verify test user credentials (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)" -ForegroundColor Gray
    Write-Host "    3. Ensure all new routes are registered in backend/src/index.ts" -ForegroundColor Gray
    Write-Host "    4. Review error messages above for specific failures" -ForegroundColor Gray
    Write-Host ""
}

Set-Location -Path ".."

exit $exitCode
