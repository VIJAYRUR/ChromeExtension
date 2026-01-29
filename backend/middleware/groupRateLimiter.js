const rateLimit = require('express-rate-limit');

// Rate limiter for group creation (prevent spam groups)
const groupCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 groups per day per user
  message: {
    success: false,
    message: 'Too many groups created. Please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use userId as key
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

// Rate limiter for job sharing (prevent spam)
const jobSharingLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // 50 jobs per day per user
  message: {
    success: false,
    message: 'Too many jobs shared today. Please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

// Rate limiter for chat messages (prevent spam)
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute per user
  message: {
    success: false,
    message: 'Too many messages. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

// Rate limiter for comments (prevent spam)
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 comments per 5 minutes per user
  message: {
    success: false,
    message: 'Too many comments. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

// Rate limiter for reactions (prevent spam clicking)
const reactionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 reactions per minute per user
  message: {
    success: false,
    message: 'Too many reactions. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

// Rate limiter for joining groups (prevent spam joining)
const joinGroupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 group joins per hour per user
  message: {
    success: false,
    message: 'Too many group join attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

// Rate limiter for analytics requests (prevent abuse)
const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 analytics requests per minute per user
  message: {
    success: false,
    message: 'Too many analytics requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  }
});

module.exports = {
  groupCreationLimiter,
  jobSharingLimiter,
  messageLimiter,
  commentLimiter,
  reactionLimiter,
  joinGroupLimiter,
  analyticsLimiter
};

