// Shared types for anonymous chat API (used by ao-chat)

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
  message?: string;
  retryAfter?: number;
  chatId?: string;
}

export interface CreateChatRequest {
  title?: string;
  initialMessage?: string;
  model?: string;
}

export interface CreateMessageRequest {
  content: string;
  role?: MessageRole;
  model?: string;
}

export interface AnonymousChat {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
