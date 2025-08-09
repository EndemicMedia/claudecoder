const core = require('@actions/core');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

class BedrockClient {
  constructor(region, accessKeyId, secretAccessKey, options = {}) {
    // Initialize configurable parameters with defaults
    this.maxTokens = options.maxTokens || 64000; // Maximum supported is 128K, default to 64K (GA limit)
    this.enableThinking = options.enableThinking !== undefined ? options.enableThinking : true;
    this.thinkingBudget = options.thinkingBudget || 1024; // Default to 1024 tokens for thinking (API minimum)
    this.extendedOutput = options.extendedOutput !== undefined ? options.extendedOutput : true; // Enable 128K output by default
    this.requestTimeout = options.requestTimeout || 3600000; // Default to 60 minutes (3600000 ms)
    this.modelId = options.model || "us.anthropic.claude-3-7-sonnet-20250219-v1:0"; // Default model

    this.client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      // Use configurable timeout
      requestHandler: {
        requestTimeout: this.requestTimeout
      }
    });
  }

  async invokeBedrock(prompt, imageBase64 = null, retries = 3) {
    const messages = [
      {
        role: "user",
        content: []
      }
    ];

    if (imageBase64) {
      messages[0].content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: imageBase64
        }
      });
    }

    messages[0].content.push({
      type: "text",
      text: `
        Human: ${prompt}
        Assistant:
      `
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ 
        anthropic_version: "bedrock-2023-05-31",
        anthropic_beta: this.extendedOutput ? ["output-128k-2025-02-19"] : [], // Enable extended output length (beta) if configured
        max_tokens: this.maxTokens, // Use configurable max tokens
        // Enable extended thinking for complex code analysis tasks
        thinking: this.enableThinking ? {
          type: "enabled",
          budget_tokens: this.thinkingBudget // Use configurable thinking budget
        } : undefined,
        messages: messages
      })
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Improved response handling for Claude 3.7 Sonnet
      // Check for thinking blocks and text content
      let textContent = "";
      for (const contentBlock of responseBody.content) {
        if (contentBlock.type === "text") {
          textContent += contentBlock.text;
        }
        // Store thinking blocks if needed for future multi-turn conversations
        // else if (contentBlock.type === "thinking") {
        //   this.lastThinking = contentBlock;
        // }
      }
      
      return textContent || (responseBody.content[0] && responseBody.content[0].text) || "";
    } catch (error) {
      // Enhanced error handling for Claude 3.7 Sonnet
      if (error.name === 'ValidationException' && error.message.includes('max_tokens')) {
        // Handle token limit exceeded errors
        core.warning(`Token limit exceeded: ${error.message}`);
        throw new Error(`Claude 3.7 Sonnet token limit exceeded. Try reducing the input or max_tokens: ${error.message}`);
      } else if (retries > 0) {
        core.warning(`Bedrock API call failed. Retrying in 5 seconds... Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return this.invokeBedrock(prompt, imageBase64, retries - 1);
      } else {
        throw new Error(`Failed to invoke Bedrock after 3 attempts: ${error.message}`);
      }
    }
  }

  async getCompleteResponse(initialPrompt, imageBase64, maxRequests) {
    let fullResponse = '';
    let currentPrompt = initialPrompt;
    let requestCount = 0;

    while (requestCount < maxRequests) {
      requestCount++;
      core.info(`Making request ${requestCount} to Bedrock...`);
      
      let response;
      try {
        response = await this.invokeBedrock(currentPrompt, requestCount === 1 ? imageBase64 : null);
        core.debug('Received response from Bedrock');
        fullResponse += response;
      } catch (error) {
        core.error('Error making request to Bedrock:', error);
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

module.exports = { BedrockClient };