// OPTIONAL CHAT CONTROLLER - Only needed if chat feature is enabled
const ChatMessage = require('../models/ChatMessage');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { chatCache } = require('../utils/cache');
const multer = require('multer');
const { uploadFile, getDownloadUrl } = require('../config/s3');

// @desc    Get chat messages for group (supports lazy loading)
// @route   GET /api/groups/:groupId/messages
// @query    ?limit=50&before=timestamp (cursor-based) OR ?page=1&limit=50 (page-based)
// @access  Private (Members only)
const getMessages = asyncHandler(async (req, res) => {
  const { page, limit = 50, before } = req.query;
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

  // CURSOR-BASED LAZY LOADING (preferred for infinite scroll)
  // Used when scrolling up to load older messages
  if (before) {
    console.log(`[Controller] 📜 Lazy loading messages before timestamp: ${before}`);
    return await getMessagesBeforeCursor(req, res, groupId, before, parseInt(limit));
  }

  // PAGE-BASED PAGINATION (backward compatibility)
  // HOT PATH: First page from cache
  if (!page || parseInt(page) === 1) {
    console.log(`[Controller] 🔍 Attempting to fetch first batch from cache for group ${groupId}`);
    try {
      const cachedMessages = await chatCache.getHotMessages(groupId, parseInt(limit));

      if (cachedMessages && cachedMessages.length > 0) {
        const total = await chatCache.getMessageCount(groupId);
        const hasMore = cachedMessages.length >= parseInt(limit);
        const oldestMessage = cachedMessages[0]; // Already reversed in cache

        console.log(`[Controller] ✅ Returning ${cachedMessages.length} cached messages to client`);
        return res.json({
          success: true,
          data: cachedMessages.reverse(), // Reverse to show oldest first
          pagination: {
            currentPage: 1,
            totalPages: Math.ceil(total / parseInt(limit)),
            totalMessages: total,
            hasMore,
            oldestTimestamp: oldestMessage?.createdAt
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
    .limit(parseInt(limit) + 1) // Fetch one extra to check if there's more
    .skip((parseInt(page || 1) - 1) * parseInt(limit));

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

  // Check if there are more messages (we fetched limit + 1)
  const hasMore = messages.length > parseInt(limit);
  const actualMessages = hasMore ? messages.slice(0, parseInt(limit)) : messages;

  // Manually attach user data to each message
  const messagesWithUsers = actualMessages.map(msg => {
    const messageObj = msg.toObject();
    messageObj.userId = userMap[msg.userId?.toString()] || null;
    return messageObj;
  });

  const total = await ChatMessage.countDocuments({
    groupId: groupId,
    deleted: false
  });

  // Cache first page results for next time
  if ((!page || parseInt(page) === 1) && messagesWithUsers.length > 0) {
    console.log(`[Controller] 💾 Warming cache with ${messagesWithUsers.length} messages from DB`);
    chatCache.cacheMessages(messagesWithUsers, groupId).catch(err => {
      console.warn('[Controller] ❌ Failed to cache messages:', err.message);
    });
  }

  const oldestMessage = messagesWithUsers[messagesWithUsers.length - 1];
  console.log(`[Controller] 📤 Returning ${messagesWithUsers.length} messages from DB (page ${page || 1})`);

  res.json({
    success: true,
    data: messagesWithUsers.reverse(), // Reverse to show oldest first
    pagination: {
      currentPage: parseInt(page || 1),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalMessages: total,
      hasMore,
      oldestTimestamp: oldestMessage?.createdAt
    },
    cached: false
  });
});

// Helper function for cursor-based lazy loading
async function getMessagesBeforeCursor(req, res, groupId, beforeTimestamp, limit) {
  const beforeDate = new Date(beforeTimestamp);

  console.log(`[Controller] 🔍 Fetching ${limit} messages before ${beforeDate.toISOString()}`);

  // Query messages before the cursor
  const messages = await ChatMessage.find({
    groupId: groupId,
    deleted: false,
    createdAt: { $lt: beforeDate } // Messages created BEFORE this timestamp
  })
    .sort({ createdAt: -1 }) // Newest first
    .limit(limit + 1); // Fetch one extra to check if there's more

  // Check if there are more messages
  const hasMore = messages.length > limit;
  const actualMessages = hasMore ? messages.slice(0, limit) : messages;

  // Manually populate user data (cross-database)
  const User = require('../models/User');
  const userIds = [...new Set(actualMessages.map(m => m.userId).filter(Boolean))];

  const users = await User.find({ _id: { $in: userIds } })
    .select('firstName lastName email');

  const userMap = {};
  users.forEach(user => {
    userMap[user._id.toString()] = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };
  });

  const messagesWithUsers = actualMessages.map(msg => {
    const messageObj = msg.toObject();
    messageObj.userId = userMap[msg.userId?.toString()] || null;
    return messageObj;
  });

  const oldestMessage = messagesWithUsers[messagesWithUsers.length - 1];

  console.log(`[Controller] ✅ Returning ${messagesWithUsers.length} messages (hasMore: ${hasMore})`);

  return res.json({
    success: true,
    data: messagesWithUsers.reverse(), // Reverse to show oldest first
    pagination: {
      hasMore,
      oldestTimestamp: oldestMessage?.createdAt,
      count: messagesWithUsers.length
    },
    cached: false
  });
}

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

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
}).single('pdf'); // Expecting field name 'pdf'

// @desc    Upload PDF to chat
// @route   POST /api/groups/:groupId/messages/upload-pdf
// @access  Private (Members only)
const uploadPDF = asyncHandler(async (req, res) => {
  const groupId = req.params.groupId;

  // Check if group exists and user is member
  const group = await Group.findById(groupId);
  if (!group) {
    throw new AppError('Group not found', 404);
  }

  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to upload files', 403);
  }

  // Check if chat is enabled
  if (!group.settings.allowChat) {
    throw new AppError('Chat is disabled for this group', 403);
  }

  // Handle file upload with multer
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      // Upload to S3
      const folder = `chat-pdfs/${groupId}`;
      const s3Key = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder
      );

      console.log(`[Chat] PDF uploaded to S3: ${s3Key}`);

      // Create chat message with PDF attachment
      const message = await ChatMessage.create({
        groupId: groupId,
        userId: req.userId,
        content: req.body.content || `Shared a PDF: ${req.file.originalname}`,
        messageType: 'pdf_attachment',
        pdfAttachment: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          s3Key: s3Key,
          uploadedAt: new Date()
        }
      });

      // Update group stats
      group.stats.totalMessages += 1;
      await group.save();

      // Update member stats
      const member = await GroupMember.findOne({
        groupId: groupId,
        userId: req.userId
      });

      if (member) {
        await member.updateStats('messagesPosted');
      }

      // Fetch user info manually (cross-connection)
      const User = require('../models/User');
      const user = await User.findById(req.userId).select('firstName lastName email');

      // Convert message to object and attach user data
      const messageObj = message.toObject();
      messageObj.userId = user ? {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      } : null;

      console.log(`[Chat] PDF message created: ${message._id}`);

      res.status(201).json({
        success: true,
        message: 'PDF uploaded successfully',
        data: messageObj
      });
    } catch (error) {
      console.error('[Chat] PDF upload failed:', error);
      return res.status(500).json({
        success: false,
        message: `Failed to upload PDF: ${error.message}`
      });
    }
  });
});

// @desc    Get PDF download URL
// @route   GET /api/groups/:groupId/messages/:messageId/pdf
// @access  Private (Members only)
const getPDFDownloadUrl = asyncHandler(async (req, res) => {
  const { groupId, messageId } = req.params;

  // Check if group exists and user is member
  const group = await Group.findById(groupId);
  if (!group) {
    throw new AppError('Group not found', 404);
  }

  if (!group.isMember(req.userId)) {
    throw new AppError('You must be a member to view files', 403);
  }

  // Get message
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (message.messageType !== 'pdf_attachment' || !message.pdfAttachment?.s3Key) {
    throw new AppError('No PDF attachment found', 404);
  }

  // Generate pre-signed URL (valid for 1 hour)
  const downloadUrl = await getDownloadUrl(message.pdfAttachment.s3Key, 3600);

  res.json({
    success: true,
    data: {
      downloadUrl,
      fileName: message.pdfAttachment.fileName,
      fileSize: message.pdfAttachment.fileSize
    }
  });
});

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  uploadPDF,
  getPDFDownloadUrl
};

