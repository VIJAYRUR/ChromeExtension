/**
 * Script to fix job_share messages that are missing jobData
 * This will delete old job_share messages that don't have jobData
 * so users can share fresh jobs with the new format
 */

const mongoose = require('mongoose');

async function fixJobShareMessages() {
  try {
    console.log('🔧 Starting job_share message cleanup...\n');

    // Connect directly to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobtracker-chat';
    console.log('📡 Connecting to:', MONGODB_URI);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get ChatMessage collection directly
    const ChatMessage = mongoose.connection.collection('chatmessages');

    // Find all job_share messages
    const allJobShareMessages = await ChatMessage.find({ messageType: 'job_share' }).toArray();
    console.log(`📊 Found ${allJobShareMessages.length} job_share messages\n`);

    // Find job_share messages without jobData
    const messagesWithoutJobData = allJobShareMessages.filter(msg => !msg.jobData);
    console.log(`❌ ${messagesWithoutJobData.length} messages are missing jobData`);
    console.log(`✅ ${allJobShareMessages.length - messagesWithoutJobData.length} messages have jobData\n`);

    if (messagesWithoutJobData.length > 0) {
      console.log('🗑️  Deleting messages without jobData...');

      const idsToDelete = messagesWithoutJobData.map(msg => msg._id);
      const result = await ChatMessage.deleteMany({ _id: { $in: idsToDelete } });

      console.log(`✅ Deleted ${result.deletedCount} old job_share messages\n`);
    } else {
      console.log('✅ All job_share messages have jobData - nothing to delete\n');
    }

    console.log('🎉 Cleanup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Share a new job from the Kanban board');
    console.log('   2. It should appear as a rich job card in the chat');
    console.log('   3. Click "Save to Jobs" to save it to your Saved column\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixJobShareMessages();

