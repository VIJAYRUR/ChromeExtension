const Redis = require('ioredis');

// Redis connection configuration
const redisConfig = {
  // AWS ElastiCache endpoint (from environment)
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 6379,

  // Connection options
  password: process.env.REDIS_PASSWORD || undefined, // if AUTH enabled
  db: parseInt(process.env.REDIS_DB) || 0,

  // TLS for ElastiCache in-transit encryption
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,

  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Reconnection strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`[Redis] Reconnect attempt ${times}, delay: ${delay}ms`);
    return delay;
  },

  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,

  // Keep-alive
  keepAlive: 30000,

  // Connection name for monitoring
  connectionName: `jobtracker-chat-${process.env.NODE_ENV || 'development'}`
};

// Create Redis client
let redisClient = null;
let isRedisAvailable = false;

const connectRedis = async () => {
  try {
    // Validate configuration
    if (!process.env.REDIS_HOST) {
      console.warn('⚠️  REDIS_HOST not configured. Redis caching disabled.');
      return null;
    }

    // Check if cluster mode is enabled (default: false)
    const isClusterMode = process.env.REDIS_CLUSTER_MODE === 'true';

    if (isClusterMode) {
      console.log('🔄 Connecting to Redis Cluster...');

      // Cluster mode configuration
      const clusterConfig = {
        redisOptions: {
          password: redisConfig.password,
          tls: redisConfig.tls,
          connectTimeout: redisConfig.connectTimeout,
          commandTimeout: redisConfig.commandTimeout,
          enableReadyCheck: redisConfig.enableReadyCheck
        },
        clusterRetryStrategy: redisConfig.retryStrategy,
        enableOfflineQueue: redisConfig.enableOfflineQueue,
        slotsRefreshTimeout: 10000
      };

      redisClient = new Redis.Cluster(
        [{ host: redisConfig.host, port: redisConfig.port }],
        clusterConfig
      );

      console.log('   Mode: Cluster');
    } else {
      console.log('🔄 Connecting to Redis (standalone mode)...');
      redisClient = new Redis(redisConfig);
      console.log('   Mode: Standalone');
    }

    // Connection event handlers
    redisClient.on('connect', () => {
      console.log('🔄 Redis connecting...');
    });

    redisClient.on('ready', () => {
      isRedisAvailable = true;
      console.log(`✅ Redis connected: ${redisConfig.host}:${redisConfig.port}`);
      console.log(`   Connection: ${redisConfig.connectionName}`);
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      console.error('❌ Redis connection error:', err.message);
      // Don't crash the app - graceful degradation
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
      console.log('🔴 Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    // Wait for connection
    await redisClient.ping();

    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);
    console.warn('⚠️  Application will continue without Redis caching');
    isRedisAvailable = false;
    return null;
  }
};

// Graceful shutdown
const disconnectRedis = async () => {
  if (redisClient) {
    console.log('Closing Redis connection...');
    await redisClient.quit();
    console.log('Redis connection closed');
  }
};

// Health check
const checkRedisHealth = async () => {
  if (!redisClient) return false;

  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    isRedisAvailable = false;
    return false;
  }
};

module.exports = {
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
  getRedisClient: () => redisClient,
  isRedisAvailable: () => isRedisAvailable
};
