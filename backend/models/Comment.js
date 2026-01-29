const mongoose = require('mongoose');
const { getChatConnection } = require('../config/database');

// Comment Schema (Uses LOCAL MongoDB)
const commentSchema = new mongoose.Schema({
  // Reference to Shared Job
  sharedJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedJob',
    required: true,
    index: true
  },
  
  // Commenter
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Comment Content
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  
  // Reactions
  reactions: {
    thumbsUp: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    heart: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Thread Support (for replies)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
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

// Indexes
commentSchema.index({ sharedJobId: 1, createdAt: -1 });
commentSchema.index({ userId: 1 });

// Methods
commentSchema.methods.addReaction = async function(reactionType, userId) {
  if (this.reactions[reactionType]) {
    if (!this.reactions[reactionType].includes(userId)) {
      this.reactions[reactionType].push(userId);
      await this.save();
    }
  }
};

commentSchema.methods.removeReaction = async function(reactionType, userId) {
  if (this.reactions[reactionType]) {
    this.reactions[reactionType] = this.reactions[reactionType].filter(
      id => !id.equals(userId)
    );
    await this.save();
  }
};

commentSchema.methods.markAsEdited = async function() {
  this.edited = true;
  this.editedAt = new Date();
  await this.save();
};

commentSchema.methods.softDelete = async function() {
  this.deleted = true;
  this.deletedAt = new Date();
  this.content = '[Comment deleted]';
  await this.save();
};

// Use local MongoDB connection for all group features
const localConnection = getChatConnection();
module.exports = localConnection.model('Comment', commentSchema);

