/**
 * Test Script for Lazy Loading / Infinite Scroll
 *
 * This script simulates how a frontend would:
 * 1. Load initial batch of messages
 * 2. Load older messages as user scrolls (lazy loading)
 * 3. Continue until no more messages
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { chatCache } = require('./utils/cache');
const ChatMessage = require('./models/ChatMessage');
const Group = require('./models/Group');
const User = require('./models/User');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
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

/**
 * Simulate frontend: Load initial messages
 */
async function loadInitialMessages(groupId, limit = 10) {
  header('STEP 1: Load Initial Messages (Most Recent)');

  const startTime = Date.now();

  // Try cache first
  const cachedMessages = await chatCache.getHotMessages(groupId, limit);

  if (cachedMessages && cachedMessages.length > 0) {
    const responseTime = Date.now() - startTime;

    const oldestMessage = cachedMessages[0]; // Messages are newest first from cache
    const newestMessage = cachedMessages[cachedMessages.length - 1];

    log('✅', `Loaded ${cachedMessages.length} messages from cache in ${responseTime}ms`);
    log('📊', 'Message range:', {
      oldest: {
        id: oldestMessage._id,
        content: oldestMessage.content.substring(0, 50),
        createdAt: oldestMessage.createdAt
      },
      newest: {
        id: newestMessage._id,
        content: newestMessage.content.substring(0, 50),
        createdAt: newestMessage.createdAt
      }
    });

    return {
      messages: cachedMessages.reverse(), // Reverse to oldest first
      hasMore: cachedMessages.length >= limit,
      oldestTimestamp: oldestMessage.createdAt,
      cached: true
    };
  }

  // Fallback to DB
  log('⚠️', 'Cache miss, loading from database...');

  const messages = await ChatMessage.find({ groupId, deleted: false })
    .sort({ createdAt: -1 })
    .limit(limit + 1);

  const hasMore = messages.length > limit;
  const actualMessages = hasMore ? messages.slice(0, limit) : messages;

  // Populate users
  const userIds = [...new Set(actualMessages.map(m => m.userId).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email');

  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
  });

  const messagesWithUsers = actualMessages.map(msg => {
    const messageObj = msg.toObject();
    messageObj.userId = userMap[msg.userId?.toString()] || null;
    return messageObj;
  });

  const oldestMessage = messagesWithUsers[messagesWithUsers.length - 1];
  const responseTime = Date.now() - startTime;

  log('✅', `Loaded ${messagesWithUsers.length} messages from DB in ${responseTime}ms`);

  return {
    messages: messagesWithUsers.reverse(),
    hasMore,
    oldestTimestamp: oldestMessage?.createdAt,
    cached: false
  };
}

/**
 * Simulate frontend: Load older messages (lazy loading)
 */
async function loadOlderMessages(groupId, beforeTimestamp, limit = 10) {
  header(`STEP: Load Older Messages (before ${beforeTimestamp})`);

  const startTime = Date.now();
  const beforeDate = new Date(beforeTimestamp);

  const messages = await ChatMessage.find({
    groupId,
    deleted: false,
    createdAt: { $lt: beforeDate }
  })
    .sort({ createdAt: -1 })
    .limit(limit + 1);

  const hasMore = messages.length > limit;
  const actualMessages = hasMore ? messages.slice(0, limit) : messages;

  if (actualMessages.length === 0) {
    log('🏁', 'No more messages to load');
    return {
      messages: [],
      hasMore: false,
      oldestTimestamp: null
    };
  }

  // Populate users
  const userIds = [...new Set(actualMessages.map(m => m.userId).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email');

  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
  });

  const messagesWithUsers = actualMessages.map(msg => {
    const messageObj = msg.toObject();
    messageObj.userId = userMap[msg.userId?.toString()] || null;
    return messageObj;
  });

  const oldestMessage = messagesWithUsers[messagesWithUsers.length - 1];
  const newestMessage = messagesWithUsers[0];
  const responseTime = Date.now() - startTime;

  log('✅', `Loaded ${messagesWithUsers.length} older messages in ${responseTime}ms`);
  log('📊', 'Message range:', {
    oldest: {
      id: oldestMessage._id,
      content: oldestMessage.content.substring(0, 50),
      createdAt: oldestMessage.createdAt
    },
    newest: {
      id: newestMessage._id,
      content: newestMessage.content.substring(0, 50),
      createdAt: newestMessage.createdAt
    }
  });

  return {
    messages: messagesWithUsers.reverse(),
    hasMore,
    oldestTimestamp: oldestMessage?.createdAt
  };
}

