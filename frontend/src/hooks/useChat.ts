import { useState, useCallback, useRef } from 'react';
import { apiService, Chat, Message, CreateChatRequest, CreateMessageRequest, ApiResponse } from '../services/api';
import { AnonymousChatService } from '../services/anonymousChatService';
import { t } from '../utils/i18n';

export interface UseChatReturn {
  // State
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  
  // Actions
  createChat: (request: CreateChatRequest) => Promise<void>;
  loadChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string, options?: { model?: string }) => Promise<void>;
  clearError: () => void;
  resetChat: () => void;
}

export interface UseChatOptions {
  isAnonymous?: boolean;
}

/**
 * Convert API error response to localized error message
 */
function getErrorMessage(response: ApiResponse<any>, context: 'send' | 'load' | 'create'): string {
  // Handle specific error types
  if (response.errorType === 'LLM_UNAVAILABLE') {
    return context === 'create' 
      ? t('errors.llm_unavailable_on_create')
      : t('errors.llm_unavailable');
  }
  
  if (response.error === 'NETWORK_ERROR') {
    return t('errors.network_error');
  }
  
  // Use backend message if available, otherwise use localized defaults
  if (response.message) {
    return response.message;
  }
  
  // Fallback to context-specific errors
  switch (context) {
    case 'send':
    case 'create':
      return t('errors.failed_to_send');
    case 'load':
      return t('errors.failed_to_load');
    default:
      return t('errors.unknown_error');
  }
}

