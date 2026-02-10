# Test script to run integration tests one at a time on Windows

Write-Host "🧪 Running integration tests individually..." -ForegroundColor Cyan
Write-Host ""

# Array of test files
$tests = @(
  "src/api/integration/__tests__/01-auth.test.ts",
  "src/api/integration/__tests__/02-organizations.test.ts",
  "src/api/integration/__tests__/03-projects.test.ts",
  "src/api/integration/__tests__/04-trials.test.ts",
  "src/api/integration/__tests__/05-samples.test.ts"
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
  Write-Host "🧪 Running: $test" -ForegroundColor Cyan
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
  
  $result = npm test -- "$test" --runInBand --no-coverage 2>&1
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PASSED: $test" -ForegroundColor Green
    $passed++
  } else {
    Write-Host "❌ FAILED: $test" -ForegroundColor Red
    Write-Host $result
    $failed++
  }
  
  Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

if ($failed -eq 0) {
  Write-Host "🎉 All tests passed!" -ForegroundColor Green
  exit 0
} else {
  Write-Host "⚠️  Some tests failed. Check output above." -ForegroundColor Red
  exit 1
}
