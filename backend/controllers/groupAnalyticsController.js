const SharedJob = require('../models/SharedJob');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get group analytics
// @route   GET /api/groups/:groupId/analytics
// @access  Private (Members only)
const getGroupAnalytics = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  
  if (!group) {
    throw new AppError('Group not found', 404);
  }
  
  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view analytics', 403);
  }
  
  // Get all shared jobs for this group
  const sharedJobs = await SharedJob.find({
    groupId: req.params.groupId,
    isActive: true
  });
  
  // Calculate analytics
  const totalJobsShared = sharedJobs.length;
  const totalSaves = sharedJobs.reduce((sum, job) => sum + job.stats.saves, 0);
  const totalApplications = sharedJobs.reduce((sum, job) => sum + job.stats.applications, 0);
  const totalViews = sharedJobs.reduce((sum, job) => sum + job.stats.views, 0);
  
  // Top companies by job shares
  const companyStats = {};
  sharedJobs.forEach(job => {
    if (!companyStats[job.company]) {
      companyStats[job.company] = {
        company: job.company,
        jobsShared: 0,
        applications: 0,
        saves: 0
      };
    }
    companyStats[job.company].jobsShared += 1;
    companyStats[job.company].applications += job.stats.applications;
    companyStats[job.company].saves += job.stats.saves;
  });
  
  const topCompanies = Object.values(companyStats)
    .sort((a, b) => b.jobsShared - a.jobsShared)
    .slice(0, 10);
  
  // Work type distribution
  const workTypeStats = {};
  sharedJobs.forEach(job => {
    const type = job.workType || 'Not specified';
    workTypeStats[type] = (workTypeStats[type] || 0) + 1;
  });
  
  // Application success rate (if we have status data)
  const applicationsByStatus = {};
  sharedJobs.forEach(job => {
    job.appliedBy.forEach(app => {
      const status = app.status || 'applied';
      applicationsByStatus[status] = (applicationsByStatus[status] || 0) + 1;
    });
  });
  
  // Member leaderboard
  const members = await GroupMember.find({ groupId: req.params.groupId })
    .populate('userId', 'firstName lastName')
    .sort({ 'stats.jobsShared': -1 })
    .limit(10);
  
  const leaderboard = members.map(m => ({
    userId: m.userId._id,
    name: `${m.userId.firstName} ${m.userId.lastName}`,
    jobsShared: m.stats.jobsShared,
    messagesPosted: m.stats.messagesPosted,
    applicationsTracked: m.stats.applicationsTracked,
    jobsSaved: m.stats.jobsSaved
  }));
  
  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentJobs = await SharedJob.countDocuments({
    groupId: req.params.groupId,
    sharedAt: { $gte: sevenDaysAgo }
  });
  
  res.json({
    success: true,
    data: {
      overview: {
        totalJobsShared,
        totalSaves,
        totalApplications,
        totalViews,
        saveRate: totalJobsShared > 0 ? ((totalSaves / totalJobsShared) * 100).toFixed(1) : 0,
        applicationRate: totalJobsShared > 0 ? ((totalApplications / totalJobsShared) * 100).toFixed(1) : 0
      },
      topCompanies,
      workTypeDistribution: workTypeStats,
      applicationsByStatus,
      leaderboard,
      recentActivity: {
        jobsSharedLast7Days: recentJobs
      }
    }
  });
});

// @desc    Get member stats
// @route   GET /api/groups/:groupId/analytics/member/:userId
// @access  Private (Members only)
const getMemberStats = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  
  if (!group) {
    throw new AppError('Group not found', 404);
  }
  
  // Check if requester is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view stats', 403);
  }
  
  const targetUserId = req.params.userId || req.userId;
  
  const member = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: targetUserId
  }).populate('userId', 'firstName lastName email');
  
  if (!member) {
    throw new AppError('Member not found', 404);
  }
  
  // Get jobs shared by this member
  const jobsShared = await SharedJob.find({
    groupId: req.params.groupId,
    sharedBy: targetUserId,
    isActive: true
  }).select('company title stats sharedAt');
  
  // Calculate engagement on their shared jobs
  const totalEngagement = jobsShared.reduce((sum, job) => {
    return sum + job.stats.saves + job.stats.applications + job.stats.comments;
  }, 0);
  
  res.json({
    success: true,
    data: {
      member: {
        userId: member.userId._id,
        name: `${member.userId.firstName} ${member.userId.lastName}`,
        email: member.userId.email,
        role: member.role,
        joinedAt: member.joinedAt
      },
      stats: member.stats,
      jobsShared,
      totalEngagement
    }
  });
});

module.exports = {
  getGroupAnalytics,
  getMemberStats
};

