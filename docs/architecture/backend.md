# Backend Architecture

## 📋 Overview

The backend is a Node.js/Express application built with TypeScript, providing both RESTful API endpoints and **HTTP streaming (Server-Sent Events)** for the chat application. It integrates with PostgreSQL database, Google Gemini API, and optionally with MCP (Model Context Protocol) servers.

### Communication Types

- **REST API**: Standard request/response for CRUD operations (chats, users, etc.)
- **Server-Sent Events (SSE)**: Real-time streaming for AI responses, providing token-by-token display similar to ChatGPT/Claude

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express)                │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  index.ts    │  │  Middleware  │  │   Routes     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼──────┐  │
│  │            Controllers Layer                      │  │
│  │  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │ChatController│  │AuthController│               │  │
│  │  └──────────────┘  └──────────────┘               │  │
│  └───────────────────────────────────────────────────┘  │
│         │                                               │
│  ┌──────▼─────────────────────────────────────────────┐ │
│  │            Services Layer                          │ │
│  │  ┌─────────────┐  ┌───────────────┐  ┌────────────┐│ │
│  │  │geminiService│  │databaseService│  │authService ││ │
│  │  └─────────────┘  └───────────────┘  └────────────┘│ │
│  └────────────────────────────────────────────────────┘ │
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼──────┐  │
│  │  PostgreSQL  │  Gemini API  │  MCP Server (opt)   │  │
│  └──────────────┴──────────────┴─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Core Technologies
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Relational database
- **Prisma** - ORM for database access

