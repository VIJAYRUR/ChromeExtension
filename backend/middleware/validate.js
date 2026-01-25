const { validationResult, body, param, query } = require('express-validator');

// Validation middleware - checks validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }

  next();
};

// Common validation rules

// User registration
const registerRules = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
];

// User login
const loginRules = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Job creation/update
const jobRules = [
  body('company')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ max: 200 })
    .withMessage('Company name cannot exceed 200 characters'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ max: 200 })
    .withMessage('Job title cannot exceed 200 characters'),
  body('status')
    .optional()
    .isIn(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn', 'archived'])
    .withMessage('Invalid status value'),
  body('workType')
    .optional()
    .isIn(['Remote', 'On-site', 'Hybrid', 'Not specified'])
    .withMessage('Invalid work type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority value'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
];

// Job query parameters
const jobQueryRules = [
  query('status')
    .optional()
    .isIn(['all', 'saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn', 'archived'])
    .withMessage('Invalid status filter'),
  query('workType')
    .optional()
    .isIn(['all', 'Remote', 'On-site', 'Hybrid', 'Not specified'])
    .withMessage('Invalid work type filter'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['dateApplied', 'company', 'title', 'status', 'priority', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Profile update
const profileRules = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('linkedin')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid LinkedIn URL'),
  body('github')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid GitHub URL'),
  body('portfolio')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid portfolio URL')
];

// MongoDB ObjectId validation
const objectIdRule = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`)
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  jobRules,
  jobQueryRules,
  profileRules,
  objectIdRule
};
