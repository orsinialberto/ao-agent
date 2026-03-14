/**
 * MCP client service: connect to an MCP server, list tools, and execute them.
 * Supports stdio (local process) and Streamable HTTP transports.
 * Uses dynamic import for MCP SDK to avoid ESM resolution issues in CJS build.
 */

import type { MCPTool } from '../utils/mcpToGeminiTools';

const CLIENT_NAME = 'ao-agent';
const CLIENT_VERSION = '1.0.0';

export type MCPTransportType = 'stdio' | 'http';

export interface MCPClientConfig {
  enabled: boolean;
  transport: MCPTransportType;
  serverUrl?: string;
  command?: string;
  args?: string[];
}

interface MCPClientLike {
  connect(transport: unknown): Promise<void>;
  listTools(params?: unknown): Promise<{ tools?: MCPToolRaw[] }>;
  callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<{ content?: Array<{ type: string; text?: string }> }>;
}

interface MCPToolRaw {
  name: string;
  description?: string;
  inputSchema?: { type: string; properties?: Record<string, object>; required?: string[] };
}

let client: MCPClientLike | null = null;
let transport: { close(): Promise<void> } | null = null;
let toolsCache: MCPTool[] | null = null;

function isMCPEnabled(): boolean {
  const val = process.env.MCP_ENABLED;
  return val === 'true' || val === '1';
}

function getConfig(): MCPClientConfig | null {
  if (!isMCPEnabled()) return null;
  const serverUrl = process.env.MCP_SERVER_URL;
  const command = process.env.MCP_COMMAND;
  const argsStr = process.env.MCP_ARGS;

  if (serverUrl) {
    try {
      new URL(serverUrl);
    } catch {
      console.warn('MCP: invalid MCP_SERVER_URL, skipping MCP');
      return null;
    }
    return { enabled: true, transport: 'http', serverUrl };
  }
  if (command) {
    const args = argsStr ? argsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return { enabled: true, transport: 'stdio', command, args };
  }
  return null;
}

/**
 * Connect to the MCP server based on env config.
 */
export async function connect(): Promise<void> {
  if (client) return;
  const config = getConfig();
  if (!config) return;

  const [{ Client }, { StdioClientTransport }, { StreamableHTTPClientTransport }] = await Promise.all([
    import('@modelcontextprotocol/sdk/client'),
    import('@modelcontextprotocol/sdk/client/stdio'),
    import('@modelcontextprotocol/sdk/client/streamableHttp'),
  ]);

  const mcpClient = new Client(
    { name: CLIENT_NAME, version: CLIENT_VERSION },
    { capabilities: {} }
  ) as MCPClientLike;

  if (config.transport === 'http' && config.serverUrl) {
    transport = new StreamableHTTPClientTransport(new URL(config.serverUrl)) as { close(): Promise<void> };
  } else if (config.transport === 'stdio' && config.command) {
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
    }) as { close(): Promise<void> };
  } else {
    console.warn('MCP: missing transport config');
    return;
  }

  await mcpClient.connect(transport);
  client = mcpClient;
  toolsCache = null;
  console.log('MCP: connected');
}

export async function disconnect(): Promise<void> {
  if (transport) {
    try {
      await transport.close();
    } catch (e) {
      console.warn('MCP: error closing transport', e);
    }
    transport = null;
  }
  client = null;
  toolsCache = null;
  console.log('MCP: disconnected');
}

export async function listTools(): Promise<MCPTool[]> {
  if (!client) await connect();
  if (!client) return [];

  if (toolsCache) return toolsCache;

  try {
    const result = await client.listTools();
    const tools = (result?.tools ?? []).map((t: MCPToolRaw) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema && t.inputSchema.type === 'object'
        ? { type: 'object' as const, properties: t.inputSchema.properties, required: t.inputSchema.required }
        : { type: 'object' as const, properties: {}, required: [] as string[] },
    }));
    toolsCache = tools;
    return tools;
  } catch (e) {
    console.error('MCP: listTools failed', e);
    return [];
  }
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (!client) await connect();
  if (!client) return JSON.stringify({ error: 'MCP client not connected' });

  try {
    const result = await client.callTool({ name, arguments: args });
    const content = result?.content;
    if (!content || !Array.isArray(content)) {
      return JSON.stringify(result ?? { result: 'ok' });
    }
    const parts = content
      .filter((c): c is { type: string; text?: string } => c != null && typeof c === 'object' && 'type' in c)
      .map((c) => (c.type === 'text' && c.text ? c.text : JSON.stringify(c)));
    return parts.join('\n').trim() || JSON.stringify({ result: 'ok' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('MCP: callTool failed', name, e);
    return JSON.stringify({ error: message });
  }
}

export function isConnected(): boolean {
  return client != null;
}
