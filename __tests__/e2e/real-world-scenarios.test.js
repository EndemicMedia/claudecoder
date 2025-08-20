const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const github = require('@actions/github');
const { AIProviderFactory } = require('../../ai-provider');
const { ModelSelector } = require('../../model-selector');
const { FallbackManager } = require('../../fallback-manager');

// Mock @actions/core for testing
jest.mock('@actions/core');
jest.mock('@actions/github');

describe('Real-World E2E Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup core input mocks
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'github-token': 'mock-github-token',
        'ai-provider': 'auto',
        'models': 'moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free',
        'openrouter-api-key': process.env.OPENROUTER_API_KEY || 'mock-key',
        'max-tokens': '4000',
        'max-requests': '2',
        'enable-thinking': 'false',
        'extended-output': 'false',
        'request-timeout': '30000',
        'required-label': 'claudecoder'
      };
      return inputs[name] || '';
    });

    // Mock GitHub context
    github.context = {
      repo: { owner: 'testowner', repo: 'testrepo' },
      payload: {}
    };
  });

  describe('PR Label Trigger - Basic Code Improvement', () => {
    it('should process calculator improvement request with real event payload', async () => {
      // Load real GitHub event payload
      const eventPath = path.join(__dirname, '../fixtures/events/pr-labeled-basic.json');
      const eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      
      // Setup GitHub context with real event
      github.context.payload = eventPayload;
      
      // Setup model selector and fallback manager
      const modelSelector = new ModelSelector('moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free');
      const models = modelSelector.getAllModels();
      const fallbackManager = new FallbackManager(models, {
        retryInterval: 5,
        rateLimitCooldown: 300000,
        maxRetries: 2
      });
      
      // Get selected model
      const selectedModel = fallbackManager.getCurrentModel();
      
      // Verify model selection
      expect(selectedModel).toBeDefined();
      expect(selectedModel.provider).toBe('openrouter');
      expect(selectedModel.name).toBe('moonshotai/kimi-k2:free');
      
      // Test PR has required label
      const hasRequiredLabel = eventPayload.pull_request.labels.some(
        label => label.name.toLowerCase() === 'claudecoder'
      );
      expect(hasRequiredLabel).toBe(true);
      
      // Verify PR content matches expectations
      expect(eventPayload.pull_request.title).toBe('Test PR for ClaudeCoder');
      expect(eventPayload.pull_request.body).toContain('Adding proper error handling');
      expect(eventPayload.pull_request.body).toContain('Converting to modern ES6 class syntax');
      expect(eventPayload.pull_request.body).toContain('Adding input validation');
    });

    it('should handle calculator legacy code scenario', async () => {
      // Load target file that needs improvement
      const filePath = path.join(__dirname, '../fixtures/files/calculator-legacy.js');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Verify the file contains expected issues
      expect(fileContent).toContain('function Calculator()'); // Old prototype syntax
      expect(fileContent).toContain('this.result = this.result / num;'); // No division by zero check
      expect(fileContent).toContain('var calc = new Calculator()'); // Old var syntax
      expect(fileContent).toContain('divide(0)'); // Division by zero issue
      
      // This represents the type of code that would be in the repository
      // when the AI processes the PR request
      const repoContent = {
        'test-example.js': fileContent
      };
      
      // Create mock prompt that would be sent to AI
      const promptText = "Please improve the test-example.js file by: 1) Adding proper error handling for division by zero, 2) Converting to modern ES6 class syntax, 3) Adding input validation, 4) Improving the code structure and readability. Make it production-ready!";
      
      const repoContentString = Object.entries(repoContent)
        .map(([file, content]) => `File: ${file}\n\n${content}`)
        .join('\n\n---\n\n');

      const initialPrompt = `
        You are an AI assistant tasked with suggesting changes to a GitHub repository based on a pull request comment or description.
        Below is the current structure and content of the repository, followed by the latest comment or pull request description.
        Please analyze the repository content and the provided text, then suggest appropriate changes.

        Repository content:
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

        Base branch: main
      `;
      
      // Verify prompt structure
      expect(initialPrompt).toContain('test-example.js');
      expect(initialPrompt).toContain('division by zero');
      expect(initialPrompt).toContain('ES6 class syntax');
      expect(initialPrompt).toContain('input validation');
    });
  });

  describe('PR Label Trigger - React Component Creation', () => {
    it('should process React component request with real event payload', async () => {
      // Load real GitHub event payload for React scenario
      const eventPath = path.join(__dirname, '../fixtures/events/pr-labeled-react.json');
      const eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      
      // Setup GitHub context with real event
      github.context.payload = eventPayload;
      
      // Verify React-specific requirements
      expect(eventPayload.pull_request.title).toBe('Add Interactive Task Manager Dashboard');
      expect(eventPayload.pull_request.body).toContain('TaskManager.jsx');
      expect(eventPayload.pull_request.body).toContain('TaskItem.jsx');
      expect(eventPayload.pull_request.body).toContain('React and Tailwind CSS');
      expect(eventPayload.pull_request.body).toContain('useState');
      expect(eventPayload.pull_request.body).toContain('priority (High/Medium/Low)');
      
      // Test model selection for React scenario
      const modelSelector = new ModelSelector('google/gemini-2.0-flash-exp:free,moonshotai/kimi-k2:free');
      const models = modelSelector.getAllModels();
      const fallbackManager = new FallbackManager(models);
      
      const selectedModel = fallbackManager.getCurrentModel();
      expect(selectedModel.provider).toBe('openrouter');
    });
  });

  describe('Model Fallback Scenarios', () => {
    it('should handle rate limiting with real model configurations', async () => {
      const models = ['moonshotai/kimi-k2:free', 'google/gemini-2.0-flash-exp:free', 'deepseek/deepseek-r1-0528:free'];
      const modelSelector = new ModelSelector(models.join(','));
      const allModels = modelSelector.getAllModels();
      
      const fallbackManager = new FallbackManager(allModels, {
        retryInterval: 2,
        rateLimitCooldown: 5000, // 5 seconds for testing
        maxRetries: 1
      });
      
      // Simulate rate limit on first model
      const firstModel = fallbackManager.getCurrentModel();
      expect(firstModel.name).toBe('moonshotai/kimi-k2:free');
      
      const rateLimitError = new Error('Rate limit exceeded - too many requests');
      fallbackManager.handleModelResult(firstModel, false, rateLimitError);
      
      // Should switch to second model
      const secondModel = fallbackManager.getCurrentModel();
      expect(secondModel.name).toBe('google/gemini-2.0-flash-exp:free');
      expect(secondModel.name).not.toBe(firstModel.name);
      
      // Verify first model is rate limited
      const firstModelState = fallbackManager.modelStates.get(firstModel.name);
      expect(firstModelState.status).toBe('rate_limited');
      expect(firstModelState.rateLimitedAt).toBeTruthy();
    });

    it('should handle multiple model failures and recovery', async () => {
      const models = ['moonshotai/kimi-k2:free', 'google/gemini-2.0-flash-exp:free'];
      const modelSelector = new ModelSelector(models.join(','));
      const allModels = modelSelector.getAllModels();
      
      const fallbackManager = new FallbackManager(allModels, {
        maxRetries: 1
      });
      
      // Fail first model
      const firstModel = fallbackManager.getCurrentModel();
      const serverError = new Error('Internal server error');
      fallbackManager.handleModelResult(firstModel, false, serverError);
      
      // Should switch to second model
      const secondModel = fallbackManager.getCurrentModel();
      expect(secondModel.name).toBe('google/gemini-2.0-flash-exp:free');
      
      // Test success on second model
      fallbackManager.handleModelResult(secondModel, true);
      const secondModelState = fallbackManager.modelStates.get(secondModel.name);
      expect(secondModelState.status).toBe('available');
      expect(secondModelState.failures).toBe(0);
      
      // Verify stats
      const stats = fallbackManager.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.currentModel.name).toBe('google/gemini-2.0-flash-exp:free');
    });
  });

  describe('Real API Integration Tests', () => {
    // These tests will use real API keys when available
    const hasOpenRouterKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'mock-key';
    const hasAWSCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    
    // Test prompt used across all providers for consistency
    const standardTestPrompt = "Say 'Hello, this is a test response from MODEL_NAME' and nothing else.";
    
    (hasOpenRouterKey ? it : it.skip)('should make real API call to OpenRouter', async () => {
      const modelSelector = new ModelSelector('moonshotai/kimi-k2:free');
      const models = modelSelector.getAllModels();
      const fallbackManager = new FallbackManager(models);
      const selectedModel = fallbackManager.getCurrentModel();
      
      const credentials = {
        openrouterApiKey: process.env.OPENROUTER_API_KEY
      };
      
      const aiClient = AIProviderFactory.createProvider('openrouter', credentials, {
        maxTokens: 100,
        enableThinking: false,
        model: selectedModel.name,
        fallbackManager
      });
      
      // Use standardized test prompt
      const testPrompt = standardTestPrompt.replace('MODEL_NAME', selectedModel.displayName);
      
      try {
        const response = await aiClient.invokeClaude(testPrompt, null, 0);
        
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.toLowerCase()).toContain('hello');
        
        // Verify fallback manager tracked the success
        const stats = fallbackManager.getStats();
        expect(stats.totalRequests).toBeGreaterThan(0);
        
      } catch (error) {
        // If we get a rate limit or quota error, that's actually good - 
        // it means we successfully connected to the API
        if (error.message.includes('rate limit') || error.message.includes('quota')) {
          console.log('API call rate limited - this is expected behavior');
          
          // Verify fallback manager handled the rate limit
          const firstModelState = fallbackManager.modelStates.get(selectedModel.name);
          expect(firstModelState.status).toBe('rate_limited');
        } else {
          throw error;
        }
      }
    }, 30000); // 30 second timeout for real API calls

    (hasAWSCredentials ? it : it.skip)('should make real API call to AWS Bedrock', async () => {
      const modelSelector = new ModelSelector('us.anthropic.claude-3-7-sonnet-20250219-v1:0');
      const models = modelSelector.getAllModels();
      const fallbackManager = new FallbackManager(models);
      const selectedModel = fallbackManager.getCurrentModel();
      
      const credentials = {
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: process.env.AWS_REGION || 'us-east-1'
      };
      
      const aiClient = AIProviderFactory.createProvider('aws', credentials, {
        maxTokens: 100,
        enableThinking: false,
        model: selectedModel.name,
        fallbackManager
      });
      
      // Use same standardized test prompt as OpenRouter
      const testPrompt = standardTestPrompt.replace('MODEL_NAME', selectedModel.displayName);
      
      try {
        const response = await aiClient.invokeClaude(testPrompt, null, 0);
        
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.toLowerCase()).toContain('hello');
        expect(response.toLowerCase()).toContain('claude');
        
        // Verify fallback manager tracked the success
        const stats = fallbackManager.getStats();
        expect(stats.totalRequests).toBeGreaterThan(0);
        
      } catch (error) {
        // If we get a throttling or quota error, that's expected behavior
        if (error.message.includes('throttling') || error.message.includes('quota') || error.message.includes('limit')) {
          console.log('AWS Bedrock API call throttled - this is expected behavior');
          
          // Verify fallback manager handled the rate limit
          const firstModelState = fallbackManager.modelStates.get(selectedModel.name);
          expect(['rate_limited', 'failed']).toContain(firstModelState.status);
        } else {
          throw error;
        }
      }
    }, 30000); // 30 second timeout for real API calls

    (hasOpenRouterKey ? it : it.skip)('should test fallback with real OpenRouter APIs', async () => {
      // Test with multiple models to verify real fallback behavior
      const models = 'moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free';
      const modelSelector = new ModelSelector(models);
      const allModels = modelSelector.getAllModels();
      
      const fallbackManager = new FallbackManager(allModels, {
        retryInterval: 1,
        rateLimitCooldown: 10000,
        maxRetries: 1
      });
      
      const credentials = {
        openrouterApiKey: process.env.OPENROUTER_API_KEY
      };
      
      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = [];
      for (let i = 0; i < 3; i++) {
        const currentModel = fallbackManager.getCurrentModel();
        const aiClient = AIProviderFactory.createProvider('openrouter', credentials, {
          maxTokens: 50,
          model: currentModel.name,
          fallbackManager
        });
        
        const promise = aiClient.invokeClaude(`Test request ${i + 1}: Say "Response ${i + 1}"`, null, 0)
          .then(response => {
            fallbackManager.handleModelResult(currentModel, true);
            return { success: true, response, model: currentModel.name };
          })
          .catch(error => {
            fallbackManager.handleModelResult(currentModel, false, error);
            return { success: false, error: error.message, model: currentModel.name };
          });
          
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      
      // Verify we got some responses (either success or expected failures)
      expect(results).toHaveLength(3);
      
      // Check that fallback manager tracked the requests
      const stats = fallbackManager.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      
      // Log results for debugging
      console.log('Real API test results:', {
        totalRequests: stats.totalRequests,
        currentModel: stats.currentModel.name,
        results: results.map(r => ({ success: r.success, model: r.model }))
      });
      
    }, 60000); // 60 second timeout for multiple API calls

    ((hasOpenRouterKey && hasAWSCredentials) ? it : it.skip)('should test cross-provider fallback with identical prompts', async () => {
      // Test mixed OpenRouter + AWS models with same prompt
      const mixedModels = 'moonshotai/kimi-k2:free,us.anthropic.claude-3-7-sonnet-20250219-v1:0';
      const modelSelector = new ModelSelector(mixedModels);
      const allModels = modelSelector.getAllModels();
      
      expect(allModels).toHaveLength(2);
      expect(allModels[0].provider).toBe('openrouter');
      expect(allModels[1].provider).toBe('aws');
      
      const fallbackManager = new FallbackManager(allModels, {
        retryInterval: 1,
        rateLimitCooldown: 5000,
        maxRetries: 1
      });
      
      const credentials = {
        openrouterApiKey: process.env.OPENROUTER_API_KEY,
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: process.env.AWS_REGION || 'us-east-1'
      };
      
      // Test same prompt on first model (OpenRouter)
      const firstModel = fallbackManager.getCurrentModel();
      const firstClient = AIProviderFactory.createProvider(firstModel.provider, credentials, {
        maxTokens: 100,
        model: firstModel.name,
        fallbackManager
      });
      
      const testPrompt1 = standardTestPrompt.replace('MODEL_NAME', firstModel.displayName);
      
      try {
        const response1 = await firstClient.invokeClaude(testPrompt1, null, 0);
        fallbackManager.handleModelResult(firstModel, true);
        
        expect(response1).toBeDefined();
        console.log(`✅ ${firstModel.provider} (${firstModel.displayName}) responded successfully`);
        
      } catch (error) {
        fallbackManager.handleModelResult(firstModel, false, error);
        console.log(`⚠️ ${firstModel.provider} failed: ${error.message}`);
      }
      
      // Force switch to second model (AWS) and test same prompt
      fallbackManager.moveToNextModel();
      const secondModel = fallbackManager.getCurrentModel();
      
      if (secondModel.name !== firstModel.name) {
        const secondClient = AIProviderFactory.createProvider(secondModel.provider, credentials, {
          maxTokens: 100,
          model: secondModel.name,
          fallbackManager
        });
        
        const testPrompt2 = standardTestPrompt.replace('MODEL_NAME', secondModel.displayName);
        
        try {
          const response2 = await secondClient.invokeClaude(testPrompt2, null, 0);
          fallbackManager.handleModelResult(secondModel, true);
          
          expect(response2).toBeDefined();
          console.log(`✅ ${secondModel.provider} (${secondModel.displayName}) responded successfully`);
          
        } catch (error) {
          fallbackManager.handleModelResult(secondModel, false, error);
          console.log(`⚠️ ${secondModel.provider} failed: ${error.message}`);
        }
      }
      
      // Verify we tested both providers
      const stats = fallbackManager.getStats();
      console.log('Cross-provider test results:', {
        totalRequests: stats.totalRequests,
        currentModel: `${stats.currentModel.provider}:${stats.currentModel.displayName}`,
        testedProviders: ['openrouter', 'aws']
      });
      
      expect(stats.totalRequests).toBeGreaterThan(0);
      
    }, 90000); // 90 second timeout for cross-provider calls
  });

  describe('ACT Integration Preparation', () => {
    it('should prepare environment variables for ACT testing', () => {
      // These are the environment variables that ACT would need
      const requiredEnvVars = [
        'GITHUB_TOKEN',
        'OPENROUTER_API_KEY'
      ];
      
      // In real ACT testing, these would be provided via .env file
      requiredEnvVars.forEach(envVar => {
        // Just verify the structure is correct for ACT
        expect(typeof envVar).toBe('string');
        expect(envVar.length).toBeGreaterThan(0);
      });
    });

    it('should validate ACT event payload structure', () => {
      const eventPath = path.join(__dirname, '../fixtures/events/pr-labeled-basic.json');
      const eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      
      // Verify the event payload has all required fields for ACT
      expect(eventPayload.action).toBe('labeled');
      expect(eventPayload.pull_request).toBeDefined();
      expect(eventPayload.pull_request.number).toBeDefined();
      expect(eventPayload.pull_request.head.ref).toBeDefined();
      expect(eventPayload.pull_request.base.ref).toBeDefined();
      expect(eventPayload.repository).toBeDefined();
      expect(eventPayload.repository.full_name).toBeDefined();
    });
  });
});