### Key Libraries
- **@google/generative-ai** - Google Gemini API client
- **@prisma/client** - Prisma ORM client
- **jsonwebtoken** - JWT token handling
- **bcrypt** - Password hashing
- **cors** - CORS middleware
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **dotenv** - Environment variables

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/                # Route handlers
│   │   ├── chatController.ts
│   │   └── authController.ts
│   ├── services/                   # Business logic
│   │   ├── geminiService.ts
│   │   ├── databaseService.ts
│   │   ├── authService.ts
│   │   ├── oauthService.ts         # OAuth token management
│   │   ├── mcpClient.ts
│   │   └── mcpContextService.ts
│   ├── middleware/                 # Express middleware
│   │   ├── authMiddleware.ts
│   │   ├── errorHandler.ts
│   │   └── logger.ts
│   ├── routes/                     # Route definitions
│   │   └── auth.ts
│   ├── config/                     # Configuration files
│   │   ├── mcpConfig.ts
│   │   └── oauthConfig.ts
│   ├── types/                      # TypeScript types
│   │   └── shared.ts
│   ├── utils/                      # Utility functions
│   │   ├── database.ts
│   │   ├── responseHelpers.ts      # Standardized API response helpers
│   │   └── messageRoleConverter.ts # MessageRole conversion utility
│   └── index.ts                    # Entry point
├── prisma/
│   └── schema.prisma               # Database schema
├── config/
│   ├── mcp-config.yml.example
│   └── oauth-config.yml.example
├── package.json
└── tsconfig.json
```

## 🔐 Authentication System

### Architecture

The authentication system uses JWT (JSON Web Tokens) for frontend-backend communication and optionally OAuth tokens for backend-MCP server communication.

```
Frontend ←→ Backend (JWT) ←→ MCP Server (OAuth - optional)
```

### Components

#### 1. **AuthService** (`services/authService.ts`)

Core authentication service

**Login Flow:**
1. Verify credentials (username/email + password)
2. If MCP enabled AND OAuth configured:
   - Call `OAuthService.getToken()` to get access token
   - Calculate OAuth token expiry using `OAuthService.calculateExpiry()`
3. Generate JWT with:
   - `userId`, `username`, `email`
   - `oauthToken` (if MCP + OAuth enabled)
   - `oauthTokenExpiry` (if OAuth enabled)
4. Return JWT to frontend

#### 1.1. **OAuthService** (`services/oauthService.ts`)

Dedicated service for OAuth token management

**Methods:**
- **getToken(username, password)**: Gets OAuth token from OAuth server
- **isTokenExpired(expiry)**: Checks if OAuth token is expired
- **validateTokenExpiry(expiry)**: Validates token expiry (throws if expired)
- **calculateExpiry(expiresIn)**: Calculates expiry timestamp from expires_in value

**Used by:**
- `AuthService`: For obtaining OAuth tokens during login
- `AuthMiddleware`: For validating OAuth token expiry

#### 2. **Auth Middleware** (`middleware/authMiddleware.ts`)

Protects routes by verifying JWT tokens. Uses `OAuthService` to validate OAuth token expiry.

**Applied to:**
- `POST /api/chats`
- `GET /api/chats`
- `GET /api/chats/:id`
- `PUT /api/chats/:id`
- `DELETE /api/chats/:id`
- `POST /api/chats/:id/messages`

**OAuth Token Validation:**
- If OAuth is enabled and token present in JWT payload, validates expiry using `OAuthService.isTokenExpired()`
- Returns 401 with `OAUTH_TOKEN_EXPIRED` error if token expired

#### 3. **Auth Controller** (`controllers/authController.ts`)

Handles authentication endpoints. All protected routes use the `authenticate` middleware, which ensures `req.user` is always available in controller methods.

| Endpoint             | Method | Auth Required | Description           |
|----------------------|--------|---------------|-----------------------|
| `/api/auth/register` | POST   | No            | Register new user     |
| `/api/auth/login`    | POST   | No            | User login            |
| `/api/auth/logout`   | POST   | Yes           | Logout (clears token) |
| `/api/auth/me`       | GET    | Yes           | Get current user info |

### Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Secret**: Stored in environment variable
- **Token Expiration**: Configurable (default: 1h)
- **Rate Limiting**: 1000 requests per 15 minutes per IP
- **CORS**: Configured for frontend origin only

## 💬 Chat System

### Chat Controller (`controllers/chatController.ts`)

Main controller for chat operations. All methods use `ResponseHelper` for standardized API responses.

#### **Public Methods**

##### **createChat()**
- Creates new chat in database
- Associates chat with authenticated user (via `authenticate` middleware)
- If initial message provided:
  - Processes initial message using `processInitialMessage()` helper
  - Adds user message and gets AI response
  - Adds assistant message
- Returns chat with messages

##### **getChats()**
- Retrieves all chats for authenticated user
- Returns list of chats with metadata

##### **getChat()**
- Retrieves single chat by ID
- Verifies user owns the chat (via database query)
- Returns chat with all messages

##### **sendMessage()**
- Validates message content
- Adds user message to chat
- Gets chat history
- Gets AI response using `getAIMessageResponse()` helper (supports MCP integration)
- Saves assistant response
- Returns assistant message

##### **sendMessageStream()** *(NEW - HTTP Streaming)*
- Validates message content
- Sets SSE headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`)
- Adds user message to chat
- Streams AI response chunks using `geminiService.sendMessageStream()`
- Sends events: `chunk` (partial content), `done` (complete message), `error`
- Saves complete assistant response to database after streaming completes

##### **sendAnonymousMessageStream()** *(NEW - HTTP Streaming)*
- Same as `sendMessageStream()` but for anonymous (unauthenticated) users
- Stores chat in memory instead of database

##### **updateChat()**
- Updates chat title
- Verifies user ownership

##### **deleteChat()**
- Deletes chat and all messages (cascade)
- Verifies user ownership

#### **Private Helper Methods**

- **handleModelSwitch(model?: string)**: Handles model switching with validation
- **processInitialMessage(chatId, initialMessage, model?)**: Processes initial message in new chat
- **getAIMessageResponse(content, chatHistory, oauthToken?)**: Gets AI response with optional MCP integration
- **handleLLMError(res, error, chatId?, isInitialMessage?)**: Handles LLM errors with standardized error responses

## 🤖 Gemini Integration

### Gemini Service (`services/geminiService.ts`)

Manages Google Gemini API integration

