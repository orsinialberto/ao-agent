# AI Agent Chat

A modern chat application with AI agents that supports multiple LLM providers and MCP integration.

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose (for PostgreSQL)
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd ao-agent
   ```

2. **Start PostgreSQL and pgAdmin with Docker**
   ```bash
   docker-compose up -d
   ```
   - Database: `localhost:5432`
   - pgAdmin UI: `localhost:5050`

3. **Backend setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment file
   cp env.example .env
   # Edit .env with your database and API keys
   
   # Setup database
   npx prisma generate
   npx prisma db push
   ```

4. **Frontend setup**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Running the Application**
   
   Start backend (from backend directory):
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3001

   Start frontend (from frontend directory):
   ```bash
   npm run dev
   ```
   App runs on http://localhost:5173

   Or run both with prefixed logs from the project root:
   ```bash
   ./start.sh
   ```

## Configuration

### Environment Variables

Create `.env` file in backend directory:

```env
# Database (Docker PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_agent_chat"

# Server
PORT=3001
NODE_ENV=development

# Gemini API
GEMINI_API_KEY="your_gemini_api_key"

# JWT Configuration (REQUIRED for authentication)
JWT_SECRET="your_jwt_secret_change_this_in_production"
JWT_EXPIRES_IN="1h"

# OAuth Mock Server (OPTIONAL - only if using MCP with authentication)
OAUTH_SERVER_URL="http://localhost:9000"

# CORS
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
   timeout: 10000  # milliseconds
   retry_attempts: 3
   system_prompt: |
     Your custom system prompt here...
   tool_call_format: 'TOOL_CALL:toolName:{"param1":"value1"}'
   ```

3. **MCP is automatically enabled** if `mcp-config.yml` exists, otherwise it's disabled.

For detailed MCP configuration options, see `backend/config/mcp-config.yml.example`.

#### OAuth Authentication for MCP (Optional)

If your MCP server requires OAuth authentication:

1. **Enable MockServer** in `docker-compose.yml` (uncomment the `mockserver` service)
2. **Create OAuth config:**
   ```bash
   cd backend
   cp config/oauth-config.yml.example config/oauth-config.yml
   ```
3. **Start MockServer:**
   ```bash
   docker-compose up -d mockserver
   ```

The MockServer will respond to OAuth token requests at `http://localhost:9000/oauth/token` with a mock token.

For production, replace MockServer with your actual OAuth server URL in `oauth-config.yml`.

### Docker Commands

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d

# Start PostgreSQL, pgAdmin, and MockServer (if MCP OAuth is needed)
docker-compose up -d postgres pgadmin mockserver

# Stop all services
docker-compose down

# View logs
docker-compose logs postgres
docker-compose logs pgadmin
docker-compose logs mockserver  # If using OAuth

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

## Documentation

For complete documentation, including authentication, testing, API examples, architecture details, and contributing guidelines, see:

- [Documentation Overview](./docs/README.md)
- [Architecture Overview](./docs/architecture/overview.md)
- [Architecture Diagrams](./docs/architecture/diagrams.md)
- [Development Process](./AGENTS.md)
- [Technical Specifications](./SPECS.md)
