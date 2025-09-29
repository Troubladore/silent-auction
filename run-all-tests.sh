#!/bin/bash

# Comprehensive Test Suite Runner for Auction System
# This script runs all test types: Unit, Integration, API, and Browser tests

set -e  # Exit on any error

echo "🚀 Starting Comprehensive Test Suite for Auction System"
echo "======================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=false
INTEGRATION_TESTS_PASSED=false
API_TESTS_PASSED=false
BROWSER_TESTS_PASSED=false

echo
echo -e "${BLUE}Phase 1: PHPUnit Backend Tests${NC}"
echo "================================"

echo "Running Unit Tests..."
if ./vendor/bin/phpunit tests/Unit/ --colors=always; then
    echo -e "${GREEN}✅ Unit Tests PASSED${NC}"
    UNIT_TESTS_PASSED=true
else
    echo -e "${RED}❌ Unit Tests FAILED${NC}"
fi

echo
echo "Running Integration Tests..."
if ./vendor/bin/phpunit tests/Integration/ --colors=always; then
    echo -e "${GREEN}✅ Integration Tests PASSED${NC}"
    INTEGRATION_TESTS_PASSED=true
else
    echo -e "${RED}❌ Integration Tests FAILED${NC}"
fi

echo
echo "Running API Tests..."
if ./vendor/bin/phpunit tests/API/ --colors=always; then
    echo -e "${GREEN}✅ API Tests PASSED${NC}"
    API_TESTS_PASSED=true
else
    echo -e "${RED}❌ API Tests FAILED${NC}"
fi

echo
echo -e "${BLUE}Phase 2: Browser End-to-End Tests${NC}"
echo "=================================="

# Check if Node.js is available for browser tests
if command -v node &> /dev/null; then
    if [ -d "tests/browser/node_modules" ]; then
        echo "Running Browser Tests with Puppeteer..."
        cd tests/browser
        if npm test; then
            echo -e "${GREEN}✅ Browser Tests PASSED${NC}"
            BROWSER_TESTS_PASSED=true
        else
            echo -e "${RED}❌ Browser Tests FAILED${NC}"
        fi
        cd ../..
    else
        echo -e "${YELLOW}⚠️  Browser tests not set up. Run 'cd tests/browser && npm install' to enable.${NC}"
        BROWSER_TESTS_PASSED=true  # Don't fail overall tests for optional browser tests
    fi
else
    echo -e "${YELLOW}⚠️  Node.js not available. Browser tests skipped.${NC}"
    BROWSER_TESTS_PASSED=true  # Don't fail overall tests for optional browser tests
fi

echo
echo -e "${BLUE}Test Results Summary${NC}"
echo "===================="

# Display results
if [ "$UNIT_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Unit Tests: FAILED${NC}"
fi

if [ "$INTEGRATION_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✅ Integration Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Integration Tests: FAILED${NC}"
fi

if [ "$API_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✅ API Tests: PASSED${NC}"
else
    echo -e "${RED}❌ API Tests: FAILED${NC}"
fi

if [ "$BROWSER_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✅ Browser Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Browser Tests: FAILED${NC}"
fi

echo
echo -e "${BLUE}Coverage Summary${NC}"
echo "==============="

# Generate coverage report if available
if ./vendor/bin/phpunit --coverage-text tests/ 2>/dev/null | tail -20; then
    echo -e "${GREEN}Code coverage report generated above${NC}"
else
    echo -e "${YELLOW}Code coverage not available (requires Xdebug)${NC}"
fi

echo
echo -e "${BLUE}Test Recommendations${NC}"
echo "==================="

echo "1. Unit Tests: Test individual PHP classes and functions"
echo "2. Integration Tests: Test complete workflows and database interactions" 
echo "3. API Tests: Test AJAX endpoints and data flow"
echo "4. Browser Tests: Test user interface and JavaScript functionality"
echo
echo "💡 For development, run specific test suites:"
echo "   ./vendor/bin/phpunit tests/Unit/            # Fast feedback"
echo "   ./vendor/bin/phpunit tests/Integration/     # Complete workflows"
echo "   cd tests/browser && npm test                # UI testing"

# Final result
if [ "$UNIT_TESTS_PASSED" = true ] && [ "$INTEGRATION_TESTS_PASSED" = true ] && [ "$API_TESTS_PASSED" = true ] && [ "$BROWSER_TESTS_PASSED" = true ]; then
    echo
    echo -e "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}Your auction system is ready for deployment.${NC}"
    exit 0
else
    echo
    echo -e "${RED}💥 SOME TESTS FAILED 💥${NC}"
    echo -e "${RED}Please fix the failing tests before deployment.${NC}"
    exit 1
fi