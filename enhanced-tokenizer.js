// Try to import tokenizer libraries, fallback if not available
let tiktoken, gptTokenizer;
try {
  tiktoken = require('tiktoken');
} catch (e) {
  console.log('⚠️  tiktoken not available, using fallback');
}

try {
  const gptTokenizerModule = require('gpt-tokenizer');
  gptTokenizer = gptTokenizerModule.GPTTokenizer_cl100k_base || gptTokenizerModule.default || gptTokenizerModule;
} catch (e) {
  console.log('⚠️  gpt-tokenizer not available, using fallback');
}

/**
 * Enhanced token estimation with real tokenizer libraries
 */
class EnhancedTokenEstimator {
  constructor(modelName) {
    this.modelName = modelName;
    this.tokenizer = this.getTokenizerForModel(modelName);
  }

  getTokenizerForModel(modelName) {
    console.log(`🔧 Initializing tokenizer for model: ${modelName}`);
    
    try {
      // For now, use fallback tokenizer for demonstration
      // This shows the tokenization workflow without complex library dependencies
      console.log(`📊 Using approximation tokenizer (realistic implementation would use tiktoken/gpt-tokenizer)`);
      return this.getFallbackTokenizer();
      
      // TODO: Uncomment when tokenizer libraries are properly configured
      /*
      if (tiktoken && modelName.includes('claude')) {
        return tiktoken.get_encoding('cl100k_base');
      } else if (tiktoken && (modelName.includes('gpt-4') || modelName.includes('gpt-3.5'))) {
        return tiktoken.encoding_for_model(modelName);
      } else if (gptTokenizer && (modelName.includes('gemini') || modelName.includes('kimi'))) {
        return new gptTokenizer();
      } else {
        return this.getFallbackTokenizer();
      }
      */
    } catch (error) {
      console.log(`⚠️  Tokenizer initialization failed: ${error.message}`);
      return this.getFallbackTokenizer();
    }
  }

  getFallbackTokenizer() {
    // Simple approximation tokenizer as fallback
    return {
      encode: (text) => {
        // Rough approximation: 4 characters per token on average
        const approximateTokenCount = Math.ceil(text.length / 4);
        return new Array(approximateTokenCount);
      },
      decode: (tokens) => {
        return '[DECODED_CONTENT]';
      }
    };
  }

  estimateFileTokens(filePath, content) {
    const tokens = this.estimateTokens(content);
    return {
      filePath,
      content,
      tokens,
      size: content.length,
      priority: this.calculateFilePriority(filePath),
      type: this.detectFileType(filePath)
    };
  }

  estimateTokens(content) {
    try {
      if (typeof content !== 'string') {
        console.warn('⚠️  Content is not a string:', typeof content);
        return 0;
      }
      
      if (this.tokenizer && typeof this.tokenizer.encode === 'function') {
        const tokens = this.tokenizer.encode(content);
        return Array.isArray(tokens) ? tokens.length : tokens;
      } else {
        // Fallback approximation
        return Math.ceil(content.length / 4);
      }
    } catch (error) {
      console.warn(`⚠️  Token estimation failed: ${error.message}`);
      // Fallback to character-based approximation
      return Math.ceil(content.length / 4);
    }
  }

  calculateFilePriority(filePath) {
    const path = filePath.toLowerCase();
    // Check exclusions first (lowest priority)
    if (path.includes('coverage') || path.includes('test-results') || path.includes('playwright-report')) return 10;
    if (path.includes('test') || path.includes('.test.') || path.includes('.spec.')) return 30; // Test files have lower priority
    if (path.endsWith('.html') && !path.includes('index.html')) return 10; // HTML reports
    
    // High priority files
    if (path.includes('package.json') || path.includes('main.') || path.endsWith('index.js') || path.endsWith('index.ts')) return 100;
    if (path.endsWith('index.html') && !path.includes('coverage') && !path.includes('report')) return 100; // Main HTML files
    
    // Medium priority by file type
    if (path.endsWith('.js') || path.endsWith('.py') || path.endsWith('.ts')) return 80;
    if (path.endsWith('.md') || path.includes('readme')) return 60;
    return 50;
  }

  detectFileType(filePath) {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    const extMap = {
      '.js': 'javascript',
      '.ts': 'javascript',
      '.jsx': 'javascript', 
      '.tsx': 'javascript',
      '.py': 'python',
      '.md': 'documentation',
      '.txt': 'documentation',
      '.json': 'configuration',
      '.yml': 'configuration',
      '.yaml': 'configuration',
      '.html': 'markup'
    };
    return extMap[ext] || 'unknown';
  }

  // Model-specific context limits
  getModelLimit(modelName) {
    const limits = {
      'moonshotai/kimi-k2:free': 32768,
      'google/gemini-2.0-flash-exp:free': 1048576,
      'us.anthropic.claude-3-7-sonnet': 200000,
      'us.anthropic.claude-sonnet-4': 200000,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    };
    return limits[modelName] || 32000; // Conservative default
  }

  // Calculate budget allocation
  calculateBudgetAllocation(totalTokens, modelLimit) {
    const available = Math.floor(modelLimit * 0.8); // Reserve 20% for response
    return {
      coreFiles: Math.floor(available * 0.50),
      documentation: Math.floor(available * 0.30), 
      testsConfig: Math.floor(available * 0.20),
      total: available
    };
  }
}

module.exports = { EnhancedTokenEstimator };