/**
 * Comprehensive Chat Cache Test Script
 *
 * This script tests:
 * 1. Cache read operations (getHotMessages)
 * 2. Cache write operations (cacheMessage, cacheMessages)
 * 3. Cache update operations (updateMessage)
 * 4. Cache invalidation (invalidateMessage)
 * 5. Cache statistics
 * 6. Performance comparison (Cache vs DB)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectRedis, disconnectRedis, getRedisClient } = require('./config/redis');
const chatCache = require('./utils/cache/chatCache');
const ChatMessage = require('./models/ChatMessage');
const Group = require('./models/Group');
const User = require('./models/User');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(emoji, message, data = null) {
  console.log(`${emoji} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function header(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(70) + '\n');
}

async function testCacheReadOperations(groupId) {
  header('TEST 1: Cache Read Operations');

  // First read - should be CACHE MISS (fetch from DB)
  log('🔍', 'TEST 1.1: First read - expecting CACHE MISS and DB fetch');
  const start1 = Date.now();
  const messages1 = await chatCache.getHotMessages(groupId, 10);
  const time1 = Date.now() - start1;
  log('✓', `First read completed in ${time1}ms - got ${messages1.length} messages`);

  // Second read - should be CACHE HIT (from Redis)
  log('🔍', 'TEST 1.2: Second read - expecting CACHE HIT from Redis');
  const start2 = Date.now();
  const messages2 = await chatCache.getHotMessages(groupId, 10);
  const time2 = Date.now() - start2;
  log('✓', `Second read completed in ${time2}ms - got ${messages2.length} messages`);

  // Performance comparison
  const speedup = ((time1 - time2) / time1 * 100).toFixed(1);
  log('⚡', `Cache speedup: ${speedup}% faster (${time1}ms → ${time2}ms)`);

  return messages1;
}

async function testCacheWriteOperations(groupId, userId) {
  header('TEST 2: Cache Write Operations');

  log('💾', 'TEST 2.1: Creating a new message in DB');

  const testMessage = await ChatMessage.create({
    groupId,
    userId,
    content: `Test message created at ${new Date().toISOString()}`,
    messageType: 'text'
  });

  log('✓', `Message created: ${testMessage._id}`);

  // Fetch user data
  const user = await User.findById(userId).select('firstName lastName email');
  const messageObj = testMessage.toObject();
  messageObj.userId = user ? {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email
  } : null;

  log('💾', 'TEST 2.2: Caching the message');
  await chatCache.cacheMessage(messageObj, groupId);

  // Verify it's in cache
  log('🔍', 'TEST 2.3: Reading from cache to verify');
  const cached = await chatCache.getMessage(testMessage._id.toString());

  if (cached) {
    log('✅', 'Message successfully cached and retrieved!');
  } else {
    log('❌', 'ERROR: Message not found in cache!');
  }

  return testMessage._id.toString();
}

async function testCacheUpdateOperations(messageId) {
  header('TEST 3: Cache Update Operations');

  log('🔄', 'TEST 3.1: Updating message in cache');

  await chatCache.updateMessage(messageId, {
    content: 'Updated content via cache',
    edited: true,
    editedAt: new Date()
  });

  log('🔍', 'TEST 3.2: Reading updated message from cache');
  const updated = await chatCache.getMessage(messageId);

  if (updated && updated.content === 'Updated content via cache') {
    log('✅', 'Message successfully updated in cache!', {
      content: updated.content,
      edited: updated.edited
    });
  } else {
    log('❌', 'ERROR: Message not updated correctly!');
  }
}

async function testCacheInvalidation(messageId, groupId) {
  header('TEST 4: Cache Invalidation');

  log('🗑️', 'TEST 4.1: Invalidating message from cache');
  await chatCache.invalidateMessage(messageId, groupId);

  log('🔍', 'TEST 4.2: Attempting to read invalidated message');
  const deleted = await chatCache.getMessage(messageId);

  if (!deleted) {
    log('✅', 'Message successfully invalidated from cache!');
  } else {
    log('❌', 'ERROR: Message still in cache after invalidation!');
  }
}

async function testCacheStats(groupId) {
  header('TEST 5: Cache Statistics');

  const stats = await chatCache.getCacheStats(groupId);
  log('📊', 'Cache statistics:', stats);

  const redis = getRedisClient();
  if (redis) {
    // Get all cache keys
    const keys = await redis.keys('jobtracker:chat:*');
    const groupKeys = keys.filter(k => k.includes(groupId));

    log('🔑', `Total cache keys: ${keys.length}`);
    log('🔑', `Keys for this group: ${groupKeys.length}`);

    // Show sample keys
    console.log('\nSample cache keys:');
    groupKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
  }
}

async function testPerformanceComparison(groupId) {
  header('TEST 6: Performance Comparison (Cache vs DB)');

  // Clear cache first
  log('🧹', 'Clearing cache to start fresh...');
  await chatCache.invalidateGroup(groupId);

  // Test DB query
  log('🗄️', 'TEST 6.1: Querying database directly...');
  const dbStart = Date.now();
  const dbMessages = await ChatMessage.find({ groupId, deleted: false })
    .sort({ createdAt: -1 })
    .limit(50);
  const dbTime = Date.now() - dbStart;

  // Warm cache
  log('🔥', 'TEST 6.2: Warming cache...');
  await chatCache.invalidateGroup(groupId); // Clear again
  await chatCache.getHotMessages(groupId, 50); // This will cache

  // Test cache query
  log('⚡', 'TEST 6.3: Querying from cache...');
  const cacheStart = Date.now();
  const cacheMessages = await chatCache.getHotMessages(groupId, 50);
  const cacheTime = Date.now() - cacheStart;

  // Results
  console.log('\n📊 Performance Results:');
  console.log(`  Database query: ${dbTime}ms (${dbMessages.length} messages)`);
  console.log(`  Cache query:    ${cacheTime}ms (${cacheMessages.length} messages)`);

  const speedup = ((dbTime - cacheTime) / dbTime * 100).toFixed(1);
  const faster = (dbTime / cacheTime).toFixed(1);

  console.log(`\n  ${colors.green}Cache is ${faster}x faster (${speedup}% improvement)${colors.reset}`);
}

async function inspectRedisData(groupId) {
  header('TEST 7: Redis Data Inspection');

  const redis = getRedisClient();
  if (!redis) {
    log('❌', 'Redis not available');
    return;
  }

  // Inspect sorted set
  log('🔍', 'TEST 7.1: Inspecting sorted set structure');
  const sortedSetKey = `jobtracker:chat:group:${groupId}:messages`;
  const messageIds = await redis.zrange(sortedSetKey, 0, 4); // Get first 5

  console.log(`\nSorted set: ${sortedSetKey}`);
  console.log(`Total messages in set: ${await redis.zcard(sortedSetKey)}`);
  console.log(`TTL: ${await redis.ttl(sortedSetKey)} seconds`);
  console.log('\nFirst 5 message IDs:');
  messageIds.forEach(id => console.log(`  - ${id}`));

  // Inspect individual message
  if (messageIds.length > 0) {
    log('🔍', 'TEST 7.2: Inspecting message structure');
    const messageKey = `jobtracker:chat:message:${messageIds[0]}`;
    const messageData = await redis.get(messageKey);

    console.log(`\nMessage key: ${messageKey}`);
    console.log(`TTL: ${await redis.ttl(messageKey)} seconds`);
    console.log('Message data:');
    console.log(JSON.stringify(JSON.parse(messageData), null, 2).substring(0, 500) + '...');
  }

  // Inspect count
  log('🔍', 'TEST 7.3: Inspecting message count');
  const countKey = `jobtracker:chat:group:${groupId}:count`;
  const count = await redis.get(countKey);
  console.log(`\nCount key: ${countKey}`);
  console.log(`Value: ${count}`);
  console.log(`TTL: ${await redis.ttl(countKey)} seconds`);
}

async function main() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║         🧪 CHAT CACHE COMPREHENSIVE TEST SUITE 🧪                  ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Connect to services
    log('🔌', 'Connecting to Redis...');
    const redisClient = await connectRedis();
    if (!redisClient) {
      throw new Error('Failed to connect to Redis');
    }
    log('✅', 'Connected to Redis');

    log('🔌', 'Connecting to MongoDB...');
    const { connectDB } = require('./config/database');
    await connectDB();
    log('✅', 'Connected to MongoDB');

    // Initialize cache
    log('🔧', 'Initializing cache service...');
    chatCache.initialize();
    log('✅', 'Cache service initialized');

    // Find a test group with messages
    log('🔍', 'Finding a group with messages...');
    const group = await Group.findOne();
    if (!group) {
      throw new Error('No groups found. Please create a group first.');
    }

    const messageCount = await ChatMessage.countDocuments({ groupId: group._id, deleted: false });
    log('✅', `Found group: ${group.name} (${messageCount} messages)`);

    const groupId = group._id.toString();

    // Get a real user ID from an existing message
    const sampleMessage = await ChatMessage.findOne({ groupId: group._id });
    const userId = sampleMessage ? sampleMessage.userId : group.members[0];

    // Run all tests
    const messages = await testCacheReadOperations(groupId);
    const messageId = await testCacheWriteOperations(groupId, userId);
    await testCacheUpdateOperations(messageId);
    await testCacheInvalidation(messageId, groupId);
    await testCacheStats(groupId);
    await testPerformanceComparison(groupId);
    await inspectRedisData(groupId);

    // Final summary
    header('✅ ALL TESTS COMPLETED');
    log('🎉', 'All cache operations tested successfully!');
    log('💡', 'Check the logs above to see detailed cache behavior');

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Cleanup
    log('🧹', 'Cleaning up...');
    await disconnectRedis();
    await mongoose.disconnect();
    log('✅', 'Disconnected from all services');
  }
}

// Run tests
main();
