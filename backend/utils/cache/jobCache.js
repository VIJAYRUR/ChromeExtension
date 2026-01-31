const { getRedisClient, isRedisAvailable } = require('../../config/redis');
const CacheWrapper = require('./cacheWrapper');
const Logger = require('../logger');
const Job = require('../../models/Job');

class JobCacheService {
  constructor() {
    this.logger = new Logger('JobCache', process.env.LOG_LEVEL || 'INFO');
    this.wrapper = null;
    this.redis = null;
    this.ttl = parseInt(process.env.REDIS_JOB_CACHE_TTL) || 300; // 5 minutes default
    this.cachePrefix = 'jobtracker:jobs';
  }

  // Initialize cache service with Redis client
  initialize() {
    this.redis = getRedisClient();
    if (this.redis) {
      this.wrapper = new CacheWrapper(this.redis);
      this.logger.info('Job cache service initialized');
    } else {
      this.logger.warn('Redis not available, job cache service disabled');
    }
  }

  // Helper to check if Redis is ready
  isReady() {
    return isRedisAvailable() && this.redis !== null;
  }

  // ==================== CACHE KEY GENERATION ====================

  /**
   * Generate cache key based on userId and filters
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @returns {string} Cache key
   */
  getCacheKey(userId, filters = {}) {
    const {
      status = 'all',
      workType = 'all',
      search = '',
      tags = '',
      priority = 'all',
      dateFrom = '',
      dateTo = '',
      page = 1,
      limit = 50,
      sortBy = 'dateApplied',
      sortOrder = 'desc',
      archived = 'false'
    } = filters;

    // Create deterministic filter string
    // Sort keys alphabetically and normalize values to ensure consistent hashing
    const normalizedFilters = {
      archived: archived || 'false',
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      limit: parseInt(limit) || 50,
      page: parseInt(page) || 1,
      priority: priority || null,
      search: search || null,
      sortBy: sortBy || 'dateApplied',
      sortOrder: sortOrder || 'desc',
      status: status || null,
      tags: tags || null,
      workType: workType || null
    };

    const filterStr = JSON.stringify(normalizedFilters);

    // Create hash of filter string for shorter keys
    const crypto = require('crypto');
    const filterHash = crypto.createHash('md5').update(filterStr).digest('hex').substring(0, 16);

    return `${this.cachePrefix}:user:${userId}:query:${filterHash}`;
  }

  /**
   * Get pattern for user's cache keys (for invalidation)
   * @param {string} userId - User ID
   * @returns {string} Cache key pattern
   */
  getUserCachePattern(userId) {
    return `${this.cachePrefix}:user:${userId}:*`;
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Get cached jobs or fallback to database
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @param {Object} query - MongoDB query object
   * @param {Object} sort - MongoDB sort object
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Number of documents to return
   * @returns {Object} Jobs data with pagination
   */
  async getCachedJobs(userId, filters, query, sort, skip, limit) {
    this.logger.info(`📥 [GET] Attempting to fetch jobs for user ${userId}`, { filters });

    if (!this.isReady()) {
      this.logger.warn('⚠️  Redis not ready, going directly to DB');
      return await this.fetchFromDatabase(userId, query, sort, skip, limit);
    }

    return await this.wrapper.executeWithFallback(
      // Cache operation
      async () => {
        const startTime = Date.now();
        const cacheKey = this.getCacheKey(userId, filters);

        this.logger.debug(`🔍 [REDIS] Checking cache key: ${cacheKey}`);

        // Try to get from cache
        const cachedData = await this.redis.get(cacheKey);

        if (!cachedData) {
          this.logger.warn(`❌ [CACHE MISS] No cached data for user ${userId}`);
          throw new Error('CACHE_MISS');
        }

        const result = JSON.parse(cachedData);
        const responseTime = Date.now() - startTime;

        this.logger.info(`✅ [CACHE HIT] User ${userId}`, {
          jobs: result.jobs?.length || 0,
          total: result.pagination?.total || 0,
          responseTime: `${responseTime}ms`,
          source: 'Redis'
        });

        return result;
      },
      // Fallback operation
      async () => {
        this.logger.info(`🔄 [FALLBACK] Fetching from database for user ${userId}`);
        return await this.fetchFromDatabase(userId, query, sort, skip, limit, filters);
      },
      `getCachedJobs:${userId}`
    );
  }

  // ==================== WRITE OPERATIONS ====================

  /**
   * Cache jobs query result
   * @param {string} userId - User ID
   * @param {Object} filters - Query filters
   * @param {Object} jobsData - Jobs data to cache (jobs + pagination)
   */
  async cacheJobs(userId, filters, jobsData) {
    if (!this.isReady()) {
      this.logger.debug(`⏭️  [SKIP CACHE] Redis not ready - jobs not cached`);
      return;
    }

    try {
      const cacheKey = this.getCacheKey(userId, filters);
      this.logger.info(`💾 [CACHE WRITE] Caching query result for user ${userId}`);

      await this.redis.setex(
        cacheKey,
        this.ttl,
        JSON.stringify(jobsData)
      );

      this.logger.info(`✅ [CACHE SUCCESS] Cached ${jobsData.jobs?.length || 0} jobs`, {
        cacheKey,
        ttl: `${this.ttl}s`
      });
    } catch (error) {
      this.logger.error(`❌ [CACHE ERROR] Failed to cache jobs: ${error.message}`);
    }
  }

  // ==================== INVALIDATION OPERATIONS ====================

  /**
   * Invalidate all job cache for a user
   * @param {string} userId - User ID
   */
  async invalidateUserCache(userId) {
    if (!this.isReady()) {
      this.logger.debug(`⏭️  [SKIP INVALIDATE] Redis not ready - cache not invalidated`);
      return;
    }

    try {
      this.logger.info(`🗑️  [CACHE INVALIDATE] Removing all cached queries for user ${userId}`);

      const pattern = this.getUserCachePattern(userId);

      // Use SCAN for safer pattern matching (better than KEYS in production)
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const result = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );

        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
          this.logger.debug(`  ✓ Deleted ${deleted} cache keys`);
        }
      } while (cursor !== '0');

