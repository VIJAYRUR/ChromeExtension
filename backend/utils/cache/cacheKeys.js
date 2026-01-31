const CHAT_CACHE_PREFIX = 'jobtracker:chat';
const JOB_CACHE_PREFIX = 'jobtracker:jobs';

const CacheKeys = {
  // ==================== CHAT CACHE KEYS ====================
  // Group messages (Sorted Set - stores messageIds sorted by timestamp)
  groupMessages: (groupId) => `${CHAT_CACHE_PREFIX}:group:${groupId}:messages`,

  // Individual message (Hash - stores full message data)
  message: (messageId) => `${CHAT_CACHE_PREFIX}:message:${messageId}`,

  // User data (Hash - stores user info for population)
  user: (userId) => `${CHAT_CACHE_PREFIX}:user:${userId}`,

  // Group message count
  groupCount: (groupId) => `${CHAT_CACHE_PREFIX}:group:${groupId}:count`,

  // ==================== JOB CACHE KEYS ====================
  // Job query results (stores complete query result with pagination)
  jobQuery: (userId, filterHash) => `${JOB_CACHE_PREFIX}:user:${userId}:query:${filterHash}`,

  // Pattern matchers for bulk operations
  patterns: {
    // Chat patterns
    allGroupMessages: (groupId) => `${CHAT_CACHE_PREFIX}:group:${groupId}:*`,
    allMessages: `${CHAT_CACHE_PREFIX}:message:*`,
    allUsers: `${CHAT_CACHE_PREFIX}:user:*`,

    // Job patterns
    allUserJobs: (userId) => `${JOB_CACHE_PREFIX}:user:${userId}:*`,
    allJobs: `${JOB_CACHE_PREFIX}:*`
  }
};

module.exports = CacheKeys;
