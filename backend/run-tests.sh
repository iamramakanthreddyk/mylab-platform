#!/bin/bash

# MyLab Integration Test Runner
# Runs comprehensive test suites with SQLite isolation

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  MyLab Integration Test Suite - SQLite Isolated Testing   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
  echo ""
fi

# Check for required packages
REQUIRED_PACKAGES=("jest" "ts-jest" "sqlite3" "@jest/globals")
for pkg in "${REQUIRED_PACKAGES[@]}"; do
  if ! npm list "$pkg" > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing $pkg...${NC}"
    npm install --save-dev "$pkg"
  fi
done

echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Create test directory
mkdir -p .test
echo -e "${GREEN}✓ Test directory ready${NC}"
echo ""

# Run tests based on argument
if [ "$1" == "" ]; then
  echo -e "${YELLOW}Running all tests...${NC}"
  npm test -- --testPathPattern="backend/src/tests"
elif [ "$1" == "coverage" ]; then
  echo -e "${YELLOW}Running tests with coverage...${NC}"
  npm test -- --coverage --testPathPattern="backend/src/tests"
elif [ "$1" == "watch" ]; then
  echo -e "${YELLOW}Running tests in watch mode...${NC}"
  npm test -- --watch --testPathPattern="backend/src/tests"
elif [ "$1" == "integrity" ]; then
  echo -e "${YELLOW}Running data integrity tests...${NC}"
  npm test -- dataIntegrity.test.ts
elif [ "$1" == "notifications" ]; then
  echo -e "${YELLOW}Running notification & workspace tests...${NC}"
  npm test -- notificationsAndWorkspaces.test.ts
elif [ "$1" == "verbose" ]; then
  echo -e "${YELLOW}Running tests with verbose output...${NC}"
  npm test -- --verbose --testPathPattern="backend/src/tests"
elif [ "$1" == "clean" ]; then
  echo -e "${YELLOW}Cleaning test artifacts...${NC}"
  rm -rf .test
  rm -rf coverage
  echo -e "${GREEN}✓ Cleaned${NC}"
  exit 0
else
  echo -e "${RED}Unknown option: $1${NC}"
  echo ""
  echo "Usage: ./run-tests.sh [option]"
  echo ""
  echo "Options:"
  echo "  (none)         - Run all tests"
  echo "  coverage       - Run with coverage report"
  echo "  watch          - Run in watch mode"
  echo "  integrity      - Run data integrity tests only"
  echo "  notifications  - Run notification & workspace tests only"
  echo "  verbose        - Run with verbose output"
  echo "  clean          - Clean test artifacts"
  exit 1
fi

EXIT_CODE=$?

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "║  ${GREEN}✓ All tests passed successfully${NC}                          ║"
else
  echo -e "║  ${RED}✗ Tests failed (exit code: $EXIT_CODE)${NC}                      ║"
fi
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Cleanup test database if all tests passed
if [ $EXIT_CODE -eq 0 ]; then
  if [ -f .test/test.db ]; then
    rm .test/test.db
    echo -e "${GREEN}✓ Test database cleaned${NC}"
  fi
fi

exit $EXIT_CODE
