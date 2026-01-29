const ChatMessage = require('../models/ChatMessage');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');

/**
 * Register chat event handlers for Socket.io
 * @param {Object} io - Socket.io server instance
 */
function registerChatHandlers(io) {
  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Handle sending a chat message
    socket.on('send-message', async (data) => {
      try {
        const { groupId, content, messageType, sharedJobId, mentions, replyTo, jobData } = data;

        // Verify user is member of the group
        const group = await Group.findById(groupId);
        
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }
        
        if (!group.isMember(userId)) {
          socket.emit('error', { message: 'You are not a member of this group' });
          return;
        }

        // Check if chat is enabled
        if (!group.settings.allowChat) {
          socket.emit('error', { message: 'Chat is disabled for this group' });
          return;
        }

        // Create message in database
        const message = await ChatMessage.create({
          groupId,
          userId,
          content,
          messageType: messageType || 'text',
          sharedJobId: sharedJobId || null,
          jobData: jobData || null,
          mentions: mentions || [],
          replyTo: replyTo || null
        });

        // Update group stats
        group.stats.totalMessages += 1;
        await group.save();

        // Update member stats
        const member = await GroupMember.findOne({ groupId, userId });
        if (member) {
          await member.updateStats('messagesPosted');
          await member.updateLastActive();
        }

        // IMPORTANT: ChatMessage uses local MongoDB, but User is in production MongoDB
        // We can't use .populate() across different connections, so we manually fetch the user
        const User = require('../models/User');
        const user = await User.findById(userId).select('firstName lastName email');

        // Convert message to object and manually attach user data
        const messageObj = message.toObject();
        messageObj.userId = user ? {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        } : null;

        // Attach job data if it's a job_share message
        if (messageType === 'job_share' && jobData) {
          messageObj.jobData = jobData;
        }

        // Broadcast message to all members in the group room
        io.to(`group:${groupId}`).emit('new-message', {
          message: messageObj,
          groupId
        });

        // Send notifications to mentioned users
        if (mentions && mentions.length > 0) {
          mentions.forEach(mentionedUserId => {
            io.to(`user:${mentionedUserId}`).emit('mention-notification', {
              message: message.toObject(),
              groupId,
              mentionedBy: {
                userId,
                userName: socket.userName
              }
            });
          });
        }

        console.log(`💬 Message sent in group ${groupId} by ${socket.userName}`);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing-start', (data) => {
      const { groupId } = data;
      
      // Broadcast to other members in the group (not to self)
      socket.to(`group:${groupId}`).emit('user-typing', {
        userId,
        userName: socket.userName,
        groupId
      });
    });

    socket.on('typing-stop', (data) => {
      const { groupId } = data;
      
      socket.to(`group:${groupId}`).emit('user-stopped-typing', {
        userId,
        groupId
      });
    });

    // Handle message reactions (real-time)
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, reactionType, groupId } = data;

        const message = await ChatMessage.findById(messageId);

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Add reaction
        await message.addReaction(reactionType, userId);

        // Broadcast to group
        io.to(`group:${groupId}`).emit('message-reaction-added', {
          messageId,
          reactionType,
          userId,
          userName: socket.userName,
          groupId
        });

        console.log(`👍 Reaction ${reactionType} added to message ${messageId} by ${socket.userName}`);

      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Handle removing reaction
    socket.on('remove-reaction', async (data) => {
      try {
        const { messageId, reactionType, groupId } = data;

        const message = await ChatMessage.findById(messageId);

        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Remove reaction
        await message.removeReaction(reactionType, userId);

        // Broadcast to group
        io.to(`group:${groupId}`).emit('message-reaction-removed', {
          messageId,
          reactionType,
          userId,
          userName: socket.userName,
          groupId
        });

        console.log(`👎 Reaction ${reactionType} removed from message ${messageId} by ${socket.userName}`);

      } catch (error) {
        console.error('Remove reaction error:', error);
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    // Handle message edit (real-time)
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, content, groupId } = data;

        const message = await ChatMessage.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check ownership
        if (message.userId.toString() !== userId) {
          socket.emit('error', { message: 'You can only edit your own messages' });
          return;
        }

        message.content = content;
        await message.markAsEdited();

        // Broadcast to group
        io.to(`group:${groupId}`).emit('message-edited', {
          messageId,
          content,
          editedAt: message.editedAt,
          groupId
        });

      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message delete (real-time)
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, groupId } = data;

        const message = await ChatMessage.findById(messageId);
        const group = await Group.findById(groupId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check ownership or admin
        const isOwner = message.userId.toString() === userId;
        const isAdmin = group.isAdmin(userId);

        if (!isOwner && !isAdmin) {
          socket.emit('error', { message: 'You can only delete your own messages' });
          return;
        }

        await message.softDelete();

        // Broadcast to group
        io.to(`group:${groupId}`).emit('message-deleted', {
          messageId,
          groupId
        });

      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });
  });
}

module.exports = { registerChatHandlers };

