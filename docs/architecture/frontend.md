# Frontend Architecture

## 📋 Overview

The frontend is a modern React application built with TypeScript, providing a responsive chat interface with AI agents. It uses React Query for state management and Tailwind CSS for styling.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   App.tsx    │  │  AuthContext │  │  React Query │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼───────┐ │
│  │            Components Layer                        │ │
│  │  ┌─────────────┐  ┌────────────┐  ┌────────────┐   │ │
│  │  │ChatInterface│  │  Sidebar   │  │  Settings  │   │ │
│  │  └─────────────┘  └────────────┘  └────────────┘   │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │ │
│  │  │ LoginPage  │  │RegisterPage│  │ Markdown   │    │ │
│  │  └────────────┘  └────────────┘  └────────────┘    │ │
│  └────────────────────────────────────────────────────┘ │
│         │                                               │
│  ┌──────▼──────────────────────────────────────────────┐│
│  │            Services Layer                           ││
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     ││
│  │  │ api.ts     │  │ authService│  │ hooks/     │     ││
│  │  └────────────┘  └────────────┘  └────────────┘     ││
│  └─────────────────────────────────────────────────────┘│
│         │                                               │
│  ┌──────▼─────────────────────────────────────────────┐ │
│  │            Backend API (Express)                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Core Technologies
- **React 18** - UI framework with hooks and functional components
- **TypeScript** - Type safety and better DX
- **Vite** - Fast build tool and dev server
- **React Router v7** - Client-side routing
- **React Query (TanStack Query)** - Server state management
- **Tailwind CSS** - Utility-first CSS framework

### Key Libraries
- **axios** - HTTP client for API calls
- **react-markdown** - Markdown rendering
- **recharts** - Chart visualization
- **jwt-decode** - JWT token decoding
- **@headlessui/react** - Accessible UI components

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/                 # React components
│   │   ├── auth/                   # Authentication components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── sidebar/                # Sidebar components
│   │   │   ├── Sidebar.tsx
│   │   │   └── ChatList.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── Settings.tsx
│   │   └── TextArea.tsx
│   ├── contexts/                   # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/                      # Custom React hooks
│   │   ├── useChat.ts
│   │   └── useTranslation.ts
│   ├── services/                   # API and business logic
│   │   ├── api.ts                  # Main API service
│   │   └── authService.ts          # Authentication utilities
│   ├── types/                      # TypeScript types
│   ├── utils/                      # Utility functions
│   ├── styles/                     # CSS files
│   │   ├── index.css
│   │   └── markdown.css
│   ├── App.tsx                     # Main app component
│   └── main.tsx                    # Entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🔐 Authentication Flow

### Authentication Components

1. **AuthContext** (`contexts/AuthContext.tsx`)
   - Global authentication state management
   - Provides `user`, `isAuthenticated`, `login()`, `register()`, `logout()`
   - Persists JWT token in localStorage
   - Periodic token expiration check (every 30 seconds)
   - Automatic logout on token expiration (JWT or OAuth)

2. **AuthService** (`services/authService.ts`)
   - Token management (set, get, remove)
   - Token expiration checking (JWT and OAuth token)
   - JWT decoding
   - OAuth token expiration checking (`isOAuthTokenExpired()`)
   - Combined expiration check (`isTokenExpired()` checks both JWT and OAuth)

3. **ProtectedRoute** (`components/auth/ProtectedRoute.tsx`)
   - Route guard component
   - Redirects to `/login` if not authenticated
   - Wraps protected routes

4. **LoginPage** (`components/auth/LoginPage.tsx`)
   - Login form with username/email and password
   - Client-side validation
   - Automatic redirect after successful login

5. **RegisterPage** (`components/auth/RegisterPage.tsx`)
   - Registration form (username, email, password, confirm password)
   - Validation rules:
     - Username: min 3 characters
     - Email: valid format
     - Password: min 6 characters
     - Password match confirmation

### Authentication Flow Diagram

```
User → LoginPage/RegisterPage
  ↓
AuthService.login() / AuthService.register()
  ↓
API Call → Backend /api/auth/login or /api/auth/register
  ↓
Backend validates → Returns JWT token
  ↓
Frontend saves token to localStorage
  ↓
AuthContext updates state
  ↓
Redirect to / (MainApp)
  ↓
ProtectedRoute checks authentication
  ↓
Renders MainApp
```

### Token Management

- **Storage**: JWT token stored in `localStorage`
  - JWT payload includes `oauthToken` and `oauthTokenExpiry` (if OAuth is enabled)
- **Expiration Check**: 
  - **Preventive Check**: Before each API request, token expiration is verified (both JWT and OAuth token)
  - **Periodic Check**: Every 30 seconds, `AuthContext` checks token expiration even when user is not making requests
- **OAuth Token Expiration**:
  - `authService.isOAuthTokenExpired()` checks `oauthTokenExpiry` from JWT payload
  - `authService.isTokenExpired()` checks both JWT `exp` and OAuth `oauthTokenExpiry`
  - If OAuth token expired: redirect to `/login?error=oauth_expired`
  - If JWT expired: redirect to `/login`
- **Auto-logout**: If token expired or invalid (JWT or OAuth), user is automatically logged out and redirected to `/login` with appropriate error parameter
- **Header Injection**: Token is automatically added to `Authorization: Bearer <token>` header for all API requests

## 🎨 Component Architecture

### Main Components

#### 1. **App.tsx**
- Root component with routing
- Sets up `AuthProvider` and `QueryClientProvider`
- Defines routes:
  - `/login` - Public route
  - `/register` - Public route
  - `/` - Protected route (MainApp)
  - `/settings` - Protected route

