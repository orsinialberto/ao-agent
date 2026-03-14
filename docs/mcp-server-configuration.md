# MCP Server Configuration

This guide explains how to configure ao-agent to connect to an MCP (Model Context Protocol) server so the agent loop can use external tools.

## Overview

When MCP is enabled, ao-agent connects to an MCP server to discover and invoke tools. The model (Ollama) decides when to call tools; ao-agent executes them via the MCP client and feeds the results back into the conversation.

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MCP_ENABLED` | Yes (to use MCP) | Enable MCP and the agent loop | `true` |
| `MCP_SERVER_URL` | For HTTP | MCP server URL (Streamable HTTP transport) | `http://localhost:3000/mcp` |
| `MCP_COMMAND` | For stdio | Command to run the MCP server (stdio transport) | `npx` |
| `MCP_ARGS` | For stdio | Comma-separated arguments for the command | `-y,@modelcontextprotocol/server-filesystem` |
| `AGENT_MAX_ITERATIONS` | No | Max tool-call rounds per turn (default: 10) | `10` |

You must use **either** HTTP or stdio:

- **HTTP** — Set `MCP_SERVER_URL`. The server must be running and reachable.
- **Stdio** — Set `MCP_COMMAND` (and optionally `MCP_ARGS`). ao-agent will spawn the process and communicate over stdin/stdout.

## Option 1: HTTP Transport (Remote MCP Server)

Use this when the MCP server runs as a separate process or service.

1. Start your MCP server (e.g. on port 3000).
2. Add to `.env`:

   ```
   MCP_ENABLED=true
   MCP_SERVER_URL=http://localhost:3000/mcp
   ```

3. Restart ao-agent. On startup you should see: `MCP: connected`.

### Example: Streamable HTTP MCP Server

If you run an MCP server that exposes the Streamable HTTP transport, ensure it listens on the URL you set in `MCP_SERVER_URL`. The path (e.g. `/mcp`) depends on your server configuration.

## Option 2: Stdio Transport (Local Process)

Use this when the MCP server is a CLI or script that reads from stdin and writes to stdout.

1. Add to `.env`:

   ```
   MCP_ENABLED=true
   MCP_COMMAND=npx
   MCP_ARGS=-y,@modelcontextprotocol/server-filesystem
   ```

   This runs: `npx -y @modelcontextprotocol/server-filesystem`, which starts the MCP filesystem server.

2. Restart ao-agent. On startup you should see: `MCP: connected`.

### Popular MCP Servers (Stdio)

| Server | Command | Notes |
|--------|---------|-------|
| [@modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) | `npx -y @modelcontextprotocol/server-filesystem` | File system access. May need `--allow-read` / `--allow-write` and paths. |
| [@modelcontextprotocol/server-github](https://github.com/modelcontextprotocol/servers/tree/main/src/github) | `npx -y @modelcontextprotocol/server-github` | GitHub API. Requires `GITHUB_PERSONAL_ACCESS_TOKEN`. |

### Custom Command with Arguments

You can pass multiple arguments. Use comma-separated values in `MCP_ARGS`:

```
MCP_COMMAND=npx
MCP_ARGS=-y,@modelcontextprotocol/server-filesystem,--allow-read,/home/user/docs
```

This results in: `npx -y @modelcontextprotocol/server-filesystem --allow-read /home/user/docs`.

## Verifying the Connection

1. Ensure `MCP_ENABLED` is `true` or `1`.
2. Ensure either `MCP_SERVER_URL` or `MCP_COMMAND` is set.
3. Start ao-agent. Check the console for:
   - `MCP: connected` — Success.
   - `MCP: failed to connect on startup` — Connection failed; check logs and server configuration.
4. Send a chat message that should trigger tool use (e.g. “List files in the current directory” with the filesystem server). If tools are discovered and called, the agent loop is working.

## Troubleshooting

### MCP does not connect

- **HTTP**: Verify the server is running and `MCP_SERVER_URL` is correct (including scheme and path).
- **Stdio**: Ensure the command is installed (e.g. `npx` can resolve the package). Check that the process starts (e.g. no missing env vars for the server).

### No tools available

- Some MCP servers require additional configuration (e.g. env vars, config files). Refer to the server’s documentation.
- If `listTools` returns an empty list, the server may not expose tools, or initialization may have failed.

### Agent loop stops early

- If the model returns text instead of tool calls, it may not need tools for that request.
- If you hit `AGENT_MAX_ITERATIONS`, consider increasing it, but be aware of context size and cost.

## Disabling MCP

Set `MCP_ENABLED=false` (or remove it) and restart ao-agent. The backend will behave as before: no MCP connection, no agent loop, and standard chat with Ollama only.
