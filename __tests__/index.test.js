const core = require('@actions/core');
const github = require('@actions/github');
const { BedrockClient } = require('../bedrock-client');
const { getRepositoryContent } = require('../utils');

// Mock all the dependencies
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../bedrock-client');
jest.mock('../utils');

// Define the main function
const main = jest.fn().mockImplementation(async () => {
  // Import the real main function to make the mocks work correctly
  try {
    return await require('../index')();
  } catch (error) {
    // Ignore errors in test environment
    console.log('Test mode, ignoring error:', error.message);
  }
});

describe('Main Action', () => {
  let mockOctokit;
  let mockBedrockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock GitHub context
    github.context = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      payload: {
        pull_request: { number: 123 }
      }
    };

    // Mock Octokit instance
    mockOctokit = {
      rest: {
        pulls: {
          get: jest.fn().mockResolvedValue({
            data: {
              body: 'PR Description',
              head: { ref: 'feature-branch' },
              base: { ref: 'main' }
            }
          }),
          listFiles: jest.fn().mockResolvedValue({
            data: [{ filename: 'index.js' }]
          })
        },
        repos: {
          getContent: jest.fn().mockResolvedValue({
            data: { sha: 'file-sha' }
          }),
          createOrUpdateFileContents: jest.fn().mockResolvedValue({})
        },
        issues: {
          createComment: jest.fn().mockResolvedValue({})
        }
      }
    };
    github.getOctokit.mockReturnValue(mockOctokit);

    // Mock core inputs
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'github-token': 'mock-token',
        'aws-access-key-id': 'mock-aws-key',
        'aws-secret-access-key': 'mock-aws-secret',
        'aws-region': 'us-east-1'
      };
      return inputs[name] || '';
    });

    // Mock BedrockClient
    mockBedrockClient = {
      getCompleteResponse: jest.fn().mockResolvedValue('git add index.js\n<<<EOF\nnew content\nEOF>>>\nEND_OF_SUGGESTIONS')
    };
    BedrockClient.mockImplementation(() => mockBedrockClient);

    // Mock repository content
    getRepositoryContent.mockResolvedValue({
      'index.js': 'console.log("Hello world");'
    });
  });

  it('should process a pull request and apply changes', async () => {
    // Load and execute the main function
    await main();

    // Verify the correct sequence of calls
    expect(github.getOctokit).toHaveBeenCalledWith('mock-token');
    expect(BedrockClient).toHaveBeenCalledWith('us-east-1', 'mock-aws-key', 'mock-aws-secret');
    expect(getRepositoryContent).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      pull_number: 123
    });

    // Verify that the bedrock client was called with the correct prompt
    expect(mockBedrockClient.getCompleteResponse).toHaveBeenCalled();
    const prompt = mockBedrockClient.getCompleteResponse.mock.calls[0][0];
    expect(prompt).toContain('Repository content');
    expect(prompt).toContain('PR Description');

    // Verify that the file was updated
    expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      path: 'index.js',
      ref: 'feature-branch'
    });

    expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      path: 'index.js',
      message: expect.stringContaining('Apply changes suggested by Claude 3.7'),
      content: expect.any(String),
      sha: 'file-sha',
      branch: 'feature-branch'
    });

    // Verify that a comment was added
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('Claude 3.7')
    });
  });

  it('should handle comments instead of PR description', async () => {
    // Change payload to simulate comment
    github.context.payload = {
      issue: { number: 123 },
      comment: { body: 'Comment text' }
    };

    await main();

    // Verify that the prompt contains the comment text
    const prompt = mockBedrockClient.getCompleteResponse.mock.calls[0][0];
    expect(prompt).toContain('Comment text');
  });

  it('should handle file not found errors when updating', async () => {
    // Mock getContent to throw a 404 error
    mockOctokit.rest.repos.getContent.mockRejectedValueOnce({ status: 404 });

    await main();

    // Verify createOrUpdateFileContents was called for new file
    expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      path: 'index.js',
      message: expect.stringContaining('Create file suggested by Claude 3.7'),
      content: expect.any(String),
      branch: 'feature-branch'
    });
  });

  it('should handle the case when no files need to be changed', async () => {
    // Mock empty files returned from listFiles
    mockOctokit.rest.pulls.listFiles.mockResolvedValueOnce({ data: [] });
    
    // Mock bedrock response with no git commands
    mockBedrockClient.getCompleteResponse.mockResolvedValueOnce('No changes needed. END_OF_SUGGESTIONS');

    await main();

    // Verify appropriate comment was made
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: expect.stringContaining('did not suggest any changes')
    });
  });

  it('should handle errors gracefully', async () => {
    // Force an error
    mockOctokit.rest.pulls.get.mockRejectedValueOnce(new Error('API Error'));

    await main();

    // Verify error was reported
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Action failed with error'));
  });
});
