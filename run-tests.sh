#!/bin/bash
# Script to run tests locally

set -e  # Exit immediately if a command exits with a non-zero status

# Display a colorful banner
echo -e "\033[1;36m==================================\033[0m"
echo -e "\033[1;36m   ClaudeCoder Test Runner        \033[0m"
echo -e "\033[1;36m==================================\033[0m"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "\033[1;31mError: npm could not be found. Please install Node.js and npm.\033[0m"
    exit 1
fi

# Ensure dependencies are installed
echo -e "\033[1;33mChecking and installing dependencies...\033[0m"
npm ci

# Run the tests
echo -e "\033[1;33mRunning unit tests...\033[0m"
npm test

# Show test coverage if requested
if [[ "$*" == *--coverage* ]]; then
    echo -e "\033[1;33mGenerating test coverage report...\033[0m"
    npm run test:coverage
    
    # Open coverage report if on a system with a browser
    if command -v xdg-open &> /dev/null; then
        xdg-open coverage/lcov-report/index.html
    elif command -v open &> /dev/null; then
        open coverage/lcov-report/index.html
    else
        echo -e "\033[1;33mCoverage report generated at: coverage/lcov-report/index.html\033[0m"
    fi
fi

# Build the project
echo -e "\033[1;33mBuilding the project...\033[0m"
npm run build

# Run integration tests
echo -e "\033[1;33mRunning integration tests...\033[0m"
export NODE_ENV=test
export MOCK_PR_NUMBER=999
node __tests__/integration/runner.js

echo -e "\033[1;32mAll tests completed successfully!\033[0m"
