const { getRedisClient, isRedisAvailable } = require('../../config/redis');
const CacheKeys = require('./cacheKeys');
const CacheWrapper = require('./cacheWrapper');
const Logger = require('../logger');
const ChatMessage = require('../../models/ChatMessage');
const User = require('../../models/User');

class ChatCacheService {
  constructor() {
    this.logger = new Logger('ChatCache', process.env.LOG_LEVEL || 'INFO');
    this.wrapper = null;
    this.redis = null;
    this.hotMessageCount = parseInt(process.env.REDIS_HOT_MESSAGE_COUNT) || 50;
    this.ttl = parseInt(process.env.REDIS_CACHE_TTL) || 86400; // 24 hours
  }

  // Initialize cache service with Redis client
  initialize() {
    this.redis = getRedisClient();
    if (this.redis) {
      this.wrapper = new CacheWrapper(this.redis);
      this.logger.info('Chat cache service initialized');
    } else {
      this.logger.warn('Redis not available, cache service disabled');
    }
  }

  // Helper to check if Redis is ready
  isReady() {
    return isRedisAvailable() && this.redis !== null;
  }

  // ==================== READ OPERATIONS ====================

  /**
   * Get hot messages from cache or fallback to DB
   * @param {string} groupId - Group ID
   * @param {number} limit - Number of messages to fetch
   * @returns {Array} Array of messages with populated user data
   */
  async getHotMessages(groupId, limit = 50) {
    this.logger.info(`📥 [GET] Attempting to fetch ${limit} hot messages for group ${groupId}`);

    if (!this.isReady()) {
      this.logger.warn('⚠️  Redis not ready, going directly to DB');
      return await this.fetchFromDatabase(groupId, limit);
    }

    return await this.wrapper.executeWithFallback(
      // Cache operation
      async () => {
        const startTime = Date.now();

        // Get message IDs from sorted set (newest first)
        const messageIds = await this.redis.zrevrange(
          CacheKeys.groupMessages(groupId),
          0,
          limit - 1
        );

        this.logger.info(`🔍 [REDIS] Sorted set returned ${messageIds?.length || 0} message IDs`);

        if (!messageIds || messageIds.length === 0) {
          this.logger.warn(`❌ [CACHE MISS] Empty sorted set for group ${groupId}`);
          throw new Error('CACHE_MISS');
        }

        // Fetch message hashes in parallel
        this.logger.debug(`🔄 Fetching ${messageIds.length} message hashes from Redis...`);
        const messages = await Promise.all(
          messageIds.map(id => this.getMessage(id))
        );

        const validMessages = messages.filter(m => m !== null);
        const nullCount = messages.length - validMessages.length;

        if (nullCount > 0) {
          this.logger.warn(`⚠️  ${nullCount} messages had null data (stale references)`);
        }

        if (validMessages.length === 0) {
          this.logger.warn(`❌ [CACHE MISS] All messages were null for group ${groupId}`);
          throw new Error('CACHE_MISS');
        }

        const responseTime = Date.now() - startTime;
        this.logger.info(`✅ [CACHE HIT] Group ${groupId}`, {
          requested: limit,
          found: validMessages.length,
          responseTime: `${responseTime}ms`,
          source: 'Redis'
        });

        return validMessages;
      },
      // Fallback operation
      async () => {
        this.logger.info(`🔄 [FALLBACK] Fetching from database for group ${groupId}`);
        return await this.fetchFromDatabase(groupId, limit);
      },
      `getHotMessages:${groupId}`
    );
  }

