const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const ChatMessage = require('../models/ChatMessage');
const SharedJob = require('../models/SharedJob');
const Comment = require('../models/Comment');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { getChatConnection } = require('../config/database');

// @desc    Create new group
// @route   POST /api/groups
// @access  Private
const createGroup = asyncHandler(async (req, res) => {
  const { name, description, type, settings } = req.body;
  
  // Create group
  const group = await Group.create({
    name,
    description,
    type: type || 'private',
    createdBy: req.userId,
    admins: [req.userId],
    members: [req.userId],
    memberCount: 1,
    settings: settings || {}
  });
  
  // Create group member entry for creator
  await GroupMember.create({
    groupId: group._id,
    userId: req.userId,
    role: 'admin'
  });
  
  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: group
  });
});

// @desc    Get all public groups (for discovery)
// @route   GET /api/groups?type=public&search=keyword
// @access  Private
const getPublicGroups = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  
  const query = { type: 'public', isActive: true };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  const groups = await Group.find(query)
    .select('name description type memberCount stats createdAt')
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));
  
  const total = await Group.countDocuments(query);
  
  res.json({
    success: true,
    data: groups,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalGroups: total
    }
  });
});

// @desc    Get user's groups
// @route   GET /api/groups/my
// @access  Private
const getMyGroups = asyncHandler(async (req, res) => {
  const ChatMessage = require('../models/ChatMessage');
  const User = require('../models/User');

  const memberships = await GroupMember.find({ userId: req.userId })
    .populate({
      path: 'groupId',
      select: 'name description type memberCount stats isActive'
    })
    .sort({ lastActiveAt: -1 });

  const activeGroups = memberships.filter(m => m.groupId && m.groupId.isActive);

  // Fetch last message for each group
  const groupsWithLastMessage = await Promise.all(
    activeGroups.map(async (m) => {
      const groupData = {
        ...m.groupId.toObject(),
        myRole: m.role,
        lastActiveAt: m.lastActiveAt
      };

      try {
        // Get the last message for this group
        const lastMessage = await ChatMessage.findOne({
          groupId: m.groupId._id,
          deleted: { $ne: true }
        })
          .sort({ createdAt: -1 })
          .lean();

        if (lastMessage) {
          // Get sender info
          const sender = await User.findById(lastMessage.userId)
            .select('firstName lastName')
            .lean();

          groupData.lastMessage = {
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            jobData: lastMessage.jobData,
            createdAt: lastMessage.createdAt,
            sender: sender ? {
              firstName: sender.firstName,
              lastName: sender.lastName
            } : null
          };
        }
      } catch (err) {
        // If chat DB isn't available, just skip lastMessage
        console.log('Could not fetch last message for group:', m.groupId._id);
      }

      return groupData;
    })
  );

  res.json({
    success: true,
    data: groupsWithLastMessage
  });
});

// @desc    Get group details
// @route   GET /api/groups/:groupId
// @access  Private
const getGroupDetails = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId)
    .populate('createdBy', 'firstName lastName email')
    .populate('admins', 'firstName lastName email')
    .populate('moderators', 'firstName lastName email');
  
  if (!group) {
    throw new AppError('Group not found', 404);
  }
  
  // Check if user is member
  const membership = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: req.userId
  });
  
  const isMember = !!membership;
  const myRole = membership ? membership.role : null;
  
  // If private group and not a member, only show basic info
  if (group.type === 'private' && !isMember) {
    return res.json({
      success: true,
      data: {
        _id: group._id,
        name: group.name,
        description: group.description,
        type: group.type,
        memberCount: group.memberCount,
        isMember: false
      }
    });
  }
  
  res.json({
    success: true,
    data: group,
    myRole,
    isMember
  });
});

// @desc    Join group
// @route   POST /api/groups/:groupId/join
// @access  Private
const joinGroup = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const group = await Group.findById(req.params.groupId);
  
  if (!group) {
    throw new AppError('Group not found', 404);
  }
  
  // Check if already a member
  const existingMember = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: req.userId
  });
  
  if (existingMember) {
    throw new AppError('You are already a member of this group', 400);
  }
  
  // For private groups, validate invite code
  if (group.type === 'private') {
    if (!inviteCode || inviteCode !== group.inviteCode) {
      throw new AppError('Invalid invite code', 403);
    }
  }
  
  // Add user to group
  await group.addMember(req.userId);
  
  // Create group member entry
  await GroupMember.create({
    groupId: req.params.groupId,
    userId: req.userId,
    role: 'member'
  });
  
  res.json({
    success: true,
    message: 'Joined group successfully',
    data: group
  });
});

// @desc    Leave group
// @route   POST /api/groups/:groupId/leave
// @access  Private
const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is the only admin
  if (group.isAdmin(req.userId) && group.admins.length === 1) {
    throw new AppError('You are the only admin. Please assign another admin before leaving', 400);
  }

  // Remove user from group
  await group.removeMember(req.userId);

  // Delete group member entry
  await GroupMember.deleteOne({
    groupId: req.params.groupId,
    userId: req.userId
  });

  res.json({
    success: true,
    message: 'Left group successfully'
  });
});

