const SharedJob = require('../models/SharedJob');
const Job = require('../models/Job');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getSocketIO } = require('../socket/socketHelper');

// @desc    Share job to group
// @route   POST /api/groups/:groupId/jobs
// @access  Private (Members only)
const shareJob = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  
  if (!group) {
    throw new AppError('Group not found', 404);
  }
  
  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to share jobs', 403);
  }
  
  // Check if job sharing is enabled
  if (!group.settings.allowJobSharing) {
    throw new AppError('Job sharing is disabled for this group', 403);
  }
  
  const {
    company,
    title,
    description,
    descriptionHtml,
    location,
    workType,
    salary,
    linkedinUrl,
    jobUrl,
    linkedinJobId,
    source,
    jobPostedHoursAgo,
    applicantCount,
    timeToApplyBucket,
    competitionBucket,
    sharedNote
  } = req.body;
  
  // Create shared job
  const sharedJob = await SharedJob.create({
    groupId: req.params.groupId,
    sharedBy: req.userId,
    company,
    title,
    description,
    descriptionHtml,
    location,
    workType,
    salary,
    linkedinUrl,
    jobUrl,
    linkedinJobId,
    source: source || 'Manual',
    jobPostedHoursAgo,
    applicantCount,
    timeToApplyBucket,
    competitionBucket,
    sharedNote
  });
  
  // Update group stats
  group.stats.totalJobsShared += 1;
  await group.save();
  
  // Update member stats
  const member = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: req.userId
  });

  if (member) {
    await member.updateStats('jobsShared');
  }

  // Get user info for notification
  const user = await User.findById(req.userId);

  // Emit Socket.io event for real-time notification
  const io = getSocketIO();
  if (io) {
    await sharedJob.populate('sharedBy', 'firstName lastName email');
    io.to(`group:${req.params.groupId}`).emit('job-shared', {
      groupId: req.params.groupId,
      job: sharedJob,
      sharedBy: {
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      timestamp: new Date()
    });
    console.log(`📢 Job shared notification sent to group ${req.params.groupId}`);
  }

  res.status(201).json({
    success: true,
    message: 'Job shared successfully',
    data: sharedJob
  });
});

// @desc    Get shared jobs in group
// @route   GET /api/groups/:groupId/jobs
// @access  Private (Members only)
const getSharedJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, company, workType, sortBy = 'recent' } = req.query;

  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view shared jobs', 403);
  }

  const query = { groupId: req.params.groupId, isActive: true };

  if (company) {
    query.company = { $regex: company, $options: 'i' };
  }

  if (workType) {
    query.workType = workType;
  }

  let sort = {};
  if (sortBy === 'recent') {
    sort = { sharedAt: -1 };
  } else if (sortBy === 'popular') {
    sort = { 'stats.saves': -1, 'stats.applications': -1 };
  } else if (sortBy === 'applications') {
    sort = { 'stats.applications': -1 };
  }

  // Note: SharedJob is on local MongoDB, User is on production MongoDB
  // Mongoose populate doesn't work across different connections
  // So we fetch jobs first, then manually populate user data
  const sharedJobs = await SharedJob.find(query)
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean(); // Use lean() for better performance since we'll modify the results

  // Manually populate sharedBy user data from production DB
  const userIds = [...new Set(sharedJobs.map(job => job.sharedBy).filter(Boolean))];
  let userMap = {};

  if (userIds.length > 0) {
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email')
      .lean();

    // Create a map for quick lookup
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });
  }

  // Attach user data to each job
  const populatedJobs = sharedJobs.map(job => ({
    ...job,
    sharedBy: job.sharedBy ? userMap[job.sharedBy.toString()] || null : null
  }));

  const total = await SharedJob.countDocuments(query);

  res.json({
    success: true,
    data: populatedJobs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalJobs: total
    }
  });
});

