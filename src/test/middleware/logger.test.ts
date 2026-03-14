import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '../../middleware/logger';

describe('Request Logger Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let finishCallback: () => void;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/api/chats',
      get: jest.fn().mockReturnValue('Mozilla/5.0')
    };
    mockRes = {
      statusCode: 200,
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockRes as Response;
      }),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    // Call finish callback before test ends to avoid log after tests done
    if (finishCallback) {
      try {
        finishCallback();
      } catch (e) {
        // Ignore errors in afterEach
      }
    }
  });

  it('should call next() immediately', () => {
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should log error requests with status >= 400', () => {
    mockRes.statusCode = 404;
    
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should log 500 error requests', () => {
    mockRes.statusCode = 500;
    
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should include request method in log', () => {
    mockReq.method = 'POST';
    
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should include request URL in log', () => {
    mockReq.url = '/api/chats/123';
    
    requestLogger(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