**Features:**
- Model switching support
- Retry logic with exponential backoff
- Fallback responses on errors
- **HTTP Streaming support** - Real-time token-by-token responses using Server-Sent Events (SSE)

**Key Methods:**
- `sendMessage(messages)` - Standard request/response (waits for complete response)
- `sendMessageStream(messages)` - **Async generator** that yields text chunks as they arrive from Gemini
- `sendMessageWithFallback(messages)` - Standard method with retry logic
- `switchModel(modelName)` - Switch between available Gemini models
- `testConnection()` - Test API connectivity

## 🗄️ Database

### Database Service (`services/databaseService.ts`)

Prisma-based database operations. Uses `MessageRoleConverter` utility for converting between Prisma and shared MessageRole enums.

### Database Schema

See [Database Schema](./database-schema.md) for detailed schema documentation.

**Key Models:**
- **User**: Users table with authentication info
- **Chat**: Chats table linked to users
- **Message**: Messages table linked to chats
- **LLMProvider**: LLM provider configuration (future)

### MessageRole Converter (`utils/messageRoleConverter.ts`)

Utility for converting between Prisma `MessageRole` enum and shared `MessageRole` enum:

- **toPrisma(role)**: Converts shared MessageRole to Prisma MessageRole
- **toShared(role)**: Converts Prisma MessageRole to shared MessageRole

Used by `DatabaseService` to handle role conversions when reading/writing messages to the database.

## 🔌 MCP Integration

### MCP Client (`services/mcpClient.ts`)

JSON-RPC 2.0 client for MCP server communication. Uses a centralized `makeJsonRpcRequest()` method to eliminate code duplication.

**Key Methods:**
- **callTool(toolName, args)**: Calls a specific MCP tool
- **getAvailableTools()**: Gets all available tools from MCP server
- **initialize()**: Initializes MCP server connection
- **healthCheck()**: Checks MCP server health
- **getServerInfo()**: Gets MCP server information

**Internal Methods:**
- **makeJsonRpcRequest(method, params)**: Private method that handles common JSON-RPC request logic (request construction, headers, timeout, OAuth token, error handling)

### MCP Context Service (`services/mcpContextService.ts`)

Manages MCP context for LLM

**Configuration:**
- MCP is enabled if `backend/config/mcp-config.yml` exists
- Configuration loaded from YAML file
- OAuth token (if configured) passed to MCP client

For detailed MCP documentation, see [MCP Protocol Integration](../integrations/mcp-protocol.md).

## 🛡️ Middleware

### Security Middleware

1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **Rate Limiting**: 1000 requests per 15 minutes per IP
4. **Authentication**: JWT verification (see above)

### Error Handling

#### **Response Helper** (`utils/responseHelpers.ts`)

Standardized API response utility used across all controllers:

- **success()**: Send successful responses (200, 201, etc.)
- **error()**: Send error responses with custom status codes
- **unauthorized()**: Send 401 Unauthorized responses
- **notFound()**: Send 404 Not Found responses
- **badRequest()**: Send 400 Bad Request responses
- **serviceUnavailable()**: Send 503 Service Unavailable responses (for LLM/MCP errors)
- **validationError()**: Send 400 validation error responses
- **internalError()**: Send 500 Internal Server Error responses

All responses follow the standard `ApiResponse<T>` format with consistent error codes and messages.

#### **Error Handler** (`middleware/errorHandler.ts`):
- Centralized error handling for unhandled errors
- Structured error responses
- Logging for debugging

### Logger

**Logger** (`middleware/logger.ts`):
- Request logging
- Error logging
- Performance metrics

## 🚀 API Endpoints

### Authentication Endpoints

| Endpoint             | Method | Auth | Description       |
|----------------------|--------|------|-------------------|
| `/api/auth/register` | POST   | No   | Register new user |
| `/api/auth/login`    | POST   | No   | User login        |
| `/api/auth/logout`   | POST   | Yes  | Logout            |
| `/api/auth/me`       | GET    | Yes  | Get current user  |

### Chat Endpoints

