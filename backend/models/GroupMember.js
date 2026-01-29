const mongoose = require('mongoose');
const { getChatConnection } = require('../config/database');

// Group Member Schema (Uses LOCAL MongoDB)
const groupMemberSchema = new mongoose.Schema({
  // References
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Role
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member',
    required: true
  },
  
  // Member Stats
  stats: {
    jobsShared: {
      type: Number,
      default: 0
    },
    messagesPosted: {
      type: Number,
      default: 0
    },
    applicationsTracked: {
      type: Number,
      default: 0
    },
    jobsSaved: {
      type: Number,
      default: 0
    }
  },
  
  // Notification Preferences
  notifications: {
    newJobs: {
      type: Boolean,
      default: true
    },
    newMessages: {
      type: Boolean,
      default: true
    },
    mentions: {
      type: Boolean,
      default: true
    },
    applications: {
      type: Boolean,
      default: true
    }
  },
  
  // Activity Tracking
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index to prevent duplicate memberships
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

// Index for querying user's groups
groupMemberSchema.index({ userId: 1, lastActiveAt: -1 });

// Methods
groupMemberSchema.methods.updateStats = async function(statType) {
  if (this.stats[statType] !== undefined) {
    this.stats[statType] += 1;
    await this.save();
  }
};

groupMemberSchema.methods.updateLastActive = async function() {
  this.lastActiveAt = new Date();
  await this.save();
};

// Static method to get or create member
groupMemberSchema.statics.getOrCreate = async function(groupId, userId, role = 'member') {
  let member = await this.findOne({ groupId, userId });
  
  if (!member) {
    member = await this.create({
      groupId,
      userId,
      role
    });
  }
  
  return member;
};

// Use local MongoDB connection for all group features
const localConnection = getChatConnection();
module.exports = localConnection.model('GroupMember', groupMemberSchema);

