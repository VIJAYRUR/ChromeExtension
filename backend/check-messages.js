/**
 * Quick script to check message counts for all groups
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ChatMessage = require('./models/ChatMessage');
const Group = require('./models/Group');

async function checkMessageCounts() {
  try {
    // Connect to MongoDB
    const { connectDB } = require('./config/database');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get all groups
    const groups = await Group.find();
    console.log(`Found ${groups.length} groups:\n`);

    for (const group of groups) {
      // Count all messages (including deleted)
      const totalMessages = await ChatMessage.countDocuments({ groupId: group._id });

      // Count non-deleted messages
      const activeMessages = await ChatMessage.countDocuments({
        groupId: group._id,
        deleted: false
      });

      // Count deleted messages
      const deletedMessages = await ChatMessage.countDocuments({
        groupId: group._id,
        deleted: true
      });

      console.log(`📊 Group: ${group.name}`);
      console.log(`   ID: ${group._id}`);
      console.log(`   Total messages: ${totalMessages}`);
      console.log(`   Active messages: ${activeMessages}`);
      console.log(`   Deleted messages: ${deletedMessages}`);
      console.log('');
    }

    await mongoose.disconnect();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMessageCounts();
