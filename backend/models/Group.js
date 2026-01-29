const mongoose = require('mongoose');
const crypto = require('crypto');
const { getChatConnection } = require('../config/database');

// Group Schema (Uses LOCAL MongoDB)
const groupSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Group Type
  type: {
    type: String,
    enum: ['public', 'private'],
    default: 'private',
    required: true
  },
  
  // Creator and Admins
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Cached member count for performance
  memberCount: {
    type: Number,
    default: 1
  },
  
  // Invite Code for joining
  inviteCode: {
    type: String,
    unique: true,
    index: true
  },
  
  // Group Settings
  settings: {
    allowJobSharing: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    allowGuestView: {
      type: Boolean,
      default: false
    }
  },
  
  // Statistics
  stats: {
    totalJobsShared: {
      type: Number,
      default: 0
    },
    totalApplications: {
      type: Number,
      default: 0
    },
    totalMessages: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Deletion tracking (for audit purposes)
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
groupSchema.index({ type: 1, isActive: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ createdBy: 1 });

// Generate unique invite code
groupSchema.methods.generateInviteCode = function() {
  const code = crypto.randomBytes(6).toString('hex').toUpperCase();
  this.inviteCode = code;
  return code;
};

// Add member to group
groupSchema.methods.addMember = async function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.memberCount = this.members.length;
    await this.save();
  }
};

// Remove member from group
groupSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(id => !id.equals(userId));
  this.admins = this.admins.filter(id => !id.equals(userId));
  this.moderators = this.moderators.filter(id => !id.equals(userId));
  this.memberCount = this.members.length;
  await this.save();
};

// Check if user is admin
groupSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.equals(userId));
};

// Check if user is moderator or admin
groupSchema.methods.isModerator = function(userId) {
  return this.admins.some(id => id.equals(userId)) || 
         this.moderators.some(id => id.equals(userId));
};

// Check if user is member
groupSchema.methods.isMember = function(userId) {
  return this.members.some(id => id.equals(userId));
};

// Pre-save middleware to generate invite code
groupSchema.pre('save', function(next) {
  if (this.isNew && !this.inviteCode) {
    this.generateInviteCode();
  }
  next();
});

// Use local MongoDB connection for all group features
const localConnection = getChatConnection();

// Register User model on local connection if not already registered
// This allows Group to populate User fields
if (!localConnection.models.User) {
  const UserModel = require('./User');
  const userSchema = UserModel.schema;
  localConnection.model('User', userSchema);
}

module.exports = localConnection.model('Group', groupSchema);

