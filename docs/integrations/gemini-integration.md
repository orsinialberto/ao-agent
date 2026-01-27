# Gemini API Integration

## Overview

This document describes the integration of Google's Gemini API into the AI Agent Chat application for Phase 1 development.

## Implementation Details

### Service Layer (`geminiService.ts`)

The `GeminiService` class provides a clean interface to the Google Generative AI API:

- **Initialization**: Configures the Gemini model with optimal parameters
- **Message Processing**: Converts chat messages to Gemini format
- **Response Handling**: Processes AI responses and error handling
- **Connection Testing**: Validates API connectivity

### Key Features

1. **Model Configuration**:
   - Uses `gemini-2.5-flash` for fast responses
   - Temperature: 0.7 (balanced creativity)
   - Max tokens: 2048
   - Top-p: 0.8, Top-k: 40

2. **Message History**:
   - Converts chat history to Gemini format
   - Filters system messages (not supported by Gemini)
   - Maintains conversation context

3. **Error Handling**:
   - Graceful API error handling
   - Connection testing capabilities
   - Detailed error logging

### API Endpoints

The integration provides the following endpoints:

**REST Endpoints:**
- `POST /api/chats` - Create new chat
- `GET /api/chats` - List all chats
- `GET /api/chats/:chatId` - Get specific chat
- `POST /api/chats/:chatId/messages` - Send message (waits for complete response)
- `GET /api/test/gemini` - Test Gemini connection

**Streaming Endpoints (SSE):**
- `POST /api/chats/:chatId/messages/stream` - Send message with streaming response
- `POST /api/anonymous/chats/:chatId/messages/stream` - Anonymous streaming

### Usage Example

**Standard REST (waits for complete response):**
```typescript
// Create a new chat with initial message
const response = await fetch('/api/chats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Chat',
    initialMessage: 'Hello, how are you?'
  })
});

// Send a message to existing chat
const messageResponse = await fetch('/api/chats/chat123/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Tell me about AI',
    role: 'user'
  })
});
```

**HTTP Streaming (SSE - real-time responses):**
```typescript
// Send a message with streaming response
const response = await fetch('/api/chats/chat123/messages/stream', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    content: 'Tell me about AI',
    role: 'user'
  })
});

// Read the stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'chunk') {
        // Append chunk to message display
        console.log('Chunk:', data.content);
      } else if (data.type === 'done') {
        // Final message with ID saved to database
        console.log('Complete:', data.message);
      } else if (data.type === 'error') {
        console.error('Error:', data.error);
      }
    }
  }
}
```

### Environment Configuration

Required environment variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Testing

The integration includes comprehensive tests:

- Service initialization
- Message format conversion
- API error handling
- Connection testing

Run tests with:
```bash
npm test
```

### Implemented Features

1. **HTTP Streaming (SSE)** ✅
   - Real-time token-by-token responses
   - Server-Sent Events for efficient streaming
   - Smooth UI updates during streaming
   - "AI is thinking..." indicator before first chunk

2. **MCP Integration** ✅
   - Tool discovery and execution
   - Dynamic capability management

### Future Enhancements

1. **Multi-Model Support** (Phase 3):
   - Easy switching between LLM providers
   - Model comparison capabilities

2. **Advanced Features**:
   - Token usage tracking
   - Response caching

## Security Considerations

- API keys are stored in environment variables
- Rate limiting implemented (100 requests per 15 minutes)
- CORS configured for frontend communication
- Input validation and sanitization

## Performance

- Optimized for fast responses with `gemini-2.5-flash`
- Efficient message history processing
- Minimal memory footprint
- Connection pooling ready for future enhancements
- Latest Gemini 2.5 features: enhanced reasoning, tool integration, extended context
