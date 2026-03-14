import { Request, Response } from 'express';
import { ChatController } from '../../controllers/chatController';
import { geminiService } from '../../services/geminiService';
import { databaseService } from '../../services/databaseService';
import { MessageRole } from '../../types/shared';

// Mock services
jest.mock('../../services/geminiService');
jest.mock('../../services/databaseService');

describe('ChatController - Error Handling', () => {
  let controller: ChatController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    controller = new ChatController();
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('LLM Unavailability Errors', () => {
    it('should return 503 with LLM_UNAVAILABLE error type when creating chat fails', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      };

      const mockUserMessage = {
        id: 'msg-1',
        chatId: 'chat-1',
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date()
      };

      (databaseService.createChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.addMessage as jest.Mock).mockResolvedValue(mockUserMessage);
      (geminiService.sendMessageWithFallback as jest.Mock).mockRejectedValue(
        new Error('Failed to get response from Gemini: 503 Service Unavailable')
      );

      mockReq.body = { title: 'Test Chat', initialMessage: 'Hello' };

      await controller.createChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        errorType: 'LLM_UNAVAILABLE',
        message: 'The AI service is temporarily unavailable. The chat was created but the AI could not respond.',
        chatId: 'chat-1'
      });
    });

    it('should return 503 with LLM_UNAVAILABLE error type when sending message fails', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      };

      const mockUserMessage = {
        id: 'msg-1',
        chatId: 'chat-1',
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date()
      };

      (databaseService.getChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.addMessage as jest.Mock).mockResolvedValue(mockUserMessage);
      (databaseService.getMessages as jest.Mock).mockResolvedValue([mockUserMessage]);
      (geminiService.sendMessageWithFallback as jest.Mock).mockRejectedValue(
        new Error('Failed to get response from Gemini: The model is overloaded')
      );

      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { content: 'Hello' };

      await controller.sendMessage(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        errorType: 'LLM_UNAVAILABLE',
        message: 'The AI service is temporarily unavailable. Please try again in a few moments.',
        retryAfter: 60
      });
    });

    it('should include chatId in error response when chat was created', async () => {
      const mockChat = {
        id: 'chat-123',
        title: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      };

      (databaseService.createChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.addMessage as jest.Mock).mockResolvedValue({
        id: 'msg-1',
        chatId: 'chat-123',
        role: MessageRole.USER,
        content: 'Test',
        createdAt: new Date()
      });
      (geminiService.sendMessageWithFallback as jest.Mock).mockRejectedValue(
        new Error('LLM Error')
      );

      mockReq.body = { title: 'Test', initialMessage: 'Test' };

      await controller.createChat(
        mockReq as any,
        mockRes as Response
      );

      const responseCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.chatId).toBe('chat-123');
      expect(responseCall.errorType).toBe('LLM_UNAVAILABLE');
    });
  });

  describe('Successful Responses', () => {
    it('should successfully create chat and get AI response', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      };

      const mockUserMessage = {
        id: 'msg-1',
        chatId: 'chat-1',
        role: MessageRole.USER,
        content: 'Hello',
        createdAt: new Date()
      };

      const mockAssistantMessage = {
        id: 'msg-2',
        chatId: 'chat-1',
        role: MessageRole.ASSISTANT,
        content: 'Hi!',
        createdAt: new Date()
      };

      (databaseService.createChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.addMessage as jest.Mock)
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      (geminiService.sendMessageWithFallback as jest.Mock).mockResolvedValue({
        content: 'Hi!'
      });
      (databaseService.getChat as jest.Mock).mockResolvedValue({
        ...mockChat,
        messages: [mockUserMessage, mockAssistantMessage]
      });

      mockReq.body = { title: 'Test', initialMessage: 'Hello' };

      await controller.createChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'chat-1',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: MessageRole.USER }),
            expect.objectContaining({ role: MessageRole.ASSISTANT })
          ])
        })
      });
    });
  });

  describe('MCP Error Handling', () => {
    it('should propagate MCP errors as 503 LLM_UNAVAILABLE', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: []
      };

      const mockUserMessage = {
        id: 'msg-1',
        chatId: 'chat-1',
        role: MessageRole.USER,
        content: 'Get segment data',
        createdAt: new Date()
      };

      (databaseService.getChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.addMessage as jest.Mock).mockResolvedValue(mockUserMessage);
      (databaseService.getMessages as jest.Mock).mockResolvedValue([mockUserMessage]);
      (geminiService.sendMessageWithFallback as jest.Mock).mockRejectedValue(
        new Error('MCP tool execution failed after maximum retry attempts')
      );

      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { content: 'Get segment data' };

      await controller.sendMessage(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorType: 'LLM_UNAVAILABLE'
        })
      );
    });
  });
});

