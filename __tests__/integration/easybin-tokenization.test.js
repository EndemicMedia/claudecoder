const { TokenizerIntegration } = require('../../tokenizer-integration');
const { EnhancedTokenEstimator } = require('../../enhanced-tokenizer');
const fs = require('fs');
const path = require('path');

describe('EasyBin Repository Tokenization Integration', () => {
  let mockAiProvider;
  let tokenizerIntegration;
  let easyBinPath;

  beforeAll(() => {
    easyBinPath = '/Users/A200326959/Development/easybin';
    
    // Skip if easybin repository is not available
    if (!fs.existsSync(easyBinPath)) {
      console.log('EasyBin repository not found, skipping integration tests');
      return;
    }
  });

  beforeEach(() => {
    mockAiProvider = {
      invokeClaude: jest.fn()
    };
    
    tokenizerIntegration = new TokenizerIntegration(mockAiProvider, null);
  });

  // Helper function to simulate repository content loading
  function loadRepositoryContent(repoPath) {
    const content = {};
    
    function scanDirectory(dirPath, basePath = '') {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
        if (entry.name === 'node_modules') continue;
        if (entry.name === 'coverage') continue;
        if (entry.name.includes('test-results')) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          try {
            scanDirectory(fullPath, relativePath);
          } catch (error) {
            // Skip directories we can't read
          }
        } else {
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            content[relativePath.replace(/\\/g, '/')] = fileContent;
          } catch (error) {
            // Skip binary files or files we can't read
          }
        }
      }
    }
    
    scanDirectory(repoPath);
    return content;
  }

  test('should detect token limit exceeded for EasyBin repository', async () => {
    if (!fs.existsSync(easyBinPath)) {
      console.log('Skipping test: EasyBin repository not found');
      return;
    }

    const repoContent = loadRepositoryContent(easyBinPath);
    const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
    
    // Calculate total tokens
    let totalTokens = 0;
    let fileCount = 0;
    
    for (const [filePath, content] of Object.entries(repoContent)) {
      if (typeof content === 'string') {
        totalTokens += tokenEstimator.estimateTokens(content);
        fileCount++;
      }
    }
    
    const modelLimit = tokenEstimator.getModelLimit('moonshotai/kimi-k2:free');
    
    console.log(`📊 EasyBin Repository Analysis:`);
    console.log(`   Files: ${fileCount}`);
    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Model limit: ${modelLimit.toLocaleString()}`);
    console.log(`   Exceeds limit: ${totalTokens > modelLimit ? 'YES' : 'NO'}`);
    console.log(`   Reduction needed: ${Math.round((1 - modelLimit / totalTokens) * 100)}%`);
    
    // Verify that we exceed the token limit significantly
    expect(totalTokens).toBeGreaterThan(modelLimit);
    expect(totalTokens).toBeGreaterThan(modelLimit * 10); // Should be much larger
    expect(fileCount).toBeGreaterThan(20); // Should have many files
  });

  test('should successfully compress EasyBin repository with AI prioritization', async () => {
    if (!fs.existsSync(easyBinPath)) {
      console.log('Skipping test: EasyBin repository not found');
      return;
    }

    const repoContent = loadRepositoryContent(easyBinPath);
    
    // Mock AI response with realistic prioritization
    mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
      critical: [
        'README.md',
        'package.json',
        'index.html',
        'app.js',
        'styles.css',
        'manifest.json'
      ],
      important: [
        'sw.js',
        'binStyles.js',
        'translations.js',
        'analytics.js',
        'security.js'
      ],
      skip: [
        'coverage/lcov-report/index.html',
        'test-results/cross-browser.spec.js',
        'playwright-report/index.html',
        'lighthouse-report.html',
        'performance-report.html'
      ],
      reasoning: 'Prioritized core application files for README update task'
    }));

    const result = await tokenizerIntegration.processWithTokenization(
      repoContent,
      'Update the README.md to accurately reflect the current functionality',
      { name: 'moonshotai/kimi-k2:free' }
    );

    const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
    const modelLimit = tokenEstimator.getModelLimit('moonshotai/kimi-k2:free');
    
    // Calculate optimized tokens
    let optimizedTokens = 0;
    for (const [filePath, content] of Object.entries(result)) {
      if (typeof content === 'string') {
        optimizedTokens += tokenEstimator.estimateTokens(content);
      }
    }
    
    console.log(`📊 Tokenization Results:`);
    console.log(`   Original files: ${Object.keys(repoContent).length}`);
    console.log(`   Optimized files: ${Object.keys(result).length}`);
    console.log(`   Optimized tokens: ${optimizedTokens.toLocaleString()}`);
    console.log(`   Within budget: ${optimizedTokens <= modelLimit * 0.8 ? 'YES' : 'NO'}`);
    console.log(`   Compression ratio: ${Math.round((1 - Object.keys(result).length / Object.keys(repoContent).length) * 100)}%`);
    
    // Verify optimization worked
    expect(Object.keys(result).length).toBeLessThan(Object.keys(repoContent).length);
    expect(optimizedTokens).toBeLessThan(modelLimit);
    expect(result['README.md']).toBeDefined();
    expect(result['package.json']).toBeDefined();
    expect(result['index.html']).toBeDefined();
    expect(mockAiProvider.invokeClaude).toHaveBeenCalled();
  });

  test('should handle EasyBin repository with heuristic fallback', async () => {
    if (!fs.existsSync(easyBinPath)) {
      console.log('Skipping test: EasyBin repository not found');
      return;
    }

    const repoContent = loadRepositoryContent(easyBinPath);
    
    // Mock AI failure
    mockAiProvider.invokeClaude.mockRejectedValue(new Error('AI service temporarily unavailable'));

    const result = await tokenizerIntegration.processWithTokenization(
      repoContent,
      'Fix JavaScript errors in the application',
      { name: 'moonshotai/kimi-k2:free' }
    );

    const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
    const modelLimit = tokenEstimator.getModelLimit('moonshotai/kimi-k2:free');
    
    let optimizedTokens = 0;
    for (const [filePath, content] of Object.entries(result)) {
      if (typeof content === 'string') {
        optimizedTokens += tokenEstimator.estimateTokens(content);
      }
    }
    
    console.log(`📊 Heuristic Fallback Results:`);
    console.log(`   Files selected: ${Object.keys(result).length}`);
    console.log(`   Tokens used: ${optimizedTokens.toLocaleString()}`);
    console.log(`   JavaScript files included: ${Object.keys(result).filter(f => f.endsWith('.js')).length}`);
    
    // Should still work with heuristic prioritization
    expect(Object.keys(result).length).toBeGreaterThan(0);
    expect(optimizedTokens).toBeLessThan(modelLimit);
    expect(mockAiProvider.invokeClaude).toHaveBeenCalled();
    
    // Should prioritize JavaScript files for JS error fixing
    const jsFiles = Object.keys(result).filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
    expect(result['app.js']).toBeDefined(); // Main application file
  });

  test('should prioritize relevant files based on different prompts', async () => {
    if (!fs.existsSync(easyBinPath)) {
      console.log('Skipping test: EasyBin repository not found');
      return;
    }

    const repoContent = loadRepositoryContent(easyBinPath);
    
    // Test different prompts and expected prioritizations
    const testCases = [
      {
        prompt: 'Update CSS styling and improve responsive design',
        expectedAI: {
          critical: ['styles.css', 'index.html'],
          important: ['binStyles.js', 'manifest.json'],
          skip: ['app.js', 'analytics.js']
        },
        expectedFiles: ['styles.css', 'index.html']
      },
      {
        prompt: 'Fix Progressive Web App and service worker issues',
        expectedAI: {
          critical: ['sw.js', 'manifest.json'],
          important: ['index.html', 'app.js'],
          skip: ['styles.css', 'analytics.js']
        },
        expectedFiles: ['sw.js', 'manifest.json']
      },
      {
        prompt: 'Add new language support and translations',
        expectedAI: {
          critical: ['translations.js', 'app.js'],
          important: ['index.html', 'README.md'],
          skip: ['styles.css', 'sw.js']
        },
        expectedFiles: ['translations.js', 'app.js']
      }
    ];

    for (const testCase of testCases) {
      mockAiProvider.invokeClaude.mockResolvedValueOnce(JSON.stringify({
        ...testCase.expectedAI,
        reasoning: `Prioritized files relevant to: ${testCase.prompt}`
      }));

      const result = await tokenizerIntegration.processWithTokenization(
        repoContent,
        testCase.prompt,
        { name: 'moonshotai/kimi-k2:free' }
      );

      // Verify relevant files are included
      for (const expectedFile of testCase.expectedFiles) {
        if (repoContent[expectedFile]) {
          expect(result[expectedFile]).toBeDefined();
        }
      }
    }

    expect(mockAiProvider.invokeClaude).toHaveBeenCalledTimes(3);
  });

  test('should validate token reduction effectiveness', async () => {
    if (!fs.existsSync(easyBinPath)) {
      console.log('Skipping test: EasyBin repository not found');
      return;
    }

    const repoContent = loadRepositoryContent(easyBinPath);
    const tokenEstimator = new EnhancedTokenEstimator('moonshotai/kimi-k2:free');
    
    // Calculate baseline metrics
    const originalTokens = Object.entries(repoContent)
      .filter(([_, content]) => typeof content === 'string')
      .reduce((sum, [_, content]) => sum + tokenEstimator.estimateTokens(content), 0);
    
    const modelLimit = tokenEstimator.getModelLimit('moonshotai/kimi-k2:free');
    const reductionNeeded = Math.max(0, 1 - (modelLimit * 0.8) / originalTokens);
    
    mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
      critical: ['README.md', 'package.json', 'index.html', 'app.js'],
      important: ['styles.css', 'sw.js', 'manifest.json'],
      skip: ['coverage/lcov.info', 'test-results/debug.spec.js'],
      reasoning: 'Optimization test prioritization'
    }));

    const result = await tokenizerIntegration.processWithTokenization(
      repoContent,
      'Optimize the application performance',
      { name: 'moonshotai/kimi-k2:free' }
    );

    const optimizedTokens = Object.entries(result)
      .filter(([_, content]) => typeof content === 'string')
      .reduce((sum, [_, content]) => sum + tokenEstimator.estimateTokens(content), 0);
    
    const actualReduction = 1 - (optimizedTokens / originalTokens);
    
    console.log(`📊 Token Reduction Analysis:`);
    console.log(`   Required reduction: ${Math.round(reductionNeeded * 100)}%`);
    console.log(`   Actual reduction: ${Math.round(actualReduction * 100)}%`);
    console.log(`   Target met: ${actualReduction >= reductionNeeded ? 'YES' : 'NO'}`);
    
    // Verify we achieved sufficient reduction
    expect(actualReduction).toBeGreaterThanOrEqual(reductionNeeded);
    expect(optimizedTokens).toBeLessThanOrEqual(modelLimit * 0.8);
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  test('should preserve essential files for different use cases', async () => {
    if (!fs.existsSync(easyBinPath)) {
      console.log('Skipping test: EasyBin repository not found');
      return;
    }

    const repoContent = loadRepositoryContent(easyBinPath);
    
    // Essential files that should always be preserved for documentation updates
    const essentialFiles = ['README.md', 'package.json', 'index.html', 'app.js'];
    
    mockAiProvider.invokeClaude.mockResolvedValue(JSON.stringify({
      critical: essentialFiles,
      important: ['styles.css', 'manifest.json'],
      skip: ['coverage/lcov.info'],
      reasoning: 'Essential files preservation test'
    }));

    const result = await tokenizerIntegration.processWithTokenization(
      repoContent,
      'Update project documentation and README',
      { name: 'moonshotai/kimi-k2:free' }
    );

    // Verify essential files are preserved
    for (const essentialFile of essentialFiles) {
      if (repoContent[essentialFile]) {
        expect(result[essentialFile]).toBeDefined();
        expect(result[essentialFile]).toBe(repoContent[essentialFile]);
      }
    }

    // Verify we still have a reasonable number of files
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(essentialFiles.length);
    expect(Object.keys(result).length).toBeLessThan(Object.keys(repoContent).length);
  });
});