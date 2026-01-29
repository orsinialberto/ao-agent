import React, { useState, useEffect, useRef, Fragment, useCallback } from 'react'
import { useChat } from '../hooks/useChat'
import { Message, Chat } from '../services/api'
import { MarkdownRenderer } from './MarkdownRenderer'
import { useTranslation } from '../hooks/useTranslation'
import { TextArea } from './TextArea'
import { Listbox, Transition } from '@headlessui/react'

interface ChatInterfaceProps {
  currentChatId?: string;
  onChatCreated?: (chat: Chat) => void;
  isAnonymous?: boolean;
}

// Memoized Message Component to prevent unnecessary re-renders
interface MessageItemProps {
  message: Message;
  copiedMessageId: string | null;
  isTyping: boolean; // True when typewriter effect is active for this message
  onCopy: (message: Message) => void;
  onDownload: (message: Message) => void;
  t: (key: string) => string;
}

const MessageItem: React.FC<MessageItemProps> = React.memo(({ 
  message, 
  copiedMessageId, 
  isTyping,
  onCopy, 
  onDownload, 
  t 
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`break-words relative group transition-colors ${
          isUser
            ? 'max-w-[70%] px-4 py-2 rounded-lg bg-sky-200/60 dark:bg-sky-800/60 text-sky-800 dark:text-sky-100'
            : 'w-full py-2 text-gray-700 dark:text-gray-100'
        }`}
      >
        {message.role === 'assistant' ? (
          <>
            <div className="relative">
              <MarkdownRenderer 
                content={message.content} 
                className="text-sm"
              />
              {isTyping && <span className="typewriter-cursor inline-block" />}
            </div>
            {/* Copy, Download buttons and timestamp row */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onCopy(message)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  title={copiedMessageId === message.id ? (t('chat.copied') ?? 'Copied!') : (t('chat.copy_message') ?? 'Copy message')}
                  aria-label={t('chat.copy_message') ?? 'Copy message'}
                >
                  {copiedMessageId === message.id ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5 text-green-600"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onDownload(message)}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  title={t('chat.download_message') ?? 'Download message'}
                  aria-label={t('chat.download_message') ?? 'Download message'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
              <p className="text-xs opacity-70 dark:opacity-60 text-right text-gray-600 dark:text-gray-400">
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm">{message.content}</p>
            <p className="text-xs opacity-70 dark:opacity-60 mt-1 text-right text-gray-600 dark:text-gray-400">
              {new Date(message.createdAt).toLocaleTimeString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if message content changes, typing state changes, or copied state changes
  const messageChanged = 
    prevProps.message.id !== nextProps.message.id ||
    prevProps.message.content !== nextProps.message.content ||
    prevProps.message.createdAt !== nextProps.message.createdAt;
  
  const typingStateChanged = prevProps.isTyping !== nextProps.isTyping;
  
  const copiedStateChanged = 
    (prevProps.copiedMessageId === prevProps.message.id) !== 
    (nextProps.copiedMessageId === nextProps.message.id);
  
  // Re-render if message changed, typing state changed, or copied state for this message changed
  return !messageChanged && !typingStateChanged && !copiedStateChanged;
});

MessageItem.displayName = 'MessageItem';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentChatId, onChatCreated, isAnonymous = false }) => {
  const [inputValue, setInputValue] = useState('')
  const [textAreaHeight, setTextAreaHeight] = useState<number>(40)
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const availableModels = ['gemini-2.5-flash', 'gemini-2.5-pro']
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const notifiedChatIdsRef = useRef<Set<string>>(new Set())
  const { t } = useTranslation()
  const { 
    currentChat, 
    messages, 
    isLoading,
    isStreaming,
    isTyping,
    error, 
    createChat, 
    loadChat,
    sendMessage, 
    clearError,
    resetChat
  } = useChat({ isAnonymous })

  // Reset state when currentChatId becomes undefined (going to home)
  useEffect(() => {
    if (!currentChatId) {
      // Clear the current chat when navigating to home
      // This will show the empty chat interface
      resetChat();
      notifiedChatIdsRef.current.clear();
    }
  }, [currentChatId, resetChat])

  // Load chat when currentChatId changes
  useEffect(() => {
    if (currentChatId && currentChatId !== currentChat?.id) {
      loadChat(currentChatId);
      // Mark this chat as already in sidebar (it was loaded, not created)
      if (currentChatId) {
        notifiedChatIdsRef.current.add(currentChatId);
      }
    }
  }, [currentChatId, currentChat?.id, loadChat])

  // Notify parent when a new chat is created (not loaded from currentChatId)
  useEffect(() => {
    if (currentChat && onChatCreated && !currentChatId && !notifiedChatIdsRef.current.has(currentChat.id)) {
      // This is a newly created chat (no currentChatId was provided and we haven't notified about it yet)
      onChatCreated(currentChat);
      notifiedChatIdsRef.current.add(currentChat.id);
    }
  }, [currentChat, currentChatId, onChatCreated])

  // Auto-scroll to bottom when messages change (smooth scrolling)
  // Only auto-scroll if user is near the bottom (within 150px threshold)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (container && messagesEndRef.current) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150
      
      // Auto-scroll if user is near bottom or if streaming is active
      if (isNearBottom || isStreaming) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    }
  }, [messages, isLoading, isStreaming])


  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return
    
    const messageContent = inputValue.trim()
    setInputValue('')
    
    // If no chat exists, create one with the first message
    if (!currentChat) {
      await createChat({
        title: t('chat.new_chat'),
      initialMessage: messageContent,
      model: selectedModel
      })
    } else {
      // Send message to existing chat
    await sendMessage(messageContent, { model: selectedModel })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyMessage = useCallback(async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedMessageId(message.id)
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }, [])

  const handleDownloadMessage = useCallback((message: Message) => {
    // Create a blob with the message content
    const blob = new Blob([message.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    
    // Create a temporary link and trigger download
    const link = document.createElement('a')
    link.href = url
    const timestamp = new Date(message.createdAt).toISOString().replace(/[:.]/g, '-')
    link.download = `ai-response-${timestamp}.md`
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="w-full min-w-0 min-h-0 max-h-[calc(100vh-8rem)] flex flex-col bg-white/90 dark:bg-gray-900 rounded-lg transition-colors">
      
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-rose-100/60 dark:bg-rose-900/30 border-l-4 border-rose-300 dark:border-rose-600 text-rose-700 dark:text-rose-300 rounded-r-lg mx-6 mt-6 transition-colors">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="text-center text-gray-600 dark:text-gray-400 py-4 mb-8 transition-colors">
            <p className="text-4xl font-light tracking-wide">All set when you are!</p>
          </div>
        </div>
      ) : (
        <div ref={messagesContainerRef} className="space-y-2 mb-3 flex-1 overflow-y-auto overflow-x-hidden min-h-0 max-h-[calc(100vh-16rem)] scrollbar-hide overscroll-contain px-6 pt-6">
          {messages.map((message: Message) => (
            <MessageItem
              key={message.id}
              message={message}
              copiedMessageId={copiedMessageId}
              isTyping={isTyping && message.id.startsWith('streaming_')}
              onCopy={handleCopyMessage}
              onDownload={handleDownloadMessage}
              t={t}
            />
          ))}
          
          {/* Loading indicator - only show when loading but not streaming (streaming shows content directly) */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 transition-colors">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 dark:border-gray-500"></div>
                <span className="text-sm">{t('chat.thinking')}</span>
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      )}
        
        {/* Input Area */}
        <div className="px-6 mt-1">
          <div className="relative">
            <div
              className="aic-input-container"
              style={{
                // compute pill factor from height (min ~40px, max ~40vh)
                // clamp to [0,1]
                // @ts-ignore: CSS var inline
                '--pillFactor': (() => {
                  const minH = 40
                  const maxH = typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.4) : 320
                  const h = Math.max(minH, Math.min(textAreaHeight, maxH))
                  const ratio = (maxH - h) / (maxH - minH)
                  return Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 1))
                })()
              }}
            >
              <label htmlFor="chat-input" className="sr-only">
                {t('chat.type_message')}
              </label>
              <div className="relative">
                <TextArea
                  id="chat-input"
                  ariaLabelledBy={undefined}
                  ariaLabel={t('chat.type_message')}
                  value={inputValue}
                  onChange={setInputValue}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.type_message')}
                  disabled={isLoading}
                  minRows={1}
                  maxHeightVh={40}
                  onHeightChange={setTextAreaHeight}
                  className="aic-textarea--withSend"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  type="button"
                  aria-label={t('chat.send') ?? 'Invia'}
                  title={t('chat.send') ?? 'Invia'}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Model selector overlay - positioned outside container to avoid clipping */}
            <Listbox value={selectedModel} onChange={setSelectedModel}>
              <div className="absolute left-3.5 bottom-3.5 text-xs z-[70]">
                <Listbox.Button
                  className="px-2 py-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-transparent hover:bg-gray-50/30 dark:hover:bg-gray-700/30 focus:bg-white dark:focus:bg-gray-700 border-none outline-none rounded shadow-none inline-flex items-center gap-1 transition-colors"
                  aria-label={t('chat.model') ?? 'Model'}
                >
                  {selectedModel.replace('gemini-2.5-', 'gemini 2.5 ')}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="w-3.5 h-3.5 opacity-70"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.084l3.71-3.853a.75.75 0 111.08 1.04l-4.24 4.4a.75.75 0 01-1.08 0l-4.24-4.4a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options
                    className="absolute left-0 top-full mt-1 max-h-60 w-max min-w-[10rem] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-xs shadow-lg ring-1 ring-black/5 dark:ring-white/10 focus:outline-none z-[90] pointer-events-auto transition-colors"
                  >
                    {availableModels.map((model) => (
                      <Listbox.Option
                        key={model}
                        value={model}
                        className={({ active, selected }: { active: boolean; selected: boolean }) => `
                          cursor-pointer select-none px-3 py-1.5 rounded transition-colors
                          ${active ? 'bg-sky-100/50 dark:bg-sky-800/50 text-sky-800 dark:text-sky-200' : 'text-gray-700 dark:text-gray-300'}
                          ${selected ? 'font-medium' : 'font-normal'}
                        `}
                      >
                        {model.replace('gemini-2.5-', 'gemini 2.5 ')}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>
        </div>
      </div>
  )
}
