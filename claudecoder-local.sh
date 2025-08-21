#!/bin/bash

# ClaudeCoder Local Wrapper Script
# Usage: ./claudecoder-local.sh "prompt" /path/to/repo [options]

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the local claudecoder with all arguments
node "$SCRIPT_DIR/local-claudecoder.js" "$@"