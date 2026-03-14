import { Request, Response } from 'express';
import { chatController } from '../../controllers/chatController';
import { MessageRole } from '../../types/shared';

jest.mock('../../services/ollamaService', () => ({
  ollamaService: {
    sendMessageWithFallback: jest.fn().mockResolvedValue({ content: 'AI reply' }),
    sendMessageStream: jest.fn().mockImplementation(async function* () {
      yield 'Hello';
      yield ' world';
    }),
    switchModel: jest.fn(),
  },
}));

describe('ChatController (anonymous)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, end: jest.fn() });
    mockRes = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
  });

  describe('createAnonymousChat', () => {
    it('should create chat without initial message', async () => {
      mockReq = { body: { title: 'Test' } };
      await chatController.createAnonymousChat(
        mockReq as Request<{}, unknown, { title?: string }>,
        mockRes as Response
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalled();
      const payload = jsonMock.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data?.id).toMatch(/^anonymous_/);
      expect(payload.data?.title).toBe('Test');
      expect(payload.data?.messages).toEqual([]);
    });

    it('should create chat with empty body', async () => {
      mockReq = { body: {} };
      await chatController.createAnonymousChat(
        mockReq as Request<{}, unknown, object>,
        mockRes as Response
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock.mock.calls[0][0].data?.messages).toEqual([]);
    });
  });

  describe('sendAnonymousMessageStream', () => {
    it('should return error when chat not found', async () => {
      mockReq = {
        params: { chatId: 'unknown' },
        body: { chatId: 'unknown', content: 'hi', role: MessageRole.USER },
      };
      await chatController.sendAnonymousMessageStream(
        mockReq as Request<{ chatId: string }, unknown, { chatId: string; content: string; role?: MessageRole }>,
        mockRes as Response
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('Anonymous chat not found')
      );
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should return error for empty content', async () => {
      mockReq = { body: {} };
      await chatController.createAnonymousChat(
        mockReq as Request<{}, unknown, object>,
        mockRes as Response
      );
      const chatId = jsonMock.mock.calls[0][0].data?.id;
      (mockRes.write as jest.Mock).mockClear();
      (mockRes.end as jest.Mock).mockClear();
      mockReq = {
        params: { chatId },
        body: { chatId, content: '', role: MessageRole.USER },
      };
      await chatController.sendAnonymousMessageStream(
        mockReq as Request<{ chatId: string }, unknown, { chatId: string; content: string }>,
        mockRes as Response
      );
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('Message content is required')
      );
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
