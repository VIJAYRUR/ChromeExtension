const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId from parent router
const { auth } = require('../middleware/auth');
const { checkGroupMembership } = require('../middleware/groupAuth');
const { analyticsLimiter } = require('../middleware/groupRateLimiter');
const {
  getGroupAnalytics,
  getMemberStats
} = require('../controllers/groupAnalyticsController');

// All routes require authentication and group membership
router.use(auth);
router.use(checkGroupMembership);

// Analytics Routes (rate limited to prevent abuse)
router.get('/', analyticsLimiter, getGroupAnalytics);              // Get group analytics
router.get('/member/:userId?', analyticsLimiter, getMemberStats);  // Get member stats (optional userId, defaults to self)

module.exports = router;

