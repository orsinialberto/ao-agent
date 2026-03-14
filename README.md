# AO Agent

Express.js backend that exposes a minimal API for anonymous chat with AI: create chats and stream assistant replies via SSE. **No database, no authentication** — all chat data is in-memory. Use it from any HTTP client (web app, CLI, Postman, etc.).

## Tech Stack

- Node.js + Express.js + TypeScript
- Gemini API
- No database, no MCP

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Installation

```bash
cd backend
npm install
```

### 2. Configuration

Copy the example environment file and adjust as needed:

```bash
cp env.example .env
```

Set `GEMINI_API_KEY` in `.env` (required).

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `GEMINI_API_KEY` | **Required.** Gemini API key | — |
| `FRONTEND_URL` | Allowed CORS origin (e.g. dev frontend) | `http://localhost:5173` |
| `GEMINI_RETRY_ATTEMPTS` | Retry attempts for Gemini | `3` |
| `GEMINI_RETRY_DELAY` | Delay between retries (ms) | `1000` |

### 3. Development

```bash
npm run dev
```

Server runs on http://localhost:3001

### Build

```bash
npm run build
npm start   # run production build
```

### Running tests

```bash
npm test           # run tests
npm run test:watch # watch mode
```

---

## API

- **POST /api/anonymous/chats** — Create anonymous chat (body: `{ title?, initialMessage?, model? }`).
- **POST /api/anonymous/chats/:chatId/messages/stream** — Send message and stream assistant reply via SSE (body: `{ content, role?, model? }`).

