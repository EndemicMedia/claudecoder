# Changelog

All notable changes to the ClaudeCoder project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Modernized GitHub Pages website with improved design and graphics
- New SVG illustrations for code review, bug fixing, and refactoring examples
- Interactive JavaScript for smoother page scrolling and visual effects
- GitHub Sponsors support via FUNDING.yml configuration

### Changed
- Updated website style to be more responsive and mobile-friendly
- Improved website accessibility with semantic HTML and better contrast

## [2.0.0] - 2025-05-10

### Added
- Support for configurable parameters through GitHub Action inputs:
  - `max-tokens`: Maximum number of tokens for Claude to generate (default: 64000)
  - `enable-thinking`: Enable Claude's extended thinking capability (default: true)
  - `thinking-budget`: Token budget for Claude's thinking process (default: 1024)
  - `extended-output`: Enable 128K extended output capability (default: true)
  - `request-timeout`: API request timeout in milliseconds (default: 3600000)
  - `max-requests`: Maximum number of requests to make to AWS Bedrock (default: 10)
  - `required-label`: Label required on PR for processing (default: claudecoder)

### Changed
- Upgraded to Claude 3.7 Sonnet model from AWS Bedrock
- Increased default max tokens from 4000 to 64000
- Implemented extended thinking capability with a default budget of 1024 tokens
- Enabled extended output length (128K tokens) by default
- Enhanced response processing to handle thinking blocks
- Improved error handling for token validation errors
- Updated all documentation to consistently reference "Claude 3.7 Sonnet"
- Increased API timeout to 60 minutes (3600000 ms) as recommended in AWS documentation

### Fixed
- Improved error handling for validation exceptions
- Better handling of API timeouts for large responses
- Updated model ID format to use the inference profile ID required for AWS Bedrock cross-region inference (`us.anthropic.claude-3-7-sonnet-20250219-v1:0`)

### BREAKING CHANGES
- PRs now require a label (default: 'claudecoder') to be processed by the action
- Existing workflows will need to be updated to add labels to PRs that should be processed
- Workflow triggers should be updated to include the 'labeled' event type for optimal performance

## [1.2.0] - 2025-05-10

### Added
- Comprehensive test suite with Jest
- Integration tests with mocked external dependencies
- GitHub Actions workflow for testing

### Changed
- Enhanced error handling and retry mechanism
- Improved repository content retrieval with better file filtering

### Fixed
- Various bug fixes and code improvements

## [1.1.0] - 2025-04-15

### Added
- Support for handling multi-part responses
- Image attachment processing capability

### Changed
- Improved PR processing logic
- Better error handling

## [1.0.0] - 2025-03-01

### Added
- Initial release of ClaudeCoder
- Basic functionality to process pull requests with Claude
- GitHub Action integration
- Repository content analysis
- Automated code suggestions