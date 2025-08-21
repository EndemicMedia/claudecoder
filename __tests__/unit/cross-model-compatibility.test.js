const { TokenizerIntegration } = require('../../tokenizer-integration');
const { EnhancedTokenEstimator } = require('../../enhanced-tokenizer');

describe('Cross-Model Compatibility Tests', () => {
  let mockAiProvider;
  let tokenizerIntegration;

  beforeEach(() => {
    mockAiProvider = {
      invokeClaude: jest.fn()
    };
    
    tokenizerIntegration = new TokenizerIntegration(mockAiProvider, null);
  });

  // Test models with different context windows
  const testModels = [
    {
      name: 'moonshotai/kimi-k2:free',
      limit: 32768,
      category: 'small-context'
    },
    {
      name: 'gpt-4',
      limit: 8192,
      category: 'small-context'
    },
    {
      name: 'gpt-4-32k',
      limit: 32768,
      category: 'medium-context'
    },
    {
      name: 'us.anthropic.claude-3-7-sonnet',
      limit: 200000,
      category: 'large-context'
    },
    {
      name: 'us.anthropic.claude-sonnet-4',
      limit: 200000,
      category: 'large-context'
    },
    {
      name: 'google/gemini-2.0-flash-exp:free',
      limit: 1048576,
      category: 'very-large-context'
    }
  ];

  describe('Model Limit Recognition', () => {
    test.each(testModels)('should recognize correct limit for $name', (model) => {
      const tokenEstimator = new EnhancedTokenEstimator(model.name);
      const limit = tokenEstimator.getModelLimit(model.name);
      
      expect(limit).toBe(model.limit);
    });

    test('should have default limit for unknown models', () => {
      const tokenEstimator = new EnhancedTokenEstimator('unknown/model');
      const limit = tokenEstimator.getModelLimit('unknown/model');
      
      expect(limit).toBe(32000); // Conservative default
    });
  });

  describe('Budget Allocation by Model Type', () => {
    test.each(testModels)('should calculate appropriate budget for $name ($category)', (model) => {
      const tokenEstimator = new EnhancedTokenEstimator(model.name);
      const allocation = tokenEstimator.calculateBudgetAllocation(1000000, model.limit);
      
      // Total should be 80% of model limit (20% reserved for response)
      const expectedTotal = Math.floor(model.limit * 0.8);
      expect(allocation.total).toBe(expectedTotal);
      
      // Budget components should sum to total
      const sum = allocation.coreFiles + allocation.documentation + allocation.testsConfig;
      expect(sum).toBeLessThanOrEqual(allocation.total);
      
      // Core files should get the largest allocation
      expect(allocation.coreFiles).toBeGreaterThanOrEqual(allocation.documentation);
      expect(allocation.coreFiles).toBeGreaterThanOrEqual(allocation.testsConfig);
    });

    test('should handle very small context models gracefully', () => {
      const tokenEstimator = new EnhancedTokenEstimator('gpt-4');
      const allocation = tokenEstimator.calculateBudgetAllocation(1000000, 8192);
      
      // Should still provide reasonable allocation even for small contexts
      expect(allocation.total).toBe(Math.floor(8192 * 0.8));
      expect(allocation.coreFiles).toBeGreaterThan(0);
      expect(allocation.documentation).toBeGreaterThan(0);
      expect(allocation.testsConfig).toBeGreaterThan(0);
    });

    test('should handle very large context models efficiently', () => {
      const tokenEstimator = new EnhancedTokenEstimator('google/gemini-2.0-flash-exp:free');
      const allocation = tokenEstimator.calculateBudgetAllocation(100000, 1048576);
      
      // For large contexts, total input should fit within budget
      expect(allocation.total).toBe(Math.floor(1048576 * 0.8));
      expect(allocation.total).toBeGreaterThan(100000); // Should accommodate full input
    });
  });

  describe('Compression Strategy by Model', () => {
    function createLargeRepository(fileCount, tokensPerFile) {
      const repo = {};
      for (let i = 0; i < fileCount; i++) {
        const content = 'x'.repeat(tokensPerFile * 4); // Approximate 4 chars per token
        repo[`file${i}.js`] = content;
      }
      return repo;
    }

    test.each([
      { model: 'gpt-4', files: 100, tokensPerFile: 150, expectedCompression: 95 }, // 15K total for 8K limit
      { model: 'moonshotai/kimi-k2:free', files: 100, tokensPerFile: 400, expectedCompression: 90 }, // 40K total for 32K limit  
      { model: 'us.anthropic.claude-sonnet-4', files: 1000, tokensPerFile: 250, expectedCompression: 60 }, // 250K total for 200K limit
      { model: 'google/gemini-2.0-flash-exp:free', files: 5000, tokensPerFile: 250, expectedCompression: 20 } // 1.25M total for 1M limit
    ])('should apply appropriate compression for $model', async ({ model, files, tokensPerFile, expectedCompression }) => {
      const largeRepo = createLargeRepository(files, tokensPerFile);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: [`file0.js`, `file1.js`],
        important: [`file2.js`, `file3.js`, `file4.js`],
        skip: Array.from({ length: files - 10 }, (_, i) => `file${i + 10}.js`),
        reasoning: `Compression test for ${model}`
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        largeRepo,
        'Test compression',
        { name: model }
      );

      const compressionRatio = Math.round((1 - Object.keys(result).length / Object.keys(largeRepo).length) * 100);
      
      // Compression should be within reasonable range of expectation
      expect(compressionRatio).toBeGreaterThanOrEqual(expectedCompression - 10);
      expect(compressionRatio).toBeLessThanOrEqual(100);
    });

    test('should handle edge case where repository barely exceeds limit', async () => {
      // Create repository that's just slightly over the limit
      const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
      const modelLimit = tokenEstimator.getModelLimit('moonshotai/kimi-k2:free');
      const targetTokens = Math.floor(modelLimit * 1.1); // 10% over limit
      
      const repo = {
        'main.js': 'x'.repeat(targetTokens * 4), // Single large file
        'package.json': '{"name": "test"}'
      };

      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['package.json'],
        important: ['main.js'],
        skip: [],
        reasoning: 'Edge case test'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Handle edge case',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Should create a summary for the large file
      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(result['package.json']).toBeDefined();
    });
  });

  describe('Performance Scaling by Model', () => {
    test.each([
      { model: 'gpt-4', files: 50, description: 'small context model' },
      { model: 'moonshotai/kimi-k2:free', files: 100, description: 'medium context model' },
      { model: 'us.anthropic.claude-sonnet-4', files: 200, description: 'large context model' },
      { model: 'google/gemini-2.0-flash-exp:free', files: 500, description: 'very large context model' }
    ])('should handle appropriate file counts for $description', async ({ model, files }) => {
      const repo = {};
      for (let i = 0; i < files; i++) {
        repo[`file${i}.js`] = `console.log("File ${i}");`;
      }

      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: [`file0.js`],
        important: Array.from({ length: Math.min(10, files - 1) }, (_, i) => `file${i + 1}.js`),
        skip: Array.from({ length: Math.max(0, files - 11) }, (_, i) => `file${i + 11}.js`),
        reasoning: `Performance test for ${model}`
      }));

      const startTime = Date.now();
      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Performance test',
        { name: model }
      );
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete in reasonable time (under 10 seconds)
      expect(processingTime).toBeLessThan(10000);
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('Model-Specific Optimization', () => {
    test('should optimize differently for small vs large context models', async () => {
      const repo = {};
      for (let i = 0; i < 50; i++) {
        repo[`file${i}.js`] = 'x'.repeat(2000); // ~500 tokens each
      }

      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: [`file0.js`, `file1.js`],
        important: [`file2.js`, `file3.js`],
        skip: Array.from({ length: 46 }, (_, i) => `file${i + 4}.js`),
        reasoning: 'Model-specific optimization test'
      }));

      // Test with small context model
      const smallModelResult = await tokenizerIntegration.processWithTokenization(
        repo,
        'Test optimization',
        { name: 'gpt-4' }
      );

      // Test with large context model
      const largeModelResult = await tokenizerIntegration.processWithTokenization(
        repo,
        'Test optimization',
        { name: 'us.anthropic.claude-sonnet-4' }
      );

      // Large context model should include more files
      expect(Object.keys(largeModelResult).length).toBeGreaterThanOrEqual(Object.keys(smallModelResult).length);
    });

    test('should respect token budgets strictly across all models', async () => {
      const testCases = [
        { model: 'gpt-4', limit: 8192 },
        { model: 'moonshotai/kimi-k2:free', limit: 32768 },
        { model: 'us.anthropic.claude-sonnet-4', limit: 200000 }
      ];

      for (const { model, limit } of testCases) {
        const repo = {};
        for (let i = 0; i < 20; i++) {
          repo[`file${i}.js`] = 'x'.repeat(limit / 4); // Each file is ~1/4 of limit
        }

        mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
          critical: [`file0.js`],
          important: [`file1.js`, `file2.js`],
          skip: Array.from({ length: 17 }, (_, i) => `file${i + 3}.js`),
          reasoning: `Budget test for ${model}`
        }));

        const result = await tokenizerIntegration.processWithTokenization(
          repo,
          'Budget test',
          { name: model }
        );

        // Calculate actual token usage
        const tokenEstimator = new EnhancedTokenEstimator(model);
        const totalTokens = Object.values(result)
          .filter(content => typeof content === 'string')
          .reduce((sum, content) => sum + tokenEstimator.estimateTokens(content), 0);

        // Should stay within 80% of model limit
        expect(totalTokens).toBeLessThanOrEqual(limit * 0.8);
      }
    });
  });

  describe('Error Handling Across Models', () => {
    test('should handle AI provider failures consistently across models', async () => {
      // Create repository with files of varying sizes to ensure some can fit in any budget
      const repo = {
        'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
        'index.js': 'console.log("hello world");',
        'large1.js': 'x'.repeat(10000), // ~2.5K tokens 
        'large2.js': 'x'.repeat(20000), // ~5K tokens
        'large3.js': 'x'.repeat(40000)  // ~10K tokens
      };
      
      mockAiProvider.invokeClaude.mockRejectedValue(new Error('AI service unavailable'));

      for (const model of testModels.slice(0, 3)) { // Test subset for performance
        const result = await tokenizerIntegration.processWithTokenization(
          repo,
          'Error handling test',
          { name: model.name }
        );

        // Should fallback gracefully for all models - at least package.json and index.js should fit
        expect(Object.keys(result).length).toBeGreaterThan(0);
        expect(result).toBeDefined();
        // Essential files should be preserved
        expect(result['package.json']).toBeDefined();
      }
    });

    test('should handle malformed model names gracefully', async () => {
      const invalidModels = [
        'invalid/model',
        '',
        null,
        undefined,
        'model-with-no-limit'
      ];

      for (const invalidModel of invalidModels) {
        const tokenEstimator = new EnhancedTokenEstimator(invalidModel);
        const limit = tokenEstimator.getModelLimit(invalidModel);
        
        // Should default to conservative limit
        expect(limit).toBe(32000);
        expect(typeof limit).toBe('number');
        expect(limit).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration with Model Selection', () => {
    test('should work with model objects containing different properties', async () => {
      const modelFormats = [
        { name: 'moonshotai/kimi-k2:free' },
        { id: 'us.anthropic.claude-sonnet-4', displayName: 'Claude Sonnet 4' },
        'gpt-4', // String format
        { model: 'google/gemini-2.0-flash-exp:free', provider: 'google' }
      ];

      const repo = { 'test.js': 'console.log("test");' };

      for (const modelFormat of modelFormats) {
        // Should not throw error regardless of format
        expect(() => {
          const tokenEstimator = new EnhancedTokenEstimator(modelFormat);
          tokenEstimator.getModelLimit(modelFormat);
        }).not.toThrow();
      }
    });
  });
});