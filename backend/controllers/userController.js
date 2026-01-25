const User = require('../models/User');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: user.toPublicProfile()
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    'firstName', 'middleName', 'lastName', 'professionalSummary',
    'phone', 'phoneCountryCode', 'city', 'state', 'country', 'zipCode',
    'linkedin', 'github', 'portfolio',
    'experiences', 'education', 'skills', 'skillsArray',
    'workAuthorization', 'workAuthorizationType', 'requireSponsorship', 'clearanceEligibility',
    'preferredLocation', 'salaryExpectation', 'availableStartDate', 'noticePeriod',
    'willingToRelocate', 'remotePreference',
    'resumeFile', 'coverLetterFile',
    'settings'
  ];

  // Filter out non-allowed fields
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Handle skills array
  if (updates.skills && typeof updates.skills === 'string') {
    updates.skillsArray = updates.skills.split(',').map(s => s.trim()).filter(s => s);
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user.toPublicProfile()
  });
});

// @desc    Sync profile from extension (full replace)
// @route   POST /api/users/profile/sync
// @access  Private
const syncProfile = asyncHandler(async (req, res) => {
  const profileData = req.body;

  // Remove fields that shouldn't be overwritten
  delete profileData.email;
  delete profileData.password;
  delete profileData._id;
  delete profileData.createdAt;
  delete profileData.updatedAt;

  // Handle skills array
  if (profileData.skills && typeof profileData.skills === 'string') {
    profileData.skillsArray = profileData.skills.split(',').map(s => s.trim()).filter(s => s);
  }

  // Update last sync time
  profileData.lastSyncAt = new Date();

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: profileData },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'Profile synced successfully',
    data: user.toPublicProfile()
  });
});

// @desc    Add work experience
// @route   POST /api/users/profile/experience
// @access  Private
const addExperience = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.experiences.push(req.body);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Experience added successfully',
    data: user.experiences
  });
});

// @desc    Update work experience
// @route   PUT /api/users/profile/experience/:expId
// @access  Private
const updateExperience = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const experience = user.experiences.id(req.params.expId);

  if (!experience) {
    throw new AppError('Experience not found', 404);
  }

  Object.assign(experience, req.body);
  await user.save();

  res.json({
    success: true,
    message: 'Experience updated successfully',
    data: user.experiences
  });
});

// @desc    Delete work experience
// @route   DELETE /api/users/profile/experience/:expId
// @access  Private
const deleteExperience = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.experiences.pull(req.params.expId);
  await user.save();

  res.json({
    success: true,
    message: 'Experience deleted successfully',
    data: user.experiences
  });
});

// @desc    Add education
// @route   POST /api/users/profile/education
// @access  Private
const addEducation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.education.push(req.body);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'Education added successfully',
    data: user.education
  });
});

// @desc    Update education
// @route   PUT /api/users/profile/education/:eduId
// @access  Private
const updateEducation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const education = user.education.id(req.params.eduId);

  if (!education) {
    throw new AppError('Education not found', 404);
  }

  Object.assign(education, req.body);
  await user.save();

  res.json({
    success: true,
    message: 'Education updated successfully',
    data: user.education
  });
});

// @desc    Delete education
// @route   DELETE /api/users/profile/education/:eduId
// @access  Private
const deleteEducation = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.education.pull(req.params.eduId);
  await user.save();

  res.json({
    success: true,
    message: 'Education deleted successfully',
    data: user.education
  });
});

// @desc    Update settings
// @route   PUT /api/users/settings
// @access  Private
const updateSettings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.settings = { ...user.settings, ...req.body };
  await user.save();

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: user.settings
  });
});

// @desc    Delete account
// @route   DELETE /api/users/account
// @access  Private
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  const user = await User.findById(req.userId).select('+password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Password is incorrect', 400);
  }

  // Delete user and related data
  const Job = require('../models/Job');
  const Analytics = require('../models/Analytics');

  await Promise.all([
    Job.deleteMany({ userId: req.userId }),
    Analytics.deleteMany({ userId: req.userId }),
    User.findByIdAndDelete(req.userId)
  ]);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

module.exports = {
  getProfile,
  updateProfile,
  syncProfile,
  addExperience,
  updateExperience,
  deleteExperience,
  addEducation,
  updateEducation,
  deleteEducation,
  updateSettings,
  deleteAccount
};
