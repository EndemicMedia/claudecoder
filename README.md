<p align="center">
  <img src="docs/assets/images/logo-placeholder.svg" alt="ClaudeCoder Logo" width="200" height="200">
</p>

<h1 align="center">ClaudeCoderAction</h1>

<p align="center">
  <b>AI-powered code changes featuring Claude and a universe of models</b>
</p>

<p align="center">
  <b>AI-powered code changes directly in your GitHub workflow</b>
</p>

<p align="center">
  <b>Start for free with OpenRouter or use premium Claude models via AWS Bedrock</b>
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

ClaudeCoderAction is a GitHub Action that automates code changes in your pull requests, offering a choice between **premium Claude models** and a wide range of other AI models. Get started for free with models from OpenRouter, or unlock the full potential of AI-powered coding with Claude via AWS Bedrock. ClaudeCoderAction analyzes your repository content and pull request descriptions to provide intelligent code suggestions, enhancing your development workflow.

<!-- Removed button links -->

## ✨ Features

- 🤖 **AI Model Flexibility** - Choose between premium Claude models (via AWS Bedrock or OpenRouter) and a wide range of other models for cost-effective AI-powered coding.
- 📊 **Intelligent Model Selection** - Priority-based model fallback system with support for Claude models and a diverse selection of models from OpenRouter.
- 🔄 **Smart Fallback System** - Automatically handles rate limits and model failures with intelligent switching and periodic retry mechanisms
- 🔄 **Seamless GitHub Integration** - Works directly within your existing GitHub workflow with zero disruption to your development process
- 🛠️ **Highly Configurable** - Customize token limits, thinking capabilities, response handling, model selection, and more to fit your team's specific needs
- 🔍 **Context-Aware** - Analyzes your entire repository to ensure changes align with your existing codebase
- 💰 **Cost Flexibility** - Start for free with OpenRouter models or use premium Claude models via AWS Bedrock, tailoring your AI coding experience to your needs and budget.
- **Accelerated Development** - Save time on routine code changes and let your team focus on strategic work
- 🔒 **Security-Focused** - Your code stays within your chosen AI provider environment (AWS or OpenRouter)

## 📋 Prerequisites

Before you can use ClaudeCoderAction, choose your preferred setup:

### Option 1: Premium Claude Models via AWS Bedrock
1. An AWS account with access to AWS Bedrock
2. AWS credentials (Access Key ID and Secret Access Key) with permissions to invoke AWS Bedrock
3. Access to Claude models in your AWS Bedrock region

