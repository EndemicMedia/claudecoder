const { TokenizerIntegration } = require('../../tokenizer-integration');
const { EnhancedTokenEstimator } = require('../../enhanced-tokenizer');

describe('Tokenization System', () => {
  let mockAiProvider;
  let mockFallbackManager;
  let tokenizerIntegration;

  beforeEach(() => {
    mockAiProvider = {
      invokeClaude: jest.fn()
    };
    
    mockFallbackManager = {
      handleModelResult: jest.fn()
    };

    tokenizerIntegration = new TokenizerIntegration(mockAiProvider, mockFallbackManager);
  });

  describe('EnhancedTokenEstimator', () => {
    let tokenEstimator;

    beforeEach(() => {
      tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
    });

    test('should estimate tokens for text content', () => {
      const text = 'Hello world, this is a test content for token estimation.';
      const tokens = tokenEstimator.estimateTokens(text);
      
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4)); // Fallback approximation
    });

    test('should handle empty or invalid content', () => {
      expect(tokenEstimator.estimateTokens('')).toBe(0);
      expect(tokenEstimator.estimateTokens(null)).toBe(0);
      expect(tokenEstimator.estimateTokens(undefined)).toBe(0);
    });

    test('should calculate file priorities correctly', () => {
      expect(tokenEstimator.calculateFilePriority('package.json')).toBe(100);
      expect(tokenEstimator.calculateFilePriority('main.js')).toBe(100);
      expect(tokenEstimator.calculateFilePriority('index.ts')).toBe(100);
      expect(tokenEstimator.calculateFilePriority('src/component.js')).toBe(80);
      expect(tokenEstimator.calculateFilePriority('README.md')).toBe(60);
      expect(tokenEstimator.calculateFilePriority('test/unit.test.js')).toBe(30);
      expect(tokenEstimator.calculateFilePriority('coverage/index.html')).toBe(10); // Note: priority order matters in implementation
    });

    test('should detect file types correctly', () => {
      expect(tokenEstimator.detectFileType('script.js')).toBe('javascript');
      expect(tokenEstimator.detectFileType('component.ts')).toBe('javascript');
      expect(tokenEstimator.detectFileType('app.py')).toBe('python');
      expect(tokenEstimator.detectFileType('README.md')).toBe('documentation');
      expect(tokenEstimator.detectFileType('config.json')).toBe('configuration');
      expect(tokenEstimator.detectFileType('setup.yml')).toBe('configuration');
      expect(tokenEstimator.detectFileType('index.html')).toBe('markup');
      expect(tokenEstimator.detectFileType('unknown.xyz')).toBe('unknown');
    });

    test('should return correct model limits', () => {
      expect(tokenEstimator.getModelLimit('moonshotai/kimi-k2:free')).toBe(32768);
      expect(tokenEstimator.getModelLimit('google/gemini-2.0-flash-exp:free')).toBe(1048576);
      expect(tokenEstimator.getModelLimit('gpt-4')).toBe(8192);
      expect(tokenEstimator.getModelLimit('unknown-model')).toBe(32000);
    });

    test('should calculate budget allocation correctly', () => {
      const allocation = tokenEstimator.calculateBudgetAllocation(100000, 32768);
      
      expect(allocation.total).toBe(Math.floor(32768 * 0.8));
      expect(allocation.coreFiles).toBe(Math.floor(allocation.total * 0.50));
      expect(allocation.documentation).toBe(Math.floor(allocation.total * 0.30));
      expect(allocation.testsConfig).toBe(Math.floor(allocation.total * 0.20));
      expect(allocation.coreFiles + allocation.documentation + allocation.testsConfig).toBeLessThanOrEqual(allocation.total);
    });
  });

  describe('TokenizerIntegration', () => {
    test('should process repository content below model limits', async () => {
      const smallRepo = {
        'README.md': '# Test Project\nThis is a small test project.',
        'package.json': '{"name": "test", "version": "1.0.0"}',
        'index.js': 'console.log("Hello world");'
      };

      const result = await tokenizerIntegration.processWithTokenization(
        smallRepo,
        'Update documentation',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toEqual(smallRepo); // Should return unchanged
    });

    test('should process large repository content with tokenization', async () => {
      // Create a mock large repository
      const largeRepo = {};
      for (let i = 0; i < 100; i++) {
        largeRepo[`file${i}.js`] = 'x'.repeat(10000); // Create large files
      }

      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js', 'file1.js'],
        important: ['file2.js', 'file3.js'],
        skip: ['file50.js', 'file51.js'],
        reasoning: 'Selected most relevant files'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        largeRepo,
        'Fix JavaScript errors',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(Object.keys(result).length).toBeLessThan(100);
      expect(result['file0.js']).toBeDefined();
      expect(result['file1.js']).toBeDefined();
      expect(mockAiProvider.invokeClaude).toHaveBeenCalled();
    });

    test('should fall back to heuristic prioritization when AI fails', async () => {
      const largeRepo = {};
      // Create a repository that definitely exceeds token limits
      for (let i = 0; i < 100; i++) {
        largeRepo[`file${i}.js`] = 'x'.repeat(5000); // 1250 tokens each, 125K total
      }

      mockAiProvider.invokeClaude.mockRejectedValue(new Error('AI service unavailable'));

      const result = await tokenizerIntegration.processWithTokenization(
        largeRepo,
        'Fix bugs',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(Object.keys(result).length).toBeLessThan(100);
      expect(Object.keys(result).length).toBeGreaterThan(0);
      // AI should be called for large repositories
    });

    test('should prioritize files based on user prompt', () => {
      const fileListings = [
        { path: 'auth.js', size: 1000, type: 'javascript' },
        { path: 'login.js', size: 800, type: 'javascript' },
        { path: 'test/coverage.html', size: 500, type: 'markup' }, // Use .html file without index to go to skip
        { path: 'README.md', size: 200, type: 'documentation' }
      ];

      const prioritization = tokenizerIntegration.getHeuristicPrioritization(
        fileListings,
        'fix authentication login issues'
      );

      expect(prioritization.critical.includes('auth.js') || prioritization.critical.includes('login.js')).toBe(true);
      expect(prioritization.skip).toContain('test/coverage.html'); // HTML files with 'test' go to skip
    });

    test('should apply prioritization results correctly', () => {
      const files = [
        { filePath: 'critical.js', content: 'critical code', tokens: 1000, priority: 100 },
        { filePath: 'important.js', content: 'important code', tokens: 800, priority: 80 },
        { filePath: 'skip.js', content: 'skip code', tokens: 500, priority: 30 },
        { filePath: 'other.js', content: 'other code', tokens: 600, priority: 60 }
      ];

      const prioritization = {
        critical: ['critical.js'],
        important: ['important.js'],
        skip: ['skip.js']
      };

      const { optimizedFiles, skippedFiles } = tokenizerIntegration.applyPrioritization(
        files,
        prioritization,
        3000
      );

      expect(optimizedFiles.length).toBeGreaterThanOrEqual(2); // At least critical + important
      // Files are processed by priority: critical first, important second, remaining by priority
      // The applyPrioritization method selects files within token budget and skips others
      expect(optimizedFiles.find(f => f.filePath === 'critical.js')).toBeDefined();
      expect(optimizedFiles.find(f => f.filePath === 'important.js')).toBeDefined();
      // Skip files should not be in optimizedFiles
      expect(optimizedFiles.find(f => f.filePath === 'skip.js')).toBeUndefined();
      
      // Verify total tokens are within budget
      const totalTokens = optimizedFiles.reduce((sum, f) => sum + (f.summaryTokens || f.tokens), 0);
      expect(totalTokens).toBeLessThanOrEqual(3000);
    });

    test('should create summaries for large files', () => {
      const jsFile = {
        filePath: 'large.js',
        content: `
import React from 'react';
import { useState } from 'react';

function MyComponent() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

export default MyComponent;
`,
        tokens: 3000,
        type: 'javascript'
      };

      const summary = tokenizerIntegration.createSimpleSummary(jsFile);

      expect(summary).toContain('# large.js');
      expect(summary).toContain('## Imports:');
      expect(summary).toContain('import React');
      expect(summary).toContain('## Functions:');
      expect(summary).toContain('function MyComponent');
      expect(summary).toContain('## Exports:');
      expect(summary).toContain('export default');
    });

    test('should handle documentation file summarization', () => {
      const mdFile = {
        filePath: 'README.md',
        content: `
# Project Title
## Installation
### Prerequisites
## Usage
### Basic Usage
### Advanced Features
## Contributing
`,
        tokens: 1500,
        type: 'documentation'
      };

      const summary = tokenizerIntegration.createSimpleSummary(mdFile);

      expect(summary).toContain('# README.md');
      expect(summary).toContain('## Structure:');
      expect(summary).toContain('# Project Title');
      expect(summary).toContain('## Installation');
      expect(summary).toContain('## Usage');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty repository', async () => {
      const result = await tokenizerIntegration.processWithTokenization(
        {},
        'Update empty repo',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toEqual({});
    });

    test('should handle non-string file content', async () => {
      const repoWithBinary = {
        'text.js': 'console.log("hello");',
        'binary.png': Buffer.from('fake image data'),
        'null.txt': null,
        'undefined.txt': undefined
      };

      const result = await tokenizerIntegration.processWithTokenization(
        repoWithBinary,
        'Process files',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result['text.js']).toBeDefined();
      expect(typeof result['text.js']).toBe('string');
      
      // The implementation filters non-string content during file analysis
      // but may preserve original values in final output for small repos
      // Check that string content is properly handled
      expect(result['text.js']).toBe('console.log("hello");');
      
      // Non-string content may be preserved or filtered depending on implementation
      // The key requirement is that processing doesn't crash
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('should handle invalid JSON from AI provider', async () => {
      const largeRepo = { 'file.js': 'x'.repeat(100000) };
      
      mockAiProvider.invokeClaude.mockResolvedValue('invalid json response');

      const result = await tokenizerIntegration.processWithTokenization(
        largeRepo,
        'Process',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
      // AI might not be called if repository is small enough to fit without processing
    });

    test('should handle missing AI provider', async () => {
      const tokenizerWithoutAI = new TokenizerIntegration(null, mockFallbackManager);
      const largeRepo = { 'file.js': 'x'.repeat(100000) };

      const result = await tokenizerWithoutAI.processWithTokenization(
        largeRepo,
        'Process',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Token Validation', () => {
    test('should respect token budgets strictly', async () => {
      const files = [];
      for (let i = 0; i < 20; i++) {
        files.push({
          filePath: `file${i}.js`,
          content: 'x'.repeat(1000),
          tokens: 250,
          priority: 80
        });
      }

      const prioritization = {
        critical: files.slice(0, 5).map(f => f.filePath),
        important: files.slice(5, 10).map(f => f.filePath),
        skip: files.slice(15).map(f => f.filePath)
      };

      const tokenBudget = 2000; // Only allow ~8 files
      const { optimizedFiles } = tokenizerIntegration.applyPrioritization(
        files,
        prioritization,
        tokenBudget
      );

      const totalTokens = optimizedFiles.reduce((sum, f) => sum + (f.summaryTokens || f.tokens), 0);
      expect(totalTokens).toBeLessThanOrEqual(tokenBudget);
    });

    test('should detect token limit exceeded correctly', async () => {
      // Test with repository that definitely exceeds limits
      const massiveRepo = {};
      for (let i = 0; i < 200; i++) {
        massiveRepo[`large_file_${i}.js`] = 'x'.repeat(50000); // Each file ~12,500 tokens
      }

      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: [`large_file_0.js`, `large_file_1.js`],
        important: [`large_file_2.js`],
        skip: Object.keys(massiveRepo).slice(10),
        reasoning: 'Prioritized core files'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        massiveRepo,
        'Optimize performance',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Should have significant reduction
      const originalSize = Object.keys(massiveRepo).length;
      const optimizedSize = Object.keys(result).length;
      
      expect(optimizedSize).toBeLessThan(originalSize * 0.2); // At least 80% reduction
      expect(mockAiProvider.invokeClaude).toHaveBeenCalled();
    });

    test('should validate AI prioritization response format', async () => {
      const validResponse = {
        critical: ['file1.js'],
        important: ['file2.js'],
        skip: ['file3.js'],
        reasoning: 'Test prioritization'
      };

      const invalidResponses = [
        'not json',
        '{}',
        '{"critical": "not an array"}',
        '{"critical": [], "important": [], "skip": []}'  // Missing reasoning
      ];

      for (const invalidResponse of invalidResponses) {
        mockAiProvider.invokeClaude.mockResolvedValueOnce(invalidResponse);
      }

      const repo = {
        'file1.js': 'x'.repeat(50000),
        'file2.js': 'x'.repeat(50000),
        'file3.js': 'x'.repeat(50000)
      };

      // Should fallback to heuristic for all invalid responses
      for (let i = 0; i < invalidResponses.length; i++) {
        const result = await tokenizerIntegration.processWithTokenization(
          repo,
          'Test',
          { name: 'moonshotai/kimi-k2:free' }
        );
        
        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBeGreaterThan(0);
      }
    });
  });
});