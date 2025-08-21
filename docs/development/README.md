# 🔧 Development Guide

Complete development setup, local usage, and contribution guidelines for ClaudeCoder.

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v16 or later
- **Git**: Repository management
- **AI Provider**: OpenRouter (free) or AWS Bedrock credentials

### Local Usage

```bash
# Basic usage
node local-claudecoder.js "your prompt" /path/to/repo

# With specific model and dry-run
node local-claudecoder.js "Add authentication" ~/my-project --models "moonshotai/kimi-k2:free" --dry-run

# Using the wrapper script
./claudecoder-local.sh "your prompt" /path/to/repo
```

## 🌍 Environment Setup

### OpenRouter (Recommended - Free Tier Available)
```bash
export OPENROUTER_API_KEY=your_openrouter_api_key
```

### AWS Bedrock (Enterprise)
```bash
export AWS_ACCESS_KEY_ID=your_aws_access_key
export AWS_SECRET_ACCESS_KEY=your_aws_secret_key
export AWS_REGION=us-east-1
```

## 📋 Command Line Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--provider` | AI provider (`aws`, `openrouter`, `auto`) | `auto` | `--provider openrouter` |
| `--models` | Comma-separated model list | `moonshotai/kimi-k2:free` | `--models "claude-3-sonnet,kimi-k2"` |
| `--max-tokens` | Maximum response tokens | `64000` | `--max-tokens 8000` |
| `--max-requests` | Maximum API calls | `10` | `--max-requests 5` |
| `--dry-run` | Preview without applying | `false` | `--dry-run` |
| `--enable-tokenization` | Smart repository compression | `false` | `--enable-tokenization` |
| `--tokenization-debug` | Show compression details | `false` | `--tokenization-debug` |

## 🎯 Best Practices

### Effective Prompting
**✅ Good prompts** (specific and actionable):
- "Add error handling with try-catch blocks to the API service functions"
- "Create a React component for user profile editing with form validation"
- "Implement database connection pooling with proper cleanup"
- "Add unit tests for the authentication middleware using Jest"

**❌ Avoid vague prompts**:
- "Make it better" 
- "Fix bugs"
- "Improve performance"
- "Clean up the code"

## 🔒 Security & Quality

### Branch Protection Setup
For repositories using ClaudeCoder in CI/CD, configure branch protection:

**Required Status Checks**:
- `All Quality Gates Passed` (comprehensive test suite)
- `Unit Tests` (component-level testing)
- `Model Configuration Tests` (AI model compatibility)
- `Build Test` (compilation and packaging)

**Setup Path**: Settings → Branches → Add rule for `main`
**Enable**: Status checks, up-to-date branches, secret detection

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for detailed contribution guidelines.