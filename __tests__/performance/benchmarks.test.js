const { TokenizerIntegration } = require('../../tokenizer-integration');
const { EnhancedTokenEstimator } = require('../../enhanced-tokenizer');

describe('Performance Benchmarks', () => {
  let mockAiProvider;
  let tokenizerIntegration;

  beforeEach(() => {
    mockAiProvider = {
      invokeClaude: jest.fn()
    };
    
    tokenizerIntegration = new TokenizerIntegration(mockAiProvider, null);
  });

  // Helper to create repositories of various sizes
  function createRepository(fileCount, avgTokensPerFile = 1000) {
    const repo = {};
    const fileTypes = ['.js', '.ts', '.py', '.md', '.json', '.css', '.html'];
    
    for (let i = 0; i < fileCount; i++) {
      const fileType = fileTypes[i % fileTypes.length];
      const tokenCount = avgTokensPerFile + (Math.random() * 500 - 250); // ±250 variation
      const content = 'x'.repeat(Math.max(1, Math.floor(tokenCount * 4))); // ~4 chars per token
      
      if (fileType === '.json') {
        repo[`file${i}.json`] = JSON.stringify({ data: content });
      } else if (fileType === '.md') {
        repo[`file${i}.md`] = `# File ${i}\n\n${content}`;
      } else {
        repo[`file${i}${fileType}`] = content;
      }
    }
    
    return repo;
  }

  // Helper to measure execution time and memory
  function measurePerformance(fn) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    return fn().then(result => {
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      return {
        result,
        executionTime: endTime - startTime,
        memoryUsed: endMemory - startMemory,
        peakMemory: process.memoryUsage().heapUsed
      };
    });
  }

  describe('Execution Time Benchmarks', () => {
    test('should process 10-file repository in <1 second', async () => {
      const repo = createRepository(10, 500);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js', 'file1.ts'],
        important: ['file2.py', 'file3.md'],
        skip: ['file4.json'],
        reasoning: 'Small repository test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Performance test',
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      expect(performance.executionTime).toBeLessThan(1000); // <1 second
      expect(performance.result).toBeDefined();
    });

    test('should process 100-file repository in <5 seconds', async () => {
      const repo = createRepository(100, 1000);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: Array.from({ length: 5 }, (_, i) => `file${i}.js`),
        important: Array.from({ length: 10 }, (_, i) => `file${i + 5}.ts`),
        skip: Array.from({ length: 85 }, (_, i) => `file${i + 15}.py`),
        reasoning: 'Medium repository test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Performance test',
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      expect(performance.executionTime).toBeLessThan(5000); // <5 seconds
      expect(performance.result).toBeDefined();
    });

    test('should process 500-file repository in <15 seconds', async () => {
      const repo = createRepository(500, 800);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: Array.from({ length: 10 }, (_, i) => `file${i}.js`),
        important: Array.from({ length: 20 }, (_, i) => `file${i + 10}.ts`),
        skip: Array.from({ length: 470 }, (_, i) => `file${i + 30}.py`),
        reasoning: 'Large repository test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Performance test',
          { name: 'us.anthropic.claude-sonnet-4' }
        )
      );

      expect(performance.executionTime).toBeLessThan(15000); // <15 seconds
      expect(performance.result).toBeDefined();
    }, 20000); // Increase timeout for this test

    test('should scale linearly with repository size', async () => {
      const sizes = [50, 100, 200];
      const times = [];

      for (const size of sizes) {
        const repo = createRepository(size, 800);
        
        mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
          critical: [`file0.js`],
          important: Array.from({ length: Math.min(10, size - 1) }, (_, i) => `file${i + 1}.ts`),
          skip: Array.from({ length: Math.max(0, size - 11) }, (_, i) => `file${i + 11}.py`),
          reasoning: `Scaling test for ${size} files`
        }));

        const performance = await measurePerformance(() =>
          tokenizerIntegration.processWithTokenization(
            repo,
            'Scaling test',
            { name: 'moonshotai/kimi-k2:free' }
          )
        );

        times.push(performance.executionTime);
      }

      // Check that scaling is reasonable (not exponential)
      const ratio1 = times[1] / times[0]; // 100/50
      const ratio2 = times[2] / times[1]; // 200/100
      
      // Should scale sub-linearly or linearly, not exponentially
      expect(ratio1).toBeLessThanOrEqual(3); // Should not be more than 3x slower for 2x files
      expect(ratio2).toBeLessThanOrEqual(3); // Should not be more than 3x slower for 2x files
    }, 30000);
  });

  describe('Memory Usage Benchmarks', () => {
    test('should use <50MB for 100-file repository', async () => {
      const repo = createRepository(100, 1000);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js'],
        important: ['file1.ts', 'file2.py'],
        skip: Array.from({ length: 97 }, (_, i) => `file${i + 3}.md`),
        reasoning: 'Memory test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Memory test',
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      const memoryUsedMB = performance.memoryUsed / (1024 * 1024);
      expect(memoryUsedMB).toBeLessThan(50); // <50MB
    });

    test('should use <200MB for 1000-file repository', async () => {
      const repo = createRepository(1000, 500);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js', 'file1.ts'],
        important: Array.from({ length: 20 }, (_, i) => `file${i + 2}.py`),
        skip: Array.from({ length: 978 }, (_, i) => `file${i + 22}.md`),
        reasoning: 'Large memory test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Large memory test',
          { name: 'us.anthropic.claude-sonnet-4' }
        )
      );

      const memoryUsedMB = performance.memoryUsed / (1024 * 1024);
      expect(memoryUsedMB).toBeLessThan(200); // <200MB
    }, 30000);

    test('should not leak memory across multiple operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple operations
      for (let i = 0; i < 5; i++) {
        const repo = createRepository(50, 500);
        
        mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
          critical: ['file0.js'],
          important: ['file1.ts'],
          skip: Array.from({ length: 48 }, (_, idx) => `file${idx + 2}.py`),
          reasoning: `Memory leak test ${i}`
        }));

        await tokenizerIntegration.processWithTokenization(
          repo,
          'Memory leak test',
          { name: 'moonshotai/kimi-k2:free' }
        );
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024);
      
      // Should not increase by more than 20MB after 5 operations
      expect(memoryIncrease).toBeLessThan(20);
    });
  });

  describe('Token Processing Performance', () => {
    test('should estimate tokens for 10K+ files in <2 seconds', async () => {
      const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
      const testStrings = Array.from({ length: 10000 }, (_, i) => 
        `function test${i}() { return "This is a test function with some content"; }`
      );

      const startTime = Date.now();
      
      for (const str of testStrings) {
        tokenEstimator.estimateTokens(str);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // <2 seconds for 10K estimations
    });

    test('should handle very large files efficiently', async () => {
      const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
      const largeContent = 'x'.repeat(1000000); // 1MB of content
      
      const startTime = Date.now();
      const tokens = tokenEstimator.estimateTokens(largeContent);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // <100ms for 1MB file
      expect(tokens).toBeGreaterThan(0);
    });

    test('should batch process files efficiently', async () => {
      const repo = createRepository(200, 2000);
      
      // Mock AI to return quickly
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js'],
        important: ['file1.ts'],
        skip: Object.keys(repo).slice(2),
        reasoning: 'Batch processing test'
      }));

      const startTime = Date.now();
      
      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Batch test',
        { name: 'moonshotai/kimi-k2:free' }
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process 200 files in <10 seconds
      expect(processingTime).toBeLessThan(10000);
      expect(result).toBeDefined();
    });
  });

  describe('AI Provider Performance', () => {
    test('should handle AI provider delays gracefully', async () => {
      const repo = createRepository(100, 1000);
      
      // Simulate slow AI response
      mockAiProvider.invokeClaude.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve(JSON.stringify({
            critical: ['file0.js'],
            important: ['file1.ts'],
            skip: Object.keys(repo).slice(2),
            reasoning: 'Slow AI test'
          })), 2000); // 2 second delay
        })
      );

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Slow AI test',
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      // Should complete even with slow AI (allow for AI delay + processing)
      expect(performance.executionTime).toBeLessThan(5000);
      expect(performance.result).toBeDefined();
    }, 10000);

    test('should optimize when AI is unavailable', async () => {
      const repo = createRepository(100, 1000);
      
      // Simulate AI failure
      mockAiProvider.invokeClaude.mockRejectedValue(new Error('AI unavailable'));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'AI failure test',
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      // Should be faster without AI and still produce results
      expect(performance.executionTime).toBeLessThan(3000);
      expect(performance.result).toBeDefined();
      expect(Object.keys(performance.result).length).toBeGreaterThan(0);
    });
  });

  describe('Compression Efficiency', () => {
    test('should achieve 95%+ compression on large repositories', async () => {
      const repo = createRepository(1000, 1000);
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: Array.from({ length: 5 }, (_, i) => `file${i}.js`),
        important: Array.from({ length: 10 }, (_, i) => `file${i + 5}.ts`),
        skip: Array.from({ length: 985 }, (_, i) => `file${i + 15}.py`),
        reasoning: 'Compression efficiency test'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Compression test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      const compressionRatio = 1 - (Object.keys(result).length / Object.keys(repo).length);
      
      expect(compressionRatio).toBeGreaterThanOrEqual(0.95); // 95%+ compression
    });

    test('should maintain quality while compressing', async () => {
      const repo = createRepository(200, 1500);
      repo['package.json'] = JSON.stringify({ name: 'test', version: '1.0.0' });
      repo['README.md'] = '# Important Documentation\nThis is critical information.';
      repo['index.js'] = 'console.log("Main application file");';
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['package.json', 'README.md', 'index.js'],
        important: ['file0.js', 'file1.ts'],
        skip: Object.keys(repo).filter(f => !['package.json', 'README.md', 'index.js', 'file0.js', 'file1.ts'].includes(f)),
        reasoning: 'Quality preservation test'
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        repo,
        'Quality test',
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Essential files should be preserved
      expect(result['package.json']).toBeDefined();
      expect(result['README.md']).toBeDefined();
      expect(result['index.js']).toBeDefined();
      
      // Should still achieve significant compression
      const compressionRatio = 1 - (Object.keys(result).length / Object.keys(repo).length);
      expect(compressionRatio).toBeGreaterThan(0.8); // 80%+ compression
    });
  });

  describe('Stress Tests', () => {
    test('should handle edge case: single massive file', async () => {
      const massiveContent = 'x'.repeat(5000000); // 5MB file
      const repo = {
        'massive.js': massiveContent,
        'package.json': '{"name": "test"}'
      };
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['package.json'],
        important: ['massive.js'],
        skip: [],
        reasoning: 'Massive file test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Massive file test',
          { name: 'moonshotai/kimi-k2:free' }
        )
      );

      expect(performance.executionTime).toBeLessThan(10000); // <10 seconds
      expect(performance.result).toBeDefined();
    }, 15000);

    test('should handle extreme file counts', async () => {
      const repo = {};
      for (let i = 0; i < 2000; i++) {
        repo[`file${i}.js`] = `// File ${i}\nconsole.log(${i});`;
      }
      
      mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
        critical: ['file0.js'],
        important: Array.from({ length: 50 }, (_, i) => `file${i + 1}.js`),
        skip: Array.from({ length: 1949 }, (_, i) => `file${i + 51}.js`),
        reasoning: 'Extreme file count test'
      }));

      const performance = await measurePerformance(() =>
        tokenizerIntegration.processWithTokenization(
          repo,
          'Extreme file count test',
          { name: 'us.anthropic.claude-sonnet-4' }
        )
      );

      expect(performance.executionTime).toBeLessThan(20000); // <20 seconds
      expect(performance.result).toBeDefined();
    }, 30000);
  });
});