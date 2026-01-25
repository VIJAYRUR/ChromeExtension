const mongoose = require('mongoose');

// Analytics Schema - For tracking user activity and generating insights
const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Daily aggregated stats
  date: {
    type: Date,
    required: true,
    index: true
  },

  // Application metrics
  applications: {
    total: { type: Number, default: 0 },
    byStatus: {
      saved: { type: Number, default: 0 },
      applied: { type: Number, default: 0 },
      screening: { type: Number, default: 0 },
      interview: { type: Number, default: 0 },
      offer: { type: Number, default: 0 },
      rejected: { type: Number, default: 0 },
      withdrawn: { type: Number, default: 0 }
    },
    bySource: {
      LinkedIn: { type: Number, default: 0 },
      Indeed: { type: Number, default: 0 },
      Glassdoor: { type: Number, default: 0 },
      CompanyWebsite: { type: Number, default: 0 },
      Referral: { type: Number, default: 0 },
      Other: { type: Number, default: 0 }
    },
    byWorkType: {
      Remote: { type: Number, default: 0 },
      Onsite: { type: Number, default: 0 },
      Hybrid: { type: Number, default: 0 }
    }
  },

  // Response metrics
  responses: {
    total: { type: Number, default: 0 },
    positive: { type: Number, default: 0 }, // Moved to interview/offer
    negative: { type: Number, default: 0 }, // Rejections
    pending: { type: Number, default: 0 }
  },

  // Interview metrics
  interviews: {
    scheduled: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 }
  },

  // Activity metrics
  activity: {
    jobsViewed: { type: Number, default: 0 },
    notesAdded: { type: Number, default: 0 },
    profileUpdates: { type: Number, default: 0 }
  }

}, {
  timestamps: true
});

// Compound index for efficient queries
analyticsSchema.index({ userId: 1, date: -1 });

// Static method to get or create today's analytics
analyticsSchema.statics.getOrCreateToday = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let analytics = await this.findOne({ userId, date: today });

  if (!analytics) {
    analytics = await this.create({ userId, date: today });
  }

  return analytics;
};

// Static method to get analytics for a date range
analyticsSchema.statics.getRange = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

// Static method to get weekly summary
analyticsSchema.statics.getWeeklySummary = async function(userId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const analytics = await this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  });

  // Aggregate the weekly data
  const summary = {
    totalApplications: 0,
    totalResponses: 0,
    totalInterviews: 0,
    responseRate: 0,
    dailyBreakdown: []
  };

  analytics.forEach(day => {
    summary.totalApplications += day.applications.total;
    summary.totalResponses += day.responses.total;
    summary.totalInterviews += day.interviews.completed;
    summary.dailyBreakdown.push({
      date: day.date,
      applications: day.applications.total,
      responses: day.responses.total
    });
  });

  if (summary.totalApplications > 0) {
    summary.responseRate = ((summary.totalResponses / summary.totalApplications) * 100).toFixed(1);
  }

  return summary;
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