  /**
   * Get single message from cache
   * @param {string} messageId - Message ID
   * @returns {Object|null} Message object or null
   */
  async getMessage(messageId) {
    try {
      const messageJson = await this.redis.get(CacheKeys.message(messageId));

      if (!messageJson) {
        return null;
      }

      return JSON.parse(messageJson);
    } catch (error) {
      this.logger.error(`Error fetching message ${messageId} from cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Get message count from cache or DB
   * @param {string} groupId - Group ID
   * @returns {number} Total message count
   */
  async getMessageCount(groupId) {
    if (!this.isReady()) {
      return await ChatMessage.countDocuments({ groupId, deleted: false });
    }

    try {
      const cached = await this.redis.get(CacheKeys.groupCount(groupId));

      if (cached) {
        return parseInt(cached);
      }

      // Fetch from DB and cache
      const count = await ChatMessage.countDocuments({ groupId, deleted: false });
      await this.redis.setex(CacheKeys.groupCount(groupId), this.ttl, count);

      return count;
    } catch (error) {
      this.logger.error(`Error getting message count: ${error.message}`);
      return await ChatMessage.countDocuments({ groupId, deleted: false });
    }
  }

  // ==================== WRITE OPERATIONS ====================

  /**
   * Cache a single message
   * @param {Object} message - Message object with populated user data
   * @param {string} groupId - Group ID
   */
  async cacheMessage(message, groupId) {
    if (!this.isReady()) {
      this.logger.debug(`⏭️  [SKIP CACHE] Redis not ready - message ${message._id} not cached`);
      return;
    }

    try {
      const messageId = message._id.toString();
      const timestamp = new Date(message.createdAt).getTime();

      this.logger.info(`💾 [CACHE WRITE] Starting to cache message ${messageId} in group ${groupId}`);

      // Store message hash
      await this.redis.setex(
        CacheKeys.message(messageId),
        this.ttl,
        JSON.stringify(message)
      );
      this.logger.debug(`  ✓ Stored message hash: ${CacheKeys.message(messageId)}`);

      // Add to sorted set
      await this.redis.zadd(
        CacheKeys.groupMessages(groupId),
        timestamp,
        messageId
      );
      this.logger.debug(`  ✓ Added to sorted set with timestamp ${timestamp}`);

      // Trim to keep only hot messages
      const trimmed = await this.redis.zremrangebyrank(
        CacheKeys.groupMessages(groupId),
        0,
        -(this.hotMessageCount + 1)
      );
      if (trimmed > 0) {
        this.logger.debug(`  ✓ Trimmed ${trimmed} old messages (keeping ${this.hotMessageCount})`);
      }

      // Set TTL on sorted set
      await this.redis.expire(CacheKeys.groupMessages(groupId), this.ttl);

      // Increment count
      await this.redis.incr(CacheKeys.groupCount(groupId));
      await this.redis.expire(CacheKeys.groupCount(groupId), this.ttl);

      this.logger.info(`✅ [CACHE SUCCESS] Message ${messageId} cached in group ${groupId}`);
    } catch (error) {
      this.logger.error(`❌ [CACHE ERROR] Failed to cache message: ${error.message}`);
    }
  }

  /**
   * Cache multiple messages (for warming)
   * @param {Array} messages - Array of messages with populated user data
   * @param {string} groupId - Group ID
   */
  async cacheMessages(messages, groupId) {
    if (!this.isReady()) {
      this.logger.debug(`⏭️  [SKIP CACHE] Redis not ready - ${messages?.length || 0} messages not cached`);
      return;
    }

    if (!messages || messages.length === 0) {
      this.logger.debug(`⏭️  [SKIP CACHE] No messages to cache for group ${groupId}`);
      return;
    }

    try {
      this.logger.info(`💾 [CACHE BULK WRITE] Caching ${messages.length} messages for group ${groupId}`);
      const startTime = Date.now();

      const pipeline = this.redis.pipeline();

      // Store each message hash
      messages.forEach(message => {
        const messageId = message._id.toString();
        pipeline.setex(
          CacheKeys.message(messageId),
          this.ttl,
          JSON.stringify(message)
        );
      });

      // Build sorted set entries
      const sortedSetEntries = messages.flatMap(message => [
        new Date(message.createdAt).getTime(),
        message._id.toString()
      ]);

      // Add all to sorted set
      pipeline.zadd(CacheKeys.groupMessages(groupId), ...sortedSetEntries);

      // Trim to keep only hot messages
      pipeline.zremrangebyrank(
        CacheKeys.groupMessages(groupId),
        0,
        -(this.hotMessageCount + 1)
      );

      // Set TTL
      pipeline.expire(CacheKeys.groupMessages(groupId), this.ttl);

      // Execute pipeline
      const results = await pipeline.exec();
      const responseTime = Date.now() - startTime;

      this.logger.info(`✅ [CACHE BULK SUCCESS] Cached ${messages.length} messages in ${responseTime}ms`, {
        groupId,
        messageCount: messages.length,
        pipelineOperations: results.length
      });
    } catch (error) {
      this.logger.error(`❌ [CACHE BULK ERROR] Failed to cache messages: ${error.message}`);
    }
  }

  /**
   * Update specific fields of a cached message
   * @param {string} messageId - Message ID
   * @param {Object} updates - Fields to update
   */
  async updateMessage(messageId, updates) {
    if (!this.isReady()) {
      this.logger.debug(`⏭️  [SKIP UPDATE] Redis not ready - message ${messageId} not updated`);
      return;
    }

    try {
      this.logger.info(`🔄 [CACHE UPDATE] Updating message ${messageId}`, { fields: Object.keys(updates) });

      // Get existing message
      const messageJson = await this.redis.get(CacheKeys.message(messageId));

      if (!messageJson) {
        this.logger.warn(`⚠️  [CACHE MISS] Message ${messageId} not in cache, skipping update`);
        return;
      }

      // Update fields
      const message = JSON.parse(messageJson);
      Object.assign(message, updates);

      // Store updated message
      await this.redis.setex(
        CacheKeys.message(messageId),
        this.ttl,
        JSON.stringify(message)
      );

      this.logger.info(`✅ [CACHE UPDATE SUCCESS] Message ${messageId} updated with: ${Object.keys(updates).join(', ')}`);
    } catch (error) {
      this.logger.error(`❌ [CACHE UPDATE ERROR] Failed to update message: ${error.message}`);
    }
  }

  // ==================== INVALIDATION OPERATIONS ====================

  /**
   * Invalidate (remove) a message from cache
   * @param {string} messageId - Message ID
   * @param {string} groupId - Group ID
   */
  async invalidateMessage(messageId, groupId) {
    if (!this.isReady()) {
      this.logger.debug(`⏭️  [SKIP INVALIDATE] Redis not ready - message ${messageId} not invalidated`);
      return;
    }

    try {
      this.logger.info(`🗑️  [CACHE INVALIDATE] Removing message ${messageId} from group ${groupId}`);

      // Remove from sorted set
      const removed = await this.redis.zrem(CacheKeys.groupMessages(groupId), messageId);
      this.logger.debug(`  ✓ Removed from sorted set (${removed} items)`);

      // Delete message hash
      const deleted = await this.redis.del(CacheKeys.message(messageId));
      this.logger.debug(`  ✓ Deleted message hash (${deleted} keys)`);

      // Decrement count
      const newCount = await this.redis.decr(CacheKeys.groupCount(groupId));
      this.logger.debug(`  ✓ Decremented count to ${newCount}`);

      this.logger.info(`✅ [CACHE INVALIDATE SUCCESS] Message ${messageId} removed from cache`);
    } catch (error) {
      this.logger.error(`❌ [CACHE INVALIDATE ERROR] Failed to invalidate message: ${error.message}`);
    }
  }

  /**
   * Invalidate entire group cache
   * @param {string} groupId - Group ID
   */
  async invalidateGroup(groupId) {
    if (!this.isReady()) {
      return;
    }

    try {
      // Get all message IDs
      const messageIds = await this.redis.zrange(
        CacheKeys.groupMessages(groupId),
        0,
        -1
      );

      // Delete all message hashes
      if (messageIds && messageIds.length > 0) {
        const messageKeys = messageIds.map(id => CacheKeys.message(id));
        await this.redis.del(...messageKeys);
      }

      // Delete sorted set and count
      await this.redis.del(CacheKeys.groupMessages(groupId));
      await this.redis.del(CacheKeys.groupCount(groupId));

      this.logger.info(`Invalidated entire cache for group ${groupId}`);
    } catch (error) {
      this.logger.error(`Error invalidating group: ${error.message}`);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Fetch messages from database with user population
   * @param {string} groupId - Group ID
   * @param {number} limit - Number of messages to fetch
   * @returns {Array} Array of messages with populated user data
   */
  async fetchFromDatabase(groupId, limit) {
    this.logger.info(`🗄️  [DATABASE QUERY] Fetching ${limit} messages for group ${groupId} from MongoDB`);
    const startTime = Date.now();

    // Query messages
    const messages = await ChatMessage.find({
      groupId,
      deleted: false
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    this.logger.debug(`  ✓ Found ${messages.length} messages in ChatMessage collection`);

    // Manual user population (cross-database)
    const userIds = [...new Set(messages.map(m => m.userId).filter(Boolean))];
    this.logger.debug(`  ✓ Fetching ${userIds.length} unique users from User collection`);

    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email');

    this.logger.debug(`  ✓ Found ${users.length} users`);

    // Create user map
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      };
    });

    // Attach user data
    const messagesWithUsers = messages.map(msg => {
      const messageObj = msg.toObject();
      messageObj.userId = userMap[msg.userId?.toString()] || null;
      return messageObj;
    });

    const responseTime = Date.now() - startTime;
    this.logger.info(`✅ [DATABASE SUCCESS] Fetched ${messagesWithUsers.length} messages in ${responseTime}ms`, {
      source: 'MongoDB',
      groupId,
      messageCount: messagesWithUsers.length,
      responseTime: `${responseTime}ms`
    });

    // Cache for next time (fire and forget)
    if (messagesWithUsers.length > 0) {
      this.logger.info(`🔄 [WARMING CACHE] Storing ${messagesWithUsers.length} DB results in Redis...`);
      this.cacheMessages(messagesWithUsers, groupId).catch(err => {
        this.logger.warn(`⚠️  Failed to warm cache with DB results: ${err.message}`);
      });
    }

    return messagesWithUsers;
  }

  /**
   * Get cache statistics
   * @param {string} groupId - Group ID
   * @returns {Object} Cache stats
   */
  async getCacheStats(groupId) {
    if (!this.isReady()) {
      return { available: false };
    }

    try {
      const messageCount = await this.redis.zcard(CacheKeys.groupMessages(groupId));
      const ttl = await this.redis.ttl(CacheKeys.groupMessages(groupId));

      return {
        available: true,
        messageCount,
        ttl,
        circuitBreaker: this.wrapper.getStats()
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
}

// Create singleton instance
const chatCacheService = new ChatCacheService();

module.exports = chatCacheService;
