require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { chatCache, jobCache } = require('./utils/cache');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const {
  initializeSentry,
  getSentryRequestHandler,
  getSentryTracingHandler,
  getSentryErrorHandler
} = require('./config/sentry');
const { sanitizeMongoQueries, sanitizeXSS } = require('./middleware/security');

// Initialize express app
const app = express();

// Initialize Sentry FIRST (before any other middleware)
initializeSentry(app);

// Trust proxy - Required for Render.com, Railway, Heroku, etc.
// This allows express-rate-limit to correctly identify users behind proxies
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

// Connect to MongoDB (Production + Local Chat)
connectDB();

// Initialize Redis cache (non-blocking)
connectRedis()
  .then(() => {
    // Initialize cache services
    chatCache.initialize();
    jobCache.initialize();
    console.log('✅ Redis cache initialized for chat and jobs');
  })
  .catch(err => {
    console.warn('⚠️  Redis cache disabled:', err.message);
    console.log('   Application will continue without caching');
  });

// Sentry request handler - MUST be first middleware
app.use(getSentryRequestHandler());

// Sentry tracing handler - MUST be after request handler
app.use(getSentryTracingHandler());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow Chrome extensions
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }

    // Allow configured origins
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
    if (allowedOrigins.some(allowed => origin.includes(allowed.trim()))) {
      return callback(null, true);
    }

    // Development mode - allow localhost
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased for development
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' })); // Increased for base64 file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Sanitize user input to prevent NoSQL injection and XSS
app.use(sanitizeMongoQueries);
app.use(sanitizeXSS);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Job Tracker API',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Sentry error handler - MUST be before custom error handlers
app.use(getSentryErrorHandler());

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   🚀 Job Tracker API Server                                    ║
║                                                                ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║   Port: ${PORT}                                                    ║
║   API: http://localhost:${PORT}/api                                ║
║   Health: http://localhost:${PORT}/api/health                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Initialize Socket.io for real-time chat (OPTIONAL FEATURE)
const { initializeSocketServer } = require('./socket/socketServer');
const { registerChatHandlers } = require('./socket/chatHandlers');
const { registerGroupHandlers } = require('./socket/groupHandlers');
const { setSocketIO } = require('./socket/socketHelper');

const io = initializeSocketServer(server);
registerChatHandlers(io);
registerGroupHandlers(io);

// Make io accessible to controllers
setSocketIO(io);
app.set('io', io);

console.log('✅ Socket.io initialized for real-time chat');
console.log(`   WebSocket: ws://localhost:${PORT}`);

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close server
    await new Promise((resolve) => {
      server.close(resolve);
    });
    console.log('✅ HTTP server closed');

    // Close database connections
    const mongoose = require('mongoose');
    await mongoose.connection.close();
    console.log('✅ Database connections closed');

    // Close Redis connection
    await disconnectRedis();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('UnhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
