// Role-based authorization middleware for groups
// These are helper functions that can be composed with other middleware

// Require admin role
const requireAdmin = (req, res, next) => {
  if (!req.groupRole) {
    return res.status(403).json({
      success: false,
      message: 'Group role not found. Please ensure you are a member of this group.'
    });
  }

  if (req.groupRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'This action requires admin privileges'
    });
  }

  next();
};

// Require moderator or admin role
const requireModerator = (req, res, next) => {
  if (!req.groupRole) {
    return res.status(403).json({
      success: false,
      message: 'Group role not found. Please ensure you are a member of this group.'
    });
  }

  if (req.groupRole !== 'admin' && req.groupRole !== 'moderator') {
    return res.status(403).json({
      success: false,
      message: 'This action requires moderator or admin privileges'
    });
  }

  next();
};

// Require member role (any role including admin, moderator, member)
const requireMember = (req, res, next) => {
  if (!req.groupRole) {
    return res.status(403).json({
      success: false,
      message: 'You must be a member of this group'
    });
  }

  next();
};

// Check if user owns the resource (e.g., their own message or shared job)
const requireOwnerOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    // This middleware should be used after the resource is loaded
    // The resource should be attached to req (e.g., req.message, req.sharedJob)
    
    const resource = req.message || req.sharedJob || req.comment;
    
    if (!resource) {
      return res.status(500).json({
        success: false,
        message: 'Resource not found in request'
      });
    }

    const resourceUserId = resource[resourceUserIdField];
    const isOwner = resourceUserId && resourceUserId.toString() === req.userId;
    const isAdmin = req.groupRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own content or you must be an admin'
      });
    }

    next();
  };
};

// Check if group setting allows certain actions
const checkGroupSetting = (settingName) => {
  return (req, res, next) => {
    if (!req.group) {
      return res.status(500).json({
        success: false,
        message: 'Group not found in request'
      });
    }

    const settingValue = req.group.settings[settingName];

    if (settingValue === false) {
      return res.status(403).json({
        success: false,
        message: `This action is disabled for this group (${settingName})`
      });
    }

    next();
  };
};

module.exports = {
  requireAdmin,
  requireModerator,
  requireMember,
  requireOwnerOrAdmin,
  checkGroupSetting
};

