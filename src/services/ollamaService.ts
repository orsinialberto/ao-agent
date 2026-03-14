import { Message, MessageRole } from '../types/shared';
import * as mcpClient from './mcpClientService';
import { mcpToolsToOllamaTools } from '../utils/mcpToOllamaTools';

const AGENT_MAX_ITERATIONS = parseInt(process.env.AGENT_MAX_ITERATIONS || '10', 10);

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

interface OllamaToolCall {
  type: 'function';
  function: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

interface OllamaChatResponse {
  message: {
    role: string;
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaService {
  private baseUrl: string;
  private currentModelName: string;
  private retryAttempts: number;
  private retryDelay: number;
  private readonly systemInstruction: string;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    this.currentModelName = process.env.OLLAMA_MODEL || 'qwen3:8b';
    this.retryAttempts = parseInt(process.env.OLLAMA_RETRY_ATTEMPTS || '3');
    this.retryDelay = parseInt(process.env.OLLAMA_RETRY_DELAY || '1000');
    this.systemInstruction = this.getSystemInstruction();
  }

  /**
   * When MCP is connected, run agent loop with Ollama and return final text; otherwise return null.
   */
  private async runAgentLoop(messages: Message[]): Promise<LLMResponse | null> {
    if (!mcpClient.isConnected()) return null;
    const mcpTools = await mcpClient.listTools();
    if (mcpTools.length === 0) return null;

    const tools = mcpToolsToOllamaTools(mcpTools);
    const chatMessages: OllamaMessage[] = [
      { role: 'system', content: this.systemInstruction },
      ...this.convertMessagesToOllama(messages),
    ];

    let iteration = 0;
    while (iteration < AGENT_MAX_ITERATIONS) {
      iteration++;
      const response = await this.chatRequest(chatMessages, tools, false);
      const msg = response.message;
      const toolCalls = msg.tool_calls ?? [];

      if (toolCalls.length > 0) {
        chatMessages.push({
          role: 'assistant',
          content: msg.content ?? '',
          tool_calls: toolCalls,
        });
        for (const tc of toolCalls) {
          const name = tc.function?.name ?? '';
          const args = (tc.function?.arguments ?? {}) as Record<string, unknown>;
          const result = await mcpClient.callTool(name, args);
          chatMessages.push({ role: 'tool', tool_name: name, content: result });
        }
        continue;
      }

      const text = msg.content ?? '';
      const evalCount = response.eval_count ?? 0;
      const promptEvalCount = response.prompt_eval_count ?? 0;
      return {
        content: text,
        usage: { promptTokens: promptEvalCount, responseTokens: evalCount, totalTokens: promptEvalCount + evalCount },
      };
    }

    const lastResponse = await this.chatRequest(chatMessages, [], false);
    return {
      content: lastResponse.message?.content ?? '',
      usage: { promptTokens: 0, responseTokens: 0, totalTokens: 0 },
    };
  }

  private getSystemInstruction(): string {
    return `You are a helpful AI assistant with the ability to display interactive data visualizations and maps directly in the chat interface.

IMPORTANT: This chat interface has built-in chart and map rendering capabilities. When users ask for charts, graphs, data visualizations, or maps, you MUST use the special syntax below. DO NOT suggest Python code, matplotlib, or external tools - the visualizations will render directly in the interface.

**HOW TO CREATE CHARTS:**

Use markdown code blocks with the syntax \`\`\`chart:TYPE followed by JSON data:

\`\`\`chart:line
{
  "title": "Chart Title",
  "data": [{"x": "Label1", "y": 100}, {"x": "Label2", "y": 200}],
  "xKey": "x",
  "yKey": "y"
}
\`\`\`

**AVAILABLE CHART TYPES:**
- \`chart:line\` - Line chart (trends over time, continuous data)
- \`chart:bar\` - Bar chart (comparisons between categories)
- \`chart:pie\` - Pie chart (proportions and percentages)
- \`chart:area\` - Area chart (cumulative data, filled trends)

**REQUIRED JSON FIELDS:**
- \`data\`: Array of objects with your data points
- \`xKey\`: Property name for x-axis (e.g., "month", "category", "name")
- \`yKey\`: Property name for y-axis (e.g., "sales", "value", "count")
- \`title\`: (optional) Chart title

**CRITICAL RULES:**
1. ALWAYS use chart syntax when users ask for graphs, charts, or visualizations
2. NEVER suggest Python code, matplotlib, or external visualization tools
3. The JSON must be valid - use double quotes for all strings
4. Keep data arrays concise (5-15 data points ideal)

**HOW TO CREATE MAPS:**

Use markdown code blocks with the syntax \`\`\`map followed by JSON data:

\`\`\`map
{
  "title": "Map Title",
  "center": [latitude, longitude],
  "zoom": 10,
  "markers": [
    { "name": "Location Name", "lat": latitude, "lng": longitude, "description": "Optional" }
  ]
}
\`\`\`

**CRITICAL MAP RULES:**
1. ALWAYS use map syntax when users ask for maps, locations, or geographic visualizations
2. NEVER suggest external map services - maps render directly in the interface
3. Coordinates: lat between -90 and 90, lng between -180 and 180

Remember: Both charts and maps render directly in this interface. Users see interactive visualizations when you use the correct syntax.`;
  }

  private async chatRequest(
    messages: OllamaMessage[],
    tools: Array<{ type: string; function: { name: string; description?: string; parameters: object } }>,
    stream: boolean
  ): Promise<OllamaChatResponse> {
    const body: Record<string, unknown> = {
      model: this.currentModelName,
      messages,
      stream: false,
      think: false,
      options: { temperature: 0.7, top_p: 0.8, top_k: 40, num_predict: 2048 },
    };
    if (tools.length > 0) body.tools = tools;

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${text || res.statusText}`);
    }
    return res.json() as Promise<OllamaChatResponse>;
  }

  private async *chatStream(messages: OllamaMessage[]): AsyncGenerator<string, void, unknown> {
    const body = {
      model: this.currentModelName,
      messages,
      stream: true,
      think: false,
      options: { temperature: 0.7, top_p: 0.8, top_k: 40, num_predict: 2048 },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama API error ${res.status}: ${text || res.statusText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Ollama streaming: no response body');

    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          if (obj.message?.content) yield obj.message.content;
        } catch {
          // skip malformed lines
        }
      }
    }
    if (buffer.trim()) {
      try {
        const obj = JSON.parse(buffer) as { message?: { content?: string } };
        if (obj.message?.content) yield obj.message.content;
      } catch {
        // skip
      }
    }
  }

  private convertMessagesToOllama(messages: Message[]): OllamaMessage[] {
    return messages
      .filter((msg) => msg.role !== MessageRole.SYSTEM)
      .map((msg) => ({
        role: msg.role === MessageRole.USER ? 'user' : 'assistant',
        content: msg.content,
      }));
  }

  async sendMessage(messages: Message[]): Promise<LLMResponse> {
    if (messages.length === 0) {
      throw new Error('At least one message is required');
    }
    return this.sendMessageWithRetry(messages, 0);
  }

  async *sendMessageStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
    const agentResult = await this.runAgentLoop(messages);
    if (agentResult) {
      if (agentResult.content) yield agentResult.content;
      return;
    }

    const chatMessages: OllamaMessage[] = [
      { role: 'system', content: this.systemInstruction },
      { role: 'user', content: 'Understood! I will create interactive charts using the chart syntax. I will use chart:line, chart:bar, chart:pie, or chart:area with JSON data. I will not suggest Python or external tools.' },
      ...this.convertMessagesToOllama(messages),
    ];

    for await (const chunk of this.chatStream(chatMessages)) {
      if (chunk) yield chunk;
    }
  }

  private async sendMessageWithRetry(messages: Message[], attempt: number): Promise<LLMResponse> {
    try {
      const agentResult = await this.runAgentLoop(messages);
      if (agentResult) return agentResult;

      const chatMessages: OllamaMessage[] = [
        { role: 'system', content: this.systemInstruction },
        { role: 'user', content: 'Understood! I will create interactive charts using the chart syntax. I will use chart:line, chart:bar, chart:pie, or chart:area with JSON data. I will not suggest Python or external tools.' },
        ...this.convertMessagesToOllama(messages),
      ];

      const response = await this.chatRequest(chatMessages, [], false);
      const content = response.message?.content ?? '';
      const evalCount = response.eval_count ?? 0;
      const promptEvalCount = response.prompt_eval_count ?? 0;
      return {
        content,
        usage: { promptTokens: promptEvalCount, responseTokens: evalCount, totalTokens: promptEvalCount + evalCount },
      };
    } catch (error) {
      const isRetryable = this.isRetryableError(error);
      if (isRetryable && attempt < this.retryAttempts) {
        const delay = this.calculateRetryDelay(attempt);
        console.warn(`🔄 Ollama API error (attempt ${attempt + 1}/${this.retryAttempts}): ${error instanceof Error ? error.message : 'Unknown'}. Retrying in ${delay}ms...`);
        await this.delay(delay);
        return this.sendMessageWithRetry(messages, attempt + 1);
      }
      console.error('❌ Ollama API error (final):', error);
      throw new Error(`Failed to get response from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (!error) return false;
    const msg = error instanceof Error ? error.message : String(error);
    return /503|overloaded|rate limit|Internal server|Bad Gateway|Gateway Timeout|Service Unavailable|Too Many Requests|ECONNREFUSED|ETIMEDOUT/i.test(msg);
  }

  private calculateRetryDelay(attempt: number): number {
    return Math.min(this.retryDelay * Math.pow(2, attempt) + Math.random() * 1000, 30000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  async sendMessageWithFallback(messages: Message[]): Promise<LLMResponse> {
    return this.sendMessage(messages);
  }

  async testConnection(): Promise<boolean> {
    try {
      const testMessage: Message = {
        id: 'test_message',
        chatId: 'test_chat',
        role: MessageRole.USER,
        content: 'Hello, this is a test.',
        createdAt: new Date(),
      };
      await this.sendMessage([testMessage]);
      return true;
    } catch (error) {
      console.error('Ollama connection test failed:', error);
      return false;
    }
  }

  getAvailableModels(): string[] {
    return ['qwen3:8b', 'qwen3:4b', 'qwen3:14b'];
  }

  switchModel(modelName: string): void {
    const available = this.getAvailableModels();
    if (!available.includes(modelName)) {
      throw new Error(`Model ${modelName} is not available. Available: ${available.join(', ')}`);
    }
    this.currentModelName = modelName;
  }
}

export const ollamaService = new OllamaService();
