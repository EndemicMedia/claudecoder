# Contributing to ClaudeCoder

Thank you for your interest in contributing to ClaudeCoder! This document provides guidelines and instructions for contributing to this project.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/claudecoder.git`
3. Install dependencies: `npm ci`
4. Build the action: `npm run build`

## Testing

We use Jest for testing. To run the tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

Please ensure that all tests pass before submitting a pull request, and add tests for any new functionality you introduce.

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

## Questions?

If you have any questions or need help with the contribution process, please open an issue and we'll be happy to assist.
