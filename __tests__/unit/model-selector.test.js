const core = require('@actions/core');
const { ModelSelector } = require('../../model-selector');

// Mock @actions/core
jest.mock('@actions/core');

describe('ModelSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Default Models', () => {
    it('should initialize with default model when no input provided', () => {
      const selector = new ModelSelector();
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({
        name: 'moonshotai/kimi-k2:free',
        provider: 'openrouter',
        displayName: 'Kimi K2 (Free) - Default OpenRouter'
      });
    });

    it('should initialize with default model when empty string provided', () => {
      const selector = new ModelSelector('');
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('moonshotai/kimi-k2:free');
    });

    it('should initialize with default model when whitespace string provided', () => {
      const selector = new ModelSelector('   ');
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('moonshotai/kimi-k2:free');
    });
  });

  describe('Model Parsing', () => {
    it('should parse single model correctly', () => {
      const selector = new ModelSelector('google/gemini-2.0-flash-exp:free');
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({
        name: 'google/gemini-2.0-flash-exp:free',
        provider: 'openrouter',
        displayName: 'Gemini 2.0 Flash (Free)'
      });
    });

    it('should parse multiple models correctly', () => {
      const modelString = 'moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free,deepseek/deepseek-r1-0528:free';
      const selector = new ModelSelector(modelString);
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(3);
      expect(models[0].name).toBe('moonshotai/kimi-k2:free');
      expect(models[1].name).toBe('google/gemini-2.0-flash-exp:free');
      expect(models[2].name).toBe('deepseek/deepseek-r1-0528:free');
    });

    it('should handle models with extra whitespace', () => {
      const modelString = ' moonshotai/kimi-k2:free , google/gemini-2.0-flash-exp:free , ';
      const selector = new ModelSelector(modelString);
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(2);
      expect(models[0].name).toBe('moonshotai/kimi-k2:free');
      expect(models[1].name).toBe('google/gemini-2.0-flash-exp:free');
    });

    it('should filter out empty model names', () => {
      const modelString = 'moonshotai/kimi-k2:free,,google/gemini-2.0-flash-exp:free,';
      const selector = new ModelSelector(modelString);
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(2);
      expect(models[0].name).toBe('moonshotai/kimi-k2:free');
      expect(models[1].name).toBe('google/gemini-2.0-flash-exp:free');
    });
  });

  describe('Provider Detection', () => {
    it('should correctly identify AWS models', () => {
      const selector = new ModelSelector('us.anthropic.claude-3-7-sonnet-20250219-v1:0');
      
      const models = selector.getAllModels();
      expect(models[0].provider).toBe('aws');
      expect(models[0].displayName).toBe('Claude 3.7 Sonnet (AWS US) - Default AWS');
    });

    it('should correctly identify OpenRouter models', () => {
      const selector = new ModelSelector('anthropic/claude-3.7-sonnet:beta');
      
      const models = selector.getAllModels();
      expect(models[0].provider).toBe('openrouter');
      expect(models[0].displayName).toBe('Claude 3.7 Sonnet (OpenRouter)');
    });

    it('should default to OpenRouter for unknown models', () => {
      const selector = new ModelSelector('unknown/model:123');
      
      const models = selector.getAllModels();
      expect(models[0].provider).toBe('openrouter');
      expect(models[0].displayName).toBe('unknown/model:123'); // Falls back to model name
    });

    it('should handle mixed providers', () => {
      const modelString = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0,moonshotai/kimi-k2:free';
      const selector = new ModelSelector(modelString);
      
      const models = selector.getAllModels();
      expect(models).toHaveLength(2);
      expect(models[0].provider).toBe('aws');
      expect(models[1].provider).toBe('openrouter');
    });
  });

  describe('Model Filtering', () => {
    it('should get models by provider correctly', () => {
      const modelString = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0,moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free';
      const selector = new ModelSelector(modelString);
      
      const awsModels = selector.getModelsByProvider('aws');
      const openrouterModels = selector.getModelsByProvider('openrouter');
      
      expect(awsModels).toHaveLength(1);
      expect(awsModels[0].name).toBe('us.anthropic.claude-3-7-sonnet-20250219-v1:0');
      
      expect(openrouterModels).toHaveLength(2);
      expect(openrouterModels[0].name).toBe('moonshotai/kimi-k2:free');
      expect(openrouterModels[1].name).toBe('google/gemini-2.0-flash-exp:free');
    });

    it('should return empty array for non-existent provider', () => {
      const selector = new ModelSelector('moonshotai/kimi-k2:free');
      
      const models = selector.getModelsByProvider('nonexistent');
      expect(models).toHaveLength(0);
    });
  });

  describe('Provider Management', () => {
    it('should get all providers needed', () => {
      const modelString = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0,moonshotai/kimi-k2:free';
      const selector = new ModelSelector(modelString);
      
      const providers = selector.getProvidersNeeded();
      expect(providers).toHaveLength(2);
      expect(providers).toContain('aws');
      expect(providers).toContain('openrouter');
    });

    it('should return unique providers only', () => {
      const modelString = 'moonshotai/kimi-k2:free,google/gemini-2.0-flash-exp:free,deepseek/deepseek-r1-0528:free';
      const selector = new ModelSelector(modelString);
      
      const providers = selector.getProvidersNeeded();
      expect(providers).toHaveLength(1);
      expect(providers[0]).toBe('openrouter');
    });
  });

  describe('Display Names', () => {
    it('should return correct display names for known models', () => {
      const testCases = [
        { model: 'moonshotai/kimi-k2:free', expected: 'Kimi K2 (Free) - Default OpenRouter' },
        { model: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', expected: 'Claude 3.7 Sonnet (AWS US) - Default AWS' },
        { model: 'google/gemini-2.0-flash-exp:free', expected: 'Gemini 2.0 Flash (Free)' },
        { model: 'deepseek/deepseek-r1-0528:free', expected: 'DeepSeek R1 (Free)' },
        { model: 'thudm/glm-z1-32b:free', expected: 'GLM-Z1 32B (Free)' }
      ];

      testCases.forEach(({ model, expected }) => {
        const selector = new ModelSelector(model);
        const models = selector.getAllModels();
        expect(models[0].displayName).toBe(expected);
      });
    });

    it('should use model name as display name for unknown models', () => {
      const selector = new ModelSelector('custom/unknown-model:v1');
      
      const models = selector.getAllModels();
      expect(models[0].displayName).toBe('custom/unknown-model:v1');
    });
  });

  describe('Logging', () => {
    it('should log model priority correctly', () => {
      const modelString = 'us.anthropic.claude-3-7-sonnet-20250219-v1:0,moonshotai/kimi-k2:free';
      const selector = new ModelSelector(modelString);
      
      selector.logModelPriority();
      
      expect(core.info).toHaveBeenCalledWith('Model priority list (2 models):');
      expect(core.info).toHaveBeenCalledWith('  1. Claude 3.7 Sonnet (AWS US) - Default AWS (aws)');
      expect(core.info).toHaveBeenCalledWith('  2. Kimi K2 (Free) - Default OpenRouter (openrouter)');
    });

    it('should log single model correctly', () => {
      const selector = new ModelSelector(); // Uses default
      
      selector.logModelPriority();
      
      expect(core.info).toHaveBeenCalledWith('Model priority list (1 models):');
      expect(core.info).toHaveBeenCalledWith('  1. Kimi K2 (Free) - Default OpenRouter (openrouter)');
    });
  });

  describe('Comprehensive Model Support', () => {
    it('should support all AWS Bedrock models', () => {
      const awsModels = [
        'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
        'anthropic.claude-3-5-sonnet-20241022-v2:0',
        'anthropic.claude-3-haiku-20240307-v1:0'
      ];

      awsModels.forEach(modelName => {
        const selector = new ModelSelector(modelName);
        const models = selector.getAllModels();
        expect(models[0].provider).toBe('aws');
        expect(models[0].name).toBe(modelName);
      });
    });

    it('should support all free OpenRouter models', () => {
      const freeModels = [
        'google/gemini-2.0-flash-exp:free',
        'deepseek/deepseek-r1-0528:free',
        'z-ai/glm-4.5-air:free',
        'deepseek/deepseek-r1-0528-qwen3-8b:free',
        'qwen/qwen3-235b-a22b:free',
        'moonshotai/kimi-vl-a3b-thinking:free',
        'qwen/qwen3-30b-a3b:free',
        'moonshotai/kimi-k2:free',
        'thudm/glm-z1-32b:free',
        'arliai/qwq-32b-arliai-rpr-v1:free',
        'qwen/qwq-32b:free',
        'qwen/qwen3-coder:free'
      ];

      freeModels.forEach(modelName => {
        const selector = new ModelSelector(modelName);
        const models = selector.getAllModels();
        expect(models[0].provider).toBe('openrouter');
        expect(models[0].name).toBe(modelName);
        expect(models[0].displayName).toContain('Free');
      });
    });
  });
});