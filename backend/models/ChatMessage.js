const mongoose = require('mongoose');
const { getChatConnection } = require('../config/database');

// Chat Message Schema (OPTIONAL - for chat feature)
// Uses LOCAL MongoDB for testing
const chatMessageSchema = new mongoose.Schema({
  // Group Reference
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },

  // Sender
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message Type
  messageType: {
    type: String,
    enum: ['text', 'job_share', 'system', 'pdf_attachment'],
    default: 'text',
    required: true
  },
  
  // Message Content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  
  // If messageType is "job_share"
  sharedJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedJob'
  },

  // Job data for inline job share messages
  jobData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // PDF Attachment (for messageType === 'pdf_attachment')
  pdfAttachment: {
    fileName: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String,
      default: 'application/pdf'
    },
    s3Key: {
      type: String,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },

  // Mentions
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Reactions
  reactions: {
    thumbsUp: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    heart: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    fire: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    laugh: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Thread Support
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  replyCount: {
    type: Number,
    default: 0
  },
  
  // Edit/Delete Status
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
chatMessageSchema.index({ groupId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });

// Methods
chatMessageSchema.methods.addReaction = async function(reactionType, userId) {
  if (this.reactions[reactionType]) {
    if (!this.reactions[reactionType].includes(userId)) {
      this.reactions[reactionType].push(userId);
      await this.save();
    }
  }
};

chatMessageSchema.methods.removeReaction = async function(reactionType, userId) {
  if (this.reactions[reactionType]) {
    this.reactions[reactionType] = this.reactions[reactionType].filter(
      id => !id.equals(userId)
    );
    await this.save();
  }
};

chatMessageSchema.methods.markAsEdited = async function() {
  this.edited = true;
  this.editedAt = new Date();
  await this.save();
};

chatMessageSchema.methods.softDelete = async function() {
  this.deleted = true;
  this.deletedAt = new Date();
  this.content = '[Message deleted]';
  await this.save();
};

// Use chat connection (local MongoDB) instead of main connection
// This will use local MongoDB if available, otherwise falls back to production
const chatConnection = getChatConnection();

module.exports = chatConnection.model('ChatMessage', chatMessageSchema);

