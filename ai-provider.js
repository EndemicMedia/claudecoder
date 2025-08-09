const core = require('@actions/core');
const { BedrockClient } = require('./bedrock-client');
const { OpenRouterClient } = require('./openrouter-client');

class AIProviderFactory {
  static createProvider(provider, credentials, options = {}) {
    const modelName = options.model || 'default';
    
    switch (provider.toLowerCase()) {
      case 'aws':
      case 'bedrock':
        if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
          throw new Error('AWS Bedrock requires aws-access-key-id and aws-secret-access-key');
        }
        core.info(`Using AWS Bedrock as AI provider with model: ${modelName}`);
        return new BedrockClient(
          credentials.awsRegion || 'us-east-1',
          credentials.awsAccessKeyId,
          credentials.awsSecretAccessKey,
          options
        );
        
      case 'openrouter':
        if (!credentials.openrouterApiKey) {
          throw new Error('OpenRouter requires openrouter-api-key');
        }
        core.info(`Using OpenRouter as AI provider with model: ${modelName}`);
        return new OpenRouterClient(credentials.openrouterApiKey, options);
        
      default:
        throw new Error(`Unsupported AI provider: ${provider}. Supported providers: aws, openrouter`);
    }
  }

  static detectProvider(credentials) {
    // Auto-detect provider based on available credentials
    if (credentials.openrouterApiKey) {
      return 'openrouter';
    } else if (credentials.awsAccessKeyId && credentials.awsSecretAccessKey) {
      return 'aws';
    } else {
      throw new Error('No valid credentials found. Please provide either AWS credentials or OpenRouter API key.');
    }
  }
}

module.exports = { AIProviderFactory };