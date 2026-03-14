import { Request, Response } from 'express';
import { ollamaService } from '../services/ollamaService';
import { ResponseHelper } from '../utils/responseHelpers';
import {
  Message,
  MessageRole,
  CreateChatRequest,
  CreateMessageRequest,
  ApiResponse,
  AnonymousChat,
} from '../types/shared';

export class ChatController {
  private anonymousChats: Map<string, AnonymousChat>;
  private readonly ANONYMOUS_CHAT_TIMEOUT = 60 * 60 * 1000; // 1 hour
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.anonymousChats = new Map();
    this.startAnonymousChatCleanup();
  }

  private startAnonymousChatCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const chatsToDelete: string[] = [];
      this.anonymousChats.forEach((chat, chatId) => {
        if (now - chat.createdAt.getTime() > this.ANONYMOUS_CHAT_TIMEOUT) {
          chatsToDelete.push(chatId);
        }
      });
      chatsToDelete.forEach(chatId => this.anonymousChats.delete(chatId));
      if (chatsToDelete.length > 0) {
        console.log(`Cleaned up ${chatsToDelete.length} anonymous chat(s)`);
      }
    }, 30 * 60 * 1000);
  }

  private handleModelSwitch(model?: string): void {
    if (!model) return;
    ollamaService.switchModel(model);
  }

  private handleLLMError(res: Response, error: unknown, chatId?: string, isInitialMessage = false): Response {
    console.error('Error getting AI response:', error);
    const message = isInitialMessage
      ? 'The AI service is temporarily unavailable. The chat was created but the AI could not respond.'
      : 'The AI service is temporarily unavailable. Please try again in a few moments.';
    const retryAfter = isInitialMessage ? undefined : 60;
    return ResponseHelper.serviceUnavailable(res, message, 'LLM_UNAVAILABLE', retryAfter, chatId);
  }

  async createAnonymousChat(req: Request<{}, ApiResponse<AnonymousChat>, CreateChatRequest>, res: Response<ApiResponse<AnonymousChat>>) {
    try {
      const { title, initialMessage, model } = req.body;
      const chatId = `anonymous_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const now = new Date();
      const anonymousChat: AnonymousChat = {
        id: chatId,
        title: title || 'New Chat',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };

      if (initialMessage) {
        try {
          if (model) this.handleModelSwitch(model);
          const userMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            chatId,
            role: MessageRole.USER,
            content: initialMessage.trim(),
            createdAt: now,
          };
          const aiResponse = await ollamaService.sendMessageWithFallback([userMessage]);
          const assistantMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            chatId,
            role: MessageRole.ASSISTANT,
            content: aiResponse.content,
            createdAt: new Date(),
          };
          anonymousChat.messages = [userMessage, assistantMessage];
          anonymousChat.updatedAt = new Date();
        } catch (error) {
          const userMessage: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            chatId,
            role: MessageRole.USER,
            content: initialMessage.trim(),
            createdAt: now,
          };
          anonymousChat.messages = [userMessage];
          anonymousChat.updatedAt = new Date();
          this.anonymousChats.set(chatId, anonymousChat);
          return this.handleLLMError(res, error, chatId, true);
        }
      }

      this.anonymousChats.set(chatId, anonymousChat);
      return ResponseHelper.success(res, anonymousChat, 201);
    } catch (error) {
      console.error('Error creating anonymous chat:', error);
      if (error instanceof Error && error.message.includes('Model')) {
        return ResponseHelper.badRequest(res as Response<ApiResponse>, error.message, 'INVALID_MODEL');
      }
      return ResponseHelper.internalError(res as Response<ApiResponse>, 'Failed to create anonymous chat');
    }
  }

  async sendAnonymousMessageStream(req: Request<{ chatId: string }, unknown, CreateMessageRequest>, res: Response) {
    const { chatId } = req.params;
    const { content, role = MessageRole.USER, model } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      if (!content || !content.trim()) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Message content is required' })}\n\n`);
        res.end();
        return;
      }

      const anonymousChat = this.anonymousChats.get(chatId);
      if (!anonymousChat) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Anonymous chat not found' })}\n\n`);
        res.end();
        return;
      }

      if (model) this.handleModelSwitch(model);

      const userMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        chatId,
        role,
        content: content.trim(),
        createdAt: new Date(),
      };
      anonymousChat.messages.push(userMessage);
      anonymousChat.updatedAt = new Date();

      let fullContent = '';
      try {
        for await (const chunk of ollamaService.sendMessageStream(anonymousChat.messages)) {
          fullContent += chunk;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          chatId,
          role: MessageRole.ASSISTANT,
          content: fullContent,
          createdAt: new Date(),
        };
        anonymousChat.messages.push(assistantMessage);
        anonymousChat.updatedAt = new Date();
        this.anonymousChats.set(chatId, anonymousChat);
        res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMessage })}\n\n`);
        res.end();
      } catch (error) {
        console.error('Error streaming AI response:', error);
        anonymousChat.messages.pop();
        anonymousChat.updatedAt = new Date();
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'The AI service is temporarily unavailable. Please try again in a few moments.' })}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error('Error in anonymous streaming message:', error);
      if (error instanceof Error && error.message.includes('Model')) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to send anonymous message' })}\n\n`);
      }
      res.end();
    }
  }
}

export const chatController = new ChatController();
