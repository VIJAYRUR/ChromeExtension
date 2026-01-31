const Job = require('../models/Job');
const Analytics = require('../models/Analytics');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { jobCache } = require('../utils/cache');

// @desc    Get all jobs for user
// @route   GET /api/jobs
// @access  Private
const getJobs = asyncHandler(async (req, res) => {
  const {
    status,
    workType,
    search,
    tags,
    priority,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50,
    sortBy = 'dateApplied',
    sortOrder = 'desc',
    archived
  } = req.query;

  // Build query
  const query = { userId: req.userId };

  // Status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  // Work type filter
  if (workType && workType !== 'all') {
    query.workType = workType;
  }

  // Priority filter
  if (priority && priority !== 'all') {
    query.priority = priority;
  }

  // Tags filter
  if (tags) {
    const tagArray = tags.split(',').map(t => t.trim());
    query.tags = { $in: tagArray };
  }

  // Date range filter
  if (dateFrom || dateTo) {
    query.dateApplied = {};
    if (dateFrom) query.dateApplied.$gte = new Date(dateFrom);
    if (dateTo) query.dateApplied.$lte = new Date(dateTo);
  }

  // Archived filter
  if (archived !== undefined) {
    query.isArchived = archived === 'true';
  } else {
    query.isArchived = false; // Default to non-archived
  }

  // Text search
  if (search) {
    query.$or = [
      { company: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
  }

  // Sort options
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Prepare filter object for cache key generation
  const filters = {
    status,
    workType,
    search,
    tags,
    priority,
    dateFrom,
    dateTo,
    page,
    limit,
    sortBy,
    sortOrder,
    archived
  };

  // Use cache service (with automatic fallback to DB)
  const result = await jobCache.getCachedJobs(
    req.userId,
    filters,
    query,
    sort,
    skip,
    parseInt(limit)
  );

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Update view count
  job.viewCount += 1;
  job.lastViewedAt = new Date();
  await job.save();

  res.json({
    success: true,
    data: job
  });
});

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private
const createJob = asyncHandler(async (req, res) => {
  const jobData = {
    ...req.body,
    userId: req.userId
  };

  // Check for duplicates
  if (req.body.linkedinUrl) {
    const linkedinJobId = req.body.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];
    if (linkedinJobId) {
      jobData.externalIds = { linkedinJobId };

      const duplicate = await Job.findDuplicates(
        req.userId,
        req.body.company,
        req.body.title,
        linkedinJobId
      );

      if (duplicate) {
        return res.status(200).json({
          success: true,
          message: 'Job already exists',
          data: duplicate,
          isDuplicate: true
        });
      }
    }
  }

  // Add initial timeline entry
  jobData.timeline = [{
    date: new Date(),
    event: 'Application tracked',
    type: 'created'
  }];

  const job = await Job.create(jobData);

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  // Update analytics
  const analytics = await Analytics.getOrCreateToday(req.userId);
  analytics.applications.total += 1;
  if (job.status) {
    analytics.applications.byStatus[job.status] = (analytics.applications.byStatus[job.status] || 0) + 1;
  }
  if (job.source) {
    const sourceKey = job.source.replace(/\s/g, '');
    analytics.applications.bySource[sourceKey] = (analytics.applications.bySource[sourceKey] || 0) + 1;
  }
  await analytics.save();

  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: job
  });
});

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private
const updateJob = asyncHandler(async (req, res) => {
  let job = await Job.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Track status change for analytics
  const oldStatus = job.status;
  const newStatus = req.body.status;

  // Update job
  Object.assign(job, req.body);

  // Add timeline entry for updates
  job.timeline.push({
    date: new Date(),
    event: 'Job details updated',
    type: 'update'
  });

  await job.save();

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  // Update analytics if status changed
  if (oldStatus !== newStatus) {
    const analytics = await Analytics.getOrCreateToday(req.userId);
    if (newStatus === 'interview') {
      analytics.responses.positive += 1;
      analytics.responses.total += 1;
    } else if (newStatus === 'rejected') {
      analytics.responses.negative += 1;
      analytics.responses.total += 1;
    }
    await analytics.save();
  }

  res.json({
    success: true,
    message: 'Job updated successfully',
    data: job
  });
});