// @desc    Update group
// @route   PUT /api/groups/:groupId
// @access  Private (Admin only)
const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is admin
  if (!group.isAdmin(req.userId)) {
    throw new AppError('Only admins can update group settings', 403);
  }

  const { name, description, settings } = req.body;

  if (name) group.name = name;
  if (description) group.description = description;
  if (settings) group.settings = { ...group.settings, ...settings };

  await group.save();

  res.json({
    success: true,
    message: 'Group updated successfully',
    data: group
  });
});

// @desc    Delete group with cascade delete
// @route   DELETE /api/groups/:groupId
// @access  Private (Admin only)
// Cascade deletes: messages, shared jobs, comments, members, metadata
const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // ADMIN PERMISSION CHECK
  // Only admins can delete groups - this is explicitly required
  if (!group.isAdmin(req.userId)) {
    throw new AppError('Only admins can delete the group', 403);
  }

  const groupId = group._id;
  const deletionResults = {
    messages: 0,
    sharedJobs: 0,
    comments: 0,
    members: 0
  };

  // Get chat connection for transaction support (if available)
  const chatConn = getChatConnection();

  // Start a session for transaction if supported
  let session = null;
  const supportsTransactions = chatConn.readyState === 1;

  try {
    if (supportsTransactions) {
      try {
        session = await chatConn.startSession();
        session.startTransaction();
      } catch (err) {
        // Transactions may not be supported (standalone MongoDB)
        session = null;
      }
    }

    const sessionOpts = session ? { session } : {};

    // 1. Delete all chat messages for this group
    const messageResult = await ChatMessage.deleteMany({ groupId }, sessionOpts);
    deletionResults.messages = messageResult.deletedCount || 0;

    // 2. Get all shared jobs for this group (needed to delete their comments)
    const sharedJobs = await SharedJob.find({ groupId }, '_id', sessionOpts);
    const sharedJobIds = sharedJobs.map(job => job._id);

    // 3. Delete all comments on shared jobs from this group
    if (sharedJobIds.length > 0) {
      const commentResult = await Comment.deleteMany(
        { sharedJobId: { $in: sharedJobIds } },
        sessionOpts
      );
      deletionResults.comments = commentResult.deletedCount || 0;
    }

    // 4. Delete all shared jobs for this group
    const sharedJobResult = await SharedJob.deleteMany({ groupId }, sessionOpts);
    deletionResults.sharedJobs = sharedJobResult.deletedCount || 0;

    // 5. Delete all group member entries
    const memberResult = await GroupMember.deleteMany({ groupId }, sessionOpts);
    deletionResults.members = memberResult.deletedCount || 0;

    // 6. Soft delete the group (mark as inactive)
    // This preserves the group record for audit purposes
    group.isActive = false;
    group.deletedAt = new Date();
    group.deletedBy = req.userId;
    await group.save(sessionOpts);

    // Commit transaction if we started one
    if (session) {
      await session.commitTransaction();
    }
  } catch (error) {
    // Rollback transaction if we started one
    if (session) {
      await session.abortTransaction();
    }
    throw new AppError(`Failed to delete group: ${error.message}`, 500);
  } finally {
    if (session) {
      session.endSession();
    }
  }

  res.json({
    success: true,
    message: 'Group and all associated data deleted successfully',
    data: {
      groupId: groupId,
      deleted: deletionResults
    }
  });
});

// @desc    Get group members
// @route   GET /api/groups/:groupId/members
// @access  Private (Members only)
const getGroupMembers = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view members', 403);
  }

  const members = await GroupMember.find({ groupId: req.params.groupId })
    .sort({ role: 1, joinedAt: 1 });

  // IMPORTANT: GroupMember uses local MongoDB, but User is in production MongoDB
  // We can't use .populate() across different connections, so we manually fetch users
  const User = require('../models/User');

  // Get unique user IDs from members
  const userIds = [...new Set(members.map(m => m.userId).filter(Boolean))];

  // Fetch all users in one query
  const users = await User.find({ _id: { $in: userIds } })
    .select('firstName lastName email');

  // Create a map of userId -> user data
  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
  });

  // Manually attach user data to each member and filter out members with no user
  const formattedMembers = members
    .filter(m => userMap[m.userId?.toString()]) // Filter out members with no user
    .map(m => {
      const user = userMap[m.userId.toString()];
      return {
        userId: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: m.role,
        stats: m.stats,
        joinedAt: m.joinedAt
      };
    });

  res.json({
    success: true,
    data: formattedMembers
  });
});

