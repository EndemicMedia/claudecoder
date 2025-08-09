<p align="center">
  <img src="docs/assets/images/logo-placeholder.svg" alt="ClaudeCoder Logo" width="200" height="200">
</p>

<h1 align="center">ClaudeCoderAction</h1>

<p align="center">
  <b>AI-powered code changes directly in your GitHub workflow</b>
</p>

<p align="center">
  <a href="https://github.com/EndemicMedia/claudecoder/actions/workflows/test.yml"><img src="https://github.com/EndemicMedia/claudecoder/actions/workflows/test.yml/badge.svg" alt="Test Status"></a>
  <a href="https://github.com/EndemicMedia/claudecoder/releases"><img src="https://img.shields.io/github/v/release/EndemicMedia/claudecoder" alt="Latest Release"></a>
  <a href="https://github.com/EndemicMedia/claudecoder/blob/main/LICENSE"><img src="https://img.shields.io/github/license/EndemicMedia/claudecoder" alt="License"></a>
  <a href="https://github.com/EndemicMedia/claudecoder/stargazers"><img src="https://img.shields.io/github/stars/EndemicMedia/claudecoder" alt="GitHub Stars"></a>
  <a href="https://github.com/sponsors/EndemicMedia"><img src="https://img.shields.io/badge/Sponsor-♥-ff69b4" alt="Sponsor"></a>
  <a href="https://github.com/EndemicMedia/claudecoder/actions/workflows/release.yml"><img src="https://github.shields.io/github/actions/workflow/status/EndemicMedia/claudecoder/release.yml" alt="Release Status"></a>
  <a href="https://github.com/EndemicMedia/claudecoder/network/members"><img src="https://img.shields.io/github/forks/EndemicMedia/claudecoder" alt="Forks"></a>
</p>

<p align="center">
  <b>Turn PR feedback into code instantly using multiple AI providers</b>
</p>

---

## Overview

ClaudeCoder is a GitHub Action that automatically processes pull requests using **multiple AI providers** (AWS Bedrock, OpenRouter) with **intelligent model selection** to suggest code changes. It analyzes your repository content and pull request descriptions to provide intelligent code suggestions, enhancing your development workflow.

<p align="center">
  <a href="https://github.com/EndemicMedia/claudecoder" class="btn primary">Get Started</a>
  &nbsp;&nbsp;
  <a href="https://github.com/sponsors/EndemicMedia" class="btn secondary">❤️ Sponsor</a>
</p>

## ✨ Features

- 🤖 **Multi-Provider AI Support** - Choose between AWS Bedrock and OpenRouter with automatic provider detection based on model selection
- 📊 **Intelligent Model Selection** - Priority-based model fallback system with support for multiple Claude models and free OpenRouter models
- 🔄 **Seamless GitHub Integration** - Works directly within your existing GitHub workflow with zero disruption to your development process
- 🛠️ **Highly Configurable** - Customize token limits, thinking capabilities, response handling, model selection, and more to fit your team's specific needs
- 🔍 **Context-Aware** - Analyzes your entire repository to ensure changes align with your existing codebase
- 💰 **Cost Flexibility** - Use free OpenRouter models or premium AWS Bedrock models based on your needs and budget
- **Accelerated Development** - Save time on routine code changes and let your team focus on strategic work
- 🔒 **Security-Focused** - Your code stays within your chosen AI provider environment (AWS or OpenRouter)

## 📋 Prerequisites

Before you can use ClaudeCoderAction, you need **one of the following**:

### Option 1: AWS Bedrock (Premium Models)
1. An AWS account with access to AWS Bedrock
2. AWS credentials (Access Key ID and Secret Access Key) with permissions to invoke AWS Bedrock
3. Access to Claude models in your AWS Bedrock region

