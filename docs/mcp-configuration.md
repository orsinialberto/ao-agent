# Configuring the application to communicate with an MCP server

This document describes how to configure the AO Agent application so that the backend communicates with an **MCP (Model Context Protocol)** server. Configuration is optional: if not enabled, the backend runs in LLM-only chat mode (e.g. Gemini) with no MCP tools.

---

## Overview

- **MCP** lets the backend use tools exposed by an external server (file system, database, APIs, etc.).
- Configuration is done via two YAML files in `backend/config/`:
  - **mcp-config.yml** — required to enable MCP (server URL, timeout, system prompt, tool call format).
  - **oauth-config.yml** — optional, only if the MCP server requires OAuth authentication.

If `mcp-config.yml` is missing or invalid, MCP integration remains disabled.

---

## 1. MCP server configuration (`mcp-config.yml`)

### Creating the file

Start from the example file and copy it to `mcp-config.yml` (the actual file is in `.gitignore` and is not committed):

```bash
cd backend/config
cp mcp-config.yml.example mcp-config.yml
```

Then edit `mcp-config.yml` for your environment.

### Supported parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `base_url` | MCP server base URL (no trailing slash) | `http://localhost:8080` |
| `timeout` | Request timeout in milliseconds | `10000` |
| `retry_attempts` | Number of retries on failure | `3` |
| `system_prompt` | System prompt for the agent using MCP tools | Multi-line text (see below) |
| `tool_call_format` | Expected format for tool calls (tool name + JSON parameters) | `TOOL_CALL:toolName:{"param":"value"}` |

### Example `mcp-config.yml`

```yaml
# Server settings
base_url: 'http://localhost:8080'
timeout: 10000
retry_attempts: 3

# System prompt for the MCP agent
system_prompt: |
  You are an AI assistant with access to MCP (Model Context Protocol) tools.
  When users ask questions that can be answered using available tools, use them.
  Always provide helpful and clear explanations based on the tool results.

# Tool call format
tool_call_format: 'TOOL_CALL:toolName:{"param1":"value1","param2":"value2"}'
```

- **base_url**: must point to your actual MCP server (local or remote).
- **system_prompt**: defines how the assistant behaves when using MCP tools; you can customize it for your use case.
- **tool_call_format**: describes how the backend formats tool calls to the MCP server (tool name + JSON payload).

---

## 2. OAuth configuration (optional)

If the MCP server requires OAuth authentication (e.g. client credentials), use the `oauth-config.yml` file.

### Creating the file

```bash
cd backend/config
cp oauth-config.yml.example oauth-config.yml
```

### Main parameters

| Parameter | Description |
|-----------|-------------|
| `oauth.mock_server_url` | OAuth server (or mock) base URL |
| `oauth.token_endpoint` | Path to obtain the token (e.g. `/oauth/token`) |
| `oauth.timeout` | Timeout in ms for OAuth requests |
| `oauth.client_id` / `oauth.client_secret` | OAuth 2.0 client credentials, if required |

### Example `oauth-config.yml`

```yaml
oauth:
  mock_server_url: 'http://localhost:9000'
  token_endpoint: '/oauth/token'
  timeout: 5000
  # client_id: 'ai-agent-chat'
  # client_secret: 'your_secret_here'
```

This configuration is **optional** and should only be used when the MCP server requires an OAuth token for requests.

---

## 3. Summary and activation order

1. **LLM chat only (no MCP)**  
   Do not create `mcp-config.yml` (or remove it). The backend will not attempt to connect to any MCP server.

2. **MCP without authentication**  
   Create and fill in only `backend/config/mcp-config.yml` from `mcp-config.yml.example`. Set `base_url` (and other parameters) according to your MCP server.

3. **MCP with OAuth authentication**  
   In addition to `mcp-config.yml`, create and fill in `backend/config/oauth-config.yml` from `oauth-config.yml.example` and add your OAuth server credentials and endpoints.

---

## 4. Security and environment

- **Do not commit** files containing secrets: `mcp-config.yml` and `oauth-config.yml` are already listed in `.gitignore`. Only the `.example` files should be in the repository.
- In production use **HTTPS** for `base_url` and the OAuth URL, and manage **client_id** and **client_secret** via environment variables or a secret manager rather than storing them in plain text in the file when possible.
- Ensure **network** (firewall, DNS) allows the backend to reach the MCP server host and port (and the OAuth server if used).

---

## References

- **Example configs**: `backend/config/mcp-config.yml.example`, `backend/config/oauth-config.yml.example`
- **Model Context Protocol**: [MCP specification / documentation](https://modelcontextprotocol.io/) for protocol details and compatible servers
