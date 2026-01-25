const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validate, registerRules, loginRules } = require('../middleware/validate');
const {
  register,
  login,
  refreshToken,
  getMe,
  updatePassword,
  logout
} = require('../controllers/authController');

// Public routes
router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', auth, getMe);
router.put('/password', auth, updatePassword);
router.post('/logout', auth, logout);

module.exports = router;
