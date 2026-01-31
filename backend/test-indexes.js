/**
 * Index Verification Script
 *
 * This script verifies that queries are using the newly created indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');
const ChatMessage = require('./models/ChatMessage');
const Group = require('./models/Group');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function header(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(70) + '\n');
}

function getIndexNameFromExplain(explain) {
  // Try different paths in the explain output
  if (explain.queryPlanner?.winningPlan?.inputStage?.indexName) {
    return explain.queryPlanner.winningPlan.inputStage.indexName;
  }
  if (explain.queryPlanner?.winningPlan?.inputStage?.inputStage?.indexName) {
    return explain.queryPlanner.winningPlan.inputStage.inputStage.indexName;
  }
  if (explain.queryPlanner?.winningPlan?.stage === 'IXSCAN') {
    return explain.queryPlanner.winningPlan.indexName || 'INDEX_SCAN';
  }
  if (explain.queryPlanner?.winningPlan?.stage === 'COLLSCAN') {
    return 'COLLECTION_SCAN (NO INDEX!)';
  }
  return 'UNKNOWN';
}

async function testJobIndexes() {
  header('Testing Job Collection Indexes');

  // Get a sample userId
  const sampleJob = await Job.findOne({});
  if (!sampleJob) {
    log('⚠️', 'No jobs in database, skipping tests');
    return;
  }

  const userId = sampleJob.userId;

  // Test 1: userId + status + dateApplied (should use idx_user_status_date)
  log('🧪', 'Test 1: Filtered query (userId + status + dateApplied)');
  const explain1 = await Job.find({ userId, status: 'applied' })
    .sort({ dateApplied: -1 })
    .limit(50)
    .explain('executionStats');

  const indexUsed1 = getIndexNameFromExplain(explain1);
  const stage1 = explain1.executionStats?.executionStages?.stage || explain1.queryPlanner?.winningPlan?.stage;

  console.log(`  Stage: ${stage1}`);
  console.log(`  Index: ${indexUsed1}`);
  console.log(`  Docs examined: ${explain1.executionStats?.totalDocsExamined}`);
  console.log(`  Docs returned: ${explain1.executionStats?.nReturned}`);

  if (stage1 === 'FETCH' || indexUsed1.includes('idx_user')) {
    log('✅', 'Using index!');
  } else {
    log('❌', 'NOT using index!');
  }

  // Test 2: userId + createdAt (should use idx_user_created)
  log('\n🧪', 'Test 2: Recent jobs query (userId + createdAt)');
  const explain2 = await Job.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .explain('executionStats');

  const indexUsed2 = getIndexNameFromExplain(explain2);
  const stage2 = explain2.executionStats?.executionStages?.stage || explain2.queryPlanner?.winningPlan?.stage;

  console.log(`  Stage: ${stage2}`);
  console.log(`  Index: ${indexUsed2}`);
  console.log(`  Docs examined: ${explain2.executionStats?.totalDocsExamined}`);
  console.log(`  Docs returned: ${explain2.executionStats?.nReturned}`);

  if (stage2 === 'FETCH' || indexUsed2.includes('idx_user')) {
    log('✅', 'Using index!');
  } else {
    log('❌', 'NOT using index!');
  }

  // Test 3: userId + workType + dateApplied (should use idx_user_worktype_date)
  log('\n🧪', 'Test 3: Work type filter (userId + workType + dateApplied)');
  const explain3 = await Job.find({ userId, workType: 'full-time' })
    .sort({ dateApplied: -1 })
    .limit(50)
    .explain('executionStats');

  const indexUsed3 = getIndexNameFromExplain(explain3);
  const stage3 = explain3.executionStats?.executionStages?.stage || explain3.queryPlanner?.winningPlan?.stage;

  console.log(`  Stage: ${stage3}`);
  console.log(`  Index: ${indexUsed3}`);
  console.log(`  Docs examined: ${explain3.executionStats?.totalDocsExamined}`);
  console.log(`  Docs returned: ${explain3.executionStats?.nReturned}`);

  if (stage3 === 'FETCH' || indexUsed3.includes('idx_user')) {
    log('✅', 'Using index!');
  } else {
    log('❌', 'NOT using index!');
  }

  // Test 4: Text search (should use text index)
  log('\n🧪', 'Test 4: Text search');
  const explain4 = await Job.find({ $text: { $search: 'engineer' } })
    .limit(20)
    .explain('executionStats');

  const stage4 = explain4.executionStats?.executionStages?.stage || explain4.queryPlanner?.winningPlan?.stage;

  console.log(`  Stage: ${stage4}`);
  console.log(`  Docs examined: ${explain4.executionStats?.totalDocsExamined}`);
  console.log(`  Docs returned: ${explain4.executionStats?.nReturned}`);

  if (stage4 === 'TEXT' || stage4 === 'TEXT_OR') {
    log('✅', 'Using text index!');
  } else {
    log('❌', 'NOT using text index!');
  }
}

async function testChatMessageIndexes() {
  header('Testing ChatMessage Collection Indexes');

  const sampleMessage = await ChatMessage.findOne({});
  if (!sampleMessage) {
    log('⚠️', 'No messages in database, skipping tests');
    return;
  }

  const groupId = sampleMessage.groupId;

  // Test: groupId + createdAt + deleted (should use idx_group_time_deleted)
  log('🧪', 'Test: Group messages query (groupId + createdAt + deleted)');
  const explain1 = await ChatMessage.find({ groupId, deleted: false })
    .sort({ createdAt: -1 })
    .limit(50)
    .explain('executionStats');

  const indexUsed1 = getIndexNameFromExplain(explain1);
  const stage1 = explain1.executionStats?.executionStages?.stage || explain1.queryPlanner?.winningPlan?.stage;

  console.log(`  Stage: ${stage1}`);
  console.log(`  Index: ${indexUsed1}`);
  console.log(`  Docs examined: ${explain1.executionStats?.totalDocsExamined}`);
  console.log(`  Docs returned: ${explain1.executionStats?.nReturned}`);

  if (stage1 === 'FETCH' || indexUsed1.includes('idx_group')) {
    log('✅', 'Using index!');
  } else {
    log('❌', 'NOT using index!');
  }
}

async function testGroupIndexes() {
  header('Testing Group Collection Indexes');

  const sampleGroup = await Group.findOne({});
  if (!sampleGroup || !sampleGroup.members || sampleGroup.members.length === 0) {
    log('⚠️', 'No groups with members in database, skipping tests');
    return;
  }

  const userId = sampleGroup.members[0].userId || sampleGroup.members[0];

  // Test: Find groups by member (should use idx_group_members)
  log('🧪', 'Test: Find groups by member (members.userId)');
  const explain1 = await Group.find({ 'members.userId': userId })
    .explain('executionStats');

  const indexUsed1 = getIndexNameFromExplain(explain1);
  const stage1 = explain1.executionStats?.executionStages?.stage || explain1.queryPlanner?.winningPlan?.stage;

  console.log(`  Stage: ${stage1}`);
  console.log(`  Index: ${indexUsed1}`);
  console.log(`  Docs examined: ${explain1.executionStats?.totalDocsExamined}`);
  console.log(`  Docs returned: ${explain1.executionStats?.nReturned}`);

  if (stage1 === 'FETCH' || indexUsed1.includes('idx_group')) {
    log('✅', 'Using index!');
  } else {
    log('❌', 'NOT using index!');
  }
}

async function main() {
  try {
    console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║         📊 INDEX VERIFICATION TEST SUITE 📊                        ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║                                                                    ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    log('🔌', 'Connecting to MongoDB...');
    const { connectDB } = require('./config/database');
    await connectDB();
    log('✅', 'Connected to MongoDB');

    // Run tests
    await testJobIndexes();
    await testChatMessageIndexes();
    await testGroupIndexes();

    // Summary
    header('✅ VERIFICATION COMPLETE');
    log('🎉', 'Check the results above to see which queries are using indexes');
    log('💡', 'Queries should show "FETCH" stage (index + fetch) or specific index names');
    log('⚠️', 'If you see "COLLSCAN", the query is NOT using an index');

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error);
    process.exit(1);
  } finally {
    log('\n🧹', 'Disconnecting from MongoDB...');
    await mongoose.disconnect();
    log('✅', 'Disconnected');
    process.exit(0);
  }
}

main();
