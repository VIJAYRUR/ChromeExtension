const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validate, registerRules, loginRules } = require('../middleware/validate');
const { authLimiter, validatePassword } = require('../middleware/security');
const {
  register,
  login,
  refreshToken,
  getMe,
  updatePassword,
  logout
} = require('../controllers/authController');

// Public routes (with strict rate limiting to prevent brute force)
router.post('/register', authLimiter, registerRules, validate, validatePassword, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.post('/refresh', authLimiter, refreshToken);

// Protected routes
router.get('/me', auth, getMe);
router.put('/password', auth, validatePassword, updatePassword);
router.post('/logout', auth, logout);

module.exports = router;
