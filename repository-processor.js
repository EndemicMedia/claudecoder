const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * AI-powered repository processor with intelligent file prioritization and tokenization
 */
class RepositoryProcessor {
  constructor(aiProvider, fallbackManager) {
    this.aiProvider = aiProvider;
    this.fallbackManager = fallbackManager;
    this.summaryCache = new Map();
    this.cacheDir = path.join(os.tmpdir(), 'claudecoder-summaries');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Main processing workflow with AI-powered file prioritization
   */
  async processWithTokenization(repoPath, userPrompt, modelName, options = {}) {
    console.log('🔍 Phase 1: Repository scanning and token estimation...');
    
    // 1. Initialize tokenizer for accurate counting
    const tokenizer = new TokenEstimator(modelName);
    const modelLimit = this.getModelLimit(modelName);
    
    // 2. Scan repository and estimate tokens per file
    const fileAnalysis = await this.scanRepository(repoPath);
    const fileTokenEstimates = fileAnalysis.map(file => 
      tokenizer.estimateFileTokens(file.path, file.content)
    );
    
    const totalTokens = fileTokenEstimates.reduce((sum, f) => sum + f.tokens, 0);
    console.log(`📊 Found ${fileTokenEstimates.length} files totaling ~${totalTokens.toLocaleString()} tokens`);
    
    // 3. AI-powered file prioritization
    console.log('🧠 Phase 2: AI analyzing file relevance to user request...');
    const aiPrioritization = await this.getAIPrioritization(fileTokenEstimates, userPrompt, tokenizer);
    
    console.log(`🎯 AI Prioritization: Critical(${aiPrioritization.critical.length}) Important(${aiPrioritization.important.length}) Background(${aiPrioritization.background.length}) Skip(${aiPrioritization.skip.length})`);
    
    // 4. Calculate smart budget allocation based on AI priorities
    const budget = this.calculateSmartBudget(aiPrioritization, modelLimit);
    
    console.log(`💰 Smart Token Budget: Critical(${budget.critical}) Important(${budget.important}) Background(${budget.background})`);
    
    // 5. Categorize files by AI priority and budget fit
    const categorized = this.categorizeFilesByAIPriority(aiPrioritization, budget, tokenizer);
    
    console.log(`📝 Direct: ${categorized.directFiles.length}, Summarize: ${categorized.summarizationQueue.length}, Skip: ${categorized.skippedFiles.length}`);
    
    // 6. Generate summaries for files marked for compression
    const summaries = [];
    if (categorized.summarizationQueue.length > 0) {
      console.log('🤖 Phase 3: Generating context-aware summaries...');
      
      // Process summaries in parallel with priority-based batching
      const summaryBatches = this.createSummaryBatches(categorized.summarizationQueue);
      
      for (const batch of summaryBatches) {
        const batchSummaries = await Promise.all(
          batch.map(file => this.generateContextAwareSummary(file, userPrompt, tokenizer))
        );
        summaries.push(...batchSummaries);
        
        for (const summary of batchSummaries) {
          const compressionPct = Math.round((1 - summary.summaryTokens/summary.originalTokens) * 100);
          console.log(`  ✅ ${summary.filePath}: ${summary.originalTokens} → ${summary.summaryTokens} tokens (${compressionPct}% compression)`);
        }
      }
    }
    
    // 7. Combine direct files and summaries for main processing
    console.log('🚀 Phase 4: Main AI processing with optimized context...');
    const finalContext = this.combineForMainProcessing(categorized.directFiles, summaries, aiPrioritization.metadata);
    
    console.log(`📊 Final context: ${finalContext.totalTokens} tokens (${Math.round(finalContext.totalTokens/modelLimit*100)}% of model limit)`);
    
    // 8. Send to AI with user prompt and context
    return await this.processWithAI(finalContext, userPrompt, modelName);
  }

  /**
   * AI-powered file prioritization based on user request
   */
  async getAIPrioritization(fileTokenEstimates, userPrompt, tokenizer) {
    // Create lightweight file listing for AI analysis
    const fileListings = fileTokenEstimates.map(file => ({
      path: file.filePath,
      size: file.tokens,
      type: file.type,
      preview: this.getFilePreview(file.content, 200) // ~50 tokens per file
    }));
    
    const prioritizationPrompt = `Analyze this repository structure and user request to categorize files by relevance:

USER REQUEST: "${userPrompt}"

REPOSITORY FILES:
${fileListings.map(f => `${f.path} (${f.size} tokens, ${f.type})
${f.preview}...`).join('\n\n')}

Categorize each file into:
- CRITICAL: Essential for the user's request (direct implementation, main logic)
- IMPORTANT: Relevant context or supporting files
- BACKGROUND: Useful context but not directly needed
- SKIP: Irrelevant to the request (tests, docs, artifacts unless specifically requested)

Return a JSON response:
{
  "critical": ["file1.js", "file2.py"],
  "important": ["config.js", "utils.js"],  
  "background": ["README.md", "types.js"],
  "skip": ["test.js", "coverage.html"],
  "reasoning": "Brief explanation of prioritization strategy"
}

Consider:
1. Files directly related to the user's request get highest priority
2. Dependencies and imported modules are important
3. Configuration files are background context
4. Tests/docs/artifacts are usually skippable unless specifically requested`;

    try {
      const response = await this.callAI({
        model: this.getPrioritizationModel(tokenizer.modelName), // Use fast/cheap model
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis expert. Analyze repository files and categorize by relevance to user requests. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prioritizationPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1 // Low temperature for consistent categorization
      });
      
      const prioritization = JSON.parse(response.content);
      
      // Add token estimates to each category
      prioritization.critical = this.addTokenEstimates(prioritization.critical, fileTokenEstimates);
      prioritization.important = this.addTokenEstimates(prioritization.important, fileTokenEstimates);
      prioritization.background = this.addTokenEstimates(prioritization.background, fileTokenEstimates);
      prioritization.skip = this.addTokenEstimates(prioritization.skip, fileTokenEstimates);
      
      // Store metadata for final processing
      prioritization.metadata = {
        userPrompt,
        reasoning: prioritization.reasoning,
        totalFiles: fileTokenEstimates.length,
        analysisTokens: tokenizer.estimateTokens(prioritizationPrompt + response.content)
      };
      
      console.log(`💡 AI Reasoning: ${prioritization.reasoning}`);
      
      return prioritization;
    } catch (error) {
      console.log('⚠️  AI prioritization failed, falling back to heuristics');
      return this.getFallbackPrioritization(fileTokenEstimates, userPrompt);
    }
  }

  /**
   * Calculate smart token budget based on AI prioritization
   */
  calculateSmartBudget(aiPrioritization, modelLimit) {
    const available = Math.floor(modelLimit * 0.8); // Reserve 20% for response
    
    const criticalTokens = this.sumTokens(aiPrioritization.critical);
    const importantTokens = this.sumTokens(aiPrioritization.important);
    const backgroundTokens = this.sumTokens(aiPrioritization.background);
    const totalRelevantTokens = criticalTokens + importantTokens + backgroundTokens;
    
    if (totalRelevantTokens <= available) {
      // All relevant files fit
      return {
        critical: criticalTokens,
        important: importantTokens,
        background: backgroundTokens,
        total: totalRelevantTokens
      };
    }
    
    // Need to allocate budget proportionally
    const criticalRatio = Math.min(1, criticalTokens / available * 0.7); // Give critical files up to 70%
    const remainingBudget = available - (criticalTokens * criticalRatio);
    const importantRatio = Math.min(1, importantTokens / remainingBudget * 0.8); // Important gets up to 80% of remaining
    const backgroundBudget = Math.max(0, available - (criticalTokens * criticalRatio) - (importantTokens * importantRatio));
    
    return {
      critical: Math.floor(criticalTokens * criticalRatio),
      important: Math.floor(importantTokens * importantRatio),  
      background: backgroundBudget,
      total: available
    };
  }

  /**
   * Categorize files into direct inclusion, summarization, or skip based on AI priority and budget
   */
  categorizeFilesByAIPriority(aiPrioritization, budget, tokenizer) {
    const directFiles = [];
    const summarizationQueue = [];
    const skippedFiles = [...aiPrioritization.skip]; // Skip files are automatically skipped
    
    // Process critical files first
    let usedCriticalBudget = 0;
    for (const file of aiPrioritization.critical) {
      if (usedCriticalBudget + file.tokens <= budget.critical) {
        directFiles.push(file);
        usedCriticalBudget += file.tokens;
      } else if (file.tokens <= budget.critical * 2) { // Summarize if not too large
        summarizationQueue.push({...file, priority: 'critical'});
      } else {
        skippedFiles.push(file);
      }
    }
    
    // Process important files
    let usedImportantBudget = 0;
    for (const file of aiPrioritization.important) {
      if (usedImportantBudget + file.tokens <= budget.important) {
        if (file.tokens <= 1000) { // Small important files go directly
          directFiles.push(file);
          usedImportantBudget += file.tokens;
        } else {
          summarizationQueue.push({...file, priority: 'important'});
          usedImportantBudget += Math.floor(file.tokens * 0.3); // Estimate post-compression size
        }
      } else {
        skippedFiles.push(file);
      }
    }
    
    // Process background files
    let usedBackgroundBudget = 0;
    for (const file of aiPrioritization.background) {
      if (file.tokens <= 500) { // Only small background files directly
        if (usedBackgroundBudget + file.tokens <= budget.background) {
          directFiles.push(file);
          usedBackgroundBudget += file.tokens;
        } else {
          skippedFiles.push(file);
        }
      } else {
        // Summarize larger background files if budget allows
        const estimatedSummaryTokens = Math.floor(file.tokens * 0.2); // More aggressive compression
        if (usedBackgroundBudget + estimatedSummaryTokens <= budget.background) {
          summarizationQueue.push({...file, priority: 'background'});
          usedBackgroundBudget += estimatedSummaryTokens;
        } else {
          skippedFiles.push(file);
        }
      }
    }
    
    return { directFiles, summarizationQueue, skippedFiles };
  }

  /**
   * Generate context-aware summary that preserves key information for the user's request
   */
  async generateContextAwareSummary(file, userPrompt, tokenizer) {
    // Check cache first
    const cacheKey = this.generateCacheKey(file.filePath, file.content, userPrompt);
    const cached = await this.getCachedSummary(cacheKey);
    if (cached) {
      console.log(`  💾 Using cached summary for ${file.filePath}`);
      return cached;
    }
    
    const summaryPrompt = this.getContextAwareSummaryPrompt(file, userPrompt);
    
    try {
      const response = await this.callAI({
        model: this.getSummaryModel(tokenizer.modelName),
        messages: [
          {
            role: 'system',
            content: 'You are a code analysis expert. Create concise but comprehensive summaries that preserve all important technical details relevant to the user\'s specific request.'
          },
          {
            role: 'user',
            content: summaryPrompt
          }
        ],
        max_tokens: this.calculateSummaryTokens(file, userPrompt),
        temperature: 0.1
      });
      
      const summary = response.content;
      const summaryTokens = tokenizer.estimateTokens(summary);
      
      const summaryData = {
        filePath: file.filePath,
        summary,
        originalTokens: file.tokens,
        summaryTokens,
        priority: file.priority,
        compressionRatio: file.tokens / summaryTokens
      };
      
      // Cache the summary
      await this.cacheSummary(cacheKey, summaryData);
      
      return summaryData;
    } catch (error) {
      console.log(`⚠️  Failed to summarize ${file.filePath}: ${error.message}`);
      // Return a basic fallback summary
      return {
        filePath: file.filePath,
        summary: `File: ${file.filePath}\nType: ${file.type}\nSize: ${file.tokens} tokens\nContent: [Summary generation failed]`,
        originalTokens: file.tokens,
        summaryTokens: 50,
        priority: file.priority,
        compressionRatio: file.tokens / 50
      };
    }
  }

  /**
   * Create context-aware summary prompt based on file type and user request
   */
  getContextAwareSummaryPrompt(file, userPrompt) {
    const basePrompt = `USER REQUEST: "${userPrompt}"\n\nAnalyze this ${file.type} file and create a concise summary that focuses on elements relevant to the user's request.\n\nFile: ${file.filePath}\n\n${file.content}\n\n`;
    
    const typeSpecificInstructions = {
      javascript: `Focus on:
1. Function signatures and exports that might relate to: ${userPrompt}
2. Key variables, constants, and configurations
3. Important algorithms or business logic patterns
4. Dependencies and imports
5. Any code directly relevant to: ${userPrompt}

Format as a structured summary with clear sections.`,

      python: `Focus on:
1. Class definitions and key methods relevant to: ${userPrompt}  
2. Function signatures and return types
3. Important constants and global variables
4. Main execution flow and entry points
5. Dependencies and imports
6. Any code directly relevant to: ${userPrompt}`,

      documentation: `Extract key information relevant to: ${userPrompt}:
1. Main purpose and functionality
2. Configuration options and usage examples
3. API specifications or interfaces
4. Installation or setup instructions
5. Any sections directly related to: ${userPrompt}`,

      configuration: `Summarize configuration relevant to: ${userPrompt}:
1. Key configuration options and their purposes
2. Default values and environment settings  
3. Dependencies and service configurations
4. Any settings that might affect: ${userPrompt}`,

      default: `Create a focused summary highlighting:
1. Main purpose and functionality
2. Key components relevant to: ${userPrompt}
3. Important data structures or interfaces
4. Any elements that might help with: ${userPrompt}`
    };
    
    const instructions = typeSpecificInstructions[file.type] || typeSpecificInstructions.default;
    
    return basePrompt + instructions;
  }

  /**
   * Helper methods
   */
  
  getFilePreview(content, maxChars = 200) {
    const preview = content.substring(0, maxChars);
    const lines = preview.split('\n').slice(0, 10); // Max 10 lines
    return lines.join('\n');
  }

  sumTokens(files) {
    return files.reduce((sum, file) => sum + (file.tokens || 0), 0);
  }

  addTokenEstimates(filePaths, fileTokenEstimates) {
    return filePaths.map(filePath => {
      const estimate = fileTokenEstimates.find(f => f.filePath === filePath);
      return estimate || { filePath, tokens: 0, type: 'unknown', content: '' };
    }).filter(file => file.tokens > 0); // Filter out empty estimates
  }

  generateCacheKey(filePath, content, userPrompt) {
    const hash = crypto.createHash('md5');
    hash.update(filePath + content + userPrompt);
    return hash.digest('hex');
  }

  async getCachedSummary(cacheKey) {
    try {
      const cachedPath = path.join(this.cacheDir, `${cacheKey}.json`);
      if (fs.existsSync(cachedPath)) {
        const cached = JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
        // Check if cache is not older than 24 hours
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          return cached.data;
        }
      }
    } catch (error) {
      // Cache miss or error, continue without cache
    }
    return null;
  }

