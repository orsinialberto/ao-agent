import { Request, Response } from 'express';
import { ChatController } from '../../controllers/chatController';
import { geminiService } from '../../services/geminiService';
import { databaseService } from '../../services/databaseService';
import { MessageRole } from '../../types/shared';

// Mock services
jest.mock('../../services/geminiService');
jest.mock('../../services/databaseService');

describe('ChatController', () => {
  let controller: ChatController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    controller = new ChatController();
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('createChat', () => {
    it('should create a chat without initial message', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
        messages: []
      };

      (databaseService.createChat as jest.Mock).mockResolvedValue(mockChat);

      mockReq.body = { title: 'Test Chat' };

      await controller.createChat(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.createChat).toHaveBeenCalledWith('Test Chat');
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockChat
      });
    });

    it('should create a chat with initial message', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
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
        content: 'Hi there!',
        createdAt: new Date()
      };

      (databaseService.createChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.addMessage as jest.Mock)
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      
      (geminiService.sendMessageWithFallback as jest.Mock).mockResolvedValue({
        content: 'Hi there!'
      });
      (databaseService.getChat as jest.Mock).mockResolvedValue({
        ...mockChat,
        messages: [mockUserMessage, mockAssistantMessage]
      });

      mockReq.body = { title: 'Test Chat', initialMessage: 'Hello' };

      await controller.createChat(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.createChat).toHaveBeenCalledWith('Test Chat');
      expect(databaseService.addMessage).toHaveBeenCalledTimes(2);
      expect(geminiService.sendMessageWithFallback).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle errors when creating chat', async () => {
      (databaseService.createChat as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      mockReq.body = { title: 'Test Chat' };

      await controller.createChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create chat'
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
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
        content: 'Hi there!',
        createdAt: new Date()
      };

      (databaseService.getChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.getMessages as jest.Mock).mockResolvedValue([mockUserMessage]);
      (databaseService.addMessage as jest.Mock)
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      
      (geminiService.sendMessageWithFallback as jest.Mock).mockResolvedValue({
        content: 'Hi there!'
      });

      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { content: 'Hello', role: 'user' };

      await controller.sendMessage(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.getChat).toHaveBeenCalledWith('chat-1');
      expect(databaseService.addMessage).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAssistantMessage
      });
    });

    it('should return 400 if content is empty', async () => {
      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { content: '', role: 'user' };

      await controller.sendMessage(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Message content is required'
      });
    });

    it('should return 404 if chat does not exist', async () => {
      (databaseService.getChat as jest.Mock).mockResolvedValue(null);

      mockReq.params = { chatId: 'invalid-chat' };
      mockReq.body = { content: 'Hello', role: 'user' };

      await controller.sendMessage(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'NOT_FOUND',
        message: 'Chat not found'
      });
    });

    it('should handle errors when sending message', async () => {
      (databaseService.getChat as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { content: 'Hello', role: 'user' };

      await controller.sendMessage(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to send message'
      });
    });
  });

  describe('getChats', () => {
    it('should get all chats successfully', async () => {
      const mockChats = [
        {
          id: 'chat-1',
          title: 'Test Chat 1',
          createdAt: new Date(),
          messages: []
        },
        {
          id: 'chat-2',
          title: 'Test Chat 2',
          createdAt: new Date(),
          messages: []
        }
      ];

      (databaseService.getChats as jest.Mock).mockResolvedValue(mockChats);

      await controller.getChats(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.getChats).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockChats
      });
    });

    it('should handle errors when getting chats', async () => {
      (databaseService.getChats as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await controller.getChats(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get chats'
      });
    });
  });

  describe('getChat', () => {
    it('should get a specific chat successfully', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
        messages: []
      };

      (databaseService.getChat as jest.Mock).mockResolvedValue(mockChat);

      mockReq.params = { chatId: 'chat-1' };
      mockReq.query = {};

      await controller.getChat(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.getChat).toHaveBeenCalledWith('chat-1', 50);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockChat
      });
    });

    it('should return 404 if chat not found', async () => {
      (databaseService.getChat as jest.Mock).mockResolvedValue(null);

      mockReq.params = { chatId: 'invalid-chat' };
      mockReq.query = {};

      await controller.getChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'NOT_FOUND',
        message: 'Chat not found'
      });
    });

    it('should handle errors when getting chat', async () => {
      (databaseService.getChat as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      mockReq.params = { chatId: 'chat-1' };
      mockReq.query = {};

      await controller.getChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get chat'
      });
    });
  });

  describe('updateChat', () => {
    it('should update chat title successfully', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Updated Title',
        createdAt: new Date(),
        messages: []
      };

      (databaseService.getChat as jest.Mock)
        .mockResolvedValueOnce({ ...mockChat, title: 'Old Title' })
        .mockResolvedValueOnce(mockChat);
      (databaseService.updateChatTitle as jest.Mock).mockResolvedValue(undefined);

      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { title: 'Updated Title' };

      await controller.updateChat(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.updateChatTitle).toHaveBeenCalledWith('chat-1', 'Updated Title');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockChat
      });
    });

    it('should return 400 if title is empty', async () => {
      mockReq.params = { chatId: 'chat-1' };
      mockReq.body = { title: '   ' };

      await controller.updateChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Title is required'
      });
    });

    it('should return 404 if chat not found', async () => {
      (databaseService.getChat as jest.Mock).mockResolvedValue(null);

      mockReq.params = { chatId: 'invalid-chat' };
      mockReq.body = { title: 'New Title' };

      await controller.updateChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'NOT_FOUND',
        message: 'Chat not found'
      });
    });
  });

  describe('deleteChat', () => {
    it('should delete chat successfully', async () => {
      const mockChat = {
        id: 'chat-1',
        title: 'Test Chat',
        createdAt: new Date(),
        messages: []
      };

      (databaseService.getChat as jest.Mock).mockResolvedValue(mockChat);
      (databaseService.deleteChat as jest.Mock).mockResolvedValue(undefined);

      mockReq.params = { chatId: 'chat-1' };

      await controller.deleteChat(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.getChat).toHaveBeenCalledWith('chat-1');
      expect(databaseService.deleteChat).toHaveBeenCalledWith('chat-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { message: 'Chat deleted successfully' }
      });
    });

    it('should return 404 if chat not found', async () => {
      (databaseService.getChat as jest.Mock).mockResolvedValue(null);

      mockReq.params = { chatId: 'invalid-chat' };

      await controller.deleteChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'NOT_FOUND',
        message: 'Chat not found'
      });
    });

    it('should handle errors when deleting chat', async () => {
      (databaseService.getChat as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      mockReq.params = { chatId: 'chat-1' };

      await controller.deleteChat(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete chat'
      });
    });
  });

  describe('testConnection', () => {
    it('should test Gemini connection successfully', async () => {
      (geminiService.testConnection as jest.Mock).mockResolvedValue(true);

      await controller.testConnection(
        mockReq as any,
        mockRes as Response
      );

      expect(geminiService.testConnection).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Gemini API connection successful',
        timestamp: expect.any(String)
      });
    });

    it('should handle connection test failure', async () => {
      (geminiService.testConnection as jest.Mock).mockResolvedValue(false);

      await controller.testConnection(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Gemini API connection failed',
        timestamp: expect.any(String)
      });
    });
  });

  describe('testDatabase', () => {
    it('should test database connection successfully', async () => {
      (databaseService.testConnection as jest.Mock).mockResolvedValue(true);

      await controller.testDatabase(
        mockReq as any,
        mockRes as Response
      );

      expect(databaseService.testConnection).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Database connection successful',
        timestamp: expect.any(String)
      });
    });

    it('should handle database connection failure', async () => {
      (databaseService.testConnection as jest.Mock).mockResolvedValue(false);

      await controller.testDatabase(
        mockReq as any,
        mockRes as Response
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed',
        timestamp: expect.any(String)
      });
    });
  });
});

