const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId from parent router
const { auth } = require('../middleware/auth');
const { checkGroupMembership } = require('../middleware/groupAuth');
const { checkGroupSetting } = require('../middleware/groupRole');
const {
  jobSharingLimiter,
  commentLimiter,
  reactionLimiter
} = require('../middleware/groupRateLimiter');
const {
  shareJob,
  getSharedJobs,
  getSharedJobDetails,
  saveToMyJobs,
  markAsApplied,
  addReaction,
  addComment,
  deleteSharedJob
} = require('../controllers/sharedJobController');

// All routes require authentication and group membership
router.use(auth);
router.use(checkGroupMembership);

// Shared Jobs CRUD
router.post('/',
  checkGroupSetting('allowJobSharing'),
  jobSharingLimiter,
  shareJob
);                                                       // Share job to group (rate limited, check setting)

router.get('/', getSharedJobs);                          // Get shared jobs in group
router.get('/:jobId', getSharedJobDetails);              // Get shared job details

// Job Actions
router.post('/:jobId/save', saveToMyJobs);               // Save shared job to personal tracker (CRITICAL)
router.post('/:jobId/apply', markAsApplied);             // Mark as applied
router.post('/:jobId/reactions', reactionLimiter, addReaction); // Add/remove reaction (rate limited)
router.delete('/:jobId', deleteSharedJob);               // Delete shared job (sharer/admin only)

// Comments
router.post('/:jobId/comments', commentLimiter, addComment); // Add comment to shared job (rate limited)

module.exports = router;

