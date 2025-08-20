# Branch Protection Setup

This repository requires mandatory quality gates before merging PRs to `main`. The following GitHub Actions workflows must pass:

## Required Status Checks

Configure these required status checks in GitHub repository settings:

### Path: Settings → Branches → Add rule for `main`

**Required status checks:**
- `All Quality Gates Passed` (from quality-gates.yml)
- `Unit Tests` (from test.yml)  
- `Model Configuration Tests` (from test.yml)
- `Build Test` (from test.yml)

## Quality Gates Overview

### 🧪 Mandatory Tests
- ✅ Comprehensive test suite (all test categories)
- 📊 Coverage thresholds (80% minimum)
- 🏗️ Build integrity verification
- 🤖 Claude 4 model configuration tests
- 🛡️ Authorization error handling tests
- 🔄 FallbackManager reliability tests
- 🌐 Cross-provider configuration tests

### 🔒 Security Checks
- No credentials in code
- Code quality verification
- Dependency security audit

### 📚 Documentation Checks
- Documentation examples validity
- .env.example completeness
- Model configuration examples current

## Setting Up Branch Protection

1. Go to repository **Settings** → **Branches**
2. Click **Add rule** for branch `main`
3. Enable:
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Restrict pushes that create files that contain secrets**
4. Add required status checks:
   ```
   All Quality Gates Passed
   Unit Tests  
   Model Configuration Tests
   Build Test
   ```
5. Enable:
   - ✅ **Require review from CODEOWNERS** (if applicable)
   - ✅ **Dismiss stale PR approvals when new commits are pushed**
   - ✅ **Include administrators**

## Local Testing

Before creating a PR, run these locally:

```bash
# Run all quality gates locally
npm run test:all
npm run test:coverage
npm run build

# Test specific model configurations
MODELS="us.anthropic.claude-sonnet-4-20250514-v1:0,moonshotai/kimi-k2:free" npm test -- --testNamePattern="ModelSelector"

# Test authorization error handling
npm test -- --testNamePattern="should handle authorization errors"
```

## Workflow Triggers

### quality-gates.yml
- **Triggers**: PR opened, synchronized, reopened, ready_for_review
- **Skips**: Draft PRs
- **Cancels**: In-progress runs on new commits

### test.yml  
- **Triggers**: All pushes, PR events to main
- **Includes**: Matrix testing of different model configurations

### release.yml
- **Triggers**: Push to main (after PR merge)
- **Requires**: quality-gates job must pass before release
- **Blocks**: Release if any tests fail

## Emergency Procedures

If quality gates are blocking a critical hotfix:

1. **Preferred**: Fix the failing tests
2. **If urgent**: Temporarily disable branch protection
   - Must be re-enabled immediately after merge
   - Requires admin privileges
   - Should trigger follow-up issue to fix tests

## Quality Metrics

Current quality thresholds:
- **Test Coverage**: 80% minimum (branches, functions, lines)
- **Build**: Must produce valid dist/index.js
- **Security**: Zero credentials in code
- **Model Support**: Must support latest Claude 4 models
- **Error Handling**: Must handle authorization errors gracefully