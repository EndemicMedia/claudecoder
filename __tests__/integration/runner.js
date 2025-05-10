/**
 * Integration test runner for ClaudeCoder
 * 
 * This script simulates a GitHub Action environment and runs the main function
 * with mocked external dependencies.
 */

// Set up environment variables needed for the action
process.env.GITHUB_REPOSITORY = 'test-owner/test-repo';
process.env.GITHUB_EVENT_NAME = 'pull_request';
process.env.INPUT_GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'mock-token';
process.env.INPUT_AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'mock-aws-key';
process.env.INPUT_AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'mock-aws-secret';
process.env.INPUT_AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Mock the GitHub context before requiring the modules
const mockPRNumber = process.env.MOCK_PR_NUMBER || 999;
jest.mock('@actions/github', () => {
  return {
    context: {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      payload: {
        pull_request: { number: parseInt(mockPRNumber) }
      }
    },
    getOctokit: jest.fn(() => ({
      rest: {
        pulls: {
          get: jest.fn().mockResolvedValue({
            data: {
              body: 'Integration test PR description',
              head: { ref: 'feature-branch' },
              base: { ref: 'main' }
            }
          }),
          listFiles: jest.fn().mockResolvedValue({
            data: [{ filename: 'test-file.js' }]
          })
        },
        repos: {
          getContent: jest.fn().mockResolvedValue({
            data: { sha: 'mock-file-sha' }
          }),
          createOrUpdateFileContents: jest.fn().mockResolvedValue({})
        },
        issues: {
          createComment: jest.fn().mockResolvedValue({})
        }
      }
    }))
  };
});

// Mock AWS Bedrock client
jest.mock('../../bedrock-client', () => {
  return {
    BedrockClient: jest.fn().mockImplementation(() => ({
      getCompleteResponse: jest.fn().mockResolvedValue(
        'git add test-file.js\n<<<EOF\nconsole.log("Integration test file");\nEOF>>>\nEND_OF_SUGGESTIONS'
      )
    }))
  };
});

// Mock repository content
jest.mock('../../utils', () => {
  return {
    getRepositoryContent: jest.fn().mockResolvedValue({
      'test-file.js': 'console.log("Original content");'
    })
  };
});

// Mock core module for logging
jest.mock('@actions/core', () => {
  return {
    getInput: jest.fn(input => process.env[`INPUT_${input.toUpperCase().replace(/-/g, '_')}`]),
    setFailed: jest.fn(msg => {
      console.error(`ERROR: ${msg}`);
      process.exitCode = 1;
    }),
    info: jest.fn(console.log),
    warning: jest.fn(console.warn),
    error: jest.fn(console.error),
    debug: jest.fn(console.debug)
  };
});

// Run the main function
console.log('Starting integration test...');

// Use async IIFE to run the test
(async () => {
  try {
    // Import the main function
    const main = require('../../index');
    
    // Wait for the main function to complete
    await main();
    
    console.log('Integration test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Integration test failed:', error);
    process.exit(1);
  }
})();
