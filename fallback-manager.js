const core = require('@actions/core');

class FallbackManager {
  constructor(models, options = {}) {
    this.models = models; // Array of model objects with name, provider, displayName
    this.options = {
      retryInterval: options.retryInterval || 5, // Check rate-limited models every 5 requests
      rateLimitCooldown: options.rateLimitCooldown || 300000, // 5 minutes cooldown for rate-limited models
      maxRetries: options.maxRetries || 3, // Max retries per model before marking as failed
      ...options
    };
    
    // Track model states
    this.modelStates = new Map(); // modelName -> { status, lastAttempt, failures, rateLimitedAt }
    this.currentModelIndex = 0;
    this.requestCount = 0;
    this.totalRequests = 0;
    
    // Initialize all models as available
    this.models.forEach(model => {
      this.modelStates.set(model.name, {
        status: 'available', // available, rate_limited, failed
        lastAttempt: null,
        failures: 0,
        rateLimitedAt: null
      });
    });
    
    core.info(`Fallback Manager initialized with ${this.models.length} models`);
    this.logModelStates();
  }

  getCurrentModel() {
    // Check if we should retry rate-limited models
    this.checkRateLimitedModels();
    
    // Find the next available model starting from currentModelIndex
    for (let i = 0; i < this.models.length; i++) {
      const modelIndex = (this.currentModelIndex + i) % this.models.length;
      const model = this.models[modelIndex];
      const state = this.modelStates.get(model.name);
      
      if (state.status === 'available') {
        this.currentModelIndex = modelIndex;
        core.info(`Using model: ${model.displayName} (attempt ${this.totalRequests + 1})`);
        return model;
      }
    }
    
    // If no models are available, reset all failed models and try again
    core.warning('No models available! Resetting all failed models and retrying...');
    this.resetFailedModels();
    
    // Try the first model
    this.currentModelIndex = 0;
    const firstModel = this.models[0];
    core.info(`Fallback to first model: ${firstModel.displayName} (emergency fallback)`);
    return firstModel;
  }

  handleModelResult(model, success, error = null) {
    this.totalRequests++;
    this.requestCount++;
    const state = this.modelStates.get(model.name);
    
    if (success) {
      // Reset failure count on success
      state.failures = 0;
      state.status = 'available';
      state.lastAttempt = Date.now();
      
      core.info(`✅ Model ${model.displayName} succeeded (request ${this.totalRequests})`);
    } else {
      state.failures++;
      state.lastAttempt = Date.now();
      
      // Check for authorization/availability issues first
      if (this.isModelNotAuthorizedError(error)) {
        state.status = 'failed';
        this.logModelAuthorizationWarning(model, error);
        this.moveToNextModel();
      } else if (this.isModelUnavailableError(error)) {
        state.status = 'failed';
        core.warning(`🚫 Model ${model.displayName} is temporarily unavailable`);
        core.warning(`❌ Error: ${error.message}`);
        core.warning(`🔄 Falling back to next available model...`);
        this.moveToNextModel();
      } else if (this.isRateLimitError(error)) {
        state.status = 'rate_limited';
        state.rateLimitedAt = Date.now();
        core.warning(`⏳ Model ${model.displayName} rate limited - will retry in ${this.options.rateLimitCooldown/1000}s`);
        this.moveToNextModel();
      } else if (state.failures >= this.options.maxRetries) {
        state.status = 'failed';
        core.warning(`❌ Model ${model.displayName} failed ${this.options.maxRetries} times - marking as failed`);
        this.moveToNextModel();
      } else {
        core.warning(`⚠️  Model ${model.displayName} failed (${state.failures}/${this.options.maxRetries}) - retrying`);
      }
    }
    
    this.logModelStates();
  }

  moveToNextModel() {
    const previousIndex = this.currentModelIndex;
    
    // Find next available model
    for (let i = 1; i < this.models.length; i++) {
      const nextIndex = (this.currentModelIndex + i) % this.models.length;
      const nextModel = this.models[nextIndex];
      const nextState = this.modelStates.get(nextModel.name);
      
      if (nextState.status === 'available') {
        this.currentModelIndex = nextIndex;
        core.info(`🔄 Switching from ${this.models[previousIndex].displayName} to ${nextModel.displayName}`);
        return;
      }
    }
    
    core.warning('No alternative models available - staying with current model');
  }

  checkRateLimitedModels() {
    // Every X requests, check if rate-limited models should be retried
    if (this.requestCount >= this.options.retryInterval) {
      this.requestCount = 0;
      const now = Date.now();
      
      this.modelStates.forEach((state, modelName) => {
        if (state.status === 'rate_limited' && state.rateLimitedAt) {
          const timeSinceRateLimit = now - state.rateLimitedAt;
          
          if (timeSinceRateLimit >= this.options.rateLimitCooldown) {
            state.status = 'available';
            state.rateLimitedAt = null;
            state.failures = 0; // Reset failure count
            
            const model = this.models.find(m => m.name === modelName);
            core.info(`🔄 Model ${model?.displayName || modelName} cooldown expired - marking as available`);
          }
        }
      });
    }
  }

