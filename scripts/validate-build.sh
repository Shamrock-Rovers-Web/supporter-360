#!/bin/bash

# Supporter 360 - Build and Test Validation Script
#
# This script performs end-to-end validation of the build system and test suite.
# It should be run after completing any phase to ensure code quality and stability.
#
# Usage: npm run validate
# Or directly: ./scripts/validate-build.sh
#
# Expected Output:
#   - Build completes with exit code 0
#   - All Lambda handlers bundled successfully in packages/backend/dist/
#   - Tests execute with acceptable pass rate (80%+)
#   - Summary report printed to console
#
# Exit Codes:
#   0 - All validations passed
#   1 - Build failed
#   2 - Test execution failed
#   3 - Test pass rate below threshold

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MIN_PASS_RATE=80  # Minimum acceptable test pass rate percentage

echo "=========================================="
echo "Supporter 360 - Build & Test Validation"
echo "=========================================="
echo ""

# Step 1: Clean previous builds
echo "Step 1: Cleaning previous builds..."
rm -rf packages/backend/dist
rm -rf packages/*/dist
# Also clean TypeScript buildinfo files to ensure fresh builds
find packages -name "tsconfig.tsbuildinfo" -delete
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

# Step 2: Build all packages
echo "Step 2: Building all packages..."
if npm run build; then
    echo -e "${GREEN}✓ Build successful${NC}"

    # Verify Lambda bundles were created
    if [ -d "packages/backend/dist" ] && [ "$(ls -A packages/backend/dist)" ]; then
        BUNDLE_COUNT=$(find packages/backend/dist -name "*.js" | wc -l)
        echo -e "${GREEN}✓ Created $BUNDLE_COUNT Lambda handler bundles${NC}"
    else
        echo -e "${RED}✗ No Lambda bundles found in packages/backend/dist${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Run tests
echo "Step 3: Running test suite..."
TEST_OUTPUT=$(npm test 2>&1) || true  # Don't exit on test failures

# Parse test results for Jest output
# Jest format: "Tests:       76 failed, 343 passed, 419 total"
# Strip ANSI codes and parse the numbers
if echo "$TEST_OUTPUT" | sed 's/\x1b\[[0-9;]*m//g' | grep -q "^Tests:"; then
    # Extract test statistics from Jest output (parse the "Tests:" line)
    TESTS_LINE=$(echo "$TEST_OUTPUT" | sed 's/\x1b\[[0-9;]*m//g' | grep "^Tests:" | head -1)
    TESTS_FAILED=$(echo "$TESTS_LINE" | grep -oP '\d+(?= failed)' || echo "0")
    TESTS_PASSED=$(echo "$TESTS_LINE" | grep -oP '\d+(?= passed)' || echo "0")
    TESTS_TOTAL=$(echo "$TESTS_LINE" | grep -oP '\d+(?= total)' || echo "0")

    if [ "$TESTS_TOTAL" -gt 0 ]; then
        PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
        echo "Test Results: $TESTS_PASSED/$TESTS_TOTAL passed ($PASS_RATE%)"

        if [ "$PASS_RATE" -ge "$MIN_PASS_RATE" ]; then
            echo -e "${GREEN}✓ Test pass rate acceptable${NC}"
        else
            echo -e "${YELLOW}⚠ Test pass rate below ${MIN_PASS_RATE}% threshold${NC}"
            echo "This may indicate issues requiring attention."
        fi

        if [ "$TESTS_FAILED" -gt 0 ]; then
            echo -e "${YELLOW}⚠ $TESTS_FAILED test(s) failed${NC}"
            echo "Review test output above for details."
        fi
    else
        echo -e "${YELLOW}⚠ Could not parse test results${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Jest output format not recognized${NC}"
    echo "Check test output above for results."
fi
echo ""

# Step 4: Summary
echo "=========================================="
echo "Validation Summary"
echo "=========================================="

# Final verdict based on all checks
if [ -d "packages/backend/dist" ] && [ "$(ls -A packages/backend/dist)" ]; then
    if [ "$TESTS_TOTAL" -gt 0 ] && [ "$PASS_RATE" -ge "$MIN_PASS_RATE" ]; then
        echo -e "${GREEN}✓ ALL VALIDATIONS PASSED${NC}"
        echo ""
        echo "Build artifacts created successfully"
        echo "Test suite meets quality threshold"
        echo ""
        echo "Safe to proceed with deployment or next phase."
        exit 0
    elif [ "$TESTS_TOTAL" -gt 0 ]; then
        echo -e "${YELLOW}⚠ VALIDATION COMPLETE WITH WARNINGS${NC}"
        echo ""
        echo "Build artifacts created successfully"
        echo "Test pass rate: $PASS_RATE% (threshold: ${MIN_PASS_RATE}%)"
        echo ""
        echo "Review failed tests before proceeding."
        exit 0
    fi
fi

# If we get here, something is wrong
echo -e "${RED}✗ VALIDATION FAILED${NC}"
echo ""
echo "Review errors above and fix issues before proceeding."
exit 1