  async cacheSummary(cacheKey, summaryData) {
    try {
      const cachedPath = path.join(this.cacheDir, `${cacheKey}.json`);
      const cacheEntry = {
        timestamp: Date.now(),
        data: summaryData
      };
      fs.writeFileSync(cachedPath, JSON.stringify(cacheEntry, null, 2));
    } catch (error) {
      console.log(`⚠️  Failed to cache summary: ${error.message}`);
    }
  }

  calculateSummaryTokens(file, userPrompt) {
    // Base on file size and priority
    const baseTokens = Math.min(2000, Math.floor(file.tokens * 0.3));
    const priorityMultiplier = {
      critical: 1.2,
      important: 1.0,
      background: 0.7
    };
    return Math.floor(baseTokens * (priorityMultiplier[file.priority] || 1.0));
  }

  getPrioritizationModel(mainModel) {
    // Use a faster, cheaper model for file prioritization
    if (mainModel.includes('claude')) {
      return 'moonshotai/kimi-k2:free'; // Cheap alternative
    }
    return mainModel; // Use same model if no cheap alternative
  }

  getSummaryModel(mainModel) {
    // Use same provider but potentially cheaper model for summaries
    return this.getPrioritizationModel(mainModel);
  }

  createSummaryBatches(summarizationQueue, batchSize = 3) {
    const batches = [];
    // Sort by priority: critical first, then important, then background
    const priorityOrder = { critical: 0, important: 1, background: 2 };
    const sorted = summarizationQueue.sort((a, b) => 
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
    
    for (let i = 0; i < sorted.length; i += batchSize) {
      batches.push(sorted.slice(i, i + batchSize));
    }
    return batches;
  }

  getFallbackPrioritization(fileTokenEstimates, userPrompt) {
    // Heuristic-based fallback if AI prioritization fails
    const critical = [];
    const important = [];
    const background = [];
    const skip = [];
    
    for (const file of fileTokenEstimates) {
      const path = file.filePath.toLowerCase();
      
      if (path.includes('package.json') || path.includes('main.') || path.includes('index.') || path.includes('app.')) {
        critical.push(file);
      } else if (path.includes('config') || path.includes('util') || path.endsWith('.js') || path.endsWith('.py')) {
        important.push(file);
      } else if (path.includes('readme') || path.endsWith('.md') || path.includes('doc')) {
        background.push(file);
      } else if (path.includes('test') || path.includes('coverage') || path.includes('.html') || path.includes('.png')) {
        skip.push(file);
      } else {
        background.push(file);
      }
    }
    
    return {
      critical,
      important,
      background,
      skip,
      metadata: {
        userPrompt,
        reasoning: 'Fallback heuristic-based prioritization',
        totalFiles: fileTokenEstimates.length,
        analysisTokens: 0
      }
    };
  }

  // Placeholder methods that need to be implemented or imported
  async scanRepository(repoPath) {
    // This should use the existing repository scanning logic
    throw new Error('scanRepository method needs to be implemented');
  }

  getModelLimit(modelName) {
    const limits = {
      'moonshotai/kimi-k2:free': 32768,
      'google/gemini-2.0-flash-exp:free': 1048576,
      'us.anthropic.claude-3-7-sonnet': 200000,
      'us.anthropic.claude-sonnet-4': 200000
    };
    return limits[modelName] || 32000;
  }

  async callAI(request) {
    // This should use the existing AI provider infrastructure
    throw new Error('callAI method needs to be implemented');
  }

  combineForMainProcessing(directFiles, summaries, metadata) {
    // Combine direct files and summaries into final context
    const content = [];
    
    // Add direct files
    for (const file of directFiles) {
      content.push(`File: ${file.filePath} (${file.tokens} tokens)`);
      content.push(file.content);
      content.push('---');
    }
    
    // Add summaries
    for (const summary of summaries) {
      content.push(`Summary: ${summary.filePath} (${summary.originalTokens} → ${summary.summaryTokens} tokens, ${summary.priority} priority)`);
      content.push(summary.summary);
      content.push('---');
    }
    
    const combinedContent = content.join('\n');
    const totalTokens = directFiles.reduce((sum, f) => sum + f.tokens, 0) + 
                       summaries.reduce((sum, s) => sum + s.summaryTokens, 0);
    
    return {
      content: combinedContent,
      totalTokens,
      fileCount: directFiles.length + summaries.length,
      metadata
    };
  }

  async processWithAI(finalContext, userPrompt, modelName) {
    // Final AI processing with the optimized context
    const request = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: `You are an expert software developer. You have been provided with a repository context that has been intelligently filtered and summarized based on the user's request. 

Repository Analysis: ${finalContext.metadata.reasoning}
Files processed: ${finalContext.fileCount} files (${finalContext.totalTokens} tokens)

Use this context to provide accurate, relevant responses to the user's request.`
        },
        {
          role: 'user',
          content: `Repository Context:\n${finalContext.content}\n\nUser Request: ${userPrompt}`
        }
      ]
    };
    
    return await this.callAI(request);
  }
}

// Use the enhanced tokenizer implementation
const { EnhancedTokenEstimator } = require('./enhanced-tokenizer');

// Re-export for compatibility
const TokenEstimator = EnhancedTokenEstimator;

module.exports = { RepositoryProcessor, TokenEstimator };