// @desc    Get shared job details
// @route   GET /api/groups/:groupId/jobs/:jobId
// @access  Private (Members only)
const getSharedJobDetails = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view job details', 403);
  }

  // Note: SharedJob and Comment are on local MongoDB, User is on production MongoDB
  // We need to manually populate user data
  const sharedJob = await SharedJob.findById(req.params.jobId).lean();

  if (!sharedJob || sharedJob.groupId.toString() !== req.params.groupId) {
    throw new AppError('Shared job not found', 404);
  }

  // Manually populate sharedBy user data
  if (sharedJob.sharedBy) {
    const sharedByUser = await User.findById(sharedJob.sharedBy)
      .select('firstName lastName email')
      .lean();
    sharedJob.sharedBy = sharedByUser;
  }

  // Manually populate comments with user data
  if (sharedJob.comments && sharedJob.comments.length > 0) {
    const Comment = require('../models/Comment');
    const comments = await Comment.find({ _id: { $in: sharedJob.comments } }).lean();

    // Get all user IDs from comments
    const commentUserIds = [...new Set(comments.map(c => c.userId).filter(Boolean))];

    if (commentUserIds.length > 0) {
      const commentUsers = await User.find({ _id: { $in: commentUserIds } })
        .select('firstName lastName email')
        .lean();

      const commentUserMap = {};
      commentUsers.forEach(user => {
        commentUserMap[user._id.toString()] = user;
      });

      // Attach user data to comments
      sharedJob.comments = comments.map(comment => ({
        ...comment,
        userId: comment.userId ? commentUserMap[comment.userId.toString()] || null : null
      }));
    } else {
      sharedJob.comments = comments;
    }
  }

  // Increment view count (need to use the model method, not lean object)
  await SharedJob.findByIdAndUpdate(req.params.jobId, { $inc: { 'stats.views': 1 } });

  res.json({
    success: true,
    data: sharedJob
  });
});

// @desc    Save shared job to personal tracker (CRITICAL FEATURE)
// @route   POST /api/groups/:groupId/jobs/:jobId/save
// @access  Private (Members only)
const saveToMyJobs = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to save jobs', 403);
  }

  const sharedJob = await SharedJob.findById(req.params.jobId)
    .populate('sharedBy', 'firstName lastName');

  if (!sharedJob || sharedJob.groupId.toString() !== req.params.groupId) {
    throw new AppError('Shared job not found', 404);
  }

  // Check if already saved
  const existingJob = await Job.findOne({
    userId: req.userId,
    linkedinJobId: sharedJob.linkedinJobId
  });

  if (existingJob) {
    throw new AppError('You have already saved this job', 400);
  }

  // Copy ALL fields from SharedJob to Job
  const job = await Job.create({
    userId: req.userId,
    company: sharedJob.company,
    title: sharedJob.title,
    description: sharedJob.description,
    descriptionHtml: sharedJob.descriptionHtml, // Preserve HTML
    location: sharedJob.location,
    workType: sharedJob.workType,
    salary: sharedJob.salary,
    linkedinUrl: sharedJob.linkedinUrl,
    jobUrl: sharedJob.jobUrl,
    linkedinJobId: sharedJob.linkedinJobId,
    source: `Shared by ${sharedJob.sharedBy.firstName} ${sharedJob.sharedBy.lastName}`,
    jobPostedHoursAgo: sharedJob.jobPostedHoursAgo,
    applicantCount: sharedJob.applicantCount,
    timeToApplyBucket: sharedJob.timeToApplyBucket,
    competitionBucket: sharedJob.competitionBucket,
    status: 'Saved',
    timeline: [{
      event: `Saved from group: ${group.name}`,
      type: 'created',
      note: sharedJob.sharedNote || ''
    }]
  });

  // Update shared job stats
  if (!sharedJob.savedBy.includes(req.userId)) {
    sharedJob.savedBy.push(req.userId);
    await sharedJob.incrementSaves();
  }

  // Update member stats
  const member = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: req.userId
  });

  if (member) {
    await member.updateStats('jobsSaved');
  }

  // Get user info for notification
  const user = await User.findById(req.userId);

  // Emit Socket.io event for real-time notification
  const io = getSocketIO();
  if (io) {
    io.to(`group:${req.params.groupId}`).emit('job-saved', {
      groupId: req.params.groupId,
      jobId: req.params.jobId,
      saveCount: sharedJob.stats.saves,
      savedBy: {
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      timestamp: new Date()
    });
    console.log(`💾 Job saved notification sent to group ${req.params.groupId}`);
  }

  res.status(201).json({
    success: true,
    message: 'Job saved to your tracker',
    data: job
  });
});