#### 2. **MainApp** (within App.tsx)
- Main application container
- Manages sidebar state and current chat selection
- Contains `Sidebar` and main content area

#### 3. **ChatInterface** (`components/ChatInterface.tsx`)
- Main chat interface component
- Features:
  - Message display with markdown rendering
  - **Real-time streaming display** - AI responses appear token-by-token
  - "AI is thinking..." indicator before streaming starts
  - **Smooth auto-scroll** during streaming
  - Input area with auto-resize
  - Model selection dropdown (Gemini models)
  - Loading states (`isLoading`, `isStreaming`)
  - Error handling
  - Copy and download message functionality

#### 4. **Sidebar** (`components/sidebar/Sidebar.tsx`)
- Chat navigation sidebar
- Features:
  - List of all user's chats
  - New chat button
  - Chat selection
  - Responsive design (collapsible on mobile)
  - Logout button

#### 5. **MarkdownRenderer** (`components/MarkdownRenderer.tsx`)
- Renders markdown content with syntax highlighting
- Supports:
  - Code blocks with syntax highlighting
  - Tables (GFM)
  - Links and images
  - Sanitized HTML for security

#### 6. **Settings** (`components/Settings.tsx`)
- User settings page
- (Future: User preferences, model settings, etc.)

## 🔄 State Management

### React Query (TanStack Query)

Used for server state management:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Benefits:**
- Automatic caching
- Background refetching
- Error retry logic
- Loading states

### Custom Hooks

#### **useChat** (`hooks/useChat.ts`)
- Manages chat-related state and operations
- **Supports HTTP streaming** for real-time AI responses
- Provides:
  - `currentChat` - Current chat object
  - `messages` - Messages array
  - `isLoading` - Loading state (true while waiting for response)
  - `isStreaming` - Streaming state (true while receiving chunks)
  - `error` - Error state
  - `createChat()` - Create new chat
  - `loadChat()` - Load existing chat
  - `sendMessage()` - Send message with streaming support
  - `clearError()` - Clear error state
  - `resetChat()` - Reset chat state

**Streaming Flow:**
1. User sends message → `isLoading=true`, `isStreaming=false`
2. First chunk arrives → `isStreaming=true`, message content updates incrementally
3. Streaming completes → `isLoading=false`, `isStreaming=false`

#### **useTranslation** (`hooks/useTranslation.ts`)
- Internationalization support
- Provides `t()` function for translations
- Supports multiple languages (EN, IT, ES, FR, DE)

## 🌐 API Integration

### API Service (`services/api.ts`)

Main API service that handles:
- Base URL configuration
- Request/response interceptors
- Automatic token injection
- Error handling
- Token expiration handling
- **HTTP Streaming (SSE)** for AI responses

**Key Methods:**

*Standard REST:*
- `createChat()` - Create new chat
- `getChats()` - Get all user's chats
- `getChat()` - Get chat by ID
- `sendMessage()` - Send message to chat (REST, waits for complete response)
- `register()` - User registration
- `login()` - User login
- `logout()` - User logout

*Streaming (SSE):*
- `sendMessageStream(chatId, request, onChunk, onDone, onError)` - Send message with streaming response
- `sendAnonymousMessageStream(chatId, request, onChunk, onDone, onError)` - Streaming for anonymous users

**Streaming Request Flow:**
```
Component → sendMessageStream()
  ↓
Check token expiration
  ↓
Add Authorization header
  ↓
Make HTTP request to /messages/stream endpoint
  ↓
Read response as ReadableStream
  ↓
Parse SSE events (data: {...})
  ↓
Call onChunk() for each chunk
  ↓
Call onDone() when complete
```

**SSE Event Types:**
- `chunk`: Partial AI response content
- `done`: Complete message object (saved to database)
- `error`: Error message

**Standard REST Request Flow:**
```
Component → apiService method
  ↓
Check token expiration
  ↓
Add Authorization header
  ↓
Make HTTP request (fetch)
  ↓
Handle response/error
  ↓
Return data or throw error
```

## 🎨 Styling

### Tailwind CSS
- Utility-first CSS framework
- Responsive design with breakpoints
- Custom color palette
- Dark mode support (future)

### Custom Styles
- `styles/index.css` - Global styles
- `styles/markdown.css` - Markdown-specific styles

## 🔒 Security

### Client-Side Security
- JWT token stored in localStorage (HTTPS required in production)
- Token expiration checked before requests
- Automatic logout on token expiration
- Protected routes with `ProtectedRoute` component
- XSS protection in markdown rendering (sanitization)

## 📱 Responsive Design

- **Desktop**: Full sidebar (300px fixed width)
- **Tablet**: Collapsible sidebar
- **Mobile**: Drawer overlay sidebar
- Breakpoints: `sm`, `md`, `lg`, `xl`

## 🚀 Performance Optimizations

1. **React Query Caching**: Reduces unnecessary API calls
2. **Code Splitting**: Lazy loading for routes (future)
3. **Memoization**: React.memo for expensive components
4. **Virtual Scrolling**: For long message lists (future)

## 🧪 Testing

See [Frontend Testing Documentation](../development/testing/frontend-testing.md) for details.

## 📚 Related Documentation

- [Authentication System](../features/authentication.md) - Complete authentication documentation
- [Chat System](../features/chat-system.md) - Chat functionality details
- [Error Handling](../features/error-handling-v2.md) - Error handling implementation
- [Markdown Support](../features/markdown-support.md) - Markdown rendering details

