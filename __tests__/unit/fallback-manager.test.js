const core = require('@actions/core');
const { FallbackManager } = require('../../fallback-manager');
const { ModelSelector } = require('../../model-selector');

// Mock @actions/core
jest.mock('@actions/core');

describe('FallbackManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const models = [{ name: 'test-model', provider: 'openrouter', displayName: 'Test Model' }];
      const manager = new FallbackManager(models);
      
      expect(core.info).toHaveBeenCalledWith('Fallback Manager initialized with 1 models');
      expect(manager.models).toHaveLength(1);
      expect(manager.options.retryInterval).toBe(5);
      expect(manager.options.rateLimitCooldown).toBe(300000);
      expect(manager.options.maxRetries).toBe(3);
    });

    it('should initialize with custom options', () => {
      const models = [{ name: 'test-model', provider: 'openrouter', displayName: 'Test Model' }];
      const options = {
        retryInterval: 10,
        rateLimitCooldown: 60000,
        maxRetries: 5
      };
      const manager = new FallbackManager(models, options);
      
      expect(manager.options.retryInterval).toBe(10);
      expect(manager.options.rateLimitCooldown).toBe(60000);
      expect(manager.options.maxRetries).toBe(5);
    });

    it('should initialize all models as available', () => {
      const models = [
        { name: 'model1', provider: 'openrouter', displayName: 'Model 1' },
        { name: 'model2', provider: 'aws', displayName: 'Model 2' }
      ];
      const manager = new FallbackManager(models);
      
      models.forEach(model => {
        const state = manager.modelStates.get(model.name);
        expect(state.status).toBe('available');
        expect(state.failures).toBe(0);
        expect(state.lastAttempt).toBeNull();
        expect(state.rateLimitedAt).toBeNull();
      });
    });
  });

  describe('Model Selection', () => {
    it('should return first available model initially', () => {
      const models = [
        { name: 'model1', provider: 'openrouter', displayName: 'Model 1' },
        { name: 'model2', provider: 'aws', displayName: 'Model 2' }
      ];
      const manager = new FallbackManager(models);
      
      const selectedModel = manager.getCurrentModel();
      expect(selectedModel).toEqual(models[0]);
    });

    it('should skip unavailable models', () => {
      const models = [
        { name: 'model1', provider: 'openrouter', displayName: 'Model 1' },
        { name: 'model2', provider: 'aws', displayName: 'Model 2' }
      ];
      const manager = new FallbackManager(models);
      
      // Mark first model as failed
      const state1 = manager.modelStates.get('model1');
      state1.status = 'failed';
      
      const selectedModel = manager.getCurrentModel();
      expect(selectedModel).toEqual(models[1]);
    });

    it('should reset failed models when no models available', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models);
      
      // Mark model as failed
      const state = manager.modelStates.get('model1');
      state.status = 'failed';
      
      const selectedModel = manager.getCurrentModel();
      expect(selectedModel).toEqual(models[0]);
      expect(state.status).toBe('available');
      expect(core.warning).toHaveBeenCalledWith('No models available! Resetting all failed models and retrying...');
    });
  });

  describe('Success Handling', () => {
    it('should reset failure count on success', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models);
      
      const model = models[0];
      const state = manager.modelStates.get(model.name);
      
      // Set some failures
      state.failures = 2;
      
      manager.handleModelResult(model, true);
      
      expect(state.failures).toBe(0);
      expect(state.status).toBe('available');
      expect(manager.totalRequests).toBe(1);
      expect(core.info).toHaveBeenCalledWith('✅ Model Model 1 succeeded (request 1)');
    });
  });

  describe('Rate Limit Handling', () => {
    it('should detect rate limit errors', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models);
      
      const rateLimitError = new Error('rate limit exceeded');
      const isRateLimit = manager.isRateLimitError(rateLimitError);
      
      expect(isRateLimit).toBe(true);
    });

    it('should handle rate limit by switching models', () => {
      const models = [
        { name: 'model1', provider: 'openrouter', displayName: 'Model 1' },
        { name: 'model2', provider: 'aws', displayName: 'Model 2' }
      ];
      const manager = new FallbackManager(models);
      
      const rateLimitError = new Error('Too many requests');
      manager.handleModelResult(models[0], false, rateLimitError);
      
      const state = manager.modelStates.get('model1');
      expect(state.status).toBe('rate_limited');
      expect(state.rateLimitedAt).toBeTruthy();
      expect(core.warning).toHaveBeenCalledWith('⏳ Model Model 1 rate limited - will retry in 300s');
    });

    it('should recover from rate limits after cooldown', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models, { 
        rateLimitCooldown: 1000,
        retryInterval: 1 // Force immediate check
      });
      
      const state = manager.modelStates.get('model1');
      state.status = 'rate_limited';
      state.rateLimitedAt = Date.now() - 2000; // 2 seconds ago
      
      // Set request count to trigger retry check
      manager.requestCount = 1;
      manager.checkRateLimitedModels();
      
      expect(state.status).toBe('available');
      expect(state.rateLimitedAt).toBeNull();
      expect(state.failures).toBe(0);
    });
  });

  describe('Failure Handling', () => {
    it('should track failures correctly', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models, { maxRetries: 2 });
      
      const model = models[0];
      const error = new Error('Server error');
      
      // First failure
      manager.handleModelResult(model, false, error);
      let state = manager.modelStates.get(model.name);
      expect(state.failures).toBe(1);
      expect(state.status).toBe('available');
      
      // Second failure - should mark as failed
      manager.handleModelResult(model, false, error);
      state = manager.modelStates.get(model.name);
      expect(state.failures).toBe(2);
      expect(state.status).toBe('failed');
      expect(core.warning).toHaveBeenCalledWith('❌ Model Model 1 failed 2 times - marking as failed');
    });

    it('should move to next model after max failures', () => {
      const models = [
        { name: 'model1', provider: 'openrouter', displayName: 'Model 1' },
        { name: 'model2', provider: 'aws', displayName: 'Model 2' }
      ];
      const manager = new FallbackManager(models, { maxRetries: 1 });
      
      const error = new Error('Server error');
      manager.handleModelResult(models[0], false, error);
      
      // Should have switched to model 2
      const currentModel = manager.getCurrentModel();
      expect(currentModel).toEqual(models[1]);
    });
  });

  describe('Error Detection', () => {
    it('should identify various rate limit error patterns', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models);
      
      const testCases = [
        new Error('rate limit exceeded'),
        new Error('Too many requests'),
        new Error('429 error'),
        new Error('quota exceeded'),
        new Error('usage limit reached'),
        new Error('Request was throttled')
      ];
      
      testCases.forEach(error => {
        expect(manager.isRateLimitError(error)).toBe(true);
      });
    });

    it('should not identify non-rate-limit errors', () => {
      const models = [{ name: 'model1', provider: 'openrouter', displayName: 'Model 1' }];
      const manager = new FallbackManager(models);
      
      const testCases = [
        new Error('Server error'),
        new Error('Invalid request'),
        new Error('Network timeout'),
        null,
        undefined
      ];
      
      testCases.forEach(error => {
        expect(manager.isRateLimitError(error)).toBe(false);
      });
    });

    it('should identify model authorization error patterns', () => {
      const models = [{ name: 'test-model', provider: 'aws', displayName: 'Test Model' }];
      const manager = new FallbackManager(models);
      
      const authorizationErrors = [
        new Error('not authorized to access model'),
        new Error('access denied to model'),
        new Error('forbidden - 403'),
        new Error('model not enabled'),
        new Error('model not found'),
        new Error('ValidationException: Model access not available'),
        new Error('insufficient permissions'),
        new Error('invalid model access')
      ];
      
      authorizationErrors.forEach(error => {
        expect(manager.isModelNotAuthorizedError(error)).toBe(true);
      });
    });

    it('should identify model unavailability error patterns', () => {
      const models = [{ name: 'test-model', provider: 'aws', displayName: 'Test Model' }];
      const manager = new FallbackManager(models);
      
      const unavailabilityErrors = [
        new Error('model not available'),
        new Error('model unavailable in this region'),
        new Error('service unavailable'),
        new Error('region not supported'),
        new Error('model not supported'),
        new Error('temporarily unavailable')
      ];
      
      unavailabilityErrors.forEach(error => {
        expect(manager.isModelUnavailableError(error)).toBe(true);
      });
    });

    it('should get correct model family classification', () => {
      const models = [{ name: 'test-model', provider: 'aws', displayName: 'Test Model' }];
      const manager = new FallbackManager(models);
      
      expect(manager.getModelFamily('anthropic.claude-sonnet-4-20250514-v1:0')).toBe('Claude 4 (Latest)');
      expect(manager.getModelFamily('anthropic.claude-opus-4-1-20250805-v1:0')).toBe('Claude 4 (Latest)');
      expect(manager.getModelFamily('anthropic.claude-3-7-sonnet-20250219-v1:0')).toBe('Claude 3.5/3.7');
      expect(manager.getModelFamily('anthropic.claude-3-5-sonnet-20241022-v2:0')).toBe('Claude 3.5/3.7');
      expect(manager.getModelFamily('anthropic.claude-3-opus-20240229-v1:0')).toBe('Claude 3');
      expect(manager.getModelFamily('anthropic.claude-instant-v1')).toBe('Claude');
      expect(manager.getModelFamily('other-model')).toBe('Unknown Model Family');
    });

    it('should handle authorization errors with fallback and warning', () => {
      const models = [
        { name: 'us.anthropic.claude-sonnet-4-20250514-v1:0', provider: 'aws', displayName: 'Claude Sonnet 4 (AWS US)' },
        { name: 'moonshotai/kimi-k2:free', provider: 'openrouter', displayName: 'Kimi K2 (Free)' }
      ];
      const manager = new FallbackManager(models);
      
      const authError = new Error('ValidationException: Model access not enabled');
      manager.handleModelResult(models[0], false, authError);
      
      // Should have marked as failed and moved to next model
      const state = manager.modelStates.get(models[0].name);
      expect(state.status).toBe('failed');
      expect(manager.currentModelIndex).toBe(1);
      
      // Should have logged authorization warning
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('AWS Bedrock Model Access Required'));
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Claude 4 (Latest)'));
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive stats', () => {
      const models = [
        { name: 'model1', provider: 'openrouter', displayName: 'Model 1' },
        { name: 'model2', provider: 'aws', displayName: 'Model 2' }
      ];
      const manager = new FallbackManager(models);
      
      // Simulate some activity
      manager.handleModelResult(models[0], true);
      manager.handleModelResult(models[0], false, new Error('rate limit'));
      
      const stats = manager.getStats();
      
      expect(stats.totalRequests).toBe(2);
      expect(stats.currentModel).toEqual(models[1]); // Should have switched
      expect(stats.modelStates).toHaveProperty('model1');
      expect(stats.modelStates).toHaveProperty('model2');
      expect(stats.modelStates.model1.status).toBe('rate_limited');
    });
  });

  describe('Integration with ModelSelector', () => {
    it('should work with real model configurations', () => {
      const modelSelector = new ModelSelector('moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free');
      const models = modelSelector.getAllModels();
      const manager = new FallbackManager(models);
      
      expect(manager.models).toHaveLength(2);
      expect(manager.models[0].name).toBe('moonshotai/kimi-k2:free');
      expect(manager.models[1].name).toBe('google/gemini-2.0-flash-exp:free');
      
      const currentModel = manager.getCurrentModel();
      expect(currentModel.provider).toBe('openrouter');
    });
  });
});