// @desc    Mark shared job as applied
// @route   POST /api/groups/:groupId/jobs/:jobId/apply
// @access  Private (Members only)
const markAsApplied = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member', 403);
  }

  const sharedJob = await SharedJob.findById(req.params.jobId);

  if (!sharedJob || sharedJob.groupId.toString() !== req.params.groupId) {
    throw new AppError('Shared job not found', 404);
  }

  // Check if already marked as applied
  const alreadyApplied = sharedJob.appliedBy.find(
    a => a.userId.toString() === req.userId
  );

  if (alreadyApplied) {
    // Update status
    alreadyApplied.status = status || 'applied';
    await sharedJob.save();
  } else {
    // Add to appliedBy
    sharedJob.appliedBy.push({
      userId: req.userId,
      status: status || 'applied'
    });
    await sharedJob.incrementApplications();

    // Update group stats
    group.stats.totalApplications += 1;
    await group.save();

    // Update member stats
    const member = await GroupMember.findOne({
      groupId: req.params.groupId,
      userId: req.userId
    });

    if (member) {
      await member.updateStats('applicationsTracked');
    }

    // Get user info for notification
    const user = await User.findById(req.userId);

    // Emit Socket.io event for real-time notification (only for new applications)
    const io = getSocketIO();
    if (io) {
      io.to(`group:${req.params.groupId}`).emit('job-application', {
        groupId: req.params.groupId,
        jobId: req.params.jobId,
        applicationCount: sharedJob.stats.applications,
        appliedBy: {
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        job: {
          company: sharedJob.company,
          title: sharedJob.title
        },
        timestamp: new Date()
      });
      console.log(`📝 Job application notification sent to group ${req.params.groupId}`);
    }
  }

  res.json({
    success: true,
    message: 'Application status updated'
  });
});

// @desc    Add reaction to shared job
// @route   POST /api/groups/:groupId/jobs/:jobId/reactions
// @access  Private (Members only)
const addReaction = asyncHandler(async (req, res) => {
  const { reactionType } = req.body; // upvotes, downvotes, fire, heart

  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member', 403);
  }

  const sharedJob = await SharedJob.findById(req.params.jobId);

  if (!sharedJob || sharedJob.groupId.toString() !== req.params.groupId) {
    throw new AppError('Shared job not found', 404);
  }

  // Validate reaction type
  if (!['upvotes', 'downvotes', 'fire', 'heart'].includes(reactionType)) {
    throw new AppError('Invalid reaction type', 400);
  }

  // Toggle reaction
  const reactionArray = sharedJob.reactions[reactionType];
  const userIndex = reactionArray.findIndex(id => id.equals(req.userId));

  if (userIndex > -1) {
    // Remove reaction
    reactionArray.splice(userIndex, 1);
  } else {
    // Add reaction
    reactionArray.push(req.userId);
  }

  await sharedJob.save();

  res.json({
    success: true,
    message: 'Reaction updated',
    data: sharedJob.reactions
  });
});

// @desc    Add comment to shared job
// @route   POST /api/groups/:groupId/jobs/:jobId/comments
// @access  Private (Members only)
const addComment = asyncHandler(async (req, res) => {
  const { content, replyTo } = req.body;

  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to comment', 403);
  }

  const sharedJob = await SharedJob.findById(req.params.jobId);

  if (!sharedJob || sharedJob.groupId.toString() !== req.params.groupId) {
    throw new AppError('Shared job not found', 404);
  }

  // Create comment
  const comment = await Comment.create({
    sharedJobId: req.params.jobId,
    userId: req.userId,
    content,
    replyTo: replyTo || null
  });

  // Add comment reference to shared job
  sharedJob.comments.push(comment._id);
  sharedJob.stats.comments += 1;
  await sharedJob.save();

  // Populate user info
  await comment.populate('userId', 'firstName lastName email');

  res.status(201).json({
    success: true,
    message: 'Comment added',
    data: comment
  });
});

// @desc    Delete shared job
// @route   DELETE /api/groups/:groupId/jobs/:jobId
// @access  Private (Sharer or Admin only)
const deleteSharedJob = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  const sharedJob = await SharedJob.findById(req.params.jobId);

  if (!sharedJob || sharedJob.groupId.toString() !== req.params.groupId) {
    throw new AppError('Shared job not found', 404);
  }

  // Check if user is the sharer or admin
  const isSharer = sharedJob.sharedBy.toString() === req.userId;
  const isAdmin = group.isAdmin(req.userId);

  if (!isSharer && !isAdmin) {
    throw new AppError('Only the sharer or admin can delete this job', 403);
  }

  // Soft delete
  sharedJob.isActive = false;
  await sharedJob.save();

  res.json({
    success: true,
    message: 'Shared job deleted'
  });
});

module.exports = {
  shareJob,
  getSharedJobs,
  getSharedJobDetails,
  saveToMyJobs,
  markAsApplied,
  addReaction,
  addComment,
  deleteSharedJob
};

