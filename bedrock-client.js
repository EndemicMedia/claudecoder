const core = require('@actions/core');
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

class BedrockClient {
  constructor(region, accessKeyId, secretAccessKey) {
    this.client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      // Increase timeout to 60 minutes (3600000 ms) as recommended for Claude 3.7 Sonnet
      requestHandler: {
        requestTimeout: 3600000
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
      modelId: "anthropic.claude-3-7-sonnet-20250219",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ 
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: messages
      })
    });

    try {
      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error) {
      if (retries > 0) {
        core.warning(`Bedrock API call failed. Retrying in 5 seconds...`);
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
