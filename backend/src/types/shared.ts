// Shared types between frontend and backend

export interface Chat {
  id: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: LLMType;
  config: Record<string, any>;
  active: boolean;
  createdAt: Date;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum LLMType {
  GEMINI = 'gemini',
  ANTHROPIC = 'anthropic',
  MCP = 'mcp'
}

// API Response types
export interface ApiResponse<T = any> {
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
  chatId: string;
  content: string;
  role: MessageRole;
  model?: string;
}

export interface ChatResponse {
  chat: Chat;
  messages: Message[];
}

// Anonymous chat types
export interface AnonymousChat {
  id: string;
  title?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MigrateChatsRequest {
  chats: AnonymousChat[];
}

export interface MigrateChatsResponse {
  migratedChats: Chat[];
}
