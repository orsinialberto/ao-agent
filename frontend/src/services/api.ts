// API service for communicating with the backend

import { authService } from './authService';

// Use Vite proxy in development to avoid WSL networking issues
// In production, this should be set to the actual API URL
const API_BASE_URL = import.meta.env.DEV 
  ? '/api'  // Use Vite proxy (no CORS, faster connection)
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

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
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateChatRequest {
  title?: string;
  initialMessage?: string;
  model?: string;
}

export interface CreateMessageRequest {
  chatId: string;
  content: string;
  role?: 'user' | 'system';
  model?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
  message?: string;
  retryAfter?: number;
  chatId?: string;
}

// Auth types
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a public request without authentication token
   * Used for anonymous endpoints
   */
  private async requestPublic<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: headers as HeadersInit,
      });

      // Parse response body
      const data = await response.json();

      // If response is not OK, preserve error details from backend
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
          errorType: data.errorType,
          message: data.message,
          retryAfter: data.retryAfter,
          chatId: data.chatId
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Network error or JSON parse error
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Check if token is expired before making request (JWT or OAuth)
      if (authService.hasToken() && authService.isTokenExpired()) {
        // Check if it's OAuth token expiration before removing token
        const payload = authService.decodeToken();
        const isOAuthExpired = payload?.oauthTokenExpiry && 
          Math.floor(Date.now() / 1000) >= payload.oauthTokenExpiry;
        
        console.log(isOAuthExpired ? 'OAuth token expired, switching to anonymous mode' : 'Token expired (JWT), switching to anonymous mode');
        authService.removeToken();
        
        // Return error without redirect - user will remain in chat as anonymous
        return {
          success: false,
          error: isOAuthExpired ? 'OAUTH_TOKEN_EXPIRED' : 'TOKEN_EXPIRED',
          message: isOAuthExpired 
            ? 'OAuth token has expired. You are now using anonymous mode.'
            : 'Your session has expired. You are now using anonymous mode.'
        };
      }

      // Get token and add to headers if available
      const token = authService.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: headers as HeadersInit,
      });

      // Parse response body
      const data = await response.json();

      // Handle 401 Unauthorized (token invalid or expired)
      if (response.status === 401) {
        // Handle OAuth token expiration specifically
        if (data.error === 'OAUTH_TOKEN_EXPIRED') {
          console.log('OAuth token expired, switching to anonymous mode');
          authService.removeToken();
          // Return error without redirect - user will remain in chat as anonymous
          return {
            success: false,
            error: 'OAUTH_TOKEN_EXPIRED',
            message: data.message || 'OAuth token has expired. You are now using anonymous mode.'
          };
        }
        
        console.log('Unauthorized, switching to anonymous mode');
        authService.removeToken();
        // Return error without redirect - user will remain in chat as anonymous
        return {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required. You are now using anonymous mode.'
        };
      }

      // If response is not OK, preserve error details from backend
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
          errorType: data.errorType,
          message: data.message,
          retryAfter: data.retryAfter,
          chatId: data.chatId
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      // Network error or JSON parse error
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Chat endpoints
  async createChat(request: CreateChatRequest): Promise<ApiResponse<Chat>> {
    return this.request<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getChats(): Promise<ApiResponse<Chat[]>> {
    return this.request<Chat[]>('/chats');
  }

  async getChat(chatId: string): Promise<ApiResponse<Chat>> {
    return this.request<Chat>(`/chats/${chatId}`);
  }

  async sendMessage(chatId: string, request: CreateMessageRequest): Promise<ApiResponse<Message>> {
    return this.request<Message>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateChat(chatId: string, title: string): Promise<ApiResponse<Chat>> {
    return this.request<Chat>(`/chats/${chatId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async deleteChat(chatId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  // Auth endpoints
  async register(request: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async login(request: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async logout(): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  async changePassword(request: ChangePasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/account', {
      method: 'DELETE',
    });
  }

  // Anonymous chat endpoints (public - no authentication required)
  async createAnonymousChat(request: CreateChatRequest): Promise<ApiResponse<Chat>> {
    return this.requestPublic<Chat>('/anonymous/chats', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async sendAnonymousMessage(chatId: string, request: CreateMessageRequest): Promise<ApiResponse<Message>> {
    return this.requestPublic<Message>(`/anonymous/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Send a streaming message to an authenticated chat
   * Uses Server-Sent Events (SSE) to receive chunks
   */
  async sendMessageStream(
    chatId: string,
    request: CreateMessageRequest,
    onChunk: (chunk: string) => void,
    onDone: (message: Message) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Check if token is expired before making request
      if (authService.hasToken() && authService.isTokenExpired()) {
        authService.removeToken();
        onError('Your session has expired. You are now using anonymous mode.');
        return;
      }

      const token = authService.getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(errorData.error || `HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        onError('No response body');
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last potentially incomplete chunk in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onDone(data.message);
              } else if (data.type === 'error') {
                onError(data.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.type === 'chunk') {
            onChunk(data.content);
          } else if (data.type === 'done') {
            onDone(data.message);
          } else if (data.type === 'error') {
            onError(data.error);
          }
        } catch (e) {
          // Ignore incomplete data
        }
      }
    } catch (error) {
      console.error('Streaming request failed:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Send a streaming message to an anonymous chat
   * Uses Server-Sent Events (SSE) to receive chunks
   */
  async sendAnonymousMessageStream(
    chatId: string,
    request: CreateMessageRequest,
    onChunk: (chunk: string) => void,
    onDone: (message: Message) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(`${this.baseUrl}/anonymous/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(errorData.error || `HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        onError('No response body');
        return;
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last potentially incomplete chunk in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'done') {
                onDone(data.message);
              } else if (data.type === 'error') {
                onError(data.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.type === 'chunk') {
            onChunk(data.content);
          } else if (data.type === 'done') {
            onDone(data.message);
          } else if (data.type === 'error') {
            onError(data.error);
          }
        } catch (e) {
          // Ignore incomplete data
        }
      }
    } catch (error) {
      console.error('Streaming request failed:', error);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Migrate anonymous chats to database (requires authentication)
  async migrateAnonymousChats(chats: Chat[]): Promise<ApiResponse<{ migratedChats: Chat[] }>> {
    return this.request<{ migratedChats: Chat[] }>('/chats/migrate', {
      method: 'POST',
      body: JSON.stringify({ chats }),
    });
  }

  // Test endpoints
  async testGeminiConnection(): Promise<ApiResponse> {
    return this.request('/test/gemini');
  }

  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();