/**
 * Main test flow
 */
async function main() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║         📜 LAZY LOADING / INFINITE SCROLL TEST 📜                  ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Connect to services
    log('🔌', 'Connecting to Redis...');
    await connectRedis();
    log('✅', 'Connected to Redis');

    log('🔌', 'Connecting to MongoDB...');
    const { connectDB } = require('./config/database');
    await connectDB();
    log('✅', 'Connected to MongoDB');

    // Initialize cache
    chatCache.initialize();

    // Find a test group
    const group = await Group.findOne();
    if (!group) {
      throw new Error('No groups found. Please create a group first.');
    }

    const messageCount = await ChatMessage.countDocuments({ groupId: group._id, deleted: false });
    log('✅', `Found group: ${group.name} (${messageCount} total messages)`);

    const groupId = group._id.toString();

    // Simulate infinite scroll behavior
    let allMessages = [];
    let hasMore = true;
    let oldestTimestamp = null;
    let batchNumber = 1;
    const batchSize = 10; // Load 10 messages at a time

    // 1. Initial load
    const initialBatch = await loadInitialMessages(groupId, batchSize);
    allMessages = [...initialBatch.messages];
    hasMore = initialBatch.hasMore;
    oldestTimestamp = initialBatch.oldestTimestamp;

    log('📈', `Batch ${batchNumber}: Loaded ${initialBatch.messages.length} messages (Total: ${allMessages.length})`);
    log('🔄', `Has more messages: ${hasMore}`);

    // 2. Keep loading until no more messages (simulating user scrolling to top)
    while (hasMore && batchNumber < 5) { // Limit to 5 batches for demo
      batchNumber++;

      log('⏸️', `\n⏳ Simulating user scrolling to top...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

      const olderBatch = await loadOlderMessages(groupId, oldestTimestamp, batchSize);

      if (olderBatch.messages.length > 0) {
        allMessages = [...olderBatch.messages, ...allMessages]; // Prepend older messages
        hasMore = olderBatch.hasMore;
        oldestTimestamp = olderBatch.oldestTimestamp;

        log('📈', `Batch ${batchNumber}: Loaded ${olderBatch.messages.length} messages (Total: ${allMessages.length})`);
        log('🔄', `Has more messages: ${hasMore}`);
      } else {
        hasMore = false;
      }
    }

    // Final summary
    header('✅ LAZY LOADING TEST COMPLETED');
    log('🎉', `Successfully loaded ${allMessages.length} messages across ${batchNumber} batches`);
    log('📊', 'Summary:', {
      totalBatches: batchNumber,
      totalMessages: allMessages.length,
      batchSize,
      hasMoreMessages: hasMore,
      averageMessagesPerBatch: Math.round(allMessages.length / batchNumber)
    });

    console.log('\n💡 How this works in your frontend:');
    console.log('   1. User opens chat → Load batch 1 (latest 50 messages)');
    console.log('   2. User scrolls to top → Load batch 2 (next 50 older messages)');
    console.log('   3. Continue loading as user scrolls');
    console.log('   4. Stop when hasMore = false\n');

  } catch (error) {
    console.error(`\n${colors.reset}❌ Test failed:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Cleanup
    log('🧹', 'Cleaning up...');
    await disconnectRedis();
    await mongoose.disconnect();
    log('✅', 'Disconnected from all services');
  }
}

// Run test
main();
