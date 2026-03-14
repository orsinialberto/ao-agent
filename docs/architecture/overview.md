# System Architecture Overview

> **Repository structure**: The project is split into two independent repositories:
> - **[ao-agent](https://github.com/orsinialberto/ao-agent)** — Backend (this repo): Express.js API, PostgreSQL, Gemini, MCP
> - **[ao-chat](https://github.com/orsinialberto/ao-chat)** — Frontend: React chat UI (reusable with any compatible backend)

## 🏗️ High-Level Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│  ao-chat (Frontend)  │  HTTP   │  ao-agent (Backend)  │
│  React + TypeScript  │◄───────►│  Express + Prisma    │
│  Vite + Tailwind     │   API   │  Gemini + MCP        │
└──────────────────────┘         └──────────┬───────────┘
                                            │
                                 ┌──────────▼───────────┐
                                 │    External Services  │
                                 │  Google Gemini        │
                                 │  MCP Server           │
                                 │  PostgreSQL           │
                                 └──────────────────────┘
```

## 🔄 Data Flow

### Standard REST Flow
1. **User Input** → Frontend → API Call → Backend
2. **Message Processing** → Database (Save) → AI Service → Response
3. **AI Integration** → Gemini API → AI Response → Database (Save) → Frontend
4. **MCP Integration** → MCP Context → Tool Selection → MCP Server → External API → Response

### Streaming Flow (SSE) - For AI Responses
1. **User Input** → Frontend → POST to `/messages/stream` endpoint
2. **User Message** → Save to Database
4. **SSE Connection** → Set headers (`text/event-stream`)
5. **AI Streaming** → Gemini API Stream → Yield chunks → Send SSE events
6. **Frontend Updates** → Receive chunks → Update UI incrementally → Smooth scroll
7. **Completion** → Save complete response to Database → Send `done` event

```
Frontend                    Backend                      Gemini API
   │                           │                              │
   │──POST /messages/stream───▶│                              │
   │                           │──sendMessageStream()────────▶│
   │                           │                              │
   │◀──data: {type:"chunk"}────│◀─────────chunk 1─────────────│
   │◀──data: {type:"chunk"}────│◀─────────chunk 2─────────────│
   │◀──data: {type:"chunk"}────│◀─────────chunk N─────────────│
   │                           │                              │
   │                           │──save to DB──────────────────│
   │◀──data: {type:"done"}─────│                              │
   │                           │                              │
```

## 📖 Detailed Architecture Documentation

For detailed architecture information, see:

- **[Backend Architecture](./backend.md)** - Backend structure, services, and API endpoints
- **Frontend Architecture** — see [ao-chat docs](https://github.com/orsinialberto/ao-chat)

## 🗄️ Database Schema

- **Chats** - Chat sessions
- **Messages** - Chat messages with roles (user, assistant, system)
- **LLMProvider** - LLM provider configurations (future)

See [Database Schema](./database-schema.md) for detailed schema documentation.

---