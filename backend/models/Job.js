const mongoose = require('mongoose');

// Sub-schema for timeline events
const timelineEventSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  event: { type: String, required: true },
  type: {
    type: String,
    enum: ['created', 'status_change', 'update', 'note', 'interview', 'follow_up', 'offer', 'rejection', 'custom'],
    default: 'custom'
  },
  note: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed } // Flexible field for additional data
}, { _id: true });

// Sub-schema for interview details
const interviewSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  time: { type: String },
  type: {
    type: String,
    enum: ['phone', 'video', 'onsite', 'technical', 'behavioral', 'panel', 'other'],
    default: 'video'
  },
  interviewerName: { type: String },
  interviewerTitle: { type: String },
  location: { type: String }, // For onsite interviews
  meetingLink: { type: String }, // For video interviews
  notes: { type: String },
  feedback: { type: String },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  }
}, { _id: true });

// Sub-schema for attached files
const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String },
  size: { type: Number },
  data: { type: String }, // Base64 or URL
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

// Main Job Schema
const jobSchema = new mongoose.Schema({
  // Reference to user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Core Job Information
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
  descriptionHtml: { type: String }, // Original HTML for rich display

  // Location & Work Type
  location: { type: String, trim: true, index: true },
  workType: {
    type: String,
    enum: ['Remote', 'On-site', 'Onsite', 'Hybrid', 'Not specified'],
    default: 'Not specified',
    index: true
  },

  // Compensation
  salary: { type: String, trim: true },
  salaryMin: { type: Number }, // For filtering/sorting
  salaryMax: { type: Number },
  salaryCurrency: { type: String, default: 'USD' },
  salaryPeriod: {
    type: String,
    enum: ['hourly', 'yearly', 'monthly', 'weekly', ''],
    default: ''
  },

  // Source & Links
  linkedinUrl: { type: String, trim: true },
  jobUrl: { type: String, trim: true }, // Generic job URL
  linkedinJobId: { type: String, index: true }, // For duplicate detection
  source: {
    type: String,
    enum: ['LinkedIn', 'Indeed', 'Glassdoor', 'Company Website', 'Referral', 'Other', 'Manual'],
    default: 'Manual'
  },

  // Application Status
  status: {
    type: String,
    enum: ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn', 'archived'],
    default: 'applied',
    index: true
  },
  statusUpdatedAt: { type: Date, default: Date.now },

  // Dates
  dateApplied: { type: Date, default: Date.now, index: true },
  dateSaved: { type: Date },
  deadline: { type: Date },
  followUpDate: { type: Date },

  // Timeline & History
  timeline: [timelineEventSchema],

  // Interviews
  interviews: [interviewSchema],

  // Organization & Priority
  tags: [{ type: String, trim: true, index: true }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  rating: { type: Number, min: 1, max: 5 }, // User's interest rating

  // Contact Information
  contactPerson: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  contactLinkedIn: { type: String, trim: true },
  recruiterName: { type: String, trim: true },

  // Notes & Attachments
  notes: { type: String },
  coverLetter: { type: String }, // Custom cover letter for this job
  attachments: [attachmentSchema],
  resumeUsed: attachmentSchema, // DEPRECATED: Old base64 storage (kept for backward compatibility)

  // S3 Resume Storage (NEW)
  resumeFileName: { type: String },
  resumeFileType: { type: String },
  resumeFileSize: { type: Number },
  resumeS3Key: { type: String }, // S3 object key for the resume
  resumeUploadedAt: { type: Date },

  // Company Information (for enrichment)
  companyInfo: {
    website: { type: String },
    industry: { type: String },
    size: { type: String },
    founded: { type: Number },
    headquarters: { type: String },
    linkedinUrl: { type: String },
    glassdoorRating: { type: Number }
  },

  // Job Requirements (parsed from description)
  requirements: {
    yearsOfExperience: { type: String },
    education: { type: String },
    skills: [{ type: String }],
    certifications: [{ type: String }]
  },

  // User Actions
  isArchived: { type: Boolean, default: false, index: true },
  isFavorite: { type: Boolean, default: false },
  isHidden: { type: Boolean, default: false },

  // Analytics
  viewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date },

  // External IDs (for future integrations)
  externalIds: {
    linkedinJobId: { type: String },
    indeedJobId: { type: String },
    glassdoorJobId: { type: String }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
jobSchema.index({ userId: 1, status: 1 });
jobSchema.index({ userId: 1, dateApplied: -1 });
jobSchema.index({ userId: 1, company: 1, title: 1 }); // For duplicate detection
jobSchema.index({ userId: 1, tags: 1 });
jobSchema.index({ userId: 1, isArchived: 1, status: 1 });

// Text search index
jobSchema.index({
  company: 'text',
  title: 'text',
  description: 'text',
  location: 'text',
  notes: 'text'
});

// Virtual for days since applied
jobSchema.virtual('daysSinceApplied').get(function() {
  if (!this.dateApplied) return null;
  const now = new Date();
  const applied = new Date(this.dateApplied);
  const diffTime = Math.abs(now - applied);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for next interview
jobSchema.virtual('nextInterview').get(function() {
  if (!this.interviews || this.interviews.length === 0) return null;
  const upcoming = this.interviews
    .filter(i => i.status === 'scheduled' && new Date(i.date) > new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || null;
});

// Pre-save middleware to update statusUpdatedAt
jobSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusUpdatedAt = new Date();
  }
  next();
});

// Pre-save middleware to add timeline entry on status change
jobSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      date: new Date(),
      event: `Status changed to ${this.status}`,
      type: 'status_change'
    });
  }
  next();
});

// Static method to find duplicates for a user
jobSchema.statics.findDuplicates = async function(userId, company, title, linkedinJobId) {
  const query = { userId };

  if (linkedinJobId) {
    // Check by LinkedIn job ID first (most reliable)
    query['externalIds.linkedinJobId'] = linkedinJobId;
    const byLinkedIn = await this.findOne(query);
    if (byLinkedIn) return byLinkedIn;
  }

  // Check by company + title (fuzzy match)
  return this.findOne({
    userId,
    company: { $regex: new RegExp(`^${company}$`, 'i') },
    title: { $regex: new RegExp(`^${title}$`, 'i') }
  });
};

// Static method to get statistics for a user
jobSchema.statics.getStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isArchived: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    byStatus: {}
  };

  stats.forEach(s => {
    result.byStatus[s._id] = s.count;
    result.total += s.count;
  });

  return result;
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
