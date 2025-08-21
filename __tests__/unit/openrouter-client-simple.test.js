const nock = require('nock');
const core = require('@actions/core');
const { OpenRouterClient } = require('../../openrouter-client');

// Mock @actions/core
jest.mock('@actions/core');

describe('OpenRouterClient - Core Functionality', () => {
  let client;
  const apiKey = 'sk-or-test-key-123456789';
  const baseURL = 'https://openrouter.ai/api/v1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Use longer timeout to avoid timeouts
    client = new OpenRouterClient(apiKey, { requestTimeout: 30000 });
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultClient = new OpenRouterClient(apiKey);
      
      expect(defaultClient.apiKey).toBe(apiKey);
      expect(defaultClient.maxTokens).toBe(64000);
      expect(defaultClient.model).toBe('moonshotai/kimi-k2:free');
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        maxTokens: 32000,
        model: 'anthropic/claude-3-sonnet-20240229'
      };

      const customClient = new OpenRouterClient(apiKey, customOptions);
      
      expect(customClient.maxTokens).toBe(32000);
      expect(customClient.model).toBe('anthropic/claude-3-sonnet-20240229');
    });
  });

  describe('API Calls', () => {
    it('should make successful API call', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Test response from OpenRouter'
          }
        }]
      };

      nock(baseURL)
        .post('/chat/completions')
        .reply(200, mockResponse);

      const result = await client.invokeClaude('Test prompt');

      expect(result).toBe('Test response from OpenRouter');
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Making OpenRouter API call'));
    });

    it('should handle rate limit errors immediately', async () => {
      const errorResponse = {
        error: {
          message: 'Rate limit exceeded'
        }
      };

      nock(baseURL)
        .post('/chat/completions')
        .reply(429, errorResponse);

      await expect(client.invokeClaude('Test prompt', null, 0)).rejects.toThrow('OpenRouter rate limit exceeded');
    });

    it('should handle token limit errors', async () => {
      const errorResponse = {
        error: {
          message: 'Maximum token limit exceeded'
        }
      };

      nock(baseURL)
        .post('/chat/completions')
        .reply(400, errorResponse);

      await expect(client.invokeClaude('Test prompt', null, 0)).rejects.toThrow('Claude token limit exceeded');
    });

    it('should handle invalid response format', async () => {
      const invalidResponse = { invalid: 'response' };

      nock(baseURL)
        .post('/chat/completions')
        .reply(200, invalidResponse);

      await expect(client.invokeClaude('Test prompt', null, 0)).rejects.toThrow('Invalid response format');
    });

    it('should handle empty content in response', async () => {
      const emptyResponse = {
        choices: [{ message: { content: null } }]
      };

      nock(baseURL)
        .post('/chat/completions')
        .reply(200, emptyResponse);

      const result = await client.invokeClaude('Test prompt');
      expect(result).toBe('');
    });
  });

  describe('Complete Response', () => {
    it('should handle single request with END_OF_SUGGESTIONS', async () => {
      const response = 'git add file.js\n<<<EOF\ncode content\nEOF>>>\nEND_OF_SUGGESTIONS';
      
      nock(baseURL)
        .post('/chat/completions')
        .reply(200, {
          choices: [{ message: { content: response } }]
        });

      const result = await client.getCompleteResponse('Initial prompt', null, 1);
      
      expect(result).toBe(response);
      expect(core.info).toHaveBeenCalledWith('Received end of suggestions signal.');
    });

    it('should handle no git commands in first response', async () => {
      const response = 'I cannot help with this request as it is unclear.';
      
      nock(baseURL)
        .post('/chat/completions')
        .reply(200, {
          choices: [{ message: { content: response } }]
        });

      await expect(client.getCompleteResponse('Initial prompt', null, 1)).rejects.toThrow('No valid git commands found');
    });

    it('should handle multiple requests until completion', async () => {
      const responses = [
        'git add file1.js\n<<<EOF\ncontent1\nEOF>>>\nContinuing...',
        'git add file2.js\n<<<EOF\ncontent2\nEOF>>>\nEND_OF_SUGGESTIONS'
      ];

      nock(baseURL)
        .post('/chat/completions')
        .reply(200, { choices: [{ message: { content: responses[0] } }] })
        .post('/chat/completions')
        .reply(200, { choices: [{ message: { content: responses[1] } }] });

      const result = await client.getCompleteResponse('Initial prompt', null, 2);
      
      expect(result).toContain('file1.js');
      expect(result).toContain('file2.js');
    });
  });

  describe('Image Support', () => {
    it('should make API call with image data', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Image analysis response' } }]
      };

      const imageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      nock(baseURL)
        .post('/chat/completions', (body) => {
          const message = body.messages[0];
          return message.content.length === 2 && 
                 message.content[0].type === 'image_url' &&
                 message.content[1].type === 'text';
        })
        .reply(200, mockResponse);

      const result = await client.invokeClaude('Analyze this image', imageBase64);
      expect(result).toBe('Image analysis response');
    });
  });

  describe('Request Configuration', () => {
    it('should set correct request parameters', async () => {
      let capturedRequest = null;

      nock(baseURL)
        .post('/chat/completions', (body) => {
          capturedRequest = body;
          return true;
        })
        .reply(200, { choices: [{ message: { content: 'response' } }] });

      await client.invokeClaude('Test prompt');

      expect(capturedRequest.model).toBe('moonshotai/kimi-k2:free');
      expect(capturedRequest.max_tokens).toBe(64000);
      expect(capturedRequest.temperature).toBe(0.1);
    });

    it('should include authorization headers', async () => {
      let capturedHeaders = null;

      nock(baseURL)
        .post('/chat/completions')
        .reply(function() {
          capturedHeaders = this.req.headers;
          return [200, { choices: [{ message: { content: 'response' } }] }];
        });

      await client.invokeClaude('Test prompt');

      expect(capturedHeaders.authorization).toBe(`Bearer ${apiKey}`);
      expect(capturedHeaders['content-type']).toBe('application/json');
    });
  });
});