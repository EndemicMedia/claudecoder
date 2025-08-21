const { EnhancedTokenEstimator } = require('./enhanced-tokenizer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * Simplified tokenizer integration that works with existing ClaudeCoder infrastructure
 */
class TokenizerIntegration {
  constructor(aiProvider, fallbackManager) {
    this.aiProvider = aiProvider;
    this.fallbackManager = fallbackManager;
    this.cacheDir = path.join(os.tmpdir(), 'claudecoder-summaries');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Main processing method - simplified version that actually works
   */
  async processWithTokenization(repoContent, userPrompt, selectedModel) {
    console.log('🧠 Phase 1: Token estimation and file analysis...');
    
    const modelId = selectedModel?.id || selectedModel?.name || selectedModel || 'moonshotai/kimi-k2:free';
    const tokenizer = new EnhancedTokenEstimator(modelId);
    const modelLimit = tokenizer.getModelLimit(modelId);
    
    // Debug: Check repository content structure
    console.log(`🔍 Debug: Repository content keys:`, Object.keys(repoContent).slice(0, 10));
    console.log(`🔍 Debug: Files object exists:`, !!repoContent.files);
    console.log(`🔍 Debug: Total entries:`, Object.keys(repoContent).length);
    
    // Convert repository content to file analysis - handle direct structure
    const repoFiles = repoContent.files || repoContent; // Support both structures
    const files = Object.entries(repoFiles).map(([filePath, content]) => {
      if (typeof content !== 'string') {
        console.log(`⚠️  Skipping non-string content for ${filePath}`);
        return null;
      }
      
      const tokens = tokenizer.estimateTokens(content);
      return {
        filePath,
        content,
        tokens,
        type: tokenizer.detectFileType(filePath),
        priority: tokenizer.calculateFilePriority(filePath)
      };
    }).filter(Boolean); // Remove null entries
    
    const totalTokens = files.reduce((sum, f) => sum + f.tokens, 0);
    console.log(`📊 Found ${files.length} files totaling ~${totalTokens.toLocaleString()} tokens`);
    console.log(`🎯 Model limit: ${modelLimit.toLocaleString()} tokens`);
    
    if (totalTokens <= modelLimit * 0.8) {
      console.log('✅ Repository fits within model limits, proceeding without tokenization');
      return repoContent;
    }
    
    console.log('🤖 Phase 2: AI-powered file prioritization...');
    
    try {
      // Create lightweight file listing for AI analysis
      const fileListings = files.slice(0, 50).map(file => ({ // Limit to first 50 files for prioritization
        path: file.filePath,
        size: file.tokens,
        type: file.type,
        preview: this.getFilePreview(file.content, 100)
      }));
      
      const prioritizationResponse = await this.getAIPrioritization(fileListings, userPrompt);
      console.log(`💡 AI Analysis: ${prioritizationResponse.reasoning || 'File prioritization completed'}`);
      
      // Apply AI prioritization results
      const { optimizedFiles, skippedFiles } = this.applyPrioritization(files, prioritizationResponse, modelLimit * 0.8);
      
      console.log(`📝 Selected: ${optimizedFiles.length} files, Skipped: ${skippedFiles.length} files`);
      console.log(`📊 Optimized context: ${optimizedFiles.reduce((sum, f) => sum + (f.summaryTokens || f.tokens), 0)} tokens`);
      
      // Reconstruct repository content with selected files
      const optimizedRepoContent = {};
      
      optimizedFiles.forEach(file => {
        optimizedRepoContent[file.filePath] = file.summary || file.content;
      });
      
      return optimizedRepoContent;
      
    } catch (error) {
      console.log(`⚠️  AI prioritization failed: ${error.message}`);
      console.log('📄 Falling back to heuristic filtering...');
      
      // Fallback to simple priority-based filtering
      return this.fallbackFiltering(files, repoContent, modelLimit * 0.8);
    }
  }

  /**
   * AI file prioritization with simplified prompt
   */
  async getAIPrioritization(fileListings, userPrompt) {
    const prioritizationPrompt = `Given this user request: "${userPrompt}"

Analyze these repository files and identify which are most relevant:

${fileListings.map(f => `- ${f.path} (${f.size} tokens, ${f.type})`).join('\n')}

Return JSON with files categorized by relevance:
{
  "critical": ["most_important_file1.js", "key_file2.py"],
  "important": ["supporting_file1.js", "config.json"], 
  "skip": ["test_file.js", "coverage.html"],
  "reasoning": "Brief explanation"
}

Focus on files directly related to: ${userPrompt}`;

    try {
      if (!this.aiProvider || typeof this.aiProvider.invokeClaude !== 'function') {
        throw new Error('AI provider not available for prioritization');
      }
      
      const systemPrompt = 'You are a code analysis expert. Return only valid JSON.\n\n' + prioritizationPrompt;
      const content = await this.aiProvider.invokeClaude(systemPrompt, null, 1);
      return JSON.parse(content);
    } catch (error) {
      console.log(`⚠️  AI prioritization error: ${error.message}`);
      return this.getHeuristicPrioritization(fileListings, userPrompt);
    }
  }

  /**
   * Apply AI prioritization results to files
   */
  applyPrioritization(files, prioritization, tokenBudget) {
    const optimizedFiles = [];
    const skippedFiles = [];
    let usedTokens = 0;
    
    // Helper to find file by path
    const findFile = (filePath) => files.find(f => f.filePath === filePath || f.filePath.endsWith(filePath));
    
    // Process critical files first (full content)
    if (prioritization.critical) {
      for (const filePath of prioritization.critical) {
        const file = findFile(filePath);
        if (file && usedTokens + file.tokens <= tokenBudget) {
          optimizedFiles.push(file);
          usedTokens += file.tokens;
        }
      }
    }
    
    // Process important files (summarize if needed)
    if (prioritization.important) {
      for (const filePath of prioritization.important) {
        const file = findFile(filePath);
        if (file) {
          if (usedTokens + file.tokens <= tokenBudget) {
            optimizedFiles.push(file);
            usedTokens += file.tokens;
          } else if (file.tokens > 2000) {
            // Create simple summary for large important files
            const summary = this.createSimpleSummary(file);
            const summaryTokens = Math.ceil(file.tokens * 0.3);
            if (usedTokens + summaryTokens <= tokenBudget) {
              optimizedFiles.push({
                ...file,
                content: summary,
                summary,
                summaryTokens,
                originalTokens: file.tokens
              });
              usedTokens += summaryTokens;
            }
          }
        }
      }
    }
    
    // Add remaining files by priority until budget exhausted
    const remainingFiles = files
      .filter(f => !optimizedFiles.find(of => of.filePath === f.filePath))
      .filter(f => !(prioritization.skip || []).some(skipPath => f.filePath.includes(skipPath)))
      .sort((a, b) => b.priority - a.priority);
    
    for (const file of remainingFiles) {
      if (usedTokens + file.tokens <= tokenBudget) {
        optimizedFiles.push(file);
        usedTokens += file.tokens;
      } else {
        skippedFiles.push(file);
      }
    }
    
    return { optimizedFiles, skippedFiles };
  }

  /**
   * Simple text summarization
   */
  createSimpleSummary(file) {
    const lines = file.content.split('\n');
    const summary = [];
    
    summary.push(`# ${file.filePath} (${file.tokens} tokens → summary)`);
    
    if (file.type === 'javascript') {
      // Extract key JavaScript patterns
      const functions = lines.filter(line => 
        line.trim().match(/^(function|const|let|var).+=>|^(function|async function)/));
      const exports = lines.filter(line => 
        line.trim().match(/^(export|module\.exports)/));
      const imports = lines.filter(line => 
        line.trim().match(/^(import|require)/));
      
      if (imports.length) summary.push('\n## Imports:', ...imports.slice(0, 10));
      if (functions.length) summary.push('\n## Functions:', ...functions.slice(0, 10));
      if (exports.length) summary.push('\n## Exports:', ...exports);
      
    } else if (file.type === 'documentation') {
      // Extract headers and key sections
      const headers = lines.filter(line => line.trim().startsWith('#'));
      summary.push('\n## Structure:', ...headers.slice(0, 10));
      
    } else {
      // Generic summary
      summary.push('\n## Content Preview:');
      summary.push(...lines.slice(0, 20));
      if (lines.length > 20) summary.push('...[truncated]');
    }
    
    return summary.join('\n');
  }

  /**
   * Fallback filtering when AI fails
   */
  fallbackFiltering(files, repoContent, tokenBudget) {
    console.log('📊 Using heuristic filtering based on file priorities');
    
    // Sort by priority and size
    const prioritizedFiles = files
      .filter(f => f.priority >= 50) // Skip low priority files
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.tokens - b.tokens; // Prefer smaller files when priority is equal
      });
    
    const selectedFiles = [];
    let usedTokens = 0;
    
    for (const file of prioritizedFiles) {
      if (usedTokens + file.tokens <= tokenBudget) {
        selectedFiles.push(file);
        usedTokens += file.tokens;
      }
    }
    
    console.log(`📝 Heuristic selection: ${selectedFiles.length}/${files.length} files (${usedTokens} tokens)`);
    
    // Reconstruct repository content
    const filteredRepoContent = {};
    
    selectedFiles.forEach(file => {
      filteredRepoContent[file.filePath] = file.content;
    });
    
    return filteredRepoContent;
  }

  /**
   * Heuristic prioritization fallback
   */
  getHeuristicPrioritization(fileListings, userPrompt) {
    const critical = [];
    const important = [];
    const skip = [];
    
    fileListings.forEach(file => {
      const path = file.path.toLowerCase();
      const prompt = userPrompt.toLowerCase();
      
      // Check if file path relates to user prompt
      const isRelevant = prompt.split(' ').some(word => 
        word.length > 3 && path.includes(word));
      
      if (path.includes('package.json') || path.includes('main.') || path.includes('index.')) {
        critical.push(file.path);
      } else if (isRelevant && (path.endsWith('.js') || path.endsWith('.py') || path.endsWith('.ts'))) {
        critical.push(file.path);
      } else if (path.endsWith('.js') || path.endsWith('.py') || path.endsWith('.ts')) {
        important.push(file.path);
      } else if (path.includes('test') || path.includes('coverage') || path.endsWith('.html')) {
        skip.push(file.path);
      } else {
        important.push(file.path);
      }
    });
    
    return {
      critical,
      important,
      skip,
      reasoning: 'Heuristic-based prioritization fallback'
    };
  }

  getFilePreview(content, maxChars = 100) {
    return content.substring(0, maxChars).split('\n').slice(0, 5).join('\n');
  }
}

module.exports = { TokenizerIntegration };