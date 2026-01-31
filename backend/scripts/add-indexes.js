/**
 * Database Indexing Migration Script
 *
 * This script creates optimized indexes for:
 * - Jobs collection (for fast queries and filtering)
 * - ChatMessages collection (for chat history)
 * - Groups collection (for member lookups)
 *
 * Expected Performance Impact:
 * - 2-3x faster job queries
 * - Faster text searches
 * - Improved compound filter queries
 */

require('dotenv').config();
const mongoose = require('mongoose');

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

// Helper function to safely create index
async function safeCreateIndex(collection, keys, options, description) {
  try {
    log('📊', `Creating ${description}...`);
    await collection.createIndex(keys, options);
    log('✅', `Created: ${options.name}`);
    return true;
  } catch (error) {
    if (error.code === 85 || error.code === 86) {
      // Index already exists
      log('⏭️', `Skipped: ${options.name} (already exists)`);
      return false;
    }
    throw error;
  }
}

async function createJobIndexes() {
  header('Creating Job Collection Indexes');

  const Job = mongoose.connection.collection('jobs');

  try {
    // 1. Compound index for common filtered queries (userId + status + date sorting)
    await safeCreateIndex(
      Job,
      { userId: 1, status: 1, dateApplied: -1 },
      { name: 'idx_user_status_date', background: true },
      'compound index: userId + status + dateApplied'
    );

    // 2. Compound index for userId + createdAt (for recent jobs sorting)
    await safeCreateIndex(
      Job,
      { userId: 1, createdAt: -1 },
      { name: 'idx_user_created', background: true },
      'compound index: userId + createdAt'
    );

    // 3. Compound index for userId + workType + dateApplied
    await safeCreateIndex(
      Job,
      { userId: 1, workType: 1, dateApplied: -1 },
      { name: 'idx_user_worktype_date', background: true },
      'compound index: userId + workType + dateApplied'
    );

    // 4. Text search index for company, title, location
    log('📊', 'Checking text search index...');
    const existingIndexes = await Job.indexes();
    const hasTextIndex = existingIndexes.some(idx => idx.key && idx.key._fts === 'text');

    if (hasTextIndex) {
      log('⏭️', 'Text index already exists, skipping (MongoDB allows only one text index per collection)');
      const textIndex = existingIndexes.find(idx => idx.key && idx.key._fts === 'text');
      log('ℹ️', `Existing text index: ${textIndex.name}`);
    } else {
      await Job.createIndex(
        {
          company: 'text',
          title: 'text',
          location: 'text'
        },
        {
          name: 'idx_text_search',
          background: true,
          weights: {
            company: 3,  // Higher weight for company name
            title: 2,    // Medium weight for job title
            location: 1  // Lower weight for location
          }
        }
      );
      log('✅', 'Created: idx_text_search');
    }

    // 5. Index for isArchived flag (for filtering archived jobs)
    await safeCreateIndex(
      Job,
      { userId: 1, isArchived: 1 },
      { name: 'idx_user_archived', background: true },
      'index: userId + isArchived'
    );

    // 6. Index for priority filtering
    await safeCreateIndex(
      Job,
      { userId: 1, priority: 1 },
      { name: 'idx_user_priority', background: true },
      'index: userId + priority'
    );

    log('🎉', `All job indexes created successfully!`);
  } catch (error) {
    log('❌', `Error creating job indexes: ${error.message}`);
    throw error;
  }
}

async function createChatMessageIndexes() {
  header('Creating ChatMessage Collection Indexes');

  const ChatMessage = mongoose.connection.collection('chatmessages');

  try {
    // 1. Compound index for group messages (groupId + createdAt + deleted)
    await safeCreateIndex(
      ChatMessage,
      { groupId: 1, createdAt: -1, deleted: 1 },
      { name: 'idx_group_time_deleted', background: true },
      'compound index: groupId + createdAt + deleted'
    );

    // 2. Index for finding messages by user
    await safeCreateIndex(
      ChatMessage,
      { userId: 1, createdAt: -1 },
      { name: 'idx_user_messages', background: true },
      'index: userId + createdAt'
    );

    log('🎉', `All chat message indexes created successfully!`);
  } catch (error) {
    log('❌', `Error creating chat message indexes: ${error.message}`);
    throw error;
  }
}

async function createGroupIndexes() {
  header('Creating Group Collection Indexes');

  const Group = mongoose.connection.collection('groups');

  try {
    // 1. Index for finding groups by member
    await safeCreateIndex(
      Group,
      { 'members.userId': 1 },
      { name: 'idx_group_members', background: true },
      'index: members.userId'
    );

    // 2. Index for finding groups by creator
    await safeCreateIndex(
      Group,
      { createdBy: 1 },
      { name: 'idx_group_creator', background: true },
      'index: createdBy'
    );

    // 3. Index for public groups
    await safeCreateIndex(
      Group,
      { isPublic: 1, createdAt: -1 },
      { name: 'idx_public_groups', background: true },
      'index: isPublic + createdAt'
    );

    log('🎉', `All group indexes created successfully!`);
  } catch (error) {
    log('❌', `Error creating group indexes: ${error.message}`);
    throw error;
  }
}

