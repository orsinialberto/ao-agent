import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Pre-compute allowed origins for better performance (Set for O(1) lookup)
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  
  if (process.env.NODE_ENV !== 'production') {
    // In development, allow localhost on common ports
    origins.push(
      'http://localhost:3000', 
      'http://localhost:5173', 
      'http://127.0.0.1:3000', 
      'http://127.0.0.1:5173'
    );
  }
  
  // Add configured frontend URL
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  return origins;
};

const allowedOrigins = new Set(getAllowedOrigins());

// Optimized origin check function (faster than array.includes)
const originCheck = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return callback(null, true);
  }
  
  // Fast check using Set (O(1) lookup instead of O(n))
  if (allowedOrigins.has(origin)) {
    return callback(null, true);
  }
  
  // In development, also check if it's a localhost variant (for dynamic ports)
  if (process.env.NODE_ENV !== 'production') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      // Cache this origin for future requests
      allowedOrigins.add(origin);
      return callback(null, true);
    }
  }
  
  callback(new Error('Not allowed by CORS'));
};

// Security middleware (configure helmet to not interfere with CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
}));

// CORS configuration - MUST be before rate limiting for OPTIONS requests
// This ensures preflight requests are handled immediately
app.use(cors({
  origin: originCheck,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  // Cache preflight requests for 24 hours (86400 seconds)
  // Browser will cache the preflight response and won't send OPTIONS again for 24h
  maxAge: 86400,
  // Don't continue to other middleware for OPTIONS requests (faster response)
  preflightContinue: false,
  // Use 204 for successful OPTIONS (lighter response than 200)
  optionsSuccessStatus: 204
}));

// Explicit OPTIONS handler for fastest response (fires before rate limiter)
app.options('*', (req, res) => {
  // CORS middleware already set headers, just send immediate response
  res.sendStatus(204);
});

// Rate limiting for anonymous endpoints (more restrictive)
// Must be defined before general limiter
const anonymousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for OPTIONS requests
  skip: (req) => req.method === 'OPTIONS',
});

// General rate limiting for API routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for OPTIONS requests
  skip: (req) => req.method === 'OPTIONS',
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enable HTTP keep-alive for better connection reuse
// This helps reduce connection overhead for multiple requests
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  next();
});

// Import controller and middleware
import { chatController } from './controllers/chatController';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger);
}

// Anonymous chat endpoints (in-memory, no database)
app.post('/api/anonymous/chats', anonymousLimiter, (req, res, next) => {
  chatController.createAnonymousChat(req, res).catch(next);
});
app.post('/api/anonymous/chats/:chatId/messages/stream', anonymousLimiter, (req: Request<{ chatId: string }>, res: Response, next: NextFunction) => {
  chatController.sendAnonymousMessageStream(req, res).catch(next);
});

// Apply general rate limiting for non-anonymous routes (anonymous already has anonymousLimiter)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/anonymous')) return next();
  return limiter(req, res, next);
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/anonymous/chats`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
