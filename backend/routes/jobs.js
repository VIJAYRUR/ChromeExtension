const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validate, jobRules, jobQueryRules, objectIdRule } = require('../middleware/validate');
const {
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
} = require('../controllers/jobController');
const {
  uploadResume,
  getResumeDownloadUrl,
  deleteResume
} = require('../controllers/resumeController');

// All routes require authentication
router.use(auth);

// Statistics (before :id route to avoid conflict)
router.get('/stats', getStats);

// Sync from extension
router.post('/sync', syncJobs);

// Find duplicates
router.get('/duplicates', findDuplicates);

// Bulk operations
router.post('/bulk-delete', bulkDeleteJobs);
router.post('/bulk-status', bulkUpdateStatus);

// CRUD operations
router.get('/', jobQueryRules, validate, getJobs);
router.post('/', jobRules, validate, createJob);
router.get('/:id', objectIdRule('id'), validate, getJob);
router.put('/:id', objectIdRule('id'), validate, updateJob);
router.delete('/:id', objectIdRule('id'), validate, deleteJob);

// Status update
router.patch('/:id/status', objectIdRule('id'), validate, updateJobStatus);

// Notes
router.post('/:id/notes', objectIdRule('id'), validate, addNote);

// Interviews
router.post('/:id/interviews', objectIdRule('id'), validate, addInterview);
router.put('/:id/interviews/:interviewId', updateInterview);

// Resume operations (S3-backed)
router.post('/:id/resume', objectIdRule('id'), validate, uploadResume);
router.get('/:id/resume', objectIdRule('id'), validate, getResumeDownloadUrl);
router.delete('/:id/resume', objectIdRule('id'), validate, deleteResume);

module.exports = router;
