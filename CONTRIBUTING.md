# Contributing to ClaudeCoder

Thank you for your interest in contributing to ClaudeCoder! This document provides guidelines and instructions for contributing to this project.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/claudecoder.git`
3. Install dependencies: `npm ci`
4. Build the action: `npm run build`

## Testing

We use Jest for testing with comprehensive coverage requirements. Our test suite is organized into three categories:

### Test Structure

- **Unit Tests** (`__tests__/unit/`): Test individual modules in isolation
- **Integration Tests** (`__tests__/integration/`): Test API integrations and component interactions
- **E2E Tests** (`__tests__/e2e/`): Test complete workflows with ACT (local GitHub Actions runner)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:all           # All test categories sequentially

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch

# Test with ACT (local GitHub Actions)
npm run test:act
```

### Coverage Requirements

We maintain strict coverage thresholds to ensure code quality:

- **Global Coverage**: 70% branches, 70% functions, 75% lines, 75% statements
- **openrouter-client.js**: 80% branches, 80% functions, 85% lines, 85% statements
- **model-selector.js**: 85% branches, 85% functions, 90% lines, 90% statements
- **utils.js**: 90% branches, 90% functions, 95% lines, 95% statements

Current coverage status:
- **Overall Project**: 67.86% statements, 78.12% functions
- **openrouter-client.js**: 85.36% statements (exceeds threshold)
- **model-selector.js**: 100% coverage (exceeds threshold)
- **utils.js**: 100% coverage (exceeds threshold)

### Writing Tests

- All new functionality must include corresponding tests
- Tests should achieve the coverage thresholds for their respective files
- Use descriptive test names that explain the behavior being tested
- Mock external dependencies appropriately (use `nock` for HTTP requests)
- Include both positive and negative test cases
- Test edge cases and error conditions

Please ensure that all tests pass and coverage thresholds are met before submitting a pull request.

### Testing Philosophy

Our testing approach emphasizes:

1. **Quality over Quantity**: High coverage with meaningful tests that catch real issues
2. **Fast Feedback**: Unit tests provide immediate feedback during development
3. **Real-world Validation**: Integration tests verify actual API interactions
4. **Complete Workflows**: E2E tests ensure the entire GitHub Action works correctly
5. **Error Resilience**: Comprehensive error handling and edge case testing
6. **Maintainability**: Tests serve as living documentation of expected behavior

### Local Testing with ACT

We support local testing of the GitHub Action using ACT (GitHub Actions runner):

```bash
# Install ACT (macOS)
brew install act

# Run the action locally with test event
npm run test:act
```

This allows you to test the complete GitHub Action workflow locally before pushing to GitHub, ensuring faster development cycles and catching integration issues early.

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) for our commit messages. This enables automatic versioning and changelog generation. Please format your commit messages as follows:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code (formatting, etc)
- `refactor:` Code changes that neither fix a bug nor add a feature
- `perf:` Performance improvements
- `test:` Adding missing tests or correcting existing tests
- `build:` Changes to the build system or dependencies
- `ci:` Changes to CI configuration files and scripts
- `chore:` Other changes that don't modify src or test files

Examples:
- `feat(bedrock): add support for image attachments`
- `fix(utils): correctly handle binary files`
- `docs: update README with new example`

## Pull Request Process

1. Create a new branch for your feature or bug fix
2. Make your changes
3. Run tests and ensure they pass
4. Update documentation if needed
5. Submit a pull request to the `main` branch
6. Ensure the PR description clearly describes the changes you've made

## Code of Conduct

Please be respectful and constructive in your communication with other contributors. We aim to maintain a welcoming and inclusive community.

## Releasing

This project uses semantic-release for automated versioning and releases. When commits are merged to the main branch, a new release will be created automatically if needed, based on the conventional commit messages.

## Latest Features & Model Support

### Claude 4 Series Support ✨

The action now supports the latest Claude 4 models with intelligent error handling:

- **Claude Sonnet 4** (`us.anthropic.claude-sonnet-4-20250514-v1:0`)
- **Claude Opus 4** (`us.anthropic.claude-opus-4-20250514-v1:0`) 
- **Claude Opus 4.1** (`us.anthropic.claude-opus-4-1-20250805-v1:0`)

### Intelligent Model Availability Detection 🧠

The FallbackManager now automatically detects and handles:

1. **Authorization Errors**: When AWS Bedrock models aren't authorized
   - Provides step-by-step AWS console instructions
   - Categorizes model families (Claude 4, Claude 3.5/3.7, etc.)
   - Automatically falls back to available models

2. **Availability Errors**: When models are temporarily unavailable
   - Distinguishes between rate limits, authorization, and availability
   - Intelligent fallback strategies per error type

3. **Enhanced Error Classification**:
   ```javascript
   // Authorization: ValidationException, access denied, model not enabled
   // Availability: service unavailable, region not supported
   // Rate Limits: 429, quota exceeded, throttled
   ```

### Configuration Examples

```yaml
# Latest Claude 4 models (requires AWS authorization)
models: "us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free"

# Cross-provider fallback
models: "us.anthropic.claude-opus-4-1-20250805-v1:0,anthropic/claude-3.7-sonnet:beta"
```

When unauthorized models are requested, users will see helpful guidance:

```
🚨 AWS Bedrock Model Access Required: Claude Sonnet 4 (AWS US) - Latest
📋 To use Claude 4 (Latest) models, you need to:
   1. Go to AWS Bedrock Console: https://console.aws.amazon.com/bedrock/
   2. Navigate to 'Model access' in the left sidebar
   3. Click 'Enable specific models' or 'Modify model access'
   4. Find 'Claude 4 (Latest)' and click 'Enable'
   5. Wait for approval (may take a few minutes)
🔄 Falling back to available model...
```

## Questions?

If you have any questions or need help with the contribution process, please open an issue and we'll be happy to assist.