  resetFailedModels() {
    let resetCount = 0;
    this.modelStates.forEach((state, modelName) => {
      if (state.status === 'failed') {
        state.status = 'available';
        state.failures = 0;
        resetCount++;
      }
    });
    
    if (resetCount > 0) {
      core.info(`🔄 Reset ${resetCount} failed models to available`);
    }
  }

  isRateLimitError(error) {
    if (!error) return false;
    
    const errorStr = error.message || error.toString();
    const rateLimitIndicators = [
      'rate limit',
      'rate_limit',
      'too many requests',
      '429',
      'quota exceeded',
      'usage limit',
      'throttled'
    ];
    
    return rateLimitIndicators.some(indicator => 
      errorStr.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  isModelNotAuthorizedError(error) {
    if (!error) return false;
    
    const errorStr = error.message || error.toString();
    const unauthorizedIndicators = [
      'not authorized',
      'access denied',
      'forbidden',
      '403',
      'not enabled',
      'model not found',
      'invalid model',
      'model access',
      'insufficient permissions',
      'ValidationException'
    ];
    
    return unauthorizedIndicators.some(indicator => 
      errorStr.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  isModelUnavailableError(error) {
    if (!error) return false;
    
    const errorStr = error.message || error.toString();
    const unavailableIndicators = [
      'model not available',
      'model unavailable',
      'service unavailable',
      'region not supported',
      'model not supported',
      'temporarily unavailable'
    ];
    
    return unavailableIndicators.some(indicator => 
      errorStr.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  logModelAuthorizationWarning(model, error) {
    const isAWS = model.provider === 'aws';
    const modelFamily = this.getModelFamily(model.name);
    
    if (isAWS) {
      core.warning(`🚨 AWS Bedrock Model Access Required: ${model.displayName}`);
      core.warning(`❌ Error: ${error.message}`);
      core.warning(`📋 To use ${modelFamily} models, you need to:`);
      core.warning(`   1. Go to AWS Bedrock Console: https://console.aws.amazon.com/bedrock/`);
      core.warning(`   2. Navigate to 'Model access' in the left sidebar`);
      core.warning(`   3. Click 'Enable specific models' or 'Modify model access'`);
      core.warning(`   4. Find '${modelFamily}' and click 'Enable'`);
      core.warning(`   5. Wait for approval (may take a few minutes)`);
      core.warning(`🔄 Falling back to available model...`);
    } else {
      core.warning(`🚨 Model Access Issue: ${model.displayName}`);
      core.warning(`❌ Error: ${error.message}`);
      core.warning(`🔄 Falling back to available model...`);
    }
  }

  getModelFamily(modelName) {
    if (modelName.includes('claude-sonnet-4') || modelName.includes('claude-opus-4')) {
      return 'Claude 4 (Latest)';
    } else if (modelName.includes('claude-3-7') || modelName.includes('claude-3-5')) {
      return 'Claude 3.5/3.7';
    } else if (modelName.includes('claude-3')) {
      return 'Claude 3';
    } else if (modelName.includes('claude')) {
      return 'Claude';
    }
    return 'Unknown Model Family';
  }

  logModelStates() {
    core.info('📊 Model Status Summary:');
    this.models.forEach((model, index) => {
      const state = this.modelStates.get(model.name);
      const statusIcon = this.getStatusIcon(state.status);
      const currentMarker = index === this.currentModelIndex ? ' [CURRENT]' : '';
      
      let statusDetails = '';
      if (state.status === 'rate_limited' && state.rateLimitedAt) {
        const cooldownRemaining = Math.max(0, this.options.rateLimitCooldown - (Date.now() - state.rateLimitedAt));
        statusDetails = ` (cooldown: ${Math.ceil(cooldownRemaining/1000)}s)`;
      } else if (state.failures > 0) {
        statusDetails = ` (failures: ${state.failures})`;
      }
      
      core.info(`  ${statusIcon} ${model.displayName}${statusDetails}${currentMarker}`);
    });
    
    core.info(`📈 Total requests: ${this.totalRequests}, Next retry check in: ${this.options.retryInterval - this.requestCount} requests`);
  }

  getStatusIcon(status) {
    switch (status) {
      case 'available': return '✅';
      case 'rate_limited': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  getStats() {
    const stats = {
      totalRequests: this.totalRequests,
      currentModel: this.models[this.currentModelIndex],
      modelStates: {}
    };
    
    this.modelStates.forEach((state, modelName) => {
      stats.modelStates[modelName] = { ...state };
    });
    
    return stats;
  }
}

module.exports = { FallbackManager };