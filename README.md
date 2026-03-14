# AO Agent — Backend

Express.js backend for the AI Agent Chat application. Provides REST APIs for chat and AI model integration (Gemini) with MCP protocol support.

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL)
- npm

### Installation

1. **Start PostgreSQL and pgAdmin with Docker**
   ```bash
   docker-compose up -d
   ```
   - Database: `localhost:5432`
   - pgAdmin UI: `localhost:5050`

2. **Backend setup**
   ```bash
   cd backend
   npm install

   # Copy environment file
   cp env.example .env
   # Edit .env with your database and API keys

   # Database schema is applied automatically when the PostgreSQL container
   # is created (init.sql in docker-entrypoint-initdb.d). No extra setup needed.
   ```

3. **Run the server**
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3001

## Configuration

### Environment Variables

Create `.env` file in `backend/` directory:

```env
# Database (Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_agent_chat"

# Server
PORT=3001
NODE_ENV=development

# Gemini API
GEMINI_API_KEY="your_gemini_api_key"

# CORS — set to your frontend origin
FRONTEND_URL="http://localhost:5173"
```

### MCP Server Configuration

MCP (Model Context Protocol) server is configured via YAML file:

1. **Copy the example configuration:**
   ```bash
   cd backend
   cp config/mcp-config.yml.example config/mcp-config.yml
   ```

2. **Edit `backend/config/mcp-config.yml`** with your MCP server settings:
   ```yaml
   base_url: 'http://localhost:8080'
   timeout: 10000
   retry_attempts: 3
   system_prompt: |
     Your custom system prompt here...
   tool_call_format: 'TOOL_CALL:toolName:{"param1":"value1"}'
   ```

3. **MCP is automatically enabled** if `mcp-config.yml` exists, otherwise it's disabled.

### Docker Commands

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs postgres
docker-compose logs pgadmin

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

### Tech Stack

- Node.js + Express.js + TypeScript
- PostgreSQL (schema via init.sql at container first start)
- Gemini API integration
- Docker + Docker Compose

## Documentation

- [Documentation Overview](./docs/README.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Technical Specifications](./SPECS.md)

## Related

- **Frontend**: [ao-chat](https://github.com/orsinialberto/ao-chat) — React chat UI (can be used independently)
