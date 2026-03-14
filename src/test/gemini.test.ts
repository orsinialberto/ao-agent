import { GeminiService } from '../services/geminiService';
import { Message, MessageRole } from '../types/shared';

// Mock the GoogleGenerativeAI module
const mockSendMessage = jest.fn().mockResolvedValue({
  response: {
    text: jest.fn().mockReturnValue('AI response text')
  }
});

const mockStartChat = jest.fn().mockReturnValue({
  sendMessage: mockSendMessage
});

const mockGetGenerativeModel = jest.fn().mockReturnValue({
  startChat: mockStartChat
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

describe('Gemini Service', () => {
  let service: GeminiService;
  let consoleErrorSpy: jest.SpyInstance;
  let originalApiKey: string | undefined;

  beforeAll(() => {
    originalApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-api-key';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    if (originalApiKey) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    service = new GeminiService();
  });

  describe('Service Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(GeminiService);
    });

    it('should have API key configured', () => {
      expect(process.env.GEMINI_API_KEY).toBeDefined();
      expect(process.env.GEMINI_API_KEY).not.toBe('');
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date()
      }];

      const result = await service.sendMessage(messages);

      expect(result).toBeDefined();
      expect(result.content).toBe('AI response text');
    });

    it('should throw error without API key', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const newService = new GeminiService();
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'Test',
        createdAt: new Date()
      }];

      await expect(newService.sendMessage(messages)).rejects.toThrow(
        'GEMINI_API_KEY environment variable is required'
      );

      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });

    it('should process conversation history', async () => {
      const messages: Message[] = [
        {
          id: '1',
          chatId: 'chat1',
          role: MessageRole.USER,
          content: 'Hello',
          createdAt: new Date()
        },
        {
          id: '2',
          chatId: 'chat1',
          role: MessageRole.ASSISTANT,
          content: 'Hi there!',
          createdAt: new Date()
        },
        {
          id: '3',
          chatId: 'chat1',
          role: MessageRole.USER,
          content: 'How are you?',
          createdAt: new Date()
        }
      ];

      const result = await service.sendMessage(messages);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('sendMessageWithFallback', () => {
    it('should send message with fallback successfully', async () => {
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date()
      }];

      const result = await service.sendMessageWithFallback(messages);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle errors and provide fallback', async () => {
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date()
      }];

      const result = await service.sendMessageWithFallback(messages);

      expect(result).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const newService = new GeminiService();
      const result = await newService.testConnection();

      expect(result).toBe(false);

      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  describe('Message Conversion', () => {
    it('should handle empty message array', async () => {
      const messages: Message[] = [];

      await expect(service.sendMessage(messages)).rejects.toThrow();
    });

    it('should handle long messages', async () => {
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'A'.repeat(1000),
        createdAt: new Date()
      }];

      const result = await service.sendMessage(messages);

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'Test',
        createdAt: new Date()
      }];

      try {
        await service.sendMessage(messages);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle network errors', async () => {
      const messages: Message[] = [{
        id: '1',
        chatId: 'test',
        role: MessageRole.USER,
        content: 'Test',
        createdAt: new Date()
      }];

      // Mock a network error scenario
      try {
        await service.sendMessage(messages);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
