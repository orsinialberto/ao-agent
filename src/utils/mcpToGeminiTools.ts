/**
 * Converts MCP tool definitions to Gemini FunctionDeclaration format.
 * Uses parametersJsonSchema so MCP's JSON Schema is passed through directly.
 */

import type { FunctionDeclaration } from '@google/genai';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
  };
}

/**
 * Convert a list of MCP tools to Gemini function declarations.
 * Gemini accepts JSON Schema via parametersJsonSchema.
 */
export function mcpToolsToGeminiDeclarations(tools: MCPTool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? `Tool: ${tool.name}`,
    parametersJsonSchema: {
      type: 'object',
      properties: tool.inputSchema.properties ?? {},
      required: Array.isArray(tool.inputSchema.required) ? tool.inputSchema.required : [],
    },
  }));
}
