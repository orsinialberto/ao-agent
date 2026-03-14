import { GoogleGenerativeAI } from '@google/generative-ai';
import { Message, MessageRole } from '../types/shared';

export interface GeminiResponse {
  content: string;
  usage?: {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
  };
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private retryAttempts: number;
  private retryDelay: number;
  private readonly systemInstruction: string;

  constructor() {
    this.retryAttempts = parseInt(process.env.GEMINI_RETRY_ATTEMPTS || '3');
    this.retryDelay = parseInt(process.env.GEMINI_RETRY_DELAY || '1000');
    this.systemInstruction = this.getSystemInstruction();
  }

  /**
   * Get system instruction for the LLM
   */
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

**COMPLETE EXAMPLES:**

1. Bar Chart Example:
\`\`\`chart:bar
{
  "title": "Monthly Sales",
  "data": [
    {"month": "Jan", "sales": 1200},
    {"month": "Feb", "sales": 1900},
    {"month": "Mar", "sales": 1600}
  ],
  "xKey": "month",
  "yKey": "sales"
}
\`\`\`

2. Pie Chart Example:
\`\`\`chart:pie
{
  "title": "Market Share",
  "data": [
    {"company": "A", "share": 35},
    {"company": "B", "share": 28},
    {"company": "C", "share": 22},
    {"company": "Others", "share": 15}
  ],
  "xKey": "company",
  "yKey": "share"
}
\`\`\`

3. Line Chart Example:
\`\`\`chart:line
{
  "title": "Temperature Trend",
  "data": [
    {"day": "Mon", "temp": 18},
    {"day": "Tue", "temp": 20},
    {"day": "Wed", "temp": 19},
    {"day": "Thu", "temp": 22}
  ],
  "xKey": "day",
  "yKey": "temp"
}
\`\`\`

**CRITICAL RULES:**
1. ALWAYS use chart syntax when users ask for graphs, charts, or visualizations
2. NEVER suggest Python code, matplotlib, or external visualization tools
3. The JSON must be valid - use double quotes for all strings
4. Keep data arrays concise (5-15 data points ideal)
5. Choose the right chart type: line (trends), bar (comparisons), pie (proportions)

**WHEN TO USE CHARTS:**
- User explicitly asks for a chart/graph
- Presenting numerical comparisons
- Showing trends over time
- Displaying proportions or distributions
- Any time a visualization would make data clearer

**HOW TO CREATE MAPS:**

Use markdown code blocks with the syntax \`\`\`map followed by JSON data:

\`\`\`map
{
  "title": "Map Title",
  "center": [latitude, longitude],
  "zoom": 10,
  "markers": [
    {
      "name": "Location Name",
      "lat": latitude,
      "lng": longitude,
      "description": "Optional description"
    }
  ]
}
\`\`\`

**REQUIRED JSON FIELDS:**
- \`center\`: Array with [latitude, longitude] for map center (required)
- \`markers\`: Array of marker objects (required, at least one marker)
- \`zoom\`: Number (optional, default: 10, range: 1-18)
- \`title\`: String (optional) Map title

**MARKER OBJECT FIELDS:**
- \`name\`: String (required) - Marker label
- \`lat\`: Number (required) - Latitude (-90 to 90)
- \`lng\`: Number (required) - Longitude (-180 to 180)
- \`description\`: String (optional) - Additional info shown in popup

**COMPLETE MAP EXAMPLES:**

1. Single Location Map:
\`\`\`map
{
  "title": "Tokyo, Japan",
  "center": [35.6762, 139.6503],
  "zoom": 12,
  "markers": [
    {
      "name": "Tokyo",
      "lat": 35.6762,
      "lng": 139.6503,
      "description": "Capital of Japan"
    }
  ]
}
\`\`\`

2. Multiple Locations Map (Travel Itinerary):
\`\`\`map
{
  "title": "Japan Travel Itinerary",
  "center": [35.6762, 139.6503],
  "zoom": 6,
  "markers": [
    {
      "name": "Tokyo",
      "lat": 35.6762,
      "lng": 139.6503,
      "description": "Capital city with modern attractions"
    },
    {
      "name": "Kyoto",
      "lat": 35.0116,
      "lng": 135.7681,
      "description": "Historic city with temples"
    },
    {
      "name": "Osaka",
      "lat": 34.6937,
      "lng": 135.5023,
      "description": "Food capital of Japan"
    }
  ]
}
\`\`\`

**CRITICAL MAP RULES:**
1. ALWAYS use map syntax when users ask for maps, locations, travel routes, or geographic visualizations
2. NEVER suggest external map services or tools - maps render directly in the interface
3. The JSON must be valid - use double quotes for all strings
4. Coordinates must be valid: lat between -90 and 90, lng between -180 and 180
5. When multiple markers are provided, the map will automatically fit all markers in view
6. Use appropriate zoom levels: 1-5 (country/continent), 6-10 (region/city), 11-15 (city/neighborhood), 16-18 (street level)

**WHEN TO USE MAPS:**
- User asks to show locations on a map
- Displaying travel itineraries or routes
- Showing multiple places of interest
- Geographic data visualization
- Any request involving locations, cities, landmarks, or geographic coordinates
- When user mentions "show on map", "map of", "where is", or similar phrases

**COORDINATE LOOKUP:**
When users mention cities, landmarks, or places without coordinates, you should:
1. Use your knowledge to provide approximate coordinates (you have geographic knowledge)
2. For major cities, use well-known coordinates (e.g., Tokyo: 35.6762, 139.6503)
3. If uncertain about exact coordinates, use reasonable approximations based on the city/region
4. Always validate that coordinates are within valid ranges

Remember: Both charts and maps render directly and interactively in this interface. Users will see beautiful, interactive visualizations immediately when you use the correct syntax.`;
  }

  private initialize() {
    if (this.genAI && this.model) {
      return; // Already initialized
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
  }

  /**
   * Send a message to Gemini and get a response with retry logic
   */
  async sendMessage(messages: Message[]): Promise<GeminiResponse> {
    return await this.sendMessageWithRetry(messages, 0);
  }

  /**
   * Send a message to Gemini and stream the response
   * Uses Server-Sent Events (SSE) pattern - yields chunks as they arrive
   */
  async *sendMessageStream(messages: Message[]): AsyncGenerator<string, void, unknown> {
    // Initialize if not already done
    this.initialize();
    
    // Convert messages to Gemini format
    const history = this.convertMessagesToHistory(messages);
    
    // Prepend system instruction as first message
    const historyWithSystemInstruction = [
      {
        role: 'user',
        parts: [this.systemInstruction]
      },
      {
        role: 'model',
        parts: ['Understood! I will create interactive charts using the chart syntax you provided. Whenever users ask for visualizations, I will use the special markdown code blocks with chart:line, chart:bar, chart:pie, or chart:area followed by properly formatted JSON data. I will not suggest Python code or external tools. The charts will render directly in the interface.']
      },
      ...history
    ];
    
    // Start a chat session
    const chat = this.model.startChat({
      history: historyWithSystemInstruction,
    });

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== MessageRole.USER) {
      throw new Error('Last message must be from user');
    }

    // Send message and stream response
    const result = await chat.sendMessageStream(lastMessage.content);
    
    // Yield each chunk as it arrives
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }

  /**
   * Send message with retry logic and exponential backoff
   */
  private async sendMessageWithRetry(messages: Message[], attempt: number): Promise<GeminiResponse> {
    try {
      // Initialize if not already done
      this.initialize();
      
      // Convert messages to Gemini format
      const history = this.convertMessagesToHistory(messages);
      
      // Prepend system instruction as first message
      const historyWithSystemInstruction = [
        {
          role: 'user',
          parts: [this.systemInstruction]
        },
        {
          role: 'model',
          parts: ['Understood! I will create interactive charts using the chart syntax you provided. Whenever users ask for visualizations, I will use the special markdown code blocks with chart:line, chart:bar, chart:pie, or chart:area followed by properly formatted JSON data. I will not suggest Python code or external tools. The charts will render directly in the interface.']
        },
        ...history
      ];
      
      // Start a chat session
      const chat = this.model.startChat({
        history: historyWithSystemInstruction,
      });

      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== MessageRole.USER) {
        throw new Error('Last message must be from user');
      }

      // Send message and get response
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        usage: {
          promptTokens: 0, // Gemini doesn't provide detailed token usage in this API
          responseTokens: 0,
          totalTokens: 0,
        }
      };
    } catch (error) {
      const isRetryableError = this.isRetryableError(error);
      
      if (isRetryableError && attempt < this.retryAttempts) {
        const delay = this.calculateRetryDelay(attempt);
        console.warn(`🔄 Gemini API error (attempt ${attempt + 1}/${this.retryAttempts}): ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in ${delay}ms...`);
        
        await this.delay(delay);
        return await this.sendMessageWithRetry(messages, attempt + 1);
      }
      
      // If not retryable or max attempts reached, throw error
      console.error('❌ Gemini API error (final):', error);
      throw new Error(`Failed to get response from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    
    // Check for specific retryable error conditions
    const retryablePatterns = [
      '503 Service Unavailable',
      'The model is overloaded',
      'Rate limit exceeded',
      'Quota exceeded',
      'Internal server error',
      'Bad Gateway',
      'Gateway Timeout',
      'Service Unavailable',
      'Too Many Requests'
    ];
    
    return retryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (2^attempt) + jitter
    const exponentialDelay = this.retryDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert chat messages to Gemini history format
   */
  private convertMessagesToHistory(messages: Message[]): Array<{role: string, parts: string[]}> {
    return messages
      .filter(msg => msg.role !== MessageRole.SYSTEM) // Gemini doesn't support system messages in history
      .map(msg => ({
        role: msg.role === MessageRole.USER ? 'user' : 'model',
        parts: [msg.content]
      }));
  }

  /**
   * Send message - removed fallback, errors are now propagated to controller
   * The controller will handle errors and return appropriate HTTP status codes
   */
  async sendMessageWithFallback(messages: Message[]): Promise<GeminiResponse> {
    // Simply call sendMessage - it has retry logic built-in
    // If it fails after all retries, let the error propagate to the controller
    return await this.sendMessage(messages);
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Initialize if not already done
      this.initialize();
      
      const testMessage: Message = {
        id: 'test_message',
        chatId: 'test_chat',
        role: MessageRole.USER,
        content: 'Hello, this is a test message.',
        createdAt: new Date()
      };

      await this.sendMessage([testMessage]);
      return true;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models (for future multi-model support)
   */
  getAvailableModels(): string[] {
    return ['gemini-2.5-flash', 'gemini-2.5-pro'];
  }

  /**
   * Switch model (for future multi-model support)
   */
  switchModel(modelName: string): void {
    // Initialize if not already done
    this.initialize();
    
    // Validate model name
    const availableModels = this.getAvailableModels();
    if (!availableModels.includes(modelName)) {
      throw new Error(`Model ${modelName} is not available. Available models: ${availableModels.join(', ')}`);
    }
    
    this.model = this.genAI!.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
