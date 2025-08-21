const { AIProviderFactory } = require('./ai-provider');
const { ModelSelector } = require('./model-selector');
const { FallbackManager } = require('./fallback-manager');
const { getRepositoryContent } = require('./utils');

/**
 * Core ClaudeCoder processor that can be used in both GitHub Actions and local execution
 */
class ClaudeCoderProcessor {
  constructor(options = {}) {
    this.options = {
      aiProvider: 'auto',
      models: 'moonshotai/kimi-k2:free',
      maxTokens: 64000,
      maxRequests: 10,
      enableThinking: true,
      thinkingBudget: 1024,
      extendedOutput: true,
      requestTimeout: 3600000,
      requiredLabel: 'claudecoder',
      ...options
    };
    
    this.credentials = options.credentials || {};
    this.fallbackManager = null;
    this.aiClient = null;
  }

  /**
   * Initialize the AI client with fallback management
   */
  async initialize() {
    // Setup model selection and fallback
    const modelSelector = new ModelSelector(this.options.models);
    const allModels = modelSelector.getAllModels();
    
    this.fallbackManager = new FallbackManager(allModels, {
      retryInterval: 5,
      rateLimitCooldown: 300000,
      maxRetries: 2
    });
    
    const selectedModel = this.fallbackManager.getCurrentModel();
    
    // Auto-detect provider if needed
    let aiProvider = this.options.aiProvider;
    if (aiProvider === 'auto') {
      aiProvider = selectedModel.provider;
    }

    // Initialize AI client
    this.aiClient = AIProviderFactory.createProvider(aiProvider, this.credentials, {
      maxTokens: this.options.maxTokens,
      enableThinking: this.options.enableThinking,
      thinkingBudget: this.options.thinkingBudget,
      extendedOutput: this.options.extendedOutput,
      requestTimeout: this.options.requestTimeout,
      model: selectedModel.name,
      fallbackManager: this.fallbackManager
    });

    return {
      selectedModel,
      aiProvider
    };
  }

  /**
   * Minify content for token efficiency
   */
  minifyContent(content) {
    return content.replace(/\s+/g, ' ').trim();
  }

  /**
   * Build the AI prompt from repository content and user request
   */
  buildPrompt(repoContent, promptText, baseBranch = 'main') {
    const repoContentString = Object.entries(repoContent)
      .map(([file, content]) => `File: ${file}\n\n${this.minifyContent(content)}`)
      .join('\n\n---\n\n');

    return `
You are an AI assistant tasked with suggesting changes to a GitHub repository based on a pull request comment or description.
Below is the current structure and content of the repository, followed by the latest comment or pull request description.
Please analyze the repository content and the provided text, then suggest appropriate changes.

Repository content (minified):
${repoContentString}

Description/Comment:
${promptText}

<instructions>
Based on the repository content and the provided text, suggest changes to the codebase. 
Format your response as a series of git commands that can be executed to make the changes.
Each command should be on a new line and start with 'git'.
For file content changes, use 'git add' followed by the file path, then provide the new content between <<<EOF and EOF>>> markers.
Ensure all file paths are valid and use forward slashes.
Consider the overall architecture and coding style of the existing codebase when suggesting changes.
If not directly related to the requested changes, don't make code changes to those parts. we want to keep consistency and stability with each iteration
If the provided text is vague, don't make any changes.
If no changes are necessary or if the request is unclear, state so explicitly.
When you have finished suggesting all changes, end your response with the line END_OF_SUGGESTIONS.
</instructions>

Base branch: ${baseBranch}
`;
  }

  /**
   * Process changes with AI and return the response
   */
  async processChanges(promptText, baseBranch = 'main', repoContent = null) {
    if (!this.aiClient) {
      throw new Error('Processor not initialized. Call initialize() first.');
    }

    // Get repository content if not provided
    if (!repoContent) {
      repoContent = await getRepositoryContent();
    }
    
    // Build prompt
    const initialPrompt = this.buildPrompt(repoContent, promptText, baseBranch);
    
    // Get AI response
    const claudeResponse = await this.aiClient.getCompleteResponse(
      initialPrompt, 
      null, 
      this.options.maxRequests
    );

    return claudeResponse;
  }

  /**
   * Parse commands from Claude's response
   */
  parseCommands(claudeResponse) {
    const commands = claudeResponse.split('\n').filter(cmd => cmd.trim().startsWith('git'));
    const changes = [];

    for (const command of commands) {
      if (command.startsWith('git add')) {
        // Parse the file path more carefully - get everything between 'git add' and any EOF markers
        const parts = command.split(' ');
        let filePath = parts[2]; // First argument after 'git add'
        
        // If there are EOF markers on the same line, stop before them
        if (filePath && (filePath.includes('<<') || filePath.includes('```'))) {
          filePath = filePath.split('<<')[0].split('```')[0];
        }
        
        // Parse content using various EOF marker patterns
        const eofPatterns = [
          { start: '<<<EOF', end: 'EOF>>>', startOffset: 6 },
          { start: '<<EOF', end: 'EOF>>', startOffset: 5 },
          { start: '<<EOF', end: 'EOF', startOffset: 5 },
          { start: '```', end: '```', startOffset: 3 }
        ];
        
        let content = '';
        let found = false;
        
        for (const pattern of eofPatterns) {
          const commandIndex = claudeResponse.indexOf(command);
          const contentStart = claudeResponse.indexOf(pattern.start, commandIndex);
          if (contentStart !== -1) {
            const contentEnd = claudeResponse.indexOf(pattern.end, contentStart + pattern.startOffset);
            if (contentEnd !== -1) {
              content = claudeResponse.slice(contentStart + pattern.startOffset, contentEnd).trim();
              found = true;
              break;
            }
          }
        }
        
        if (found) {
          changes.push({
            command,
            filePath,
            content
          });
        } else {
          console.error(`Invalid content markers for file: ${filePath}`);
        }
      }
    }

    return changes;
  }
}

module.exports = { ClaudeCoderProcessor };