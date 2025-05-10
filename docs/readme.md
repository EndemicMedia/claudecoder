---
layout: default
title: ClaudeCoder Documentation
description: Technical documentation and setup guide for the ClaudeCoder GitHub Action
---

# ClaudeCoder Documentation

## Overview

ClaudeCoder is a GitHub Action that automatically processes pull requests using AWS Bedrock and Claude 3.7 Sonnet to suggest code changes. It analyzes your repository content and pull request descriptions to provide intelligent code suggestions, enhancing your development workflow.

### Key Features

- Automatically analyzes pull requests and suggests code changes based on the pull request description
- Utilizes AWS Bedrock with Claude 3.7 Sonnet for intelligent code analysis
- Handles large responses with multi-part processing
- Respects `.gitignore` rules when analyzing repository content
- Commits suggested changes directly to the pull request branch
- Processes only pull requests with the "claudecoder" label (configurable)

### Prerequisites

Before you can use ClaudeCoder, you need to have:

1. An AWS account with access to AWS Bedrock
2. AWS credentials (Access Key ID and Secret Access Key) with permissions to invoke AWS Bedrock
3. A GitHub repository where you want to use this action

## Setup Guide

1. **Add the following secrets to your GitHub repository:**
   - `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
   - `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key

2. **Create a workflow file** (e.g., `.github/workflows/claudecoder.yml`) in your repository with the following content:

```yaml
name: ClaudeCoder

on:
  pull_request:
    types: [opened, edited, labeled]
  pull_request_review_comment:
    types: [created, edited]
  issue_comment:
    types: [created, edited]

jobs:
  process-pr:
    # Only run this job if the PR has the 'claudecoder' label
    # This is a recommended filter at the workflow level for efficiency
    if: contains(github.event.pull_request.labels.*.name, 'claudecoder')
    permissions: write-all
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: ClaudeCoderAction
      uses: EndemicMedia/claudecoder@v2.0.0
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
        # The following is optional - defaults to 'claudecoder'
        required-label: claudecoder
```

## Configuration Options

You can configure ClaudeCoder using the following inputs in your workflow file:

### Basic Configuration

- `aws-region`: The AWS region to use (default: `us-east-1`)
- `max-requests`: Maximum number of requests to make to AWS Bedrock (default: `10`)
- `required-label`: Label required on PR for processing (default: `claudecoder`)

### Advanced Claude 3.7 Sonnet Configuration

- `max-tokens`: Maximum number of tokens for Claude to generate (default: `64000`, up to 128K)
- `enable-thinking`: Enable Claude's extended thinking capability (default: `true`)
- `thinking-budget`: Token budget for Claude's thinking process (default: `1024`, minimum required by the API)
- `extended-output`: Enable 128K extended output capability (default: `true`)
- `request-timeout`: API request timeout in milliseconds (default: `3600000` - 60 minutes)

### Example with Custom Configuration

```yaml
- uses: EndemicMedia/claudecoder@v2.0.0
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: eu-west-1
    max-requests: 5
    max-tokens: 32000
    enable-thinking: true
    thinking-budget: 2000
    extended-output: true
    request-timeout: 1800000
    required-label: 'ai-review' # Custom label
```

## Usage

ClaudeCoder will automatically run on pull requests that have the "claudecoder" label. It will:

1. Verify that the PR has the required label (default: "claudecoder")
2. Analyze the repository content and the pull request description
3. Generate code suggestions using Claude 3.7 Sonnet
4. Apply the suggested changes to the pull request branch
5. Add a comment to the pull request with a summary of the changes

To use ClaudeCoder on a pull request:
1. Create or edit a pull request
2. Add the "claudecoder" label to the PR
3. Wait for ClaudeCoder to process the PR and suggest changes

## Label Filtering Options

You can implement label filtering in two ways:

1. **Workflow-level filtering (recommended)**: Using the `if` condition in your workflow file as shown in the setup example:
   ```yaml
   if: contains(github.event.pull_request.labels.*.name, 'claudecoder')
   ```
   This prevents the job from running entirely when the label is not present, saving computational resources.

2. **Action-level filtering (built-in)**: The action itself checks for the required label and exits gracefully if missing, adding a comment to inform users. This acts as a safety mechanism even if workflow-level filtering is not set up.

We recommend using both approaches for optimal efficiency and user experience.

## Limitations

- ClaudeCoder is designed to suggest changes, but it's important to review all suggestions before merging.
- The action is limited by the capabilities of Claude 3.7 Sonnet and may not understand very complex or domain-specific code patterns.
- There's a limit to the amount of repository content that can be analyzed due to API constraints.

## Contributing

Contributions to ClaudeCoder are welcome! Please see [CONTRIBUTING.md](https://github.com/EndemicMedia/claudecoder/blob/main/CONTRIBUTING.md) for guidelines on commit messages, pull requests, and our development workflow.

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

This project is licensed under the MIT License - see the [LICENSE](https://github.com/EndemicMedia/claudecoder/blob/main/LICENSE) file for details.

## Support

If you encounter any problems or have any questions about ClaudeCoder, please open an issue in this repository.