// @desc    Update job status
// @route   PATCH /api/jobs/:id/status
// @access  Private
const updateJobStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const job = await Job.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const oldStatus = job.status;
  job.status = status;

  // Add timeline entry
  job.timeline.push({
    date: new Date(),
    event: `Status changed to ${status}`,
    type: 'status_change',
    note: note || ''
  });

  await job.save();

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  // Update analytics
  if (oldStatus !== status) {
    const analytics = await Analytics.getOrCreateToday(req.userId);
    if (status === 'interview') {
      analytics.responses.positive += 1;
      analytics.responses.total += 1;
    } else if (status === 'rejected') {
      analytics.responses.negative += 1;
      analytics.responses.total += 1;
    } else if (status === 'offer') {
      analytics.responses.positive += 1;
    }
    await analytics.save();
  }

  res.json({
    success: true,
    message: 'Status updated successfully',
    data: job
  });
});

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  res.json({
    success: true,
    message: 'Job deleted successfully'
  });
});

// @desc    Bulk delete jobs
// @route   POST /api/jobs/bulk-delete
// @access  Private
const bulkDeleteJobs = asyncHandler(async (req, res) => {
  const { jobIds } = req.body;

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    throw new AppError('Job IDs array is required', 400);
  }

  const result = await Job.deleteMany({
    _id: { $in: jobIds },
    userId: req.userId
  });

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  res.json({
    success: true,
    message: `${result.deletedCount} jobs deleted successfully`,
    data: { deletedCount: result.deletedCount }
  });
});

// @desc    Bulk update job status
// @route   POST /api/jobs/bulk-status
// @access  Private
const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { jobIds, status } = req.body;

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    throw new AppError('Job IDs array is required', 400);
  }

  const result = await Job.updateMany(
    { _id: { $in: jobIds }, userId: req.userId },
    {
      $set: { status, statusUpdatedAt: new Date() },
      $push: {
        timeline: {
          date: new Date(),
          event: `Status changed to ${status}`,
          type: 'status_change'
        }
      }
    }
  );

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  res.json({
    success: true,
    message: `${result.modifiedCount} jobs updated successfully`,
    data: { modifiedCount: result.modifiedCount }
  });
});

// @desc    Add note to job
// @route   POST /api/jobs/:id/notes
// @access  Private
const addNote = asyncHandler(async (req, res) => {
  const { note } = req.body;

  const job = await Job.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Append note
  job.notes = job.notes ? `${job.notes}\n\n---\n\n${note}` : note;

  // Add timeline entry
  job.timeline.push({
    date: new Date(),
    event: 'Note added',
    type: 'note',
    note: note.substring(0, 100) + (note.length > 100 ? '...' : '')
  });

  await job.save();

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  // Update analytics
  const analytics = await Analytics.getOrCreateToday(req.userId);
  analytics.activity.notesAdded += 1;
  await analytics.save();

  res.json({
    success: true,
    message: 'Note added successfully',
    data: job
  });
});

// @desc    Add interview to job
// @route   POST /api/jobs/:id/interviews
// @access  Private
const addInterview = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  job.interviews.push(req.body);

  // Update status to interview if not already
  if (job.status === 'applied' || job.status === 'screening') {
    job.status = 'interview';
  }

  // Add timeline entry
  job.timeline.push({
    date: new Date(),
    event: `Interview scheduled for ${new Date(req.body.date).toLocaleDateString()}`,
    type: 'interview'
  });

  await job.save();

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  // Update analytics
  const analytics = await Analytics.getOrCreateToday(req.userId);
  analytics.interviews.scheduled += 1;
  await analytics.save();

  res.status(201).json({
    success: true,
    message: 'Interview added successfully',
    data: job
  });
});

// @desc    Update interview
// @route   PUT /api/jobs/:id/interviews/:interviewId
// @access  Private
const updateInterview = asyncHandler(async (req, res) => {
  const job = await Job.findOne({
    _id: req.params.id,
    userId: req.userId
  });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  const interview = job.interviews.id(req.params.interviewId);

  if (!interview) {
    throw new AppError('Interview not found', 404);
  }

  const oldStatus = interview.status;
  Object.assign(interview, req.body);
  await job.save();

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  // Update analytics if status changed
  if (oldStatus !== req.body.status) {
    const analytics = await Analytics.getOrCreateToday(req.userId);
    if (req.body.status === 'completed') {
      analytics.interviews.completed += 1;
    } else if (req.body.status === 'cancelled') {
      analytics.interviews.cancelled += 1;
    }
    await analytics.save();
  }

  res.json({
    success: true,
    message: 'Interview updated successfully',
    data: job
  });
});

