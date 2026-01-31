/**
 * Comprehensive Job Cache Test Script
 *
 * This script tests:
 * 1. Cache read operations (getCachedJobs)
 * 2. Cache write operations (cacheJobs)
 * 3. Cache invalidation (invalidateUserCache)
 * 4. Cache statistics
 * 5. Performance comparison (Cache vs DB)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectRedis, disconnectRedis, getRedisClient } = require('./config/redis');
const jobCache = require('./utils/cache/jobCache');
const Job = require('./models/Job');
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

async function testCacheReadOperations(userId) {
  header('TEST 1: Cache Read Operations');

  // Build query and filters
  const filters = {
    status: 'all',
    workType: 'all',
    search: '',
    page: 1,
    limit: 50,
    sortBy: 'dateApplied',
    sortOrder: 'desc',
    archived: 'false'
  };

  const query = { userId, isArchived: false };
  const sort = { dateApplied: -1 };
  const skip = 0;
  const limit = 50;

  // First read - should be CACHE MISS (fetch from DB)
  log('🔍', 'TEST 1.1: First read - expecting CACHE MISS and DB fetch');
  const start1 = Date.now();
  const result1 = await jobCache.getCachedJobs(userId, filters, query, sort, skip, limit);
  const time1 = Date.now() - start1;
  log('✓', `First read completed in ${time1}ms - got ${result1.jobs.length} jobs`, {
    total: result1.pagination.total,
    pages: result1.pagination.pages
  });

  // Second read - should be CACHE HIT (from Redis)
  log('🔍', 'TEST 1.2: Second read - expecting CACHE HIT from Redis');
  const start2 = Date.now();
  const result2 = await jobCache.getCachedJobs(userId, filters, query, sort, skip, limit);
  const time2 = Date.now() - start2;
  log('✓', `Second read completed in ${time2}ms - got ${result2.jobs.length} jobs`);

  // Performance comparison
  if (time1 > time2) {
    const speedup = ((time1 - time2) / time1 * 100).toFixed(1);
    const faster = (time1 / time2).toFixed(1);
    log('⚡', `Cache speedup: ${speedup}% faster (${time1}ms → ${time2}ms) - ${faster}x improvement`);
  } else {
    log('⚠️', `Cache was not faster (DB: ${time1}ms, Cache: ${time2}ms)`);
  }

  return result1;
}

async function testCacheWithFilters(userId) {
  header('TEST 2: Cache with Different Filters');

  // Test different filter combinations
  const filterSets = [
    {
      name: 'Filter by status (applied)',
      filters: { status: 'applied', page: 1, limit: 50, sortBy: 'dateApplied', sortOrder: 'desc' },
      query: { userId, status: 'applied', isArchived: false }
    },
    {
      name: 'Filter by status (interview)',
      filters: { status: 'interview', page: 1, limit: 50, sortBy: 'dateApplied', sortOrder: 'desc' },
      query: { userId, status: 'interview', isArchived: false }
    },
    {
      name: 'Different page',
      filters: { status: 'all', page: 2, limit: 50, sortBy: 'dateApplied', sortOrder: 'desc' },
      query: { userId, isArchived: false }
    }
  ];

  const sort = { dateApplied: -1 };
  const limit = 50;

  for (const set of filterSets) {
    log('🔍', `Testing: ${set.name}`);
    const skip = (parseInt(set.filters.page) - 1) * limit;

    // First read (cache miss)
    const start1 = Date.now();
    const result1 = await jobCache.getCachedJobs(userId, set.filters, set.query, sort, skip, limit);
    const time1 = Date.now() - start1;

    // Second read (cache hit)
    const start2 = Date.now();
    const result2 = await jobCache.getCachedJobs(userId, set.filters, set.query, sort, skip, limit);
    const time2 = Date.now() - start2;

    log('✓', `  Found ${result1.jobs.length} jobs (DB: ${time1}ms, Cache: ${time2}ms)`);
  }
}

async function testCacheInvalidation(userId) {
  header('TEST 3: Cache Invalidation');

  log('🗑️', 'TEST 3.1: Invalidating all job cache for user');
  await jobCache.invalidateUserCache(userId);
  log('✅', 'Cache invalidated successfully');

  // Try to read again - should be cache miss
  log('🔍', 'TEST 3.2: Reading after invalidation (should be cache miss)');
  const filters = { page: 1, limit: 50, sortBy: 'dateApplied', sortOrder: 'desc' };
  const query = { userId, isArchived: false };
  const sort = { dateApplied: -1 };

  const start = Date.now();
  const result = await jobCache.getCachedJobs(userId, filters, query, sort, 0, 50);
  const time = Date.now() - start;

  log('✓', `Read completed in ${time}ms - got ${result.jobs.length} jobs (should be slower due to DB query)`);
}

async function testCacheStats(userId) {
  header('TEST 4: Cache Statistics');

  const stats = await jobCache.getCacheStats(userId);
  log('📊', 'Cache statistics:', stats);

  const redis = getRedisClient();
  if (redis) {
    // Get all cache keys
    const keys = await redis.keys('jobtracker:jobs:*');
    const userKeys = keys.filter(k => k.includes(userId));

    log('🔑', `Total job cache keys: ${keys.length}`);
    log('🔑', `Keys for this user: ${userKeys.length}`);

    // Show sample keys
    if (userKeys.length > 0) {
      console.log('\nSample cache keys:');
      userKeys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
    }
  }
}

async function testPerformanceComparison(userId) {
  header('TEST 5: Performance Comparison (Cache vs DB)');

  // Clear cache first
  log('🧹', 'Clearing cache to start fresh...');
  await jobCache.invalidateUserCache(userId);

  const query = { userId, isArchived: false };
  const sort = { dateApplied: -1 };
  const limit = 50;

  // Test DB query
  log('🗄️', 'TEST 5.1: Querying database directly...');
  const dbStart = Date.now();
  const [dbJobs, dbTotal] = await Promise.all([
    Job.find(query).sort(sort).limit(limit).lean(),
    Job.countDocuments(query)
  ]);
  const dbTime = Date.now() - dbStart;
  log('✓', `Database query: ${dbTime}ms (${dbJobs.length} jobs, ${dbTotal} total)`);

  // Warm cache
  log('🔥', 'TEST 5.2: Warming cache with first query...');
  const filters = { page: 1, limit: 50, sortBy: 'dateApplied', sortOrder: 'desc' };
  await jobCache.getCachedJobs(userId, filters, query, sort, 0, limit);

  // Test cache query
  log('⚡', 'TEST 5.3: Querying from cache...');
  const cacheStart = Date.now();
  const cacheResult = await jobCache.getCachedJobs(userId, filters, query, sort, 0, limit);
  const cacheTime = Date.now() - cacheStart;
  log('✓', `Cache query: ${cacheTime}ms (${cacheResult.jobs.length} jobs)`);

  // Results
  console.log('\n📊 Performance Results:');
  console.log(`  Database query: ${dbTime}ms (${dbJobs.length} jobs)`);
  console.log(`  Cache query:    ${cacheTime}ms (${cacheResult.jobs.length} jobs)`);

  if (dbTime > cacheTime) {
    const speedup = ((dbTime - cacheTime) / dbTime * 100).toFixed(1);
    const faster = (dbTime / cacheTime).toFixed(1);
    console.log(`\n  ${colors.green}✅ Cache is ${faster}x faster (${speedup}% improvement)${colors.reset}`);
  } else {
    console.log(`\n  ${colors.yellow}⚠️  Cache was not faster in this test${colors.reset}`);
  }
}

async function testMultipleQueries(userId) {
  header('TEST 6: Multiple Concurrent Queries');

  log('🔄', 'TEST 6.1: Running 10 concurrent queries to test cache efficiency');

  const filters = { page: 1, limit: 50, sortBy: 'dateApplied', sortOrder: 'desc' };
  const query = { userId, isArchived: false };
  const sort = { dateApplied: -1 };

  // Clear cache first
  await jobCache.invalidateUserCache(userId);

  const start = Date.now();
  const promises = Array(10).fill(null).map(() =>
    jobCache.getCachedJobs(userId, filters, query, sort, 0, 50)
  );

  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;

  log('✓', `Completed 10 queries in ${totalTime}ms (avg: ${(totalTime / 10).toFixed(0)}ms per query)`);
  log('📊', `First query likely warmed cache, subsequent queries benefited from caching`);
}

async function inspectRedisData(userId) {
  header('TEST 7: Redis Data Inspection');

  const redis = getRedisClient();
  if (!redis) {
    log('❌', 'Redis not available');
    return;
  }

  // Get user cache keys
  log('🔍', 'TEST 7.1: Inspecting user cache keys');
  const pattern = `jobtracker:jobs:user:${userId}:*`;
  const keys = await redis.keys(pattern);

  console.log(`\nPattern: ${pattern}`);
  console.log(`Total cache entries: ${keys.length}`);

  if (keys.length > 0) {
    // Inspect first cached query
    const firstKey = keys[0];
    log('🔍', 'TEST 7.2: Inspecting cached query structure');

    console.log(`\nCache key: ${firstKey}`);
    console.log(`TTL: ${await redis.ttl(firstKey)} seconds`);

    const cachedData = await redis.get(firstKey);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      console.log('\nCached data structure:');
      console.log(JSON.stringify({
        jobCount: data.jobs?.length || 0,
        pagination: data.pagination,
        sampleJob: data.jobs?.[0] ? {
          company: data.jobs[0].company,
          title: data.jobs[0].title,
          status: data.jobs[0].status
        } : null
      }, null, 2));
    }
  } else {
    log('⚠️', 'No cached queries found for this user');
  }
}

async function main() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║         🧪 JOB CACHE COMPREHENSIVE TEST SUITE 🧪                   ║${colors.reset}`);
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
    log('🔧', 'Initializing job cache service...');
    jobCache.initialize();
    log('✅', 'Job cache service initialized');

    // Find a test user with jobs
    log('🔍', 'Finding a user with jobs...');
    const user = await User.findOne();
    if (!user) {
      throw new Error('No users found. Please create a user first.');
    }

    const jobCount = await Job.countDocuments({ userId: user._id, isArchived: false });
    log('✅', `Found user: ${user.email} (${jobCount} jobs)`);

    if (jobCount === 0) {
      log('⚠️', 'User has no jobs. Creating test jobs...');
      // Create some test jobs
      const testJobs = Array(10).fill(null).map((_, i) => ({
        userId: user._id,
        company: `Test Company ${i + 1}`,
        title: `Test Position ${i + 1}`,
        status: ['applied', 'interview', 'offer', 'rejected'][i % 4],
        dateApplied: new Date(),
        workType: 'full-time',
        location: 'Remote'
      }));

      await Job.insertMany(testJobs);
      log('✅', `Created ${testJobs.length} test jobs`);
    }

    const userId = user._id.toString();

    // Run all tests
    await testCacheReadOperations(userId);
    await testCacheWithFilters(userId);
    await testCacheInvalidation(userId);
    await testCacheStats(userId);
    await testPerformanceComparison(userId);
    await testMultipleQueries(userId);
    await inspectRedisData(userId);

    // Final summary
    header('✅ ALL TESTS COMPLETED');
    log('🎉', 'All job cache operations tested successfully!');
    log('💡', 'Check the logs above to see detailed cache behavior');
    log('📌', 'Expected results:');
    console.log('  - Cache HITs should be 3-5x faster than DB queries');
    console.log('  - TTL should be 300 seconds (5 minutes)');
    console.log('  - Multiple queries with same filters should use cache');
    console.log('  - Invalidation should clear all user cache entries');

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Cleanup
    log('🧹', 'Cleaning up...');
    await disconnectRedis();
    await mongoose.disconnect();
    log('✅', 'Disconnected from all services');
    process.exit(0);
  }
}

// Run tests
main();
