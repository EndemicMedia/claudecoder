const { BedrockClient } = require('../bedrock-client');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Mock the AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  // Create a mock send function that can be configured in tests
  const mockSend = jest.fn();
  
  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    InvokeModelCommand: jest.fn()
  };
});

describe('BedrockClient', () => {
  let bedrockClient;
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();
    bedrockClient = new BedrockClient('us-east-1', 'fake-key', 'fake-secret');
    mockSend = bedrockClient.client.send;
  });

  describe('invokeBedrock', () => {
    it('should call Bedrock API with correct parameters', async () => {
      const mockResponse = {
        body: Buffer.from(JSON.stringify({
          content: [{ text: 'Sample response' }]
        }))
      };
      mockSend.mockResolvedValueOnce(mockResponse);

      const result = await bedrockClient.invokeBedrock('Test prompt');

      expect(result).toBe('Sample response');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('API Error'))
              .mockResolvedValueOnce({
                body: Buffer.from(JSON.stringify({
                  content: [{ text: 'Retry successful' }]
                }))
              });

      jest.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      const result = await bedrockClient.invokeBedrock('Test prompt');

      expect(result).toBe('Retry successful');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockSend.mockRejectedValue(new Error('API Error'));
      jest.spyOn(global, 'setTimeout').mockImplementation(callback => callback());
      
      await expect(bedrockClient.invokeBedrock('Test prompt', null, 3))
        .rejects.toThrow('Failed to invoke Bedrock after 3 attempts');
      
      expect(mockSend).toHaveBeenCalledTimes(4);
    });
  });

  describe('getCompleteResponse', () => {
    it('should handle multi-part responses', async () => {
      jest.spyOn(bedrockClient, 'invokeBedrock')
        .mockResolvedValueOnce('git add file.js\nFirst part')
        .mockResolvedValueOnce('git add file2.js\nEND_OF_SUGGESTIONS');

      const result = await bedrockClient.getCompleteResponse('Initial prompt', null, 3);

      expect(result).toBe('git add file2.js\nEND_OF_SUGGESTIONS');
      expect(bedrockClient.invokeBedrock).toHaveBeenCalledTimes(2);
    });

    it('should stop after reaching maxRequests', async () => {
      jest.spyOn(bedrockClient, 'invokeBedrock')
        .mockResolvedValueOnce('git add file1.js\nPart without END_OF_SUGGESTIONS')
        .mockResolvedValueOnce('git add file2.js\nPart without END_OF_SUGGESTIONS');

      const result = await bedrockClient.getCompleteResponse('Initial prompt', null, 2);

      expect(bedrockClient.invokeBedrock).toHaveBeenCalledTimes(1);
    });

    it('should handle responses with no git commands', async () => {
      jest.spyOn(bedrockClient, 'invokeBedrock')
        .mockResolvedValueOnce('Response with no git commands')
        .mockResolvedValueOnce('git add file.js\nEND_OF_SUGGESTIONS');

      const result = await bedrockClient.getCompleteResponse('Initial prompt', null, 2);
      expect(bedrockClient.invokeBedrock).toHaveBeenCalledTimes(2);
    });
  });
});
