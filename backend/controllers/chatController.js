// OPTIONAL CHAT CONTROLLER - Only needed if chat feature is enabled
const ChatMessage = require('../models/ChatMessage');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { chatCache } = require('../utils/cache');

// @desc    Get chat messages for group
// @route   GET /api/groups/:groupId/messages
// @access  Private (Members only)
const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const groupId = req.params.groupId;

  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError('Group not found', 404);
  }

  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view messages', 403);
  }

  // Check if chat is enabled
  if (!group.settings.allowChat) {
    throw new AppError('Chat is disabled for this group', 403);
  }

  // HOT PATH: First page from cache
  if (parseInt(page) === 1) {
    console.log(`[Controller] 🔍 Attempting to fetch page 1 from cache for group ${groupId}`);
    try {
      const cachedMessages = await chatCache.getHotMessages(groupId, parseInt(limit));

      if (cachedMessages && cachedMessages.length > 0) {
        const total = await chatCache.getMessageCount(groupId);

        console.log(`[Controller] ✅ Returning ${cachedMessages.length} cached messages to client`);
        return res.json({
          success: true,
          data: cachedMessages.reverse(), // Reverse to show oldest first
          pagination: {
            currentPage: 1,
            totalPages: Math.ceil(total / parseInt(limit)),
            totalMessages: total
          },
          cached: true
        });
      }
    } catch (cacheError) {
      console.warn('[Controller] ⚠️  Cache error, falling back to DB:', cacheError.message);
    }
  } else {
    console.log(`[Controller] ⏭️  Page ${page} requested - skipping cache, querying DB directly`);
  }

  // COLD PATH: Page 2+ or cache miss - Query MongoDB
  const messages = await ChatMessage.find({
    groupId: groupId,
    deleted: false
  })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  // IMPORTANT: ChatMessage uses local MongoDB, but User is in production MongoDB
  // We can't use .populate() across different connections, so we manually fetch users
  const User = require('../models/User');

  // Get unique user IDs from messages
  const userIds = [...new Set(messages.map(m => m.userId).filter(Boolean))];

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

  // Manually attach user data to each message
  const messagesWithUsers = messages.map(msg => {
    const messageObj = msg.toObject();
    messageObj.userId = userMap[msg.userId?.toString()] || null;
    return messageObj;
  });

  const total = await ChatMessage.countDocuments({
    groupId: groupId,
    deleted: false
  });

  // Cache first page results for next time
  if (parseInt(page) === 1 && messagesWithUsers.length > 0) {
    console.log(`[Controller] 💾 Warming cache with ${messagesWithUsers.length} messages from DB`);
    chatCache.cacheMessages(messagesWithUsers, groupId).catch(err => {
      console.warn('[Controller] ❌ Failed to cache messages:', err.message);
    });
  }

  console.log(`[Controller] 📤 Returning ${messagesWithUsers.length} messages from DB (page ${page})`);


  res.json({
    success: true,
    data: messagesWithUsers.reverse(), // Reverse to show oldest first
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalMessages: total
    },
    cached: false
  });
});

// @desc    Send chat message
// @route   POST /api/groups/:groupId/messages
// @access  Private (Members only)
const sendMessage = asyncHandler(async (req, res) => {
  const { content, messageType, sharedJobId, mentions } = req.body;
  
  const group = await Group.findById(req.params.groupId);
  
  if (!group) {
    throw new AppError('Group not found', 404);
  }
  
  // Check if user is member
  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to send messages', 403);
  }
  
  // Check if chat is enabled
  if (!group.settings.allowChat) {
    throw new AppError('Chat is disabled for this group', 403);
  }
  
  // Create message
  const message = await ChatMessage.create({
    groupId: req.params.groupId,
    userId: req.userId,
    content,
    messageType: messageType || 'text',
    sharedJobId: sharedJobId || null,
    mentions: mentions || []
  });
  
  // Update group stats
  group.stats.totalMessages += 1;
  await group.save();
  
  // Update member stats
  const member = await GroupMember.findOne({
    groupId: req.params.groupId,
    userId: req.userId
  });
  
  if (member) {
    await member.updateStats('messagesPosted');
  }
  
  // Populate user info
  await message.populate('userId', 'firstName lastName email');
  
  res.status(201).json({
    success: true,
    message: 'Message sent',
    data: message
  });
});

// @desc    Edit message
// @route   PUT /api/groups/:groupId/messages/:messageId
// @access  Private (Message owner only)
const editMessage = asyncHandler(async (req, res) => {
  const { content } = req.body;
  
  const message = await ChatMessage.findById(req.params.messageId);
  
  if (!message) {
    throw new AppError('Message not found', 404);
  }
  
  // Check if user is the message owner
  if (message.userId.toString() !== req.userId) {
    throw new AppError('You can only edit your own messages', 403);
  }
  
  message.content = content;
  await message.markAsEdited();
  
  res.json({
    success: true,
    message: 'Message updated',
    data: message
  });
});

// @desc    Delete message
// @route   DELETE /api/groups/:groupId/messages/:messageId
// @access  Private (Message owner or Admin)
const deleteMessage = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  const message = await ChatMessage.findById(req.params.messageId);
  
  if (!message) {
    throw new AppError('Message not found', 404);
  }
  
  // Check if user is the message owner or admin
  const isOwner = message.userId.toString() === req.userId;
  const isAdmin = group.isAdmin(req.userId);
  
  if (!isOwner && !isAdmin) {
    throw new AppError('You can only delete your own messages', 403);
  }
  
  await message.softDelete();
  
  res.json({
    success: true,
    message: 'Message deleted'
  });
});

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage
};

