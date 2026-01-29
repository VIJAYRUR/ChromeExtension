const User = require('./User');
const Job = require('./Job');
const Analytics = require('./Analytics');

// Group Collaboration Models
const Group = require('./Group');
const SharedJob = require('./SharedJob');
const GroupMember = require('./GroupMember');
const Comment = require('./Comment');
const ChatMessage = require('./ChatMessage');

module.exports = {
  User,
  Job,
  Analytics,
  // Group Collaboration
  Group,
  SharedJob,
  GroupMember,
  Comment,
  ChatMessage
};
