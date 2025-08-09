const core = require('@actions/core');

class ModelSelector {
  constructor(modelString) {
    this.models = this.parseModels(modelString);
  }

  parseModels(modelString) {
    if (!modelString || modelString.trim() === '') {
      // Default to only Kimi K2 Free for OpenRouter - never mix providers in default
      return [
        { 
          name: 'moonshotai/kimi-k2:free', 
          provider: 'openrouter',
          displayName: this.getDisplayName('moonshotai/kimi-k2:free')
        }
      ];
    }

    return modelString
      .split(',')
      .map(model => model.trim())
      .filter(model => model.length > 0)
      .map(model => this.parseModel(model));
  }

  parseModel(modelName) {
    // Map models to their appropriate providers
    const providerMappings = {
      // AWS Bedrock models
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0': 'aws',
      'anthropic.claude-3-5-sonnet-20241022-v2:0': 'aws',
      'anthropic.claude-3-haiku-20240307-v1:0': 'aws',
      
      // OpenRouter models (default for most)
      'anthropic/claude-3.7-sonnet:beta': 'openrouter',
      'anthropic/claude-3-5-sonnet': 'openrouter',
      'google/gemini-2.0-flash-exp:free': 'openrouter',
      'deepseek/deepseek-r1-0528:free': 'openrouter',
      'z-ai/glm-4.5-air:free': 'openrouter',
      'deepseek/deepseek-r1-0528-qwen3-8b:free': 'openrouter',
      'qwen/qwen3-235b-a22b:free': 'openrouter',
      'moonshotai/kimi-vl-a3b-thinking:free': 'openrouter',
      'qwen/qwen3-30b-a3b:free': 'openrouter',
      'moonshotai/kimi-k2:free': 'openrouter',
      'thudm/glm-z1-32b:free': 'openrouter',
      'arliai/qwq-32b-arliai-rpr-v1:free': 'openrouter',
      'qwen/qwq-32b:free': 'openrouter',
      'qwen/qwen3-coder:free': 'openrouter'
    };

    const provider = providerMappings[modelName] || 'openrouter'; // Default to OpenRouter
    
    return {
      name: modelName,
      provider: provider,
      displayName: this.getDisplayName(modelName)
    };
  }

  getDisplayName(modelName) {
    // Create user-friendly display names
    const displayNames = {
      'moonshotai/kimi-k2:free': 'Kimi K2 (Free) - Default OpenRouter',
      'us.anthropic.claude-3-7-sonnet-20250219-v1:0': 'Claude 3.7 Sonnet (AWS Bedrock) - Default AWS',
      'anthropic/claude-3.7-sonnet:beta': 'Claude 3.7 Sonnet (OpenRouter)',
      'google/gemini-2.0-flash-exp:free': 'Gemini 2.0 Flash (Free)',
      'deepseek/deepseek-r1-0528:free': 'DeepSeek R1 (Free)',
      'z-ai/glm-4.5-air:free': 'GLM-4.5 Air (Free)',
      'deepseek/deepseek-r1-0528-qwen3-8b:free': 'DeepSeek R1 Qwen3-8B (Free)',
      'qwen/qwen3-235b-a22b:free': 'Qwen3-235B (Free)',
      'moonshotai/kimi-vl-a3b-thinking:free': 'Kimi VL A3B Thinking (Free)',
      'qwen/qwen3-30b-a3b:free': 'Qwen3-30B (Free)',
      'thudm/glm-z1-32b:free': 'GLM-Z1 32B (Free)',
      'arliai/qwq-32b-arliai-rpr-v1:free': 'QwQ 32B ArliAI (Free)',
      'qwen/qwq-32b:free': 'QwQ 32B (Free)',
      'qwen/qwen3-coder:free': 'Qwen3 Coder (Free)'
    };

    return displayNames[modelName] || modelName;
  }

  getModelsByProvider(provider) {
    return this.models.filter(model => model.provider === provider);
  }

  getAllModels() {
    return this.models;
  }

  getProvidersNeeded() {
    const providers = new Set(this.models.map(model => model.provider));
    return Array.from(providers);
  }

  logModelPriority() {
    core.info(`Model priority list (${this.models.length} models):`);
    this.models.forEach((model, index) => {
      core.info(`  ${index + 1}. ${model.displayName} (${model.provider})`);
    });
  }
}

module.exports = { ModelSelector };