const CACHE_PREFIX = 'jobtracker:chat';

const CacheKeys = {
  // Group messages (Sorted Set - stores messageIds sorted by timestamp)
  groupMessages: (groupId) => `${CACHE_PREFIX}:group:${groupId}:messages`,

  // Individual message (Hash - stores full message data)
  message: (messageId) => `${CACHE_PREFIX}:message:${messageId}`,

  // User data (Hash - stores user info for population)
  user: (userId) => `${CACHE_PREFIX}:user:${userId}`,

  // Group message count
  groupCount: (groupId) => `${CACHE_PREFIX}:group:${groupId}:count`,

  // Pattern matchers for bulk operations
  patterns: {
    allGroupMessages: (groupId) => `${CACHE_PREFIX}:group:${groupId}:*`,
    allMessages: `${CACHE_PREFIX}:message:*`,
    allUsers: `${CACHE_PREFIX}:user:*`
  }
};

module.exports = CacheKeys;