      this.logger.info(`✅ [CACHE INVALIDATE SUCCESS] Removed ${totalDeleted} cache entries for user ${userId}`);
    } catch (error) {
      this.logger.error(`❌ [CACHE INVALIDATE ERROR] Failed to invalidate cache: ${error.message}`);
    }
  }

  /**
   * Invalidate specific job (simpler: just invalidate all user cache)
   * @param {string} jobId - Job ID
   * @param {string} userId - User ID
   */
  async invalidateJob(jobId, userId) {
    // For simplicity, invalidate entire user cache
    // Can optimize later to only invalidate relevant filter combinations
    this.logger.info(`🗑️  [CACHE INVALIDATE] Invalidating cache for job ${jobId}`);
    await this.invalidateUserCache(userId);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Fetch jobs from database
   * @param {string} userId - User ID
   * @param {Object} query - MongoDB query object
   * @param {Object} sort - MongoDB sort object
   * @param {number} skip - Number of documents to skip
   * @param {number} limit - Number of documents to return
   * @param {Object} filters - Original filters (for caching)
   * @returns {Object} Jobs data with pagination
   */
  async fetchFromDatabase(userId, query, sort, skip, limit, filters = null) {
    this.logger.info(`🗄️  [DATABASE QUERY] Fetching jobs for user ${userId} from MongoDB`);
    const startTime = Date.now();

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Job.countDocuments(query)
    ]);

    const responseTime = Date.now() - startTime;

    const result = {
      jobs,
      pagination: {
        page: Math.floor(skip / limit) + 1,
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    this.logger.info(`✅ [DATABASE SUCCESS] Fetched ${jobs.length} jobs in ${responseTime}ms`, {
      source: 'MongoDB',
      userId,
      jobCount: jobs.length,
      total,
      responseTime: `${responseTime}ms`
    });

    // Cache for next time (fire and forget) - only if filters are provided
    if (filters && jobs.length >= 0) {
      this.logger.info(`🔄 [WARMING CACHE] Storing DB results in Redis...`);
      this.cacheJobs(userId, filters, result).catch(err => {
        this.logger.warn(`⚠️  Failed to warm cache with DB results: ${err.message}`);
      });
    }

    return result;
  }

  /**
   * Get cache statistics
   * @param {string} userId - User ID (optional)
   * @returns {Object} Cache stats
   */
  async getCacheStats(userId = null) {
    if (!this.isReady()) {
      return { available: false };
    }

    try {
      let cachedQueries = 0;

      if (userId) {
        // Count cached queries for specific user
        const pattern = this.getUserCachePattern(userId);
        let cursor = '0';

        do {
          const result = await this.redis.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            100
          );

          cursor = result[0];
          cachedQueries += result[1].length;
        } while (cursor !== '0');
      }

      return {
        available: true,
        cachedQueries,
        ttl: this.ttl,
        circuitBreaker: this.wrapper.getStats()
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
}

// Create singleton instance
const jobCacheService = new JobCacheService();

module.exports = jobCacheService;
