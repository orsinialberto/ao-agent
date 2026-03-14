# AO Agent — Backend

Express.js backend for anonymous chat, used by [ao-chat](https://github.com/orsinialberto/ao-chat). Exposes a minimal API: create anonymous chat and stream messages (SSE). No database, no authentication.

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd backend
npm install
cp env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
```

Server runs on http://localhost:3001

## API (used by ao-chat)

- **POST /api/anonymous/chats** — Create anonymous chat (body: `{ title?, initialMessage?, model? }`).
- **POST /api/anonymous/chats/:chatId/messages/stream** — Send message and stream assistant reply via SSE (body: `{ chatId, content, role?, model? }`).

All chat data is in-memory; no persistence.

## Configuration

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3001) |
| `NODE_ENV` | `development` / `production` |
| `GEMINI_API_KEY` | **Required.** Gemini API key |
| `FRONTEND_URL` | Allowed CORS origin (e.g. http://localhost:5173) |
| `GEMINI_RETRY_ATTEMPTS` | Retry attempts for Gemini (default 3) |
| `GEMINI_RETRY_DELAY` | Delay between retries in ms (default 1000) |

## Tech Stack

- Node.js + Express.js + TypeScript
- Gemini API
- No database, no MCP

## Related

- **Frontend**: [ao-chat](https://github.com/orsinialberto/ao-chat) — React chat UI
