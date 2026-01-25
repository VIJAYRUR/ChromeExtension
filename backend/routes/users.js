const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { validate, profileRules } = require('../middleware/validate');
const {
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
} = require('../controllers/userController');

// All routes require authentication
router.use(auth);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', profileRules, validate, updateProfile);
router.post('/profile/sync', syncProfile);

// Experience routes
router.post('/profile/experience', addExperience);
router.put('/profile/experience/:expId', updateExperience);
router.delete('/profile/experience/:expId', deleteExperience);

// Education routes
router.post('/profile/education', addEducation);
router.put('/profile/education/:eduId', updateEducation);
router.delete('/profile/education/:eduId', deleteEducation);

// Settings
router.put('/settings', updateSettings);

// Account deletion
router.delete('/account', deleteAccount);

module.exports = router;
