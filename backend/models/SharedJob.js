const mongoose = require('mongoose');
const { getChatConnection } = require('../config/database');

// Shared Job Schema (Uses LOCAL MongoDB)

// Sub-schema for users who applied
const appliedBySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'],
    default: 'applied'
  }
}, { _id: false });

// Shared Job Schema
const sharedJobSchema = new mongoose.Schema({
  // Group Reference
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  
  // Shared By
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Full Job Details (same as Job model)
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    index: true
  },
  description: { type: String },
  descriptionHtml: { type: String }, // Preserved HTML formatting
  
  // Location & Work Type
  location: { type: String, trim: true },
  workType: {
    type: String,
    enum: ['Remote', 'On-site', 'Onsite', 'Hybrid', 'Not specified'],
    default: 'Not specified'
  },
  
  // Compensation
  salary: { type: String, trim: true },
  
  // Source & Links
  linkedinUrl: { type: String, trim: true },
  jobUrl: { type: String, trim: true },
  linkedinJobId: { type: String, index: true },
  source: {
    type: String,
    enum: ['LinkedIn', 'Indeed', 'Glassdoor', 'Company Website', 'Referral', 'Other', 'Manual'],
    default: 'Manual'
  },
  
  // Timing Data (if from LinkedIn)
  jobPostedHoursAgo: { type: Number },
  applicantCount: { type: Number },
  timeToApplyBucket: { type: String },
  competitionBucket: { type: String },
  
  // Sharing Metadata
  sharedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  sharedNote: {
    type: String,
    maxlength: [500, 'Note cannot exceed 500 characters']
  },
  
  // Engagement Stats
  stats: {
    views: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  },
  
  // Reactions
  reactions: {
    upvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    downvotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    fire: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    heart: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Who saved/applied
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  appliedBy: [appliedBySchema],
  
  // Comments (references to Comment documents)
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
sharedJobSchema.index({ groupId: 1, sharedAt: -1 });
sharedJobSchema.index({ groupId: 1, company: 1 });
sharedJobSchema.index({ groupId: 1, workType: 1 });

// Methods
sharedJobSchema.methods.incrementSaves = async function() {
  this.stats.saves += 1;
  await this.save();
};

sharedJobSchema.methods.incrementApplications = async function() {
  this.stats.applications += 1;
  await this.save();
};

sharedJobSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Use local MongoDB connection for all group features
const localConnection = getChatConnection();
module.exports = localConnection.model('SharedJob', sharedJobSchema);

