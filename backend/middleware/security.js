/**
 * Security Middleware
 * 
 * Protects against common attacks:
 * - NoSQL injection
 * - XSS (Cross-Site Scripting)
 * - Parameter pollution
 */

const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

/**
 * Sanitize MongoDB queries to prevent NoSQL injection
 * Removes $ and . from user input
 */
const sanitizeMongoQueries = mongoSanitize({
  replaceWith: '_', // Replace $ and . with _
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️  [SECURITY] Sanitized potentially malicious input: ${key}`);
  },
});

/**
 * Custom XSS protection middleware
 * Since xss-clean is deprecated, we'll use a simple sanitizer
 */
const sanitizeXSS = (req, res, next) => {
  // Sanitize function to remove dangerous HTML/JS
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove script tags and event handlers
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj !== null && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

/**
 * Rate limiters for different routes
 */

// Strict rate limit for authentication routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

// Moderate rate limit for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limit for job creation
const createJobLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 jobs per minute
  message: {
    success: false,
    message: 'Too many jobs created. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for group creation
const createGroupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 groups per hour
  message: {
    success: false,
    message: 'Too many groups created. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limit for chat messages
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    success: false,
    message: 'Too many messages. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password validation middleware
 * Ensures strong passwords
 */
const validatePassword = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(); // Let validation middleware handle missing password
  }

  // Password requirements
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`at least ${minLength} characters`);
  }
  if (!hasUpperCase) {
    errors.push('one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('one lowercase letter');
  }
  if (!hasNumber) {
    errors.push('one number');
  }
  if (!hasSpecialChar) {
    errors.push('one special character (!@#$%^&*...)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Password must contain ${errors.join(', ')}`,
    });
  }

  next();
};

module.exports = {
  sanitizeMongoQueries,
  sanitizeXSS,
  authLimiter,
  apiLimiter,
  uploadLimiter,
  createJobLimiter,
  createGroupLimiter,
  chatLimiter,
  validatePassword,
};

