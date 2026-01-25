const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Sub-schema for work experience
const experienceSchema = new mongoose.Schema({
  company: { type: String, trim: true },
  title: { type: String, trim: true },
  location: { type: String, trim: true },
  startDate: { type: String }, // YYYY-MM format
  endDate: { type: String }, // YYYY-MM format or null for current
  responsibilities: { type: String },
  isCurrent: { type: Boolean, default: false }
}, { _id: true });

// Sub-schema for education
const educationSchema = new mongoose.Schema({
  degree: { type: String, trim: true },
  university: { type: String, trim: true },
  major: { type: String, trim: true },
  startDate: { type: String },
  endDate: { type: String },
  gpa: { type: String },
  isCurrent: { type: Boolean, default: false }
}, { _id: true });

// Sub-schema for uploaded files
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String },
  size: { type: Number },
  data: { type: String }, // Base64 encoded
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

// Main User Schema
const userSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password by default
  },

  // Device/Extension identification for sync
  deviceId: { type: String, index: true },
  lastSyncAt: { type: Date },

  // Personal Information
  firstName: { type: String, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  fullName: { type: String, trim: true, index: true },
  professionalSummary: { type: String },

  // Contact Information
  phone: { type: String, trim: true },
  phoneCountryCode: { type: String, default: '+1' },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  zipCode: { type: String, trim: true },

  // Social Links
  linkedin: { type: String, trim: true },
  github: { type: String, trim: true },
  portfolio: { type: String, trim: true },

  // Work Experience
  experiences: [experienceSchema],

  // Education
  education: [educationSchema],

  // Skills
  skills: { type: String }, // Comma-separated string
  skillsArray: [{ type: String, trim: true }], // Array for better querying

  // Work Authorization
  workAuthorization: { type: String, trim: true },
  workAuthorizationType: { type: String, trim: true },
  requireSponsorship: { type: String, enum: ['Yes', 'No', ''] },
  clearanceEligibility: { type: String, trim: true },

  // Job Preferences
  preferredLocation: { type: String, trim: true },
  salaryExpectation: { type: String, trim: true },
  availableStartDate: { type: Date },
  noticePeriod: { type: String, trim: true },
  willingToRelocate: { type: String, enum: ['Yes', 'No', 'Maybe', ''] },
  remotePreference: { type: String, enum: ['Remote', 'Hybrid', 'On-site', 'Flexible', ''] },

  // Documents
  resumeFile: fileSchema,
  coverLetterFile: fileSchema,

  // Settings & Preferences
  settings: {
    theme: { type: String, default: 'light' },
    notifications: { type: Boolean, default: true },
    autoSync: { type: Boolean, default: true },
    defaultView: { type: String, default: 'table' }
  },

  // Account Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }

}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for common queries (email index is already defined in schema with `index: true`)
userSchema.index({ createdAt: -1 });
userSchema.index({ 'experiences.company': 'text', 'experiences.title': 'text', 'skillsArray': 'text' });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update fullName
userSchema.pre('save', function(next) {
  if (this.firstName || this.lastName) {
    this.fullName = [this.firstName, this.middleName, this.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile (no sensitive data)
userSchema.methods.toPublicProfile = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
