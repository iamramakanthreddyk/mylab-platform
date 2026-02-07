#!/bin/bash
# Documentation Cleanup Script
# This script organizes your 11 documentation files into core + archive

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}===== MyLab Documentation Cleanup =====${NC}\n"

# Create archive directory if it doesn't exist
echo "📁 Creating docs/ARCHIVE directory..."
mkdir -p docs/ARCHIVE

# Move documents to archive
echo -e "\n${YELLOW}Moving old docs to docs/ARCHIVE/${NC}"

files_to_archive=(
  "MULTI_LAB_IMPLEMENTATION_CHECKLIST.md"
  "MULTI_LAB_WORKFLOW_IMPLEMENTATION.md"
  "RBAC_IMPLEMENTATION_SUMMARY.md"
  "ROLE_BASED_ACCESS_CONTROL.md"
  "backend/ACCESS_CONTROL_IMPLEMENTATION_COMPLETE.md"
)

for file in "${files_to_archive[@]}"; do
  if [ -f "$file" ]; then
    echo "  Moving: $file → docs/ARCHIVE/"
    mv "$file" "docs/ARCHIVE/$(basename $file)"
  else
    echo "  ⚠️  Not found: $file (skipping)"
  fi
done

# Delete redundant files
echo -e "\n${RED}Deleting redundant files${NC}"

files_to_delete=(
  "IMPLEMENTATION_SUMMARY_ACCESS_CONTROL.md"
)

for file in "${files_to_delete[@]}"; do
  if [ -f "$file" ]; then
    echo "  Deleting: $file"
    rm "$file"
  else
    echo "  ⚠️  Not found: $file (skipping)"
  fi
done

# List remaining core docs
echo -e "\n${GREEN}✅ Cleanup Complete!${NC}\n"
echo "📚 CORE DOCUMENTATION (kept for active use):"
echo "  ✅ COMPANY_ADMIN_DASHBOARD_GUIDE.md"
echo "  ✅ DATABASE_SCHEMA_GUIDE.md"
echo "  ✅ DOCUMENTATION_INDEX.md"
echo "  ✅ DOCUMENTATION_MAINTENANCE_GUIDE.md"
echo "  ✅ backend/ACCESS_CONTROL_INTEGRATION.md"
echo "  ✅ backend/SCHEMA_ARCHITECTURE.md"
echo "  ✅ backend/SCHEMA_CHANGE_CHECKLIST.md"
echo ""

echo -e "${YELLOW}📦 ARCHIVED DOCUMENTATION (reference only):${NC}"
ls -1 docs/ARCHIVE/*.md 2>/dev/null | xargs -n1 basename | sed 's/^/  /'
echo ""

echo -e "${GREEN}Next steps:${NC}"
echo "  1. Review: DOCUMENTATION_MAINTENANCE_GUIDE.md"
echo "  2. Update: DOCUMENTATION_INDEX.md (if needed)"
echo "  3. Commit: git add . && git commit -m 'docs: organize documentation'"
echo ""
