import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/apiResponse.js';

const app: Express = express();

// Security Headers
app.use(helmet());

// CORS Configuration
const allowedOrigins = [
  ENV.CLIENT_URL,
  process.env.APP_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (like mobile apps, server-to-server or curl)
      // or if origin is in allowed list / Vercel deployment preview domains
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in production reverse proxy
      }
    },
    credentials: true,
  })
);

// Rate Limiting (200 requests per 15 min for general API)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check (handles both /health and /api/health)
const healthHandler = (_req: Request, res: Response) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: ENV.NODE_ENV,
  }, 'Dairy Shop Inventory API is operational');
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api/v1', apiRoutes);

// 404 Handler for undefined routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API route does not exist',
    },
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = ENV.PORT;
const server = app.listen(PORT, () => {
  console.log(`🚀 Dairy Shop Backend running on port ${PORT} [${ENV.NODE_ENV}]`);
  console.log(`🔗 Health check available at http://localhost:${PORT}/health`);
  console.log(`📦 API v1 mounted at http://localhost:${PORT}/api/v1`);
});

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log('Stopping server gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;

