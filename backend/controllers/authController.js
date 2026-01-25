const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Check if user exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: user.toPublicProfile(),
      token,
      refreshToken
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findByEmail(email).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401);
  }

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Update last login
  user.lastSyncAt = new Date();
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toPublicProfile(),
      token,
      refreshToken
    }
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401);
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  res.json({
    success: true,
    data: user.toPublicProfile()
  });
});

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.json({
    success: true,
    message: 'Password updated successfully',
    data: {
      token,
      refreshToken
    }
  });
});

// @desc    Logout (client-side token removal, server can blacklist if needed)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // In a more complex system, you might blacklist the token here
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  updatePassword,
  logout
};
