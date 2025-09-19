@echo off
echo ========================================
echo Air Traffic Routes Game - Test Suite
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if Python is installed for the web server
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

:: Install Playwright if not already installed
if not exist node_modules\@playwright\test (
    echo Installing Playwright test framework...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Install Playwright browsers if needed
echo Checking Playwright browsers...
npx playwright install
if errorlevel 1 (
    echo ERROR: Failed to install Playwright browsers
    pause
    exit /b 1
)

echo.
echo ========================================
echo Running Test Suite
echo ========================================
echo.

:: Run different test suites based on command line argument
if "%1"=="desktop" (
    echo Running Desktop Tests Only...
    npx playwright test --grep "Desktop"
) else if "%1"=="mobile" (
    echo Running Mobile Tests Only...
    npx playwright test --grep "Mobile"
) else if "%1"=="headed" (
    echo Running All Tests in Headed Mode...
    npx playwright test --headed
) else if "%1"=="debug" (
    echo Running Tests in Debug Mode...
    npx playwright test --debug
) else (
    echo Running Full Test Suite...
    npx playwright test
)

echo.
echo ========================================
echo Test Results
echo ========================================
echo.

:: Check exit code
if errorlevel 1 (
    echo TESTS FAILED - Check output above for details
    echo.
    echo To run specific test suites:
    echo   run-tests.bat desktop  - Desktop functionality only
    echo   run-tests.bat mobile   - Mobile/touch functionality only
    echo   run-tests.bat headed   - Run with visible browser windows
    echo   run-tests.bat debug    - Run in debug mode
) else (
    echo ALL TESTS PASSED - Game is working correctly!
)

echo.
echo Test report available at: playwright-report/index.html
pause