### Option 2: OpenRouter (Free & Premium Models)
1. An OpenRouter account (free signup at [openrouter.ai](https://openrouter.ai))
2. OpenRouter API key with access to free or paid models
3. No additional setup required - works immediately

### Common Requirements
- A GitHub repository where you want to use this action
- Basic understanding of GitHub Actions and workflows

## 🛠️ Setup

### 1. Add Required Secrets

**For AWS Bedrock:**
- `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key

**For OpenRouter:**
- `OPENROUTER_API_KEY`: Your OpenRouter API key

**Optional:**
- `MODELS`: Comma-separated list of models in priority order (auto-detects provider)

### 2. Create Workflow File

Create a workflow file (e.g., `.github/workflows/claudecoder.yml`) with one of the following configurations:

#### Option A: OpenRouter (Free Models - Recommended)
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
    if: contains(github.event.pull_request.labels.*.name, 'claudecoder')
    permissions: write-all
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: ClaudeCoderAction
      uses: EndemicMedia/claudecoder@v2.1.0
      with:
        openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
        # Uses free Kimi K2 model by default - no cost!
```

#### Option B: AWS Bedrock (Premium Models)
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
    if: contains(github.event.pull_request.labels.*.name, 'claudecoder')
    permissions: write-all
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: ClaudeCoderAction
      uses: EndemicMedia/claudecoder@v2.1.0
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

#### Option C: Custom Model Selection
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
    if: contains(github.event.pull_request.labels.*.name, 'claudecoder')
    permissions: write-all
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: ClaudeCoderAction
      uses: EndemicMedia/claudecoder@v2.1.0
      with:
        # Provider auto-detected from first model
        openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        models: ${{ secrets.MODELS }} # e.g., "google/gemini-2.0-flash-exp:free,moonshotai/kimi-k2:free"
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

## ▶️ Usage

ClaudeCoderAction will automatically run on pull requests that have the "claudecoder" label. It will:

1. Verify that the PR has the required label (default: "claudecoder")
2. Analyze the repository content and the pull request description
3. Generate code suggestions using Claude 3.7 Sonnet
4. Apply the suggested changes to the pull request branch
5. Add a comment to the pull request with a summary of the changes

To use ClaudeCoder on a pull request:
1. Create or edit a pull request
2. Add the "claudecoder" label to the PR
3. Wait for ClaudeCoder to process the PR and suggest changes

## ⚙️ Configuration

### AI Provider Configuration
- `ai-provider`: AI provider to use (`aws`, `openrouter`, or `auto` for auto-detection based on model)
- `models`: Comma-separated list of models in priority order (auto-detects provider from first model)
- `aws-access-key-id`: AWS Access Key ID (required for AWS Bedrock)
- `aws-secret-access-key`: AWS Secret Access Key (required for AWS Bedrock)  
- `aws-region`: AWS region to use (default: `us-east-1`)
- `openrouter-api-key`: OpenRouter API key (required for OpenRouter)

### Model Selection Examples
```yaml
# OpenRouter free models only (recommended)
models: "moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free,deepseek/deepseek-r1-0528:free"

# AWS Bedrock models only  
models: "us.anthropic.claude-3-7-sonnet-20250219-v1:0,anthropic.claude-3-haiku-20240307-v1:0"

# Single model (no fallback)
models: "moonshotai/kimi-k2:free"
```

### Basic Configuration  
- `max-requests`: Maximum number of requests to make (default: `10`)
- `required-label`: Label required on PR for processing (default: `claudecoder`)

### Advanced AI Configuration
- `max-tokens`: Maximum number of tokens for AI to generate (default: `64000`, up to 128K)
- `enable-thinking`: Enable extended thinking capability (default: `true`)
- `thinking-budget`: Token budget for thinking process (default: `1024`)
- `extended-output`: Enable 128K extended output capability (default: `true`)  
- `request-timeout`: API request timeout in milliseconds (default: `3600000` - 60 minutes)

### Example Configurations

#### OpenRouter with Custom Models and Settings
```yaml
- uses: EndemicMedia/claudecoder@v2.1.0
  with:
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
    models: "google/gemini-2.0-flash-exp:free,moonshotai/kimi-k2:free"
    max-requests: 5
    max-tokens: 32000
    enable-thinking: true
    thinking-budget: 2000
    required-label: 'ai-review'
```

#### AWS Bedrock with Custom Configuration
```yaml
- uses: EndemicMedia/claudecoder@v2.1.0
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: eu-west-1
    models: "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
    max-requests: 5
    max-tokens: 32000
    enable-thinking: true
    thinking-budget: 2000
    extended-output: true
    request-timeout: 1800000
    required-label: 'ai-review'
```

## 🏷️ Label Filtering Options

You can implement label filtering in two ways:

1. **Workflow-level filtering (recommended)**: Using the `if` condition in your workflow file as shown in the setup example:
   ```yaml
   if: contains(github.event.pull_request.labels.*.name, 'claudecoder')
   ```
   This prevents the job from running entirely when the label is not present, saving computational resources.

2. **Action-level filtering (built-in)**: The action itself checks for the required label and exits gracefully if missing, adding a comment to inform users. This acts as a safety mechanism even if workflow-level filtering is not set up.

We recommend using both approaches for optimal efficiency and user experience.

## ⚠️ Limitations

- ClaudeCoderAction is designed to suggest changes, but it's important to review all suggestions before merging.
- The action is limited by the capabilities of Claude 3.7 Sonnet and may not understand very complex or domain-specific code patterns.
- There's a limit to the amount of repository content that can be analyzed due to API constraints.

## 👥 Contributing

Contributions to ClaudeCoderAction are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on commit messages, pull requests, and our development workflow.

This project follows [Conventional Commits](https://www.conventionalcommits.org/) and uses semantic-release for automated versioning.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ❤️ Support

If you find ClaudeCoderAction valuable, please consider supporting the project:

<p align="center">
  <a href="https://github.com/sponsors/EndemicMedia"><img src="https://img.shields.io/badge/Sponsor-Support%20Our%20Work-ff69b4?style=for-the-badge&logo=githubsponsors" alt="Sponsor via GitHub Sponsors" width="250" /></a>
</p>

Your support helps us maintain and improve ClaudeCoderAction. Every contribution makes a difference!

## 💬 Community

If you encounter any problems or have any questions about ClaudeCoderAction, please open an issue in this repository. We're here to help!

## 🔗 Related Projects

Check out these other awesome AI-powered developer tools:

- [GitHub Copilot](https://github.com/features/copilot) - AI pair programming
- [AWS Bedrock](https://aws.amazon.com/bedrock/) - Foundation models for AI applications

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/EndemicMedia">EndemicMedia</a></sub>
</p>
