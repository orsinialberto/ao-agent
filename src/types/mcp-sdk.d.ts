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
  }
}

declare module '@modelcontextprotocol/sdk/client/stdio' {
  export class StdioClientTransport {
    constructor(server: { command: string; args?: string[] });
  }
}

declare module '@modelcontextprotocol/sdk/client/streamableHttp' {
  export class StreamableHTTPClientTransport {
    constructor(url: URL, opts?: object);
  }
}
