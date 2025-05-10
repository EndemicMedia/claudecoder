# ClaudeCoder

ClaudeCoder is a GitHub Action that automatically processes pull requests using AWS Bedrock and Claude 3.7 to suggest code changes. It analyzes your repository content and pull request descriptions to provide intelligent code suggestions, enhancing your development workflow.

## Features

- Automatically analyzes pull requests and suggests code changes based on the pull request description
- Utilizes AWS Bedrock with Claude 3.7 for intelligent code analysis
- Handles large responses with multi-part processing
- Respects `.gitignore` rules when analyzing repository content
- Commits suggested changes directly to the pull request branch

## Prerequisites

Before you can use ClaudeCoder, you need to have:

1. An AWS account with access to AWS Bedrock
2. AWS credentials (Access Key ID and Secret Access Key) with permissions to invoke AWS Bedrock
3. A GitHub repository where you want to use this action

## Setup

1. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key

2. Create a workflow file (e.g., `.github/workflows/claudecoder.yml`) in your repository with the following content:

```yaml
name: ClaudeCoder

on:
  pull_request:
    types: [opened, edited]
  pull_request_review_comment:
    types: [created, edited]
  issue_comment:
    types: [created, edited]

jobs:
  process-pr:
    permissions: write-all
    runs-on: ubuntu-latest
    steps:
    - name: ClaudeCoderAction
      uses: EndemicMedia/claudecoder@v1.1.0
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Usage

Once set up, ClaudeCoder will automatically run on every new pull request or when a pull request is edited. It will:

1. Analyze the repository content and the pull request description
2. Generate code suggestions using Claude 3.7
3. Apply the suggested changes to the pull request branch
4. Add a comment to the pull request with a summary of the changes

No additional action is required from the user after setup.

## Configuration

You can configure ClaudeCoder using the following inputs in your workflow file:

- `aws-region`: The AWS region to use (default: `us-east-1`)
- `max-requests`: Maximum number of requests to make to AWS Bedrock (default: `10`)

Example with custom configuration:

```yaml
- uses: your-github-username/claudecoder@v1
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: eu-west-1
    max-requests: 3
```

## Limitations

- ClaudeCoder is designed to suggest changes, but it's important to review all suggestions before merging.
- The action is limited by the capabilities of Claude 3.7 and may not understand very complex or domain-specific code patterns.
- There's a limit to the amount of repository content that can be analyzed due to API constraints.

## Contributing

Contributions to ClaudeCoder are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on commit messages, pull requests, and our development workflow.

### Testing

ClaudeCoder includes a comprehensive test suite built with Jest. Tests cover:

- Unit tests for all components
- Integration tests with mocked external dependencies
- GitHub Actions workflow tests

To run the tests locally:

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

Windows users can use the provided batch file:
```
run-tests.bat
```

All pull requests are automatically tested using GitHub Actions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any problems or have any questions about ClaudeCoder, please open an issue in this repository.