| Endpoint                         | Method | Auth | Description                    |
|----------------------------------|--------|------|--------------------------------|
| `/api/chats`                     | POST   | Yes  | Create new chat                |
| `/api/chats`                     | GET    | Yes  | Get all user's chats           |
| `/api/chats/:id`                 | GET    | Yes  | Get chat by ID                 |
| `/api/chats/:id`                 | PUT    | Yes  | Update chat                    |
| `/api/chats/:id`                 | DELETE | Yes  | Delete chat                    |
| `/api/chats/:id/messages`        | POST   | Yes  | Send message (REST)            |
| `/api/chats/:id/messages/stream` | POST   | Yes  | Send message (SSE streaming)   |

### Anonymous Chat Endpoints

| Endpoint                                   | Method | Auth | Description                          |
|--------------------------------------------|--------|------|--------------------------------------|
| `/api/anonymous/chats`                     | POST   | No   | Create anonymous chat                |
| `/api/anonymous/chats/:id/messages`        | POST   | No   | Send message to anonymous chat (REST)|
| `/api/anonymous/chats/:id/messages/stream` | POST   | No   | Send message (SSE streaming)         |

### Health Check

| Endpoint      | Method | Auth | Description  |
|---------------|--------|------|--------------|
| `/api/health` | GET    | No   | Health check |

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration checking
- User ownership verification for resources
- **Middleware Protection**: All protected routes use `authenticate` middleware
- **No Redundant Checks**: Controller methods don't check `req.user` as it's guaranteed by middleware

### Input Validation
- Request body validation
- Parameter sanitization
- SQL injection prevention (Prisma)

### Rate Limiting
- 1000 requests per 15 minutes per IP
- Prevents abuse and DDoS

### Security Headers
- Helmet.js for security headers
- CORS configuration
- XSS protection

## 📊 Error Handling

### Error Types

- **401 Unauthorized**: Invalid or expired token
- **403 Forbidden**: User doesn't own resource
- **404 Not Found**: Resource not found
- **400 Bad Request**: Invalid input
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: External service unavailable (e.g., Gemini API)

### Error Response Format

All error responses follow the standard format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "errorType": "ERROR_TYPE" // Optional, used for specific error types (e.g., "LLM_UNAVAILABLE")
}
```

**Standard Error Codes:**
- `UNAUTHORIZED` (401): Authentication required
- `NOT_FOUND` (404): Resource not found
- `BAD_REQUEST` (400): Invalid request
- `VALIDATION_ERROR` (400): Validation failed
- `SERVICE_UNAVAILABLE` (503): External service unavailable (LLM, MCP)
- `INTERNAL_ERROR` (500): Internal server error

**Response Helper Usage:**

All controllers use `ResponseHelper` for consistent error handling:

```typescript
// Success response
return ResponseHelper.success(res, data, 201);

// Error responses
return ResponseHelper.unauthorized(res, 'Authentication required');
return ResponseHelper.notFound(res, 'Chat not found');
return ResponseHelper.badRequest(res, 'Invalid input', 'VALIDATION_ERROR');
return ResponseHelper.serviceUnavailable(res, 'LLM unavailable', 'LLM_UNAVAILABLE', 60, chatId);
```

**LLM Error Handling:**

The `ChatController` uses a centralized `handleLLMError()` method to handle LLM service errors consistently:

- Standardized error messages for initial messages vs. subsequent messages
- Automatic retry suggestions (60 seconds for sendMessage)
- Includes chatId in error response when chat was created but LLM failed
- Uses `ResponseHelper.serviceUnavailable()` for consistent error format

## 🧪 Testing

See [Backend Testing Documentation](../development/testing/backend-testing.md) for details.

## 📚 Related Documentation

- [Authentication System](../features/authentication.md) - Complete authentication documentation
- [MCP Protocol Integration](../integrations/mcp-protocol.md) - MCP integration details
- [Database Schema](./database-schema.md) - Database structure
- [Error Handling](../features/error-handling-v2.md) - Error handling implementation

