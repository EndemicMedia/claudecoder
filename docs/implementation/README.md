# ⚙️ Implementation Guide

Technical implementation details, architecture, and tokenization system for ClaudeCoder.

## 🏗️ System Architecture

### Core Components
```
📁 ClaudeCoder Architecture
├── 🤖 AI Providers
│   ├── AWS Bedrock (Enterprise)
│   └── OpenRouter (Free/Premium)
├── 🧠 Core Processing
│   ├── Core Processor (GitHub Actions)
│   ├── Local Processor (CLI)
│   └── Fallback Manager (Multi-model)
├── 🔧 Tokenization System
│   ├── Token Estimator
│   ├── Repository Scanner
│   └── AI Prioritization
└── 🎯 Output Handlers
    ├── GitHub PR Updates
    └── Local File Changes
```

## 🎯 Tokenization System (Smart Repository Compression)

### Problem Solved
Large repositories exceed AI model context limits, causing failures. ClaudeCoder now automatically compresses repositories by 95%+ while preserving essential functionality.

**Real-world example**: EasyBin repository
- **Before**: 79 files, 1,159,454 tokens (35x over Kimi K2 32K limit)
- **After**: 23 files, 26,129 tokens (80% of limit used)
- **Result**: 97.7% compression with successful AI processing

### Multi-Phase Processing Pipeline
```javascript
🔍 Phase 1: Repository Analysis
├── Scan all files and calculate token counts
├── Apply file type detection and prioritization
├── Calculate total tokens vs model limits
└── Determine if tokenization needed

🤖 Phase 2: AI-Powered Prioritization (when needed)
├── Send file list and user prompt to AI
├── Get intelligent file selection based on relevance
├── Parse response into critical/important/skip categories
└── Fall back to heuristic if AI unavailable

⚡ Phase 3: Content Optimization
├── Apply prioritization results
├── Summarize large but important files
├── Enforce strict token budget limits
└── Generate final optimized repository
```

### Multi-Model Support
Different AI models have different context windows. ClaudeCoder automatically adjusts:

| Model | Context Limit | Strategy |
|-------|---------------|----------|
| Kimi K2 | 32K tokens | Aggressive compression (keep ~15 files) |
| GPT-4 | 8K tokens | Ultra-aggressive (keep ~8 files) |
| Claude Sonnet | 200K tokens | Moderate compression (keep ~100 files) |
| Gemini 2.0 | 1M tokens | Light compression (keep ~400 files) |

## 🧪 Real-World Validation Results

### EasyBin Repository Case Study
```
📊 Input Analysis:
   Files: 79 files total
   Content: 1,159,454 tokens
   Model: Kimi K2 (32,768 token limit)
   Overflow: 3,437% over limit

🤖 AI Prioritization:
   Critical: README.md, package.json, index.html, app.js
   Important: styles.css, sw.js, manifest.json
   Skip: coverage/, test-results/, playwright-report/

✅ Final Result:
   Selected: 23 files
   Tokens: 26,129 (80% of limit)
   Compression: 97.7% reduction
   Status: Successfully processed
```

### Performance Benchmarks
- **Small repos** (10 files): <1 second
- **Medium repos** (100 files): <5 seconds  
- **Large repos** (500 files): <15 seconds
- **Memory usage**: <50MB for 100 files

**The tokenization system represents a significant advancement in AI-powered repository processing, enabling ClaudeCoder to handle enterprise-scale repositories while maintaining high-quality code generation capabilities.** 🎯