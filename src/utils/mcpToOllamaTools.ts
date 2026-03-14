/**
 * Converts MCP tool definitions to Ollama tool format.
 * Ollama uses OpenAI-compatible function schema (type, function, parameters).
 */

import type { MCPTool } from './mcpTools';

export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties?: Record<string, object>;
      required?: string[];
    };
  };
}

export function mcpToolsToOllamaTools(tools: MCPTool[]): OllamaTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description ?? `Tool: ${tool.name}`,
      parameters: {
        type: 'object',
        properties: tool.inputSchema.properties ?? {},
        required: Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [],
      },
    },
  }));
}