// @desc    Update member role
// @route   PUT /api/groups/:groupId/members/:userId
// @access  Private (Admin only)
const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if requester is admin
  if (!group.isAdmin(req.userId)) {
    throw new AppError('Only admins can update member roles', 403);
  }

  const member = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: req.params.userId
  });

  if (!member) {
    throw new AppError('Member not found', 404);
  }

  // Update role
  member.role = role;
  await member.save();

  // Update group arrays
  if (role === 'admin' && !group.admins.includes(req.params.userId)) {
    group.admins.push(req.params.userId);
    group.moderators = group.moderators.filter(id => !id.equals(req.params.userId));
  } else if (role === 'moderator' && !group.moderators.includes(req.params.userId)) {
    group.moderators.push(req.params.userId);
    group.admins = group.admins.filter(id => !id.equals(req.params.userId));
  } else if (role === 'member') {
    group.admins = group.admins.filter(id => !id.equals(req.params.userId));
    group.moderators = group.moderators.filter(id => !id.equals(req.params.userId));
  }

  await group.save();

  res.json({
    success: true,
    message: 'Member role updated successfully'
  });
});

// @desc    Remove member from group
// @route   DELETE /api/groups/:groupId/members/:userId
// @access  Private (Admin/Moderator only)
const removeMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if requester is admin or moderator
  if (!group.isModerator(req.userId)) {
    throw new AppError('Only admins and moderators can remove members', 403);
  }

  // Cannot remove admins
  if (group.isAdmin(req.params.userId)) {
    throw new AppError('Cannot remove an admin', 403);
  }

  // Remove member
  await group.removeMember(req.params.userId);

  // Delete group member entry
  await GroupMember.deleteOne({
    groupId: req.params.groupId,
    userId: req.params.userId
  });

  res.json({
    success: true,
    message: 'Member removed from group'
  });
});

// @desc    Generate/Get invite link for group
// @route   POST /api/groups/:groupId/invite
// @access  Private (Members only)
const generateInviteLink = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is a member of the group
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to generate invite links', 403);
  }

  // If group doesn't have an invite code, generate one
  if (!group.inviteCode) {
    group.generateInviteCode();
    await group.save();
  }

  res.json({
    success: true,
    message: 'Invite link generated successfully',
    data: {
      inviteCode: group.inviteCode,
      groupId: group._id,
      groupName: group.name
    }
  });
});

// @desc    Permanently delete group and all data (hard delete)
// @route   DELETE /api/groups/:groupId/permanent
// @access  Private (Admin only - use with caution)
// This completely removes all data from the database
const permanentDeleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // ADMIN PERMISSION CHECK - Only admins can permanently delete
  if (!group.isAdmin(req.userId)) {
    throw new AppError('Only admins can permanently delete the group', 403);
  }

  const groupId = group._id;
  const deletionResults = {
    messages: 0,
    sharedJobs: 0,
    comments: 0,
    members: 0,
    group: 0
  };

  const chatConn = getChatConnection();
  let session = null;

  try {
    // Try to use transactions if supported
    if (chatConn.readyState === 1) {
      try {
        session = await chatConn.startSession();
        session.startTransaction();
      } catch (err) {
        session = null;
      }
    }

    const sessionOpts = session ? { session } : {};

    // 1. Delete all chat messages
    const messageResult = await ChatMessage.deleteMany({ groupId }, sessionOpts);
    deletionResults.messages = messageResult.deletedCount || 0;

    // 2. Get and delete all comments on shared jobs
    const sharedJobs = await SharedJob.find({ groupId }, '_id', sessionOpts);
    const sharedJobIds = sharedJobs.map(job => job._id);

    if (sharedJobIds.length > 0) {
      const commentResult = await Comment.deleteMany(
        { sharedJobId: { $in: sharedJobIds } },
        sessionOpts
      );
      deletionResults.comments = commentResult.deletedCount || 0;
    }

    // 3. Delete all shared jobs
    const sharedJobResult = await SharedJob.deleteMany({ groupId }, sessionOpts);
    deletionResults.sharedJobs = sharedJobResult.deletedCount || 0;

    // 4. Delete all group members
    const memberResult = await GroupMember.deleteMany({ groupId }, sessionOpts);
    deletionResults.members = memberResult.deletedCount || 0;

    // 5. HARD DELETE the group document
    await Group.deleteOne({ _id: groupId }, sessionOpts);
    deletionResults.group = 1;

    if (session) {
      await session.commitTransaction();
    }
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw new AppError(`Failed to permanently delete group: ${error.message}`, 500);
  } finally {
    if (session) {
      session.endSession();
    }
  }

  res.json({
    success: true,
    message: 'Group and all data permanently deleted',
    data: {
      groupId: groupId,
      deleted: deletionResults
    }
  });
});

module.exports = {
  createGroup,
  getPublicGroups,
  getMyGroups,
  getGroupDetails,
  joinGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
  permanentDeleteGroup,
  getGroupMembers,
  updateMemberRole,
  removeMember,
  generateInviteLink
};