export const useChat = (options: UseChatOptions = {}): UseChatReturn => {
  const { isAnonymous = false } = options;
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track streaming message ID for updates
  const streamingMessageIdRef = useRef<string | null>(null);
  
  // Refs for smooth streaming (buffering chunks with requestAnimationFrame)
  const chunkBufferRef = useRef<string>('');
  const rafIdRef = useRef<number | null>(null);

  const createChat = useCallback(async (request: CreateChatRequest) => {
    setIsLoading(true);
    setError(null);
    
    // Add user message immediately if initialMessage is provided
    let tempUserMessage: Message | null = null;
    if (request.initialMessage) {
      tempUserMessage = {
        id: `temp_${Date.now()}`,
        chatId: '', // Will be updated when chat is created
        role: 'user',
        content: request.initialMessage.trim(),
        createdAt: new Date()
      };
      setMessages([tempUserMessage]);
    }
    
    try {
      let response: ApiResponse<Chat>;
      
      if (isAnonymous) {
        // Use anonymous endpoint
        response = await apiService.createAnonymousChat(request);
      } else {
        // Use authenticated endpoint
        response = await apiService.createChat(request);
      }
      
      if (response.success && response.data) {
        const chat = response.data;
        setCurrentChat(chat);
        // Replace temp message with real messages from server
        setMessages(chat.messages || []);
        
        // Save to sessionStorage if anonymous
        if (isAnonymous) {
          AnonymousChatService.addChat(chat);
        }
      } else {
        // Remove temp message on error
        if (tempUserMessage) {
          setMessages([]);
        }
        
        // If chat was created but LLM failed, still set the chat
        if (response.chatId) {
          if (isAnonymous) {
            // For anonymous chats, try to load from sessionStorage
            const savedChat = AnonymousChatService.getChat(response.chatId);
            if (savedChat) {
              setCurrentChat(savedChat);
              setMessages(savedChat.messages || []);
            }
          } else {
            // Load the created chat from API
            const chatResponse = await apiService.getChat(response.chatId);
            if (chatResponse.success && chatResponse.data) {
              setCurrentChat(chatResponse.data);
              setMessages(chatResponse.data.messages || []);
            }
          }
        }
        
        // Show localized error message
        setError(getErrorMessage(response, 'create'));
      }
    } catch (err) {
      // Remove temp message on error
      if (tempUserMessage) {
        setMessages([]);
      }
      setError(t('errors.unknown_error'));
    } finally {
      setIsLoading(false);
    }
  }, [isAnonymous]);

  const sendMessage = useCallback(async (content: string, options?: { model?: string }) => {
    if (!currentChat || !content.trim()) return;
    
    setIsLoading(true);
    setIsStreaming(false); // Start with streaming false - will be set true on first chunk
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      chatId: currentChat.id,
      role: 'user',
      content: content.trim(),
      createdAt: new Date()
    };

    // Create placeholder for streaming assistant message
    const streamingMessageId = `streaming_${Date.now()}`;
    streamingMessageIdRef.current = streamingMessageId;
    
    const streamingMessage: Message = {
      id: streamingMessageId,
      chatId: currentChat.id,
      role: 'assistant',
      content: '',
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage, streamingMessage]);

    const request: CreateMessageRequest = {
      chatId: currentChat.id,
      content: content.trim(),
      role: 'user'
    };
    if (options?.model) {
      (request as any).model = options.model;
    }

    // Handlers for streaming with buffering for smooth rendering
    const flushBuffer = () => {
      if (chunkBufferRef.current) {
        const bufferedContent = chunkBufferRef.current;
        chunkBufferRef.current = '';
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === streamingMessageIdRef.current
              ? { ...msg, content: msg.content + bufferedContent }
              : msg
          )
        );
      }
      rafIdRef.current = null;
    };

    const onChunk = (chunk: string) => {
      // Set streaming to true on first chunk received
      setIsStreaming(true);
      
      // Accumulate chunk in buffer
      chunkBufferRef.current += chunk;
      
      // Schedule UI update with requestAnimationFrame for smooth rendering
      // This batches multiple chunks into single frame updates (~60fps)
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(flushBuffer);
      }
    };

    const onDone = (finalMessage: Message) => {
      // Cancel any pending RAF and flush remaining buffer
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      chunkBufferRef.current = '';
      
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === streamingMessageIdRef.current ? finalMessage : msg
        );
        
        // Update chat in sessionStorage if anonymous
        if (isAnonymous && currentChat) {
          const updatedChat: Chat = {
            ...currentChat,
            messages: newMessages,
            updatedAt: new Date()
          };
          AnonymousChatService.updateChat(currentChat.id, updatedChat);
          setCurrentChat(updatedChat);
        }
        
        return newMessages;
      });
      
      streamingMessageIdRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    };

    const onError = (errorMsg: string) => {
      // Cancel any pending RAF and clear buffer
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      chunkBufferRef.current = '';
      
      // Remove streaming message on error
      setMessages(prev => prev.filter(msg => 
        msg.id !== streamingMessageIdRef.current && msg.id !== userMessage.id
      ));
      streamingMessageIdRef.current = null;
      setError(errorMsg);
      setIsStreaming(false);
      setIsLoading(false);
    };

    try {
      if (isAnonymous) {
        await apiService.sendAnonymousMessageStream(currentChat.id, request, onChunk, onDone, onError);
      } else {
        await apiService.sendMessageStream(currentChat.id, request, onChunk, onDone, onError);
      }
    } catch (err) {
      onError(t('errors.unknown_error'));
    }
  }, [currentChat, isAnonymous]);

  const loadChat = useCallback(async (chatId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (isAnonymous) {
        // Load from sessionStorage for anonymous chats
        const chat = AnonymousChatService.getChat(chatId);
        if (chat) {
          setCurrentChat(chat);
          setMessages(chat.messages || []);
        } else {
          setError(t('errors.failed_to_load'));
        }
      } else {
        // Load from API for authenticated chats
        const response = await apiService.getChat(chatId);
        
        if (response.success && response.data) {
          setCurrentChat(response.data);
          setMessages(response.data.messages || []);
        } else {
          // Show localized error message
          setError(getErrorMessage(response, 'load'));
        }
      }
    } catch (err) {
      setError(t('errors.unknown_error'));
    } finally {
      setIsLoading(false);
    }
  }, [isAnonymous]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetChat = useCallback(() => {
    setCurrentChat(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    currentChat,
    messages,
    isLoading,
    isStreaming,
    error,
    createChat,
    loadChat,
    sendMessage,
    clearError,
    resetChat
  };
};
