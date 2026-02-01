const multer = require('multer');
const Job = require('../models/Job');
const { uploadFile, getDownloadUrl, deleteFile } = require('../config/s3');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const jobCache = require('../utils/cache/jobCache');

// Configure multer for memory storage (we'll upload directly to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF and Word documents
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Word documents are allowed'), false);
    }
  }
}).single('resume'); // Expecting field name 'resume'

// @desc    Upload resume for a job
// @route   POST /api/jobs/:id/resume
// @access  Private
const uploadResume = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job and verify ownership
  const job = await Job.findOne({ _id: id, userId: req.userId });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  // Handle file upload with multer
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Delete old resume from S3 if exists
      if (job.resumeS3Key) {
        await deleteFile(job.resumeS3Key);
        console.log(`[Resume] Deleted old resume: ${job.resumeS3Key}`);
      }

      // Upload to S3
      const folder = `resumes/${req.userId}`;
      const s3Key = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder
      );

      // Update job with resume information
      job.resumeFileName = req.file.originalname;
      job.resumeFileType = req.file.mimetype;
      job.resumeFileSize = req.file.size;
      job.resumeS3Key = s3Key;
      job.resumeUploadedAt = new Date();

      // Add timeline entry
      job.timeline.push({
        date: new Date(),
        event: `Resume uploaded: ${req.file.originalname}`,
        type: 'update'
      });

      await job.save();

      // Invalidate job cache for this user
      await jobCache.invalidateUserCache(req.userId);

      console.log(`[Resume] Uploaded successfully for job ${id}: ${s3Key}`);

      res.json({
        success: true,
        message: 'Resume uploaded successfully',
        data: {
          resumeFileName: job.resumeFileName,
          resumeFileSize: job.resumeFileSize,
          resumeFileType: job.resumeFileType,
          resumeS3Key: job.resumeS3Key,
          resumeUploadedAt: job.resumeUploadedAt,
          // Also include old field names for backward compatibility
          fileName: job.resumeFileName,
          fileSize: job.resumeFileSize,
          fileType: job.resumeFileType,
          s3Key: job.resumeS3Key,
          uploadedAt: job.resumeUploadedAt
        }
      });
    } catch (error) {
      console.error('[Resume] Upload failed:', error);
      return res.status(500).json({
        success: false,
        message: `Failed to upload resume: ${error.message}`
      });
    }
  });
});

// @desc    Get resume download URL for a job
// @route   GET /api/jobs/:id/resume
// @access  Private
const getResumeDownloadUrl = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job and verify ownership
  const job = await Job.findOne({ _id: id, userId: req.userId });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (!job.resumeS3Key) {
    throw new AppError('No resume found for this job', 404);
  }

  // Generate pre-signed URL (valid for 1 hour)
  const downloadUrl = await getDownloadUrl(job.resumeS3Key, 3600);

  res.json({
    success: true,
    data: {
      downloadUrl,
      fileName: job.resumeFileName,
      fileSize: job.resumeFileSize,
      fileType: job.resumeFileType,
      expiresIn: 3600 // seconds
    }
  });
});

// @desc    Delete resume for a job
// @route   DELETE /api/jobs/:id/resume
// @access  Private
const deleteResume = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Find job and verify ownership
  const job = await Job.findOne({ _id: id, userId: req.userId });

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (!job.resumeS3Key) {
    throw new AppError('No resume found for this job', 404);
  }

  // Delete from S3
  await deleteFile(job.resumeS3Key);

  // Clear resume fields
  job.resumeFileName = null;
  job.resumeFileType = null;
  job.resumeFileSize = null;
  job.resumeS3Key = null;
  job.resumeUploadedAt = null;

  // Add timeline entry
  job.timeline.push({
    date: new Date(),
    event: 'Resume deleted',
    type: 'update'
  });

  await job.save();

  // Invalidate job cache for this user
  await jobCache.invalidateUserCache(req.userId);

  console.log(`[Resume] Deleted successfully for job ${id}`);

  res.json({
    success: true,
    message: 'Resume deleted successfully'
  });
});

module.exports = {
  uploadResume,
  getResumeDownloadUrl,
  deleteResume
};