// @desc    Get job statistics
// @route   GET /api/jobs/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
  const stats = await Job.getStats(req.userId);

  // Get additional stats
  const [
    recentJobs,
    topCompanies,
    statusHistory
  ] = await Promise.all([
    // Recent 5 jobs
    Job.find({ userId: req.userId, isArchived: false })
      .sort({ dateApplied: -1 })
      .limit(5)
      .select('company title status dateApplied')
      .lean(),

    // Top companies applied to
    Job.aggregate([
      { $match: { userId: req.userId, isArchived: false } },
      { $group: { _id: '$company', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),

    // Status breakdown by month (last 6 months)
    Job.aggregate([
      {
        $match: {
          userId: req.userId,
          dateApplied: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$dateApplied' },
            year: { $year: '$dateApplied' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      ...stats,
      recentJobs,
      topCompanies,
      statusHistory
    }
  });
});

// @desc    Sync jobs from extension (bulk upsert)
// @route   POST /api/jobs/sync
// @access  Private
const syncJobs = asyncHandler(async (req, res) => {
  const { jobs } = req.body;

  if (!jobs || !Array.isArray(jobs)) {
    throw new AppError('Jobs array is required', 400);
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  for (const jobData of jobs) {
    try {
      // Check for existing job by old ID or LinkedIn ID
      let existingJob = null;

      if (jobData.id) {
        // Try to find by old extension ID stored in externalIds
        existingJob = await Job.findOne({
          userId: req.userId,
          'externalIds.extensionId': jobData.id
        });
      }

      if (!existingJob && jobData.linkedinUrl) {
        const linkedinJobId = jobData.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];
        if (linkedinJobId) {
          existingJob = await Job.findOne({
            userId: req.userId,
            'externalIds.linkedinJobId': linkedinJobId
          });
        }
      }

      if (existingJob) {
        // Update existing job
        Object.assign(existingJob, {
          ...jobData,
          userId: req.userId,
          externalIds: {
            ...existingJob.externalIds,
            extensionId: jobData.id
          }
        });
        await existingJob.save();
        results.updated++;
      } else {
        // Create new job
        const newJob = await Job.create({
          ...jobData,
          userId: req.userId,
          externalIds: {
            extensionId: jobData.id,
            linkedinJobId: jobData.linkedinUrl?.match(/\/jobs\/view\/(\d+)/)?.[1]
          },
          timeline: jobData.timeline || [{
            date: jobData.dateApplied || new Date(),
            event: 'Application synced',
            type: 'created'
          }]
        });
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        job: jobData.title || 'Unknown',
        error: error.message
      });
    }
  }

  // Invalidate job cache for this user if any jobs were created or updated
  if (results.created > 0 || results.updated > 0) {
    await jobCache.invalidateUserCache(req.userId);
  }

  res.json({
    success: true,
    message: `Sync completed: ${results.created} created, ${results.updated} updated`,
    data: results
  });
});

// @desc    Find duplicate jobs
// @route   GET /api/jobs/duplicates
// @access  Private
const findDuplicates = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ userId: req.userId }).lean();

  const seen = new Map();
  const duplicates = [];

  jobs.forEach((job, index) => {
    const linkedinId = job.externalIds?.linkedinJobId ||
      job.linkedinUrl?.match(/\/jobs\/view\/(\d+)/)?.[1];

    let uniqueKey;
    if (linkedinId) {
      uniqueKey = `linkedin_${linkedinId}`;
    } else {
      uniqueKey = `${job.company.toLowerCase().trim()}_${job.title.toLowerCase().trim()}`;
    }

    if (seen.has(uniqueKey)) {
      duplicates.push({
        duplicate: job,
        original: seen.get(uniqueKey),
        matchedBy: linkedinId ? 'LinkedIn ID' : 'Company + Title'
      });
    } else {
      seen.set(uniqueKey, job);
    }
  });

  res.json({
    success: true,
    data: {
      total: duplicates.length,
      duplicates
    }
  });
});

module.exports = {
  getJobs,
  getJob,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  bulkDeleteJobs,
  bulkUpdateStatus,
  addNote,
  addInterview,
  updateInterview,
  getStats,
  syncJobs,
  findDuplicates
};
