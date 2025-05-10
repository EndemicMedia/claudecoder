# Contributing to ClaudeCoder

Thank you for your interest in contributing to ClaudeCoder! This document provides guidelines and information about contributing to this project.

## Semantic Versioning and Commit Messages

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated version management and package publishing. This means we follow the [Conventional Commits](https://www.conventionalcommits.org/) specification to automate versioning.

### Commit Message Format

Each commit message should follow this format:

```
<type>(<scope>): <short description>

<longer description>

<BREAKING CHANGE note if applicable>
```

#### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Changes that don't affect code functionality (formatting, etc)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Code changes that improve performance
- **test**: Adding or correcting tests
- **chore**: Changes to build process or auxiliary tools

#### Scope

The scope is optional and represents the module your commit is working on (e.g., `model`, `client`, `action`).

#### Breaking Changes

If your commit includes a breaking change (a change that would cause users to update their configurations or usage), include `BREAKING CHANGE:` in the footer of your commit message:

```
feat(model): upgrade to newer AI model

BREAKING CHANGE: The new model requires different configuration parameters
```

### Examples

#### Feature Addition
```
feat(model): add support for new parameter
```

#### Bug Fix
```
fix(client): handle error response correctly
```

#### Documentation Update
```
docs: improve setup instructions
```

#### Breaking Change
```
feat(model): upgrade to Claude 3.7 Sonnet from 3.5

This commit upgrades the AI model from Claude 3.5 to Claude 3.7 Sonnet,
which provides improved code analysis and suggestions.

BREAKING CHANGE: Changes the Bedrock model ID from 
anthropic.claude-3-5-sonnet-20240620-v1:0 to 
anthropic.claude-3-7-sonnet-20250219
```

## Pull Request Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes following the commit message format
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Workflow

1. Clone the repository
2. Install dependencies with `npm ci`
3. Make your changes
4. Test your changes with `npm run build` followed by `npm test`
5. Commit and push your changes

## Versioning

When your PR is merged to `main`:

1. The `semantic-release` GitHub Action automatically determines the next version number
2. Based on commit messages, it will:
   - Bump the patch version for `fix` type commits
   - Bump the minor version for `feat` type commits
   - Bump the major version for commits with `BREAKING CHANGE`
3. A new GitHub release is created with appropriate tags
4. The release notes are generated automatically

**Important:** Do not manually modify the version in `package.json`. This will be handled automatically by the semantic-release process.

## Questions?

If you have any questions about contributing, please open an issue in the repository.
