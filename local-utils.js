const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Utilities for local repository operations
 */
class LocalRepositoryUtils {
  /**
   * Validate that a path is a valid git repository
   */
  static validateRepository(repoPath) {
    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    if (!fs.statSync(repoPath).isDirectory()) {
      throw new Error(`Path is not a directory: ${repoPath}`);
    }

    const gitDir = path.join(repoPath, '.git');
    if (!fs.existsSync(gitDir)) {
      throw new Error(`Not a git repository: ${repoPath}`);
    }

    return true;
  }

  /**
   * Get repository information
   */
  static getRepositoryInfo(repoPath) {
    const originalCwd = process.cwd();
    
    try {
      process.chdir(repoPath);
      
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const hasUncommittedChanges = execSync('git status --porcelain', { encoding: 'utf8' }).trim().length > 0;
      const remoteUrl = this.getRemoteUrl();
      
      return {
        currentBranch,
        hasUncommittedChanges,
        remoteUrl,
        repoPath
      };
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error.message}`);
    } finally {
      process.chdir(originalCwd);
    }
  }

  /**
   * Get remote URL (if it exists)
   */
  static getRemoteUrl() {
    try {
      return execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    } catch {
      return null; // No remote configured
    }
  }

  /**
   * Apply file changes to the local repository
   */
  static applyChanges(changes, repoPath, dryRun = false) {
    const results = [];
    
    for (const change of changes) {
      const fullPath = path.join(repoPath, change.filePath);
      
      if (dryRun) {
        results.push({
          filePath: change.filePath,
          status: 'would-update',
          contentLength: change.content.length
        });
        console.log(`📝 Would update: ${change.filePath}`);
        console.log(`   Content length: ${change.content.length} characters`);
      } else {
        try {
          // Ensure directory exists
          const dirPath = path.dirname(fullPath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          
          // Write file content
          fs.writeFileSync(fullPath, change.content, 'utf8');
          
          results.push({
            filePath: change.filePath,
            status: 'updated',
            contentLength: change.content.length
          });
          
          console.log(`✅ Updated: ${change.filePath}`);
        } catch (error) {
          results.push({
            filePath: change.filePath,
            status: 'error',
            error: error.message
          });
          
          console.error(`❌ Failed to write ${change.filePath}: ${error.message}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Execute repository content loading in the specified directory
   */
  static async getRepositoryContent(repoPath, getRepositoryContentFn) {
    const originalCwd = process.cwd();
    
    try {
      process.chdir(repoPath);
      return await getRepositoryContentFn();
    } finally {
      process.chdir(originalCwd);
    }
  }

  /**
   * Parse CLI arguments
   */
  static parseCliArgs(args) {
    if (args.length < 2) {
      throw new Error('Usage: <prompt> <repository-path> [options]');
    }

    const prompt = args[0];
    const repoPath = path.resolve(args[1]);
    
    const options = {
      provider: 'auto',
      models: 'moonshotai/kimi-k2:free',
      maxTokens: 64000,
      maxRequests: 10,
      dryRun: false,
      // Tokenization options
      enableTokenization: true,
      disableTokenization: false,
      tokenizationDebug: false
    };

    // Parse additional options
    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--enable-tokenization') {
        options.enableTokenization = true;
      } else if (arg === '--disable-tokenization') {
        options.disableTokenization = true;
        options.enableTokenization = false;
      } else if (arg === '--tokenization-debug') {
        options.tokenizationDebug = true;
      } else if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const value = args[i + 1];
        if (value && !value.startsWith('--')) {
          // Map command line arguments to option keys
          const keyMap = {
            'provider': 'provider',
            'models': 'models', 
            'max-tokens': 'maxTokens',
            'max-requests': 'maxRequests'
          };
          
          const optionKey = keyMap[key] || key.replace(/-/g, '');
          options[optionKey] = value;
          i++; // Skip the value
        }
      }
    }

    return { prompt, repoPath, options };
  }

  /**
   * Get credentials from environment variables
   */
  static getCredentials() {
    return {
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      openrouterApiKey: process.env.OPENROUTER_API_KEY
    };
  }

  /**
   * Display usage information
   */
  static showUsage() {
    console.error('Usage: node local-claudecoder.js <prompt> <repository-path> [options]');
    console.error('');
    console.error('Arguments:');
    console.error('  prompt           The prompt describing what changes you want');
    console.error('  repository-path  Path to the local git repository');
    console.error('');
    console.error('Options:');
    console.error('  --provider       AI provider (aws|openrouter) [default: auto]');
    console.error('  --models         Comma-separated list of models [default: moonshotai/kimi-k2:free]');
    console.error('  --max-tokens     Maximum tokens to generate [default: 64000]');
    console.error('  --max-requests   Maximum number of requests [default: 10]');
    console.error('  --dry-run        Show what would be changed without applying');
    console.error('');
    console.error('Environment variables (for credentials):');
    console.error('  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION');
    console.error('  OPENROUTER_API_KEY');
  }
}

module.exports = { LocalRepositoryUtils };