async function listAllIndexes() {
  header('Listing All Indexes');

  try {
    // Jobs collection
    const Job = mongoose.connection.collection('jobs');
    const jobIndexes = await Job.indexes();
    log('📋', `Job Collection Indexes (${jobIndexes.length} total):`);
    jobIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // ChatMessages collection
    const ChatMessage = mongoose.connection.collection('chatmessages');
    const chatIndexes = await ChatMessage.indexes();
    log('\n📋', `ChatMessage Collection Indexes (${chatIndexes.length} total):`);
    chatIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Groups collection
    const Group = mongoose.connection.collection('groups');
    const groupIndexes = await Group.indexes();
    log('\n📋', `Group Collection Indexes (${groupIndexes.length} total):`);
    groupIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Calculate total index sizes
    try {
      log('\n📊', 'Index Statistics:');
      const jobStats = await Job.stats();
      const chatStats = await ChatMessage.stats();
      const groupStats = await Group.stats();

      if (jobStats && jobStats.totalIndexSize) {
        console.log(`  Jobs collection: ${(jobStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      }
      if (chatStats && chatStats.totalIndexSize) {
        console.log(`  ChatMessages collection: ${(chatStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      }
      if (groupStats && groupStats.totalIndexSize) {
        console.log(`  Groups collection: ${(groupStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      }
      if (jobStats && chatStats && groupStats) {
        const total = (jobStats.totalIndexSize || 0) + (chatStats.totalIndexSize || 0) + (groupStats.totalIndexSize || 0);
        console.log(`  Total index size: ${(total / 1024 / 1024).toFixed(2)} MB`);
      }
    } catch (statsError) {
      log('⚠️', 'Unable to fetch index statistics (non-critical)');
    }

  } catch (error) {
    log('❌', `Error listing indexes: ${error.message}`);
    throw error;
  }
}

async function testQueryPerformance() {
  header('Testing Query Performance');

  const Job = mongoose.connection.collection('jobs');

  try {
    // Get a sample userId from the database
    const sampleJob = await Job.findOne({});
    if (!sampleJob) {
      log('⚠️', 'No jobs in database, skipping performance test');
      return;
    }

    const userId = sampleJob.userId;

    // Test 1: Query with compound index (userId + status + dateApplied)
    log('🧪', 'Test 1: Filtered query (userId + status + dateApplied)...');
    const start1 = Date.now();
    const result1 = await Job.find({
      userId: userId,
      status: 'applied'
    }).sort({ dateApplied: -1 }).limit(50).toArray();
    const time1 = Date.now() - start1;
    log('✓', `Query returned ${result1.length} jobs in ${time1}ms`);

    // Get explain plan
    const explain1 = await Job.find({
      userId: userId,
      status: 'applied'
    }).sort({ dateApplied: -1 }).limit(50).explain();
    log('📊', `Index used: ${explain1.queryPlanner.winningPlan.inputStage?.indexName || 'NONE'}`);

    // Test 2: Text search query
    log('\n🧪', 'Test 2: Text search query...');
    const start2 = Date.now();
    const result2 = await Job.find({
      $text: { $search: 'engineer' }
    }).limit(20).toArray();
    const time2 = Date.now() - start2;
    log('✓', `Search returned ${result2.length} jobs in ${time2}ms`);

    // Test 3: Work type filter
    log('\n🧪', 'Test 3: Work type filter query...');
    const start3 = Date.now();
    const result3 = await Job.find({
      userId: userId,
      workType: 'full-time'
    }).sort({ dateApplied: -1 }).limit(50).toArray();
    const time3 = Date.now() - start3;
    log('✓', `Query returned ${result3.length} jobs in ${time3}ms`);

    const explain3 = await Job.find({
      userId: userId,
      workType: 'full-time'
    }).sort({ dateApplied: -1 }).limit(50).explain();
    log('📊', `Index used: ${explain3.queryPlanner.winningPlan.inputStage?.indexName || 'NONE'}`);

    log('\n🎉', 'Performance tests completed!');
    log('💡', 'All queries should be using indexes (not COLLSCAN)');

  } catch (error) {
    log('❌', `Error testing query performance: ${error.message}`);
  }
}

async function main() {
  try {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║         🗄️  DATABASE INDEXING MIGRATION SCRIPT 🗄️                  ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Connect to MongoDB
    log('🔌', 'Connecting to MongoDB...');
    const { connectDB } = require('../config/database');
    await connectDB();
    log('✅', 'Connected to MongoDB');

    // Create indexes
    await createJobIndexes();
    await createChatMessageIndexes();
    await createGroupIndexes();

    // List all indexes
    await listAllIndexes();

    // Test query performance
    await testQueryPerformance();

    // Final summary
    header('✅ MIGRATION COMPLETED SUCCESSFULLY');
    log('🎉', 'All indexes have been created!');
    log('📌', 'Expected improvements:');
    console.log('  - 2-3x faster job queries');
    console.log('  - Instant text search');
    console.log('  - Optimized filtered queries');
    console.log('  - Faster chat message loading');
    console.log('  - Efficient group member lookups');

  } catch (error) {
    console.error(`\n${colors.red}❌ Migration failed:${colors.reset}`, error);
    process.exit(1);
  } finally {
    // Disconnect
    log('\n🧹', 'Disconnecting from MongoDB...');
    await mongoose.disconnect();
    log('✅', 'Disconnected');
    process.exit(0);
  }
}

// Run migration
main();
