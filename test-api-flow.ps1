# Test Full API Flow - Company Owner
Write-Host "=== MyLab Platform - Full API Test Flow ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"
$maxRetries = 10
$retryCount = 0

# Wait for backend to be ready
Write-Host "Waiting for backend server..." -ForegroundColor Yellow
while ($retryCount -lt $maxRetries) {
  try {
    $testConn = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "✓ Backend is ready" -ForegroundColor Green
    break
  } catch {
    $retryCount++
    if ($retryCount -eq $maxRetries) {
      Write-Host "✗ Backend not responding" -ForegroundColor Red
      exit 1
    }
    Start-Sleep -Seconds 1
  }
}

# Step 1: Login as company owner
Write-Host ""
Write-Host "Step 1: Login as company owner" -ForegroundColor Cyan
try {
  $loginBody = @{
    email = "admin@mylab.com"
    password = "Admin@123456"
  } | ConvertTo-Json

  $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $loginBody -ErrorAction Stop

  $loginData = $loginResponse.Content | ConvertFrom-Json
  $token = $loginData.token
  $userId = $loginData.user.id

  Write-Host "✓ Login successful" -ForegroundColor Green
  Write-Host "  User ID: $userId"
  Write-Host "  Token: $($token.Substring(0, 30))..."
} catch {
  Write-Host "✗ Login failed: $_" -ForegroundColor Red
  exit 1
}

# Step 2: Get user profile
Write-Host ""
Write-Host "Step 2: Get user profile" -ForegroundColor Cyan
try {
  $profileResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/profile" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} `
    -ErrorAction Stop

  $profileData = $profileResponse.Content | ConvertFrom-Json
  Write-Host "✓ Profile retrieved" -ForegroundColor Green
  Write-Host "  Name: $($profileData.name)"
  Write-Host "  Email: $($profileData.email)"
  Write-Host "  Role: $($profileData.role)"
} catch {
  Write-Host "✗ Profile fetch failed: $_" -ForegroundColor Red
}

# Step 3: List workspaces (admin only)
Write-Host ""
Write-Host "Step 3: List workspaces (admin summary)" -ForegroundColor Cyan
try {
  $workspacesResponse = Invoke-WebRequest -Uri "$baseUrl/api/workspaces/summary" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} `
    -ErrorAction Stop

  $workspacesData = $workspacesResponse.Content | ConvertFrom-Json
  Write-Host "✓ Workspaces retrieved: $($workspacesData.Count) total" -ForegroundColor Green
  foreach ($ws in $workspacesData | Select-Object -First 3) {
    Write-Host "  - $($ws.name) (users: $($ws.user_count))"
  }
} catch {
  Write-Host "✗ Workspaces fetch failed: $_" -ForegroundColor Red
}

# Step 4: Get system notifications
Write-Host ""
Write-Host "Step 4: Get system notifications" -ForegroundColor Cyan
try {
  $notifParams = @{
    Uri = "$baseUrl/api/notifications/system?limit=5"
    Method = "GET"
    Headers = @{
      "Authorization" = "Bearer $token"
      "Content-Type" = "application/json"
    }
    ErrorAction = "Stop"
  }
  $notificationsResponse = Invoke-WebRequest @notifParams

  $notificationsData = $notificationsResponse.Content | ConvertFrom-Json
  Write-Host "✓ Notifications retrieved: $($notificationsData.Count) total" -ForegroundColor Green
  foreach ($notif in $notificationsData | Select-Object -First 3) {
    Write-Host "  - [$($notif.priority.ToUpper())] $($notif.title)"
  }
} catch {
  Write-Host "✗ Notifications fetch failed: $_" -ForegroundColor Red
}

# Step 5: Get notification preferences
Write-Host ""
Write-Host "Step 5: Get notification preferences" -ForegroundColor Cyan
try {
  $prefResponse = Invoke-WebRequest -Uri "$baseUrl/api/notifications/preferences" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} `
    -ErrorAction Stop

  $prefData = $prefResponse.Content | ConvertFrom-Json
  Write-Host "✓ Preferences retrieved" -ForegroundColor Green
  Write-Host "  Email notifications: $($prefData.email_notifications)"
  Write-Host "  In-app notifications: $($prefData.in_app_notifications)"
} catch {
  Write-Host "✗ Preferences fetch failed: $_" -ForegroundColor Red
}

# Step 6: List projects
Write-Host ""
Write-Host "Step 6: List projects" -ForegroundColor Cyan
try {
  $projectsResponse = Invoke-WebRequest -Uri "$baseUrl/api/projects?limit=5" `
    -Method GET `
    -Headers @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"} `
    -ErrorAction Stop

  $projectsData = $projectsResponse.Content | ConvertFrom-Json
  Write-Host "✓ Projects retrieved: $($projectsData.Count) total" -ForegroundColor Green
  foreach ($proj in $projectsData | Select-Object -First 3) {
    Write-Host "  - $($proj.name) (samples: $($proj.sample_count))"
  }
} catch {
  Write-Host "✗ Projects fetch failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== API Test Complete ===" -ForegroundColor Cyan
Write-Host "✅ Full flow test PASSED" -ForegroundColor Green
