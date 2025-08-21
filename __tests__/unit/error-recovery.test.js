const { TokenizerIntegration } = require('../../tokenizer-integration');
const { EnhancedTokenEstimator } = require('../../enhanced-tokenizer');

describe('Error Recovery and Edge Cases', () => {
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

  describe('AI Provider Failures', () => {
    test('should handle network timeouts gracefully', async () => {
      const repo = createLargeRepo(100);
      
      mockAiProvider.invokeClaude.mockRejectedValue(new Error('Network timeout'));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Network timeout test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    test('should handle API rate limits gracefully', async () => {
      const repo = createLargeRepo(50);
      
      mockAiProvider.invokeClaude.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Rate limit test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    test('should handle malformed AI responses', async () => {
      const repo = createLargeRepo(50);
      
      const malformedResponses = [
        'invalid json',
        '{"incomplete": true',
        '{}',
        '{"critical": "not an array"}',
        '{"critical": [], "important": null}',
        JSON.stringify({ critical: [], important: [], skip: [] }) // Missing reasoning
      ];

      for (const malformedResponse of malformedResponses) {
        mockAiProvider.invokeClaude.mockResolvedValueOnce(malformedResponse);
        
        const result = await tokenizerIntegration.processWithTokenization(
          repo,
          'Malformed response test',
          { name: 'moonshotai/kimi-k2:free' }
        );

        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBeGreaterThan(0);
      }
    });

    test('should handle AI provider returning empty responses', async () => {
      const repo = createLargeRepo(30);
      
      mockAiProvider.invokeClaude.mockResolvedValue('');

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Empty response test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    test('should handle AI provider throwing unexpected errors', async () => {
      const repo = createLargeRepo(40);
      
      mockAiProvider.invokeClaude.mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined');
      });

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Unexpected error test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('File Content Edge Cases', () => {
    test('should handle binary file content', async () => {
      const repo = {
        'text.js': 'console.log("hello");',
        'binary.png': Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG header
        'binary.jpg': Buffer.from([255, 216, 255, 224]), // JPEG header
        'package.json': '{"name": "test"}'
      };

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Binary files test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result['text.js']).toBeDefined();
      expect(result['package.json']).toBeDefined();
      // Binary files may be preserved or filtered - main requirement is no crash
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle null and undefined file content', async () => {
      const repo = {
        'valid.js': 'console.log("valid");',
        'null.txt': null,
        'undefined.txt': undefined,
        'empty.txt': '',
        'package.json': '{"name": "test"}'
      };

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Null/undefined test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result['valid.js']).toBeDefined();
      expect(result['package.json']).toBeDefined();
      expect(result['empty.txt']).toBeDefined(); // Empty string is valid
      // null and undefined may be preserved or filtered - main requirement is no crash
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should handle special characters and encoding issues', async () => {
      const repo = {
        'unicode.js': 'console.log("Hello 世界 🌍");',
        'special.txt': 'Special chars: @#$%^&*()_+-=[]{}|;:,.<>?',
        'multiline.md': 'Line 1\nLine 2\r\nLine 3\tTabbed',
        'package.json': '{"name": "test"}'
      };

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Special characters test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result['unicode.js']).toBeDefined();
      expect(result['special.txt']).toBeDefined();
      expect(result['multiline.md']).toBeDefined();
      expect(result['package.json']).toBeDefined();
    });

    test('should handle extremely large file content', async () => {
      const largeContent = 'x'.repeat(10000000); // 10MB file
      const repo = {
        'huge.js': largeContent,
        'normal.js': 'console.log("normal");',
        'package.json': '{"name": "test"}'
      };

      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['package.json'],
        important: ['normal.js'],
        skip: ['huge.js'],
        reasoning: 'Large file handling test'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Large file test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(result['package.json']).toBeDefined();
      expect(result['normal.js']).toBeDefined();
    });

    test('should handle files with no extension', async () => {
      const repo = {
        'Dockerfile': 'FROM node:18\nCOPY . .',
        'Makefile': 'build:\n\tnpm run build',
        'LICENSE': 'MIT License',
        'CHANGELOG': '# Changes\n## v1.0.0',
        'package.json': '{"name": "test"}'
      };

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'No extension test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('Token Budget Edge Cases', () => {
    test('should handle zero-token files', async () => {
      const repo = {
        'empty1.js': '',
        'empty2.txt': '',
        'whitespace.md': '   \n  \t  \n',
        'valid.js': 'console.log("test");',
        'package.json': '{"name": "test"}'
      };

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Zero token test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(result['valid.js']).toBeDefined();
      expect(result['package.json']).toBeDefined();
    });

    test('should handle budget exhaustion scenarios', async () => {
      const repo = createLargeRepo(1000); // Very large repo
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js'],
        important: Array.from({ length: 999 }, (_, i) => `file${i + 1}.js`), // All marked important
        skip: [],
        reasoning: 'Budget exhaustion test'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Budget exhaustion test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Should respect budget even if AI wants to include everything
      const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
      const modelLimit = tokenEstimator.getModelLimit('moonshotai/kimi-k2:free');
      
      const totalTokens = Object.values(result)
        .filter(content => typeof content === 'string')
        .reduce((sum, content) => sum + tokenEstimator.estimateTokens(content), 0);

      expect(totalTokens).toBeLessThanOrEqual(modelLimit * 0.8);
    });

    test('should handle extremely small token budgets', async () => {
      // Create a repository that definitely exceeds a tiny budget
      const repo = {};
      for (let i = 0; i < 30; i++) {
        repo[`file${i}.js`] = 'x'.repeat(2000); // Each file ~500 tokens, 15K total
      }
      
      // Mock getModelLimit at the class prototype level to ensure it's used
      const originalGetModelLimit = EnhancedTokenEstimator.prototype.getModelLimit;
      EnhancedTokenEstimator.prototype.getModelLimit = jest.fn().mockReturnValue(1000); // Very small limit
      
      const tokenizerWithTinyModel = new TokenizerIntegration(mockAiProvider, mockFallbackManager);
      
      const result = await tokenizerWithTinyModel.processWithTokenization(
        repo,
        'Tiny budget test',
        { name: 'test-tiny-model' }
      );

      // Restore the original method
      EnhancedTokenEstimator.prototype.getModelLimit = originalGetModelLimit;

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(Object.keys(result).length).toBeLessThan(20); // Should significantly reduce from 30
    });
  });

  describe('System Resource Edge Cases', () => {
    test('should handle memory pressure gracefully', async () => {
      // Create many large repositories to simulate memory pressure
      const repos = Array.from({ length: 10 }, () => createLargeRepo(100));
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js'],
        important: ['file1.js'],
        skip: Array.from({ length: 98 }, (_, i) => `file${i + 2}.js`),
        reasoning: 'Memory pressure test'
      }));

      const results = [];
      for (const repo of repos) {
        const result = await tokenizerIntegration.processWithTokenization(
          repo,
          'Memory pressure test',
          { name: 'moonshotai/kimi-k2:free' }
        );
        results.push(result);
      }

      // All should complete successfully
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBeGreaterThan(0);
      });
    });

    test('should handle concurrent tokenization requests', async () => {
      const repos = Array.from({ length: 5 }, (_, i) => createLargeRepo(20 + i * 10));
      
      mockAiProvider.invokeClaude.mockImplementation((prompt) => {
        // Simulate variable response times
        const delay = Math.random() * 1000;
        return new Promise(resolve => {
          setTimeout(() => resolve(JSON.stringify({
            critical: ['file0.js'],
            important: ['file1.js'],
            skip: ['file2.js'],
            reasoning: 'Concurrent test'
          })), delay);
        });
      });

      // Process all repos concurrently
      const promises = repos.map((repo, i) =>
        tokenizerIntegration.processWithTokenization(
          repo,
          `Concurrent test ${i}`,
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle missing or invalid model configuration', async () => {
      const repo = createLargeRepo(30);
      
      const invalidModels = [null, undefined, '', {}, { invalidProp: true }];
      
      for (const invalidModel of invalidModels) {
        const result = await tokenizerIntegration.processWithTokenization(
          repo,
          'Invalid model test',
          invalidModel
        );

        expect(result).toBeDefined();
        expect(Object.keys(result).length).toBeGreaterThan(0);
      }
    });

    test('should handle missing AI provider gracefully', async () => {
      const tokenizerWithoutAI = new TokenizerIntegration(null, mockFallbackManager);
      const repo = createLargeRepo(50);

      const result = await tokenizerWithoutAI.processWithTokenization(
        repo,
        'No AI provider test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    test('should handle invalid AI provider interface', async () => {
      const invalidAiProvider = {
        // Missing invokeClaude method
        someOtherMethod: jest.fn()
      };
      
      const tokenizerWithInvalidAI = new TokenizerIntegration(invalidAiProvider, mockFallbackManager);
      const repo = createLargeRepo(30);

      const result = await tokenizerWithInvalidAI.processWithTokenization(
        repo,
        'Invalid AI interface test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });
  });

  describe('Recovery Strategy Validation', () => {
    test('should prioritize graceful degradation over failure', async () => {
      // Create repository large enough to require AI processing
      const repo = {};
      for (let i = 0; i < 200; i++) {
        repo[`file${i}.js`] = 'x'.repeat(1000); // Each file ~250 tokens, 50K total
      }
      
      // Simulate multiple failures
      mockAiProvider.invokeClaude
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce('invalid json');

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Multiple failures test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Should still produce a valid result using heuristic fallback
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(Object.keys(result).length).toBeLessThan(Object.keys(repo).length);
    });

    test('should maintain data integrity during errors', async () => {
      const repo = {
        'critical.js': 'console.log("critical");',
        'package.json': '{"name": "test", "version": "1.0.0"}',
        'README.md': '# Test Project',
        'other.js': 'console.log("other");'
      };
      
      mockAiProvider.invokeClaude.mockRejectedValue(new Error('AI failure'));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Data integrity test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Critical files should be preserved in heuristic fallback
      expect(result['package.json']).toBeDefined();
      expect(result['package.json']).toBe(repo['package.json']); // Content unchanged
    });

    test('should provide meaningful error context', async () => {
      // Create repository large enough to trigger AI processing
      const repo = {};
      for (let i = 0; i < 100; i++) {
        repo[`file${i}.js`] = 'x'.repeat(2000); // Each file ~500 tokens, 50K total
      }
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      mockAiProvider.invokeClaude.mockRejectedValue(new Error('Test error message'));

      await tokenizerIntegration.processWithTokenization(
        repo,
        'Error context test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Should log meaningful error information
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AI prioritization error: Test error message')
      );

      consoleSpy.mockRestore();
    });
  });

  // Helper function to create repositories for testing
  function createLargeRepo(fileCount) {
    const repo = {};
    for (let i = 0; i < fileCount; i++) {
      repo[`file${i}.js`] = `console.log("File ${i}");`;
    }
    return repo;
  }
});