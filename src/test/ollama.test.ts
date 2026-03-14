import { OllamaService } from '../services/ollamaService';
import { Message, MessageRole } from '../types/shared';

const mockFetch = jest.fn();

describe('Ollama Service', () => {
  let service: OllamaService;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;
  });

  afterAll(() => {
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
  });

  beforeEach(() => {
    mockFetch.mockReset();
    service = new OllamaService();
  });

  describe('Service Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(OllamaService);
    });

    it('should have default model configured', () => {
      expect(process.env.OLLAMA_MODEL || 'qwen3:8b').toBeDefined();
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'AI response text' },
            done: true,
            eval_count: 5,
            prompt_eval_count: 10,
          }),
      });

      const messages: Message[] = [
        {
          id: '1',
          chatId: 'test',
          role: MessageRole.USER,
          content: 'Hello',
          createdAt: new Date(),
        },
      ];

      const result = await service.sendMessage(messages);

      expect(result).toBeDefined();
      expect(result.content).toBe('AI response text');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should process conversation history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'How are you?' },
            done: true,
          }),
      });

      const messages: Message[] = [
        {
          id: '1',
          chatId: 'chat1',
          role: MessageRole.USER,
          content: 'Hello',
          createdAt: new Date(),
        },
        {
          id: '2',
          chatId: 'chat1',
          role: MessageRole.ASSISTANT,
          content: 'Hi there!',
          createdAt: new Date(),
        },
        {
          id: '3',
          chatId: 'chat1',
          role: MessageRole.USER,
          content: 'How are you?',
          createdAt: new Date(),
        },
      ];

      const result = await service.sendMessage(messages);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('sendMessageWithFallback', () => {
    it('should send message with fallback successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hello' },
            done: true,
          }),
      });

      const messages: Message[] = [
        {
          id: '1',
          chatId: 'test',
          role: MessageRole.USER,
          content: 'Hello',
          createdAt: new Date(),
        },
      ];

      const result = await service.sendMessageWithFallback(messages);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hi' },
            done: true,
          }),
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when Ollama is unreachable', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await service.testConnection();

      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Message Handling', () => {
    it('should handle empty message array', async () => {
      const messages: Message[] = [];

      await expect(service.sendMessage(messages)).rejects.toThrow(
        'At least one message is required'
      );
    });

    it('should handle long messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'OK' },
            done: true,
          }),
      });

      const messages: Message[] = [
        {
          id: '1',
          chatId: 'test',
          role: MessageRole.USER,
          content: 'A'.repeat(1000),
          createdAt: new Date(),
        },
      ];

      const result = await service.sendMessage(messages);

      expect(result).toBeDefined();
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models', () => {
      const models = service.getAvailableModels();
      expect(models).toContain('qwen3:8b');
      expect(models).toContain('qwen3:4b');
    });
  });

  describe('switchModel', () => {
    it('should switch to valid model', () => {
      expect(() => service.switchModel('qwen3:4b')).not.toThrow();
    });

    it('should throw for invalid model', () => {
      expect(() => service.switchModel('invalid-model')).toThrow(
        'Model invalid-model is not available'
      );
    });
  });
});
