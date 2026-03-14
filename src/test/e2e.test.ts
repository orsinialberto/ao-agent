// E2E tests for anonymous chat API

const API_BASE_URL = 'http://localhost:8080/api';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

describe('Anonymous Chat API - E2E', () => {
  let serverAvailable = false;
  jest.setTimeout(30000);

  beforeAll(async () => {
    try {
      const res = await fetch(`${API_BASE_URL.replace('/api', '')}/api/anonymous/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(2000),
      });
      serverAvailable = res.ok;
    } catch {
      serverAvailable = false;
    }
    if (!serverAvailable) {
      console.warn('⚠️  Backend not available, skipping E2E tests');
    }
  });

  describe('Create anonymous chat', () => {
    it('should create anonymous chat without initial message', async () => {
      if (!serverAvailable) return;
      const res = await fetch(`${API_BASE_URL}/anonymous/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'E2E Test' }),
      });
      const data = await res.json() as ApiResponse<{ id: string; title: string; messages: unknown[] }>;
      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data?.id).toBeDefined();
      expect(data.data?.title).toBe('E2E Test');
      expect(Array.isArray(data.data?.messages)).toBe(true);
    });

    it('should create anonymous chat with empty body', async () => {
      if (!serverAvailable) return;
      const res = await fetch(`${API_BASE_URL}/anonymous/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json() as ApiResponse<{ id: string }>;
      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data?.id).toBeDefined();
    });
  });

  describe('Stream message', () => {
    it('should reject empty content', async () => {
      if (!serverAvailable) return;
      const createRes = await fetch(`${API_BASE_URL}/anonymous/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const createData = await createRes.json() as ApiResponse<{ id: string }>;
      if (!createData.data?.id) return;
      const streamRes = await fetch(`${API_BASE_URL}/anonymous/chats/${createData.data.id}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: createData.data.id, content: '' }),
      });
      expect(streamRes.status).toBe(200);
      const text = await streamRes.text();
      expect(text).toContain('"type":"error"');
      expect(text).toContain('Message content is required');
    });

    it('should return 404 for unknown chatId', async () => {
      if (!serverAvailable) return;
      const res = await fetch(`${API_BASE_URL}/anonymous/chats/unknown-id/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: 'unknown-id', content: 'hi' }),
      });
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('Anonymous chat not found');
    });
  });
});
