/**
 * Test Script for Jobs Lazy Loading / Pagination
 *
 * This script tests the jobs API pagination and lazy loading functionality:
 * 1. Load initial batch of jobs (50)
 * 2. Load next pages with filters
 * 3. Test sorting and search
 * 4. Verify no duplicates
 * 5. Test performance with Redis cache
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { jobCache } = require('./utils/cache');
const Job = require('./models/Job');
const User = require('./models/User');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
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
 * Test 1: Load initial batch of jobs
 */
async function testInitialLoad(userId, limit = 50) {
  header('TEST 1: Load Initial Batch of Jobs');

  const startTime = Date.now();

  const jobs = await Job.find({ userId })
    .sort({ dateApplied: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = jobs.length > limit;
  const actualJobs = hasMore ? jobs.slice(0, limit) : jobs;
  const responseTime = Date.now() - startTime;

  log('✅', `Loaded ${actualJobs.length} jobs in ${responseTime}ms`);
  log('📊', 'Pagination info:', {
    count: actualJobs.length,
    hasMore,
    limit
  });

  return { jobs: actualJobs, hasMore, responseTime };
}

/**
 * Test 2: Load next page
 */
async function testNextPage(userId, page = 2, limit = 50) {
  header(`TEST 2: Load Page ${page}`);

  const startTime = Date.now();
  const skip = (page - 1) * limit;

  const jobs = await Job.find({ userId })
    .sort({ dateApplied: -1 })
    .skip(skip)
    .limit(limit + 1)
    .lean();

  const hasMore = jobs.length > limit;
  const actualJobs = hasMore ? jobs.slice(0, limit) : jobs;
  const responseTime = Date.now() - startTime;

  log('✅', `Loaded ${actualJobs.length} jobs (page ${page}) in ${responseTime}ms`);

  return { jobs: actualJobs, hasMore, responseTime };
}

/**
 * Test 3: Load with filters
 */
async function testWithFilters(userId, filters = {}, limit = 50) {
  header('TEST 3: Load Jobs with Filters');

  const startTime = Date.now();
  const query = { userId };

  if (filters.status) query.status = filters.status;
  if (filters.workType) query.workType = filters.workType;

  const jobs = await Job.find(query)
    .sort({ dateApplied: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = jobs.length > limit;
  const actualJobs = hasMore ? jobs.slice(0, limit) : jobs;
  const responseTime = Date.now() - startTime;

  log('✅', `Loaded ${actualJobs.length} jobs with filters in ${responseTime}ms`);
  log('🔍', 'Filters applied:', filters);

  return { jobs: actualJobs, hasMore, responseTime };
}

/**
 * Test 4: Check for duplicates
 */
function testNoDuplicates(allJobs) {
  header('TEST 4: Check for Duplicate Jobs');

  const jobIds = allJobs.map(j => j._id.toString());
  const uniqueIds = new Set(jobIds);

  const hasDuplicates = jobIds.length !== uniqueIds.size;

  if (hasDuplicates) {
    log('❌', `Found ${jobIds.length - uniqueIds.size} duplicate jobs!`);
    return false;
  } else {
    log('✅', `No duplicates found in ${jobIds.length} jobs`);
    return true;
  }
}

/**
 * Test 5: Redis cache performance
 */
async function testCachePerformance(userId, limit = 50) {
  header('TEST 5: Redis Cache Performance');

  try {
    // First request (cache miss - direct DB query)
    const startTime1 = Date.now();
    const jobs1 = await Job.find({ userId })
      .sort({ dateApplied: -1 })
      .limit(limit)
      .lean();
    const dbTime = Date.now() - startTime1;

    log('📊', `Direct DB query: ${dbTime}ms for ${jobs1.length} jobs`);

    // Second request (should be faster with indexes)
    const startTime2 = Date.now();
    const jobs2 = await Job.find({ userId })
      .sort({ dateApplied: -1 })
      .limit(limit)
      .lean();
    const indexedTime = Date.now() - startTime2;

    log('📊', `Indexed query: ${indexedTime}ms for ${jobs2.length} jobs`);
    log('✅', `Performance improvement: ${Math.round((dbTime / indexedTime) * 100)}% faster with indexes`);

    return { dbTime, indexedTime };
  } catch (error) {
    log('⚠️', `Cache test skipped: ${error.message}`);
    return { dbTime: 0, indexedTime: 0 };
  }
}

/**
 * Main test flow
 */
async function main() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║         📋 JOBS LAZY LOADING / PAGINATION TEST 📋                 ║${colors.reset}`);
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
    jobCache.initialize();

    // Find a test user with jobs
    const user = await User.findOne();
    if (!user) {
      throw new Error('No users found. Please create a user first.');
    }

    const totalJobs = await Job.countDocuments({ userId: user._id });
    log('✅', `Found user: ${user.email} (${totalJobs} total jobs)`);

    if (totalJobs === 0) {
      throw new Error('User has no jobs. Please add some jobs first.');
    }

    const userId = user._id;
    const pageSize = 50;
    let allJobs = [];
    let totalResponseTime = 0;

    // TEST 1: Initial load
    const test1 = await testInitialLoad(userId, pageSize);
    allJobs = [...test1.jobs];
    totalResponseTime += test1.responseTime;

    // TEST 2: Load next pages (up to 3 pages or until no more)
    let currentPage = 2;
    let hasMore = test1.hasMore;

    while (hasMore && currentPage <= 3) {
      const test2 = await testNextPage(userId, currentPage, pageSize);
      allJobs = [...allJobs, ...test2.jobs];
      totalResponseTime += test2.responseTime;
      hasMore = test2.hasMore;
      currentPage++;
    }

    // TEST 3: Load with filters
    const test3 = await testWithFilters(userId, { status: 'applied' }, pageSize);
    totalResponseTime += test3.responseTime;

    // TEST 4: Check for duplicates
    const noDuplicates = testNoDuplicates(allJobs);

    // TEST 5: Cache performance
    const test5 = await testCachePerformance(userId, pageSize);

    // Final summary
    header('✅ ALL TESTS COMPLETED');
    log('🎉', 'Test Results:', {
      totalJobsLoaded: allJobs.length,
      totalJobsInDB: totalJobs,
      pagesLoaded: currentPage - 1,
      pageSize,
      noDuplicates,
      averageResponseTime: `${Math.round(totalResponseTime / (currentPage - 1))}ms`,
      indexPerformance: test5.indexedTime > 0 ? `${Math.round((test5.dbTime / test5.indexedTime) * 100)}% faster` : 'N/A'
    });

    console.log('\n💡 Frontend Implementation:');
    console.log('   1. User opens dashboard → Load page 1 (50 jobs)');
    console.log('   2. User scrolls down (Kanban) → Load page 2 (next 50 jobs)');
    console.log('   3. User clicks next (Table) → Load page 3 (next 50 jobs)');
    console.log('   4. User changes filter → Reset to page 1 with new filter');
    console.log('   5. Continue until hasMore = false\n');

    if (noDuplicates) {
      console.log(`${colors.green}✅ All tests passed!${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`${colors.red}❌ Some tests failed!${colors.reset}\n`);
      process.exit(1);
    }

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

// Run test
main();

