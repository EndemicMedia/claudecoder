#!/usr/bin/env node

const { ClaudeCoderProcessor } = require('./core-processor');
const { LocalRepositoryUtils } = require('./local-utils');
const { getRepositoryContent } = require('./utils');
const { TokenizerIntegration } = require('./tokenizer-integration');

// Main function
async function main() {
  try {
    console.log('🚀 Local ClaudeCoder Starting...\n');
    
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      LocalRepositoryUtils.showUsage();
      process.exit(1);
    }
    
    const { prompt, repoPath, options } = LocalRepositoryUtils.parseCliArgs(args);
    
    console.log(`📝 Prompt: ${prompt}`);
    console.log(`📁 Repository: ${repoPath}`);
    console.log(`⚙️  Provider: ${options.provider}`);
    console.log(`🤖 Models: ${options.models}`);
    if (options.enableTokenization && !options.disableTokenization) {
      console.log(`🧠 Tokenization: Enabled`);
    } else {
      console.log(`📄 Tokenization: Disabled (legacy mode)`);
    }
    if (options.dryRun) {
      console.log(`🔍 Dry run mode: Changes will be previewed only`);
    }
    console.log('');

    // Validate repository
    LocalRepositoryUtils.validateRepository(repoPath);
    
    // Get repository info
    const repoInfo = LocalRepositoryUtils.getRepositoryInfo(repoPath);
    console.log(`📋 Current branch: ${repoInfo.currentBranch}`);
    if (repoInfo.hasUncommittedChanges) {
      console.warn('⚠️  Repository has uncommitted changes');
    }
    if (repoInfo.remoteUrl) {
      console.log(`🌐 Remote: ${repoInfo.remoteUrl}`);
    }
    console.log('');

    // Setup processor with credentials and options
    const credentials = LocalRepositoryUtils.getCredentials();
    const processorOptions = {
      aiProvider: options.provider,
      models: options.models,
      maxTokens: parseInt(options.maxTokens),
      maxRequests: parseInt(options.maxRequests),
      credentials
    };

    const processor = new ClaudeCoderProcessor(processorOptions);
    const { selectedModel, aiProvider } = await processor.initialize();
    
    console.log(`🤖 Selected model: ${selectedModel.displayName}`);
    console.log(`🔍 Provider: ${aiProvider}`);
    console.log('');

    console.log('📖 Reading repository content...');
    
    // Get repository content from the target repository
    const repoContent = await LocalRepositoryUtils.getRepositoryContent(repoPath, getRepositoryContent);
    
    let claudeResponse;

    if (options.enableTokenization && !options.disableTokenization) {
      // Use tokenization processing
      console.log('🧠 Using AI-powered tokenization and file prioritization...\n');
      
      try {
        const tokenizerProcessor = new TokenizerIntegration(processor.aiClient, processor.fallbackManager);
        const optimizedRepoContent = await tokenizerProcessor.processWithTokenization(
          repoContent,
          prompt,
          selectedModel
        );
        
        console.log(`🧠 Sending optimized request to ${aiProvider.toUpperCase()}...`);
        claudeResponse = await processor.processChanges(prompt, repoInfo.currentBranch, optimizedRepoContent);
        
      } catch (error) {
        console.log('⚠️  Tokenization failed, falling back to legacy mode...');
        console.log(`   Error: ${error.message}\n`);
        
        // Fallback to legacy processing
        console.log(`🧠 Sending request to ${aiProvider.toUpperCase()} (legacy mode)...`);
        claudeResponse = await processor.processChanges(prompt, repoInfo.currentBranch, repoContent);
      }
    } else {
      // Legacy processing
      console.log(`🧠 Sending request to ${aiProvider.toUpperCase()}...`);
      claudeResponse = await processor.processChanges(prompt, repoInfo.currentBranch, repoContent);
    }
    
    console.log(`✅ Received response from ${aiProvider.toUpperCase()}\n`);

    // Parse and apply changes
    const changes = processor.parseCommands(claudeResponse);
    const results = LocalRepositoryUtils.applyChanges(changes, repoPath, options.dryRun);
    
    if (changes.length === 0) {
      console.log('ℹ️  No changes suggested by Claude');
    } else {
      console.log(`\n📊 Summary: ${changes.length} file(s) ${options.dryRun ? 'would be' : 'were'} modified`);
      
      // Show any errors
      const errors = results.filter(r => r.status === 'error');
      if (errors.length > 0) {
        console.log(`❌ ${errors.length} file(s) had errors`);
      }
      
      if (!options.dryRun && changes.length > 0) {
        console.log('\n💡 Next steps:');
        console.log('   1. Review the changes in your repository');
        console.log('   2. Test the modifications');
        console.log('   3. Commit if satisfied: git add . && git commit -m "Applied ClaudeCoder suggestions"');
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };