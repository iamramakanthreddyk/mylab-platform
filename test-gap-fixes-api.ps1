# MyLab Platform - API Testing Script
# Tests the newly implemented APIs for gap fixes

$baseUrl = "http://localhost:3001/api"
$token = ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "MyLab Platform - API Testing" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to make API calls
function Invoke-ApiTest {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "  → $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = "$baseUrl$Endpoint"
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "  ✓ SUCCESS" -ForegroundColor Green
        Write-Host "  Response:" -ForegroundColor Gray
        $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Gray
        Write-Host ""
        return $response
    }
    catch {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails) {
            Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
        Write-Host ""
        return $null
    }
}

# Step 1: Login to get token
Write-Host "[STEP 1] Authentication" -ForegroundColor Cyan
Write-Host ""

$email = Read-Host "Enter your email"
$password = Read-Host "Enter your password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$loginBody = @{
    email = $email
    password = $passwordPlain
}

$loginResponse = Invoke-ApiTest -Method "POST" -Endpoint "/auth/login" -Description "User Login" -Body $loginBody

if ($loginResponse -and $loginResponse.token) {
    $token = $loginResponse.token
    Write-Host "  ✓ Token obtained successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "  ✗ Failed to obtain token. Exiting..." -ForegroundColor Red
    exit 1
}

$authHeaders = @{
    "Authorization" = "Bearer $token"
}

# Step 2: Test Analysis Types API
Write-Host "[STEP 2] Analysis Types API" -ForegroundColor Cyan
Write-Host ""

Invoke-ApiTest -Method "GET" -Endpoint "/analysis-types" -Description "Get Analysis Types (auto-seeds)" -Headers $authHeaders

# Step 3: Test User Invitations
Write-Host "[STEP 3] User Invitations API" -ForegroundColor Cyan
Write-Host ""

# Create invitation
$inviteBody = @{
    email = "newuser@example.com"
    role = "scientist"
}

$invitation = Invoke-ApiTest -Method "POST" -Endpoint "/users/invite" -Description "Create User Invitation" -Body $inviteBody -Headers $authHeaders

# List invitations
Invoke-ApiTest -Method "GET" -Endpoint "/users/invitations" -Description "List Pending Invitations" -Headers $authHeaders

# Step 4: Test Password Reset Flow
Write-Host "[STEP 4] Password Reset API" -ForegroundColor Cyan
Write-Host ""

$forgotBody = @{
    email = $email
}

Invoke-ApiTest -Method "POST" -Endpoint "/auth/forgot-password" -Description "Request Password Reset" -Body $forgotBody

Write-Host "  ℹ Note: Check database PasswordResetTokens table for the generated token" -ForegroundColor Yellow
Write-Host ""

# Step 5: Test File Upload (requires multipart form data - manual test recommended)
Write-Host "[STEP 5] File Upload API" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ℹ File upload testing requires multipart/form-data" -ForegroundColor Yellow
Write-Host "  Recommended: Use Postman or cURL for file upload testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Example cURL command:" -ForegroundColor Gray
Write-Host "    curl -X POST $baseUrl/files/upload \" -ForegroundColor Gray
Write-Host "      -H 'Authorization: Bearer $token' \" -ForegroundColor Gray
Write-Host "      -F 'file=@/path/to/file.pdf' \" -ForegroundColor Gray
Write-Host "      -F 'entity_type=sample' \" -ForegroundColor Gray
Write-Host "      -F 'entity_id=<sample-uuid>' \" -ForegroundColor Gray
Write-Host "      -F 'description=Test file upload'" -ForegroundColor Gray
Write-Host ""

# Step 6: Test Analysis Requests API
Write-Host "[STEP 6] Analysis Requests API" -ForegroundColor Cyan
Write-Host ""

# List incoming requests
Invoke-ApiTest -Method "GET" -Endpoint "/analysis-requests/incoming" -Description "Get Incoming Analysis Requests" -Headers $authHeaders

# List outgoing requests
Invoke-ApiTest -Method "GET" -Endpoint "/analysis-requests/outgoing" -Description "Get Outgoing Analysis Requests" -Headers $authHeaders

Write-Host "  ℹ Note: To create an analysis request, you need:" -ForegroundColor Yellow
Write-Host "    - A valid sample_id" -ForegroundColor Gray
Write-Host "    - A valid analysis_type_id (from analysis types)" -ForegroundColor Gray
Write-Host "    - A valid to_organization_id (laboratory type)" -ForegroundColor Gray
Write-Host ""

# Step 7: Database Verification Queries
Write-Host "[STEP 7] Database Verification" -ForegroundColor Cyan
Write-Host ""

Write-Host "Run these SQL queries to verify database state:" -ForegroundColor Yellow
Write-Host ""
Write-Host "-- Check UserInvitations" -ForegroundColor Gray
Write-Host "SELECT * FROM UserInvitations ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Check PasswordResetTokens" -ForegroundColor Gray
Write-Host "SELECT * FROM PasswordResetTokens ORDER BY created_at DESC LIMIT 5;" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Check AnalysisTypes (should have 6 seeded types)" -ForegroundColor Gray
Write-Host "SELECT id, name, category, is_active FROM AnalysisTypes;" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Check NotificationSettings trigger" -ForegroundColor Gray
Write-Host "SELECT * FROM pg_trigger WHERE tgname = 'trigger_create_notification_settings';" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Check FileDocuments" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) FROM FileDocuments WHERE deleted_at IS NULL;" -ForegroundColor Gray
Write-Host ""
Write-Host "-- Check AnalysisRequests" -ForegroundColor Gray
Write-Host "SELECT id, from_organization_id, to_organization_id, status, priority FROM AnalysisRequests;" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Testing Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✓ APIs Tested:" -ForegroundColor Green
Write-Host "    - Authentication (login)" -ForegroundColor Gray
Write-Host "    - Analysis Types (GET with auto-seeding)" -ForegroundColor Gray
Write-Host "    - User Invitations (POST, GET)" -ForegroundColor Gray
Write-Host "    - Password Reset (POST forgot-password)" -ForegroundColor Gray
Write-Host "    - Analysis Requests (GET incoming/outgoing)" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⚠ Manual Testing Required:" -ForegroundColor Yellow
Write-Host "    - File Upload (multipart form data)" -ForegroundColor Gray
Write-Host "    - File Download" -ForegroundColor Gray
Write-Host "    - Analysis Request Creation (requires sample data)" -ForegroundColor Gray
Write-Host "    - User Invitation Acceptance (requires token from email/DB)" -ForegroundColor Gray
Write-Host "    - Password Reset Completion (requires token from email/DB)" -ForegroundColor Gray
Write-Host ""
Write-Host "  📋 Next Steps:" -ForegroundColor Cyan
Write-Host "    1. Review database tables for inserted data" -ForegroundColor Gray
Write-Host "    2. Test UI flows (/register, /forgot-password, /reset-password)" -ForegroundColor Gray
Write-Host "    3. Set up email service for invitation/reset emails" -ForegroundColor Gray
Write-Host "    4. Replace mock data in UI components" -ForegroundColor Gray
Write-Host ""
Write-Host "Testing complete! 🎉" -ForegroundColor Green
Write-Host ""
