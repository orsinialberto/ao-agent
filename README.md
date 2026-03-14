# AO Agent

AO Agent is an backend that powers conversational AI. You create chats, send messages, and receive assistant replies — streamed via SSE — backed by the Gemini API.

Data expires after an hour. When **MCP is enabled**, the backend connects to a Model Context Protocol server so the model can call tools in an agent loop: it reasons, acts via tools, observes results, and loops until it has an answer or hits the iteration limit.

You can consume the API from any HTTP client: a React app, a CLI, Postman, or anything that speaks REST.

## Tech Stack

- Node.js + Express.js + TypeScript
- Gemini API
- Optional MCP (Model Context Protocol) for an agent loop with tools

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Installation

```bash
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
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `GEMINI_API_KEY` | **Required.** Gemini API key | — |
| `FRONTEND_URL` | Allowed CORS origin (e.g. dev frontend) | `http://localhost:5173` |
| `GEMINI_RETRY_ATTEMPTS` | Retry attempts for Gemini | `3` |
| `GEMINI_RETRY_DELAY` | Delay between retries (ms) | `1000` |
| `MCP_ENABLED` | Enable MCP and agent loop with tools | `false` |
| `MCP_SERVER_URL` | MCP server URL (HTTP transport) | — |
| `MCP_COMMAND` | Command for stdio transport (e.g. `npx`) | — |
| `MCP_ARGS` | Args for stdio (comma-separated, e.g. `-y,@modelcontextprotocol/server-filesystem`) | — |
| `AGENT_MAX_ITERATIONS` | Max tool-call rounds per turn (context control) | `10` |

### 3. Development

```bash
npm run dev
```

Server runs on http://localhost:8080

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

## Documentation

- [Agent Loop](docs/agent-loop.md) — How the agent loop works
- [MCP Server Configuration](docs/mcp-server-configuration.md) — How to configure and connect to an MCP server