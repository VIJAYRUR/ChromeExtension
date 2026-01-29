const SharedJob = require('../models/SharedJob');
const Group = require('../models/Group');
const Comment = require('../models/Comment');

/**
 * Register group event handlers for Socket.io
 * Real-time notifications for job shares, comments, reactions, etc.
 * @param {Object} io - Socket.io server instance
 */
function registerGroupHandlers(io) {
  
  /**
   * Notify group members when a new job is shared
   */
  const notifyJobShared = async (groupId, sharedJob, sharedByUser) => {
    io.to(`group:${groupId}`).emit('job-shared', {
      groupId,
      job: sharedJob,
      sharedBy: {
        userId: sharedByUser._id,
        name: `${sharedByUser.firstName} ${sharedByUser.lastName}`
      },
      timestamp: new Date()
    });
    
    console.log(`📢 Job shared notification sent to group ${groupId}`);
  };

  /**
   * Notify group members when someone saves a shared job
   */
  const notifyJobSaved = async (groupId, jobId, savedByUser) => {
    io.to(`group:${groupId}`).emit('job-saved', {
      groupId,
      jobId,
      savedBy: {
        userId: savedByUser._id,
        name: `${savedByUser.firstName} ${savedByUser.lastName}`
      },
      timestamp: new Date()
    });
  };

  /**
   * Notify group members when someone applies to a shared job
   */
  const notifyJobApplication = async (groupId, jobId, appliedByUser) => {
    io.to(`group:${groupId}`).emit('job-application', {
      groupId,
      jobId,
      appliedBy: {
        userId: appliedByUser._id,
        name: `${appliedByUser.firstName} ${appliedByUser.lastName}`
      },
      timestamp: new Date()
    });
  };

  /**
   * Notify group members when a comment is added to a shared job
   */
  const notifyCommentAdded = async (groupId, jobId, comment, commentByUser) => {
    io.to(`group:${groupId}`).emit('comment-added', {
      groupId,
      jobId,
      comment,
      commentBy: {
        userId: commentByUser._id,
        name: `${commentByUser.firstName} ${commentByUser.lastName}`
      },
      timestamp: new Date()
    });
  };

  /**
   * Notify group members when a reaction is added to a shared job
   */
  const notifyReactionAdded = async (groupId, jobId, reactionType, reactedByUser) => {
    io.to(`group:${groupId}`).emit('reaction-added', {
      groupId,
      jobId,
      reactionType,
      reactedBy: {
        userId: reactedByUser._id,
        name: `${reactedByUser.firstName} ${reactedByUser.lastName}`
      },
      timestamp: new Date()
    });
  };

  /**
   * Notify group members when a new member joins
   */
  const notifyMemberJoined = async (groupId, newMember) => {
    io.to(`group:${groupId}`).emit('member-joined', {
      groupId,
      member: {
        userId: newMember._id,
        name: `${newMember.firstName} ${newMember.lastName}`,
        email: newMember.email
      },
      timestamp: new Date()
    });
    
    console.log(`👋 Member joined notification sent to group ${groupId}`);
  };

  /**
   * Notify group members when a member leaves
   */
  const notifyMemberLeft = async (groupId, leftMember) => {
    io.to(`group:${groupId}`).emit('member-left', {
      groupId,
      member: {
        userId: leftMember._id,
        name: `${leftMember.firstName} ${leftMember.lastName}`
      },
      timestamp: new Date()
    });
  };

  /**
   * Notify group members when group settings are updated
   */
  const notifyGroupUpdated = async (groupId, updatedFields) => {
    io.to(`group:${groupId}`).emit('group-updated', {
      groupId,
      updatedFields,
      timestamp: new Date()
    });
  };

  /**
   * Notify specific user (for personal notifications)
   */
  const notifyUser = async (userId, eventType, data) => {
    io.to(`user:${userId}`).emit(eventType, {
      ...data,
      timestamp: new Date()
    });
  };

  /**
   * Notify when user is mentioned in a comment
   */
  const notifyMentionInComment = async (mentionedUserId, groupId, jobId, comment, mentionedByUser) => {
    io.to(`user:${mentionedUserId}`).emit('mention-in-comment', {
      groupId,
      jobId,
      comment,
      mentionedBy: {
        userId: mentionedByUser._id,
        name: `${mentionedByUser.firstName} ${mentionedByUser.lastName}`
      },
      timestamp: new Date()
    });
  };

  // Attach notification functions to io instance for use in controllers
  io.groupNotifications = {
    notifyJobShared,
    notifyJobSaved,
    notifyJobApplication,
    notifyCommentAdded,
    notifyReactionAdded,
    notifyMemberJoined,
    notifyMemberLeft,
    notifyGroupUpdated,
    notifyUser,
    notifyMentionInComment
  };

  console.log('✅ Group notification handlers registered');
}

module.exports = { registerGroupHandlers };

