/**
 * MCP tool type shared across LLM integrations.
 */

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
  };
}