### Option 2: Start for Free with OpenRouter
1. An OpenRouter account (free signup at [openrouter.ai](https://openrouter.ai))
2. OpenRouter API key to access a wide range of models, including free options to get started immediately.
3. No additional setup required - works immediately

### Common Requirements
- A GitHub repository where you want to use this action
- Basic understanding of GitHub Actions and workflows

## 🛠️ Setup

### 1. Add Required Secrets

**For Premium Claude Models via AWS Bedrock:**
- `AWS_ACCESS_KEY_ID`: Your AWS Access Key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS Secret Access Key

**For OpenRouter:**
- `OPENROUTER_API_KEY`: Your OpenRouter API key

**Optional:**
- `MODELS`: Comma-separated list of models in priority order (auto-detects provider)

### 2. Create Workflow File

Create a workflow file (e.g., `.github/workflows/claudecoder.yml`) with one of the following configurations:

#### Option A: Start for Free with OpenRouter
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

#### Option B: Premium Claude Models via AWS Bedrock
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

ClaudeCoderAction automatically runs on pull requests with the "claudecoder" label, and will:

1. Verify the PR has the required label (default: "claudecoder")
2. Analyze the repository content and the pull request description
3. Generate code suggestions using your selected AI model.
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

# Premium Claude models via AWS Bedrock
models: "us.anthropic.claude-3-7-sonnet-20250219-v1:0,anthropic.claude-3-haiku-20240307-v1:0"

# Single model (no fallback)
models: "moonshotai/kimi-k2:free"
```

### 🔄 Intelligent Fallback System

ClaudeCoder includes a sophisticated fallback system that automatically handles rate limiting and model failures:

#### How It Works
1. **Priority Order**: Models are tried in the order specified in the `models` parameter
2. **Rate Limit Detection**: Automatically detects HTTP 429 responses and rate limit messages
3. **Smart Switching**: Immediately switches to the next available model when rate limits are hit
4. **Periodic Retry**: Rate-limited models are automatically retried every 5 requests after a 5-minute cooldown
5. **Failure Tracking**: Models are temporarily disabled after 2 consecutive failures
6. **Recovery**: Failed models are reset and retried when all other options are exhausted

#### Fallback Behavior
```
Request 1: Try Kimi K2 → ✅ Success (continue using)
Request 2: Try Kimi K2 → ❌ Rate Limited → Switch to Gemini  
Request 3: Try Gemini → ✅ Success
Request 4: Try Gemini → ❌ Server Error → Continue with Gemini (retry)
Request 5: Try Gemini → ❌ Server Error → Switch to DeepSeek (max retries hit)
Request 6: Try DeepSeek → ✅ Success
Request 7: Try DeepSeek → ✅ Success
Request 8: Try Kimi K2 → ✅ Success (rate limit expired, back to primary)
```

#### Best Practices
- **Use multiple models**: Provide 3-4 models for maximum reliability
- **Mix model types**: Different providers handle different content types better
- **Monitor logs**: Check GitHub Actions logs to see fallback behavior and optimize model order
- **Start with free models**: Place free/reliable models first in your priority list

#### Example Fallback Configuration
```yaml
# Robust fallback with multiple free models
models: "moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free,deepseek/deepseek-r1-0528:free,qwen/qwq-32b:free"

# AWS with fallback tiers (high → medium → fast)  
models: "us.anthropic.claude-3-7-sonnet-20250219-v1:0,anthropic.claude-3-5-sonnet-20241022-v2:0,anthropic.claude-3-haiku-20240307-v1:0"
```

## 🚀 Latest Model Support - Claude 4 Series

ClaudeCoderAction now supports the latest Claude 4 models with intelligent error handling and automatic fallback when models aren't authorized.

### 🆕 Claude 4 Series Models

The latest and most powerful Claude models are now available:

| Model ID | Display Name | Provider | Notes |
|----------|--------------|----------|-------|
| `us.anthropic.claude-sonnet-4-20250514-v1:0` | Claude Sonnet 4 (AWS US) | AWS Bedrock | **Latest** - Requires authorization |
| `anthropic.claude-opus-4-20250514-v1:0` | Claude Opus 4 (AWS Bedrock) | AWS Bedrock | **Latest** - Requires authorization |
| `us.anthropic.claude-opus-4-1-20250805-v1:0` | Claude Opus 4.1 (AWS US) | AWS Bedrock | **Latest** - Requires authorization |

### 🛡️ Intelligent Model Authorization Detection

When you request a Claude 4 model that isn't authorized in your AWS account, ClaudeCoderAction will:

1. **Detect the authorization error automatically**
2. **Provide step-by-step instructions** for enabling the model in AWS Bedrock
3. **Automatically fall back** to an available model
4. **Continue processing** your request without interruption

#### Example Error Handling Output

```
🚨 AWS Bedrock Model Access Required: Claude Sonnet 4 (AWS US) - Latest
❌ Error: ValidationException: Model access not enabled
📋 To use Claude 4 (Latest) models, you need to:
   1. Go to AWS Bedrock Console: https://console.aws.amazon.com/bedrock/
   2. Navigate to 'Model access' in the left sidebar
   3. Click 'Enable specific models' or 'Modify model access'
   4. Find 'Claude 4 (Latest)' and click 'Enable'
   5. Wait for approval (may take a few minutes)
🔄 Falling back to available model...
```

### 📝 Model Configuration Examples

#### Latest Claude 4 Models with Fallback
```yaml
# Use latest Claude 4 with intelligent fallback to free models
models: "us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free"

# Claude 4.1 with AWS Bedrock fallback chain
models: "us.anthropic.claude-opus-4-1-20250805-v1:0,us.anthropic.claude-3-7-sonnet-20250219-v1:0,anthropic.claude-3-haiku-20240307-v1:0"
```

#### Cross-Provider Fallback Strategy
```yaml
# Premium to free fallback strategy
models: "us.anthropic.claude-sonnet-4-20250514-v1:0,anthropic/claude-3.7-sonnet:beta,moonshotai/kimi-k2:free"

# Latest Claude with multiple provider fallback
models: "us.anthropic.claude-opus-4-1-20250805-v1:0,google/gemini-2.0-flash-exp:free,deepseek/deepseek-r1-0528:free"
```

#### All Claude 4 Models for Maximum Performance
```yaml
# All latest Claude 4 models (requires AWS Bedrock authorization)
models: "us.anthropic.claude-opus-4-1-20250805-v1:0,us.anthropic.claude-sonnet-4-20250514-v1:0,anthropic.claude-opus-4-20250514-v1:0"
```

### 🔧 Setting Up Claude 4 Models

#### Step 1: Configure Your GitHub Secrets

Add these secrets to your GitHub repository:

```
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
MODELS=us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free
```

#### Step 2: Enable Models in AWS Bedrock

1. **Go to AWS Bedrock Console**: https://console.aws.amazon.com/bedrock/
2. **Navigate to 'Model access'** in the left sidebar
3. **Click 'Enable specific models'** or 'Modify model access'
4. **Find and enable Claude models**:
   - Search for "Claude 4"
   - Enable "Claude Sonnet 4" and/or "Claude Opus 4.1"
   - Submit your request
5. **Wait for approval** (usually takes a few minutes, but can take up to 24 hours)

#### Step 3: Update Your Workflow

```yaml
name: ClaudeCoder

on:
  pull_request:
    types: [opened, edited, labeled]

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
        # Latest Claude 4 with free fallback
        models: ${{ secrets.MODELS }}
        github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 🎯 Understanding Model Selection Priority

ClaudeCoderAction processes models in **left-to-right priority order**:

```yaml
# This configuration means:
models: "us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free"

# Priority 1: Try Claude Sonnet 4 (latest, premium)
# Priority 2: If unauthorized/unavailable → Try Kimi K2 (free, reliable)  
# Priority 3: If Kimi is rate-limited → Try Gemini 2.0 (free, backup)
```

### 💡 Best Practices for Model Configuration

#### ✅ Recommended Configurations

**🚀 Performance-First with Cost Protection**
```yaml
# Start with latest Claude 4, fall back to free models
models: "us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free"
```

**💰 Cost-Conscious with Premium Fallback**
```yaml
# Start with free models, escalate to premium if needed
models: "moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free,us.anthropic.claude-3-7-sonnet-20250219-v1:0"
```

**🏢 Enterprise All-Premium Setup**
```yaml
# All premium models for consistent high-quality output
models: "us.anthropic.claude-opus-4-1-20250805-v1:0,us.anthropic.claude-3-7-sonnet-20250219-v1:0,anthropic.claude-3-5-sonnet-20241022-v2:0"
```

#### ❌ Configurations to Avoid

```yaml
# DON'T: Single model (no fallback)
models: "us.anthropic.claude-sonnet-4-20250514-v1:0"

# DON'T: All expensive models without free fallback  
models: "us.anthropic.claude-opus-4-1-20250805-v1:0,us.anthropic.claude-opus-4-20250514-v1:0"

# DON'T: Mix unrelated providers without logic
models: "some-random-model,us.anthropic.claude-sonnet-4-20250514-v1:0"
```

### 🔍 Monitoring Model Usage

Check your GitHub Actions logs to see:

- **Which models are being used**: `✅ Model Claude Sonnet 4 (AWS US) succeeded`
- **Authorization issues**: `🚨 AWS Bedrock Model Access Required`
- **Fallback behavior**: `🔄 Switching from Claude Sonnet 4 to Kimi K2`
- **Rate limiting**: `⏳ Model Kimi K2 rate limited - will retry in 300s`

### 🆘 Troubleshooting Model Issues

#### "Model access not enabled" Error
- **Solution**: Follow the AWS Bedrock authorization steps above
- **Temporary fix**: The action will automatically fall back to available models

#### "ValidationException" Errors  
- **Cause**: Model not available in your AWS region
- **Solution**: Use `us.anthropic.` prefix models (US region) or switch regions

#### High AWS Costs
- **Solution**: Add free OpenRouter models as fallbacks in your model list
- **Example**: `"us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free"`

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
    # Example: Use Claude 3 Sonnet via OpenRouter
    # models: "anthropic/claude-3-sonnet-20240229:0"
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

## 📋 Complete Model Reference

### AWS Bedrock Models

#### 🆕 Claude 4 Series (Latest)
| Model ID | Display Name | Notes |
|----------|--------------|-------|
| `us.anthropic.claude-sonnet-4-20250514-v1:0` | Claude Sonnet 4 (AWS US) - Latest | **Newest**, requires authorization |
| `anthropic.claude-opus-4-20250514-v1:0` | Claude Opus 4 (AWS Bedrock) - Latest | **Newest**, requires authorization |
| `us.anthropic.claude-opus-4-1-20250805-v1:0` | Claude Opus 4.1 (AWS US) - Latest | **Newest**, requires authorization |

#### Claude 3.x Series (Current)
| Model ID | Display Name | Notes |
|----------|--------------|-------|
| `us.anthropic.claude-3-7-sonnet-20250219-v1:0` | Claude 3.7 Sonnet (AWS US) - Default AWS | Most reliable AWS model |
| `anthropic.claude-3-5-sonnet-20241022-v2:0` | Claude 3.5 Sonnet v2 (AWS Bedrock) | High performance |
| `anthropic.claude-3-5-sonnet-20240620-v1:0` | Claude 3.5 Sonnet (AWS Bedrock) | Stable version |
| `anthropic.claude-3-5-haiku-20241022-v1:0` | Claude 3.5 Haiku (AWS Bedrock) | Fast and cost-effective |
| `anthropic.claude-3-opus-20240229-v1:0` | Claude 3 Opus (AWS Bedrock) | Premium reasoning |
| `anthropic.claude-3-sonnet-20240229-v1:0` | Claude 3 Sonnet (AWS Bedrock) | Balanced performance |
| `anthropic.claude-3-haiku-20240307-v1:0` | Claude 3 Haiku (AWS Bedrock) | Fastest response |

### OpenRouter Models

#### Premium Models
| Model ID | Display Name | Notes |
|----------|--------------|-------|
| `anthropic/claude-3.7-sonnet:beta` | Claude 3.7 Sonnet (OpenRouter) | Latest via OpenRouter |
| `anthropic/claude-3-5-sonnet` | Claude 3.5 Sonnet (OpenRouter) | High quality |

#### Free Models (Recommended for Testing)
| Model ID | Display Name | Notes |
|----------|--------------|-------|
| `moonshotai/kimi-k2:free` | Kimi K2 (Free) - Default OpenRouter | **Recommended default** |
| `google/gemini-2.0-flash-exp:free` | Gemini 2.0 Flash (Free) | Good for code tasks |
| `deepseek/deepseek-r1-0528:free` | DeepSeek R1 (Free) | Strong reasoning |
| `z-ai/glm-4.5-air:free` | GLM-4.5 Air (Free) | Lightweight option |
| `qwen/qwq-32b:free` | QwQ 32B (Free) | Large context window |
| `thudm/glm-z1-32b:free` | GLM-Z1 32B (Free) | Chinese-optimized |

### Quick Configuration Templates

Copy and paste these into your GitHub Secrets as the `MODELS` value:

```bash
# 🏆 RECOMMENDED: Latest Claude 4 with free fallback
MODELS="us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free"

# 💰 COST-EFFECTIVE: Free models only
MODELS="moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free,deepseek/deepseek-r1-0528:free"

# 🚀 PERFORMANCE: All premium Claude models
MODELS="us.anthropic.claude-opus-4-1-20250805-v1:0,us.anthropic.claude-3-7-sonnet-20250219-v1:0,anthropic.claude-3-5-sonnet-20241022-v2:0"

# 🔄 HYBRID: Best of both worlds
MODELS="us.anthropic.claude-sonnet-4-20250514-v1:0,anthropic/claude-3.7-sonnet:beta,moonshotai/kimi-k2:free"

# ⚡ SPEED: Fast models with quality fallback
MODELS="moonshotai/kimi-k2:free,anthropic.claude-3-haiku-20240307-v1:0,google/gemini-2.0-flash-exp:free"
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

- ClaudeCoderAction is designed to suggest changes, so it's important to review all suggestions before merging.
- The action's effectiveness depends on the capabilities of the selected AI model and may not understand very complex or domain-specific code patterns.
- There's a limit to the amount of repository content that can be analyzed, depending on the selected AI model and provider API constraints.

## 🧪 Testing

ClaudeCoderAction includes a comprehensive testing suite to ensure reliability and maintainability.

### Test Coverage

Current test coverage metrics:
- **Overall Coverage**: 67.86% statements, 78.12% functions
- **OpenRouter Client**: 85.36% statements (comprehensive API testing)
- **Model Selector**: 100% coverage (complete functionality testing)
- **Utils**: 100% coverage (perfect test coverage)

### Testing Structure

```
__tests__/
├── unit/                    # Unit tests for individual components
│   ├── openrouter-client-simple.test.js
│   └── model-selector.test.js
├── integration/            # Integration tests (future)
├── e2e/                   # End-to-end tests (future)
├── fixtures/              # Test data and mocks
└── *.test.js              # Legacy test files
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests by category
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:legacy       # Legacy test files

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run all test categories
npm run test:all
```

### Real-World Testing with GitHub Events

Our testing suite includes comprehensive real-world scenarios using actual GitHub webhook payloads:

#### Event Fixtures
We maintain realistic GitHub event payloads for various scenarios:

```bash
__tests__/fixtures/
├── events/                 # Real GitHub webhook payloads
│   ├── pr-labeled-basic.json      # Calculator improvement scenario
│   ├── pr-labeled-react.json      # React component creation
│   └── ...
└── files/                  # Sample code files for testing
    ├── calculator-legacy.js       # Legacy code needing modernization
    └── ...
```

#### E2E Testing with Real APIs

Our E2E tests support both OpenRouter and AWS Bedrock with identical prompts for consistency:

```bash
# Run all E2E tests (mock APIs by default)
npm run test:e2e

# Test specific providers with real API calls
OPENROUTER_API_KEY=your_key npm run test:openrouter
AWS_ACCESS_KEY_ID=key AWS_SECRET_ACCESS_KEY=secret npm run test:bedrock

# Test cross-provider fallback (requires both API credentials)
npm run test:cross-provider

# Test all real APIs together
npm run test:real-api
```

**Tested Models:**

**OpenRouter (Free Tier):**
- `moonshotai/kimi-k2:free` - Kimi K2 (Default OpenRouter)
- `google/gemini-2.0-flash-exp:free` - Gemini 2.0 Flash  
- `deepseek/deepseek-r1-0528:free` - DeepSeek R1

**AWS Bedrock:**
- `us.anthropic.claude-3-7-sonnet-20250219-v1:0` - Claude 3.7 Sonnet (Default AWS)
- `anthropic.claude-3-5-sonnet-20241022-v2:0` - Claude 3.5 Sonnet

**Cross-Provider Testing:**
- Tests identical prompts across both OpenRouter and AWS Bedrock
- Validates fallback behavior between different providers
- Ensures consistent response quality across providers

**Test Coverage:**
- ✅ **Same Prompts**: Identical test prompts across all providers for consistency
- ✅ **Rate Limiting**: Real rate limit handling and cooldown testing
- ✅ **Model Fallback**: Automatic switching between models and providers
- ✅ **Error Recovery**: Throttling, quota limits, and network error handling

#### Test Scenarios

**Scenario 1: Legacy Code Modernization**
- PR requests: "Convert to ES6, add error handling, improve structure"
- Tests model's ability to understand context and apply modern patterns
- Validates EOF parsing with multiple marker formats

**Scenario 2: React Component Creation**
- PR requests: "Create TaskManager component with useState and Tailwind"
- Tests framework-specific knowledge and best practices
- Validates complex file creation workflows

**Scenario 3: Model Fallback Testing**
- Simulates rate limiting on primary models
- Tests automatic fallback to secondary models
- Validates error recovery and cooldown mechanisms

### Local Testing with ACT

Test the complete GitHub Action locally using [act](https://github.com/nektos/act):

```bash
# Install ACT (macOS)
brew install act

# Configure environment variables
cp .env.example .env
# Edit .env with your API credentials

# Run local test with specific event
npm run test:act

# Or run ACT directly with custom parameters
act --job process-pr --secret-file .env --eventpath __tests__/fixtures/events/pr-labeled-basic.json

# Test specific scenarios
npm run action:react       # React-specific test
npm run action:pr         # Pull request test
```

### Testing Philosophy

- **Comprehensive Coverage**: All critical paths and edge cases are tested
- **API Mocking**: Uses [Nock](https://github.com/nock/nock) for reliable HTTP mocking
- **Error Handling**: Complete coverage of rate limits, timeouts, and network errors
- **Edge Cases**: Tests for malformed data, empty responses, and boundary conditions
- **Quality Thresholds**: Jest coverage thresholds enforce minimum quality standards

### Test Features

**OpenRouter Client Tests:**
- ✅ Successful API calls with text and images
- ✅ Rate limiting and error handling
- ✅ Token limit detection and management
- ✅ Request configuration and headers
- ✅ Multi-request completion handling

**Model Selector Tests:**
- ✅ Provider detection (AWS Bedrock vs OpenRouter)
- ✅ Model parsing and validation
- ✅ Display name generation
- ✅ Priority and filtering logic
- ✅ Comprehensive model support validation

**Integration Testing:**
- ✅ ACT-based local testing
- ✅ Real API interaction verification
- ✅ File modification testing in local mode
- ✅ End-to-end workflow validation

### Coverage Thresholds

The project enforces quality standards through Jest coverage thresholds:

```javascript
// Global minimums
global: {
  branches: 70%,
  functions: 70%,
  lines: 75%,
  statements: 75%
}

// Per-file requirements
openrouter-client.js: 85%+
model-selector.js: 90%+
utils.js: 95%+
```

## 👥 Contributing

Contributions to ClaudeCoderAction are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on commit messages, pull requests, and our development workflow.

**Before contributing:**
1. Run the full test suite: `npm run test:all`
2. Ensure coverage thresholds are met: `npm run test:coverage`
3. Test locally with ACT if making action changes
4. Follow the existing code patterns and add tests for new functionality

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
