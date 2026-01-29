const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { checkGroupMembership, checkGroupAdmin, checkGroupModerator } = require('../middleware/groupAuth');
const { groupCreationLimiter, joinGroupLimiter } = require('../middleware/groupRateLimiter');
const {
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
} = require('../controllers/groupController');

// All routes require authentication
router.use(auth);

// Group CRUD
router.post('/', groupCreationLimiter, createGroup);                    // Create group (rate limited)
router.get('/', getPublicGroups);                                       // Get public groups (discovery)
router.get('/my', getMyGroups);                                         // Get user's groups
router.get('/:groupId', getGroupDetails);                               // Get group details

// Group Actions
router.post('/:groupId/join', joinGroupLimiter, joinGroup);             // Join group (rate limited)
router.post('/:groupId/leave', checkGroupMembership, leaveGroup);       // Leave group (members only)
router.post('/:groupId/invite', checkGroupMembership, generateInviteLink); // Generate invite link (members only)
router.put('/:groupId', checkGroupAdmin, updateGroup);                  // Update group (admin only)
router.delete('/:groupId', checkGroupAdmin, deleteGroup);               // Soft delete group (admin only)
router.delete('/:groupId/permanent', checkGroupAdmin, permanentDeleteGroup); // Permanent delete (admin only)

// Member Management
router.get('/:groupId/members', checkGroupMembership, getGroupMembers); // Get group members (members only)
router.put('/:groupId/members/:userId', checkGroupAdmin, updateMemberRole); // Update member role (admin only)
router.delete('/:groupId/members/:userId', checkGroupModerator, removeMember); // Remove member (admin/mod only)

module.exports = router;

