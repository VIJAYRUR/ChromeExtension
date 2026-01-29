const express = require('express');
const router = express.Router();

// Existing routes
const authRoutes = require('./auth');
const userRoutes = require('./users');
const jobRoutes = require('./jobs');

// New Group Collaboration routes
const groupRoutes = require('./groups');
const sharedJobRoutes = require('./sharedJobs');
const chatRoutes = require('./chat');
const groupAnalyticsRoutes = require('./groupAnalytics');

// Mount existing routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);

// Mount new group collaboration routes
router.use('/groups', groupRoutes);

// Nested routes for group-specific resources
// These routes are nested under /groups/:groupId
router.use('/groups/:groupId/jobs', sharedJobRoutes);
router.use('/groups/:groupId/messages', chatRoutes);
router.use('/groups/:groupId/analytics', groupAnalyticsRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
