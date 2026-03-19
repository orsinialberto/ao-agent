/**
 * Ambient declarations for MCP SDK dynamic imports (ESM subpaths).
 * Avoids TS resolution errors when using moduleResolution: "node".
 */
declare module '@modelcontextprotocol/sdk/client' {
  export class Client {
    constructor(info: { name: string; version: string }, options?: { capabilities?: object });
    connect(transport: unknown): Promise<void>;
    listTools(params?: unknown): Promise<{ tools?: Array<{ name: string; description?: string; inputSchema?: object }> }>;
    callTool(params: { name: string; arguments?: Record<string, unknown> }): Promise<{ content?: Array<{ type: string; text?: string }> }>;
    listPrompts(params?: unknown): Promise<{
      prompts?: Array<{
        name: string;
        description?: string;
        arguments?: Array<{ name: string; description?: string; required?: boolean }>;
      }>;
    }>;
    getPrompt(params: { name: string; arguments?: Record<string, string> }): Promise<{
      description?: string;
      messages?: Array<{
        role: 'user' | 'assistant';
        content: { type: string; text?: string } | Array<{ type: string; text?: string }>;
      }>;
    }>;
  }
}

declare module '@modelcontextprotocol/sdk/client/stdio' {
  export class StdioClientTransport {
    constructor(server: { command: string; args?: string[]; env?: Record<string, string> });
  }
}

declare module '@modelcontextprotocol/sdk/client/streamableHttp' {
  export class StreamableHTTPClientTransport {
    constructor(url: URL, opts?: object);
  }
}
