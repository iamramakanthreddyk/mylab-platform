#!/usr/bin/env bash
# Test script to run integration tests one at a time

echo "🧪 Running integration tests individually..."
echo ""

# Clear any old setup flags
rm -f /tmp/mylab-test-setup-done.flag 2>/dev/null || true

# Array of test files
tests=(
  "src/api/integration/__tests__/01-auth.test.ts"
  "src/api/integration/__tests__/02-organizations.test.ts"
  "src/api/integration/__tests__/03-projects.test.ts"
  "src/api/integration/__tests__/04-trials.test.ts"
  "src/api/integration/__tests__/05-samples.test.ts"
)

passed=0
failed=0

for test in "${tests[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🧪 Running: $test"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if npm test -- "$test" --runInBand --no-coverage; then
    echo "✅ PASSED: $test"
    ((passed++))
  else
    echo "❌ FAILED: $test"
    ((failed++))
  fi
  
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Passed: $passed"
echo "❌ Failed: $failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $failed -eq 0 ]; then
  echo "🎉 All tests passed!"
  exit 0
else
  echo "⚠️  Some tests failed. Check output above."
  exit 1
fi
