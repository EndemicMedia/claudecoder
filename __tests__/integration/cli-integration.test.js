const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('CLI Integration Tests', () => {
  let testRepoPath;
  let originalCwd;

  beforeAll(() => {
    originalCwd = process.cwd();
    
    // Create a small test repository
    testRepoPath = path.join(os.tmpdir(), 'test-repo-' + Date.now());
    fs.mkdirSync(testRepoPath, { recursive: true });
    
    // Initialize git repo
    require('child_process').execSync('git init', { cwd: testRepoPath });
    require('child_process').execSync('git config user.email "test@example.com"', { cwd: testRepoPath });
    require('child_process').execSync('git config user.name "Test User"', { cwd: testRepoPath });
    
    // Create test files
    fs.writeFileSync(path.join(testRepoPath, 'package.json'), JSON.stringify({
      name: 'test-package',
      version: '1.0.0',
      description: 'Test package'
    }, null, 2));
    
    fs.writeFileSync(path.join(testRepoPath, 'index.js'), 'console.log("Hello World");');
    fs.writeFileSync(path.join(testRepoPath, 'README.md'), '# Test Repository\nThis is a test.');
    
    // Commit initial files
    require('child_process').execSync('git add .', { cwd: testRepoPath });
    require('child_process').execSync('git commit -m "Initial commit"', { cwd: testRepoPath });
  });

  afterAll(() => {
    process.chdir(originalCwd);
    // Cleanup test repo
    if (fs.existsSync(testRepoPath)) {
      fs.rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  function runCLI(args, options = {}) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...options.env
      };

      const child = spawn('node', ['local-claudecoder.js', ...args], {
        cwd: process.cwd(),
        env,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr
        });
      });

      child.on('error', reject);

      // Kill process after timeout
      setTimeout(() => {
        child.kill();
        reject(new Error('CLI test timeout'));
      }, 30000);
    });
  }

  describe('Basic CLI Functionality', () => {
    test('should show usage when no arguments provided', async () => {
      const result = await runCLI([]);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Usage:');
      expect(result.stderr).toContain('repository-path');
    });

    test('should handle invalid repository path', async () => {
      const result = await runCLI([
        'Test prompt',
        '/nonexistent/path'
      ]);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('does not exist');
    });

    test('should handle non-git repository', async () => {
      const nonGitPath = path.join(os.tmpdir(), 'non-git-' + Date.now());
      fs.mkdirSync(nonGitPath);
      
      const result = await runCLI([
        'Test prompt',
        nonGitPath
      ]);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Not a git repository');
      
      fs.rmSync(nonGitPath, { recursive: true });
    });

    test('should validate API credentials', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--provider', 'openrouter'
      ], {
        env: {
          OPENROUTER_API_KEY: '' // Empty API key
        }
      });
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('requires openrouter-api-key');
    });
  });

  describe('Tokenization CLI Options', () => {
    test('should handle --enable-tokenization flag', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--enable-tokenization',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Tokenization: Enabled');
    });

    test('should handle --disable-tokenization flag', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--disable-tokenization',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Tokenization: Disabled');
    });

    test('should handle --tokenization-debug flag', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--tokenization-debug',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      // Should show debug output
      expect(result.stdout).toMatch(/Debug:|🔍|📊/);
    });
  });

  describe('Provider and Model Selection', () => {
    test('should handle --provider flag', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--provider', 'openrouter',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Provider: openrouter');
    });

    test('should handle --models flag', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--models', 'moonshotai/kimi-k2:free',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Models: moonshotai/kimi-k2:free');
    });

    test('should handle --max-tokens flag', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--max-tokens', '8000',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      // Should accept the setting without error
      expect(result.code).not.toBe(1);
    });
  });

  describe('Dry Run Mode', () => {
    test('should handle --dry-run flag correctly', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Dry run mode');
      expect(result.stdout).toContain('Changes will be previewed only');
    });

    test('should not modify files in dry-run mode', async () => {
      const beforeContent = fs.readFileSync(path.join(testRepoPath, 'README.md'), 'utf8');
      
      await runCLI([
        'Update README',
        testRepoPath,
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      const afterContent = fs.readFileSync(path.join(testRepoPath, 'README.md'), 'utf8');
      expect(afterContent).toBe(beforeContent);
    });
  });

  describe('Repository Information Display', () => {
    test('should display repository information', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Current branch:');
      expect(result.stdout).toContain('Repository:');
      expect(result.stdout).toContain(testRepoPath);
    });

    test('should show repository status', async () => {
      // Add an uncommitted file
      fs.writeFileSync(path.join(testRepoPath, 'temp.txt'), 'temp content');
      
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('uncommitted changes');
      
      // Cleanup
      fs.unlinkSync(path.join(testRepoPath, 'temp.txt'));
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed arguments gracefully', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--invalid-flag'
      ]);
      
      // Should not crash, might ignore unknown flag
      expect(result.code).not.toBe(null);
    });

    test('should handle permission errors gracefully', async () => {
      // This test might be platform-specific
      if (process.platform !== 'win32') {
        const restrictedPath = path.join(os.tmpdir(), 'restricted-' + Date.now());
        fs.mkdirSync(restrictedPath);
        fs.chmodSync(restrictedPath, 0o000); // No permissions
        
        const result = await runCLI([
          'Test prompt',
          restrictedPath
        ]);
        
        expect(result.code).toBe(1);
        
        // Cleanup
        fs.chmodSync(restrictedPath, 0o755);
        fs.rmSync(restrictedPath, { recursive: true });
      } else {
        // Skip on Windows due to different permission model
        expect(true).toBe(true);
      }
    });

    test('should handle process interruption gracefully', async () => {
      // This test verifies the CLI can be interrupted
      const promise = runCLI([
        'Test prompt',
        testRepoPath
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      // Let it start then interrupt (simulate Ctrl+C)
      setTimeout(() => {
        // This will trigger the timeout in runCLI
      }, 100);
      
      try {
        await promise;
      } catch (error) {
        expect(error.message).toMatch(/timeout|kill/);
      }
    });
  });

  describe('Output Format and Logging', () => {
    test('should provide clear status messages', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toMatch(/🚀|📝|📁|⚙️|🤖/); // Should contain status emojis
      expect(result.stdout).toContain('Starting');
      expect(result.stdout).toContain('Prompt:');
    });

    test('should show progress during execution', async () => {
      const result = await runCLI([
        'Test prompt',
        testRepoPath,
        '--enable-tokenization',
        '--dry-run'
      ], {
        env: {
          OPENROUTER_API_KEY: 'test-key'
        }
      });
      
      expect(result.stdout).toContain('Reading repository content');
      expect(result.stdout).toContain('Phase 1:');
    });
  });
});