const core = require('@actions/core');
const axios = require('axios');

class OpenRouterClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.maxTokens = options.maxTokens || 64000;
    this.enableThinking = options.enableThinking !== undefined ? options.enableThinking : true;
    this.thinkingBudget = options.thinkingBudget || 1024;
    this.extendedOutput = options.extendedOutput !== undefined ? options.extendedOutput : true;
    this.requestTimeout = options.requestTimeout || 3600000;
    
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.model = options.model || 'moonshotai/kimi-k2:free'; // Default to Kimi K2
  }

  async invokeClaude(prompt, imageBase64 = null, retries = 3) {
    const messages = [
      {
        role: "user",
        content: []
      }
    ];

    if (imageBase64) {
      messages[0].content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`
        }
      });
    }

    messages[0].content.push({
      type: "text",
      text: `Human: ${prompt}\nAssistant:`
    });

    const requestData = {
      model: this.model,
      messages: messages,
      max_tokens: this.maxTokens,
      temperature: 0.1,
      // Note: OpenRouter doesn't support all Anthropic-specific features like thinking mode
      // We'll simulate similar behavior in the response processing
    };

    const config = {
      method: 'post',
      url: `${this.baseURL}/chat/completions`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/EndemicMedia/claudecoder',
        'X-Title': 'ClaudeCoder GitHub Action'
      },
      data: requestData,
      timeout: this.requestTimeout
    };

    core.info(`Making OpenRouter API call to: ${config.url}`);
    core.info(`Model: ${this.model}`);
    core.info(`API Key: ${this.apiKey.substring(0, 10)}...`);
    
    try {
      const response = await axios(config);
      core.info(`OpenRouter API response status: ${response.status}`);
      core.info(`OpenRouter API response data keys: ${Object.keys(response.data)}`);
      
      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content;
        core.info(`OpenRouter API returned content length: ${content ? content.length : 0}`);
        return content || "";
      } else {
        throw new Error('Invalid response format from OpenRouter API');
      }
    } catch (error) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorMessage = error.response.data?.error?.message || error.message;
        
        if (statusCode === 429) {
          // Rate limit error
          core.warning(`OpenRouter rate limit exceeded: ${errorMessage}`);
          throw new Error(`OpenRouter rate limit exceeded: ${errorMessage}`);
        } else if (statusCode === 400 && errorMessage.includes('token')) {
          // Token limit error
          core.warning(`Token limit exceeded: ${errorMessage}`);
          throw new Error(`Claude token limit exceeded via OpenRouter: ${errorMessage}`);
        }
        
        if (retries > 0) {
          core.warning(`OpenRouter API call failed. Retrying in 5 seconds... Status: ${statusCode}, Error: ${errorMessage}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.invokeClaude(prompt, imageBase64, retries - 1);
        } else {
          throw new Error(`OpenRouter API failed after 3 attempts: ${statusCode} - ${errorMessage}`);
        }
      } else {
        if (retries > 0) {
          core.warning(`OpenRouter API call failed. Retrying in 5 seconds... Error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.invokeClaude(prompt, imageBase64, retries - 1);
        } else {
          throw new Error(`OpenRouter API connection failed after 3 attempts: ${error.message}`);
        }
      }
    }
  }

  async getCompleteResponse(initialPrompt, imageBase64, maxRequests) {
    let fullResponse = '';
    let currentPrompt = initialPrompt;
    let requestCount = 0;

    while (requestCount < maxRequests) {
      requestCount++;
      core.info(`Making request ${requestCount} to OpenRouter...`);
      
      let response;
      try {
        response = await this.invokeClaude(currentPrompt, requestCount === 1 ? imageBase64 : null);
        core.debug('Received response from OpenRouter');
        fullResponse += response;
      } catch (error) {
        core.error('Error making request to OpenRouter:', error);
        break;
      }
      
      if (response.includes('END_OF_SUGGESTIONS')) {
        core.info('Received end of suggestions signal.');
        break;
      }

      // Check if response contains git commands
      if (requestCount === 1 && !response.includes('git')) {
        throw new Error('No valid git commands found in the response.');
      }

      const lastCompleteCommand = fullResponse.lastIndexOf('git');
      if (lastCompleteCommand === -1) {
        throw new Error('No valid git commands found in the response.');
      }

      fullResponse = fullResponse.substring(0, lastCompleteCommand);
      currentPrompt = `${initialPrompt}\n\nPrevious response:\n${fullResponse}\n\nPlease continue from where you left off. Remember to end your response with END_OF_SUGGESTIONS when you have no more changes to suggest.`;
    }

    if (requestCount >= maxRequests) {
      core.warning(`Reached maximum number of requests (${maxRequests}). The response may be incomplete.`);
    }

    return fullResponse;
  }
}

module.exports = { OpenRouterClient };