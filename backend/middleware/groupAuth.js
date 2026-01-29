const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');

// Check if user is a member of the group
const checkGroupMembership = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Group has been deleted'
      });
    }

    // Check if user is a member
    const isMember = group.isMember(req.userId);

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this group'
      });
    }

    // Attach group to request for use in controllers
    req.group = group;
    next();

  } catch (error) {
    console.error('Group membership check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking group membership'
    });
  }
};

// Check if user is an admin of the group
const checkGroupAdmin = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is admin
    const isAdmin = group.isAdmin(req.userId);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can perform this action'
      });
    }

    // Attach group to request
    req.group = group;
    next();

  } catch (error) {
    console.error('Group admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking admin permissions'
    });
  }
};

// Check if user is a moderator or admin of the group
const checkGroupModerator = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = group.isModerator(req.userId);

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Only group moderators and admins can perform this action'
      });
    }

    // Attach group to request
    req.group = group;
    next();

  } catch (error) {
    console.error('Group moderator check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking moderator permissions'
    });
  }
};

// Get user's role in the group and attach to request
const attachGroupRole = async (req, res, next) => {
  try {
    const groupId = req.params.groupId;
    
    if (!groupId) {
      return next();
    }

    const member = await GroupMember.findOne({
      groupId,
      userId: req.userId
    });

    if (member) {
      req.groupRole = member.role;
      req.groupMember = member;
    }

    next();

  } catch (error) {
    console.error('Attach group role error:', error);
    next(); // Continue even if error
  }
};

module.exports = {
  checkGroupMembership,
  checkGroupAdmin,
  checkGroupModerator,
  attachGroupRole
};

