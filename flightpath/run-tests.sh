#!/bin/bash

echo "========================================"
echo "Air Traffic Routes Game - Test Suite"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Python is installed for the web server
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "ERROR: Python is not installed or not in PATH"
    echo "Please install Python from https://python.org/"
    exit 1
fi

# Install Playwright if not already installed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo "Installing Playwright test framework..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
fi

# Install Playwright browsers if needed
echo "Checking Playwright browsers..."
npx playwright install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Playwright browsers"
    exit 1
fi

echo
echo "========================================"
echo "Running Test Suite"
echo "========================================"
echo

# Run different test suites based on command line argument
case "$1" in
    "desktop")
        echo "Running Desktop Tests Only..."
        npx playwright test --grep "Desktop"
        ;;
    "mobile")
        echo "Running Mobile Tests Only..."
        npx playwright test --grep "Mobile"
        ;;
    "headed")
        echo "Running All Tests in Headed Mode..."
        npx playwright test --headed
        ;;
    "debug")
        echo "Running Tests in Debug Mode..."
        npx playwright test --debug
        ;;
    *)
        echo "Running Full Test Suite..."
        npx playwright test
        ;;
esac

TEST_EXIT_CODE=$?

echo
echo "========================================"
echo "Test Results"
echo "========================================"
echo

# Check exit code
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo "TESTS FAILED - Check output above for details"
    echo
    echo "To run specific test suites:"
    echo "  ./run-tests.sh desktop  - Desktop functionality only"
    echo "  ./run-tests.sh mobile   - Mobile/touch functionality only"
    echo "  ./run-tests.sh headed   - Run with visible browser windows"
    echo "  ./run-tests.sh debug    - Run in debug mode"
else
    echo "ALL TESTS PASSED - Game is working correctly!"
fi

echo
echo "Test report available at: playwright-report/index.html"

exit $TEST_EXIT_CODE