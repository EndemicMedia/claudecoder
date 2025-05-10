@echo off
echo ================================== 
echo    ClaudeCoder Test Runner         
echo ================================== 

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: npm could not be found. Please install Node.js and npm.
    exit /b 1
)

REM Ensure dependencies are installed
echo Checking and installing dependencies...
call npm ci

REM Run the tests
echo Running unit tests...
call npm test

REM Show test coverage if requested
echo %* | findstr /C:"--coverage" >nul
if %ERRORLEVEL% equ 0 (
    echo Generating test coverage report...
    call npm run test:coverage
    
    REM Open coverage report
    start "" "coverage\lcov-report\index.html"
)

REM Build the project
echo Building the project...
call npm run build

REM Run integration tests
echo Running integration tests...
set NODE_ENV=test
set MOCK_PR_NUMBER=999
node __tests__\integration\runner.js

echo All tests completed successfully!
