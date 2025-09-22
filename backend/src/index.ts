import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Import services
import { database } from './services/Database';
import { redis } from './services/Redis';
import { WebSocketService, webSocketService } from './services/WebSocketService';

// Import API routes
import authRoutes from './api/auth';
import roomRoutes from './api/rooms';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await database.testConnection();
    const redisHealthy = await redis.testConnection();
    const wsConnections = webSocketService?.getConnectedUsers() || 0;

    const health = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        websocket: 'up'
      },
      metrics: {
        connectedUsers: wsConnections,
        uptime: process.uptime()
      }
    };

    res.status(dbHealthy && redisHealthy ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(error.status || 500).json({
    error: 'internal_server_error',
    message: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Starting Realtime Chat Server...');

    // Test database connection
    console.log('📊 Connecting to database...');
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Test Redis connection
    console.log('🔴 Connecting to Redis...');
    await redis.connect();
    const redisConnected = await redis.testConnection();
    if (!redisConnected) {
      throw new Error('Failed to connect to Redis');
    }

    // Initialize WebSocket service
    console.log('🔌 Initializing WebSocket service...');
    const wsService = new WebSocketService(httpServer);
    // Make WebSocket service globally available
    (global as any).webSocketService = wsService;

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
      console.log(`🎯 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('📝 Available endpoints:');
      console.log('   POST /api/auth/register');
      console.log('   POST /api/auth/login');
      console.log('   GET  /api/auth/me');
      console.log('   GET  /api/rooms/public');
      console.log('   GET  /api/rooms/my');
      console.log('   POST /api/rooms');
      console.log('   GET  /api/rooms/:id');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

      httpServer.close(async () => {
        console.log('🔌 HTTP server closed');

        try {
          await database.close();
          console.log('📊 Database connection closed');

          await redis.disconnect();
          console.log('🔴 Redis connection closed');

          console.log('✅ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();