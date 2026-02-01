const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :groupId from parent router
const { auth } = require('../middleware/auth');
const { checkGroupMembership } = require('../middleware/groupAuth');
const { checkGroupSetting } = require('../middleware/groupRole');
const { messageLimiter } = require('../middleware/groupRateLimiter');
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  uploadPDF,
  getPDFDownloadUrl
} = require('../controllers/chatController');

// OPTIONAL CHAT ROUTES - Only needed if chat feature is enabled

// All routes require authentication and group membership
router.use(auth);
router.use(checkGroupMembership);

// Chat Messages
router.get('/', checkGroupSetting('allowChat'), getMessages);  // Get chat messages (check setting)
router.post('/',
  checkGroupSetting('allowChat'),
  messageLimiter,
  sendMessage
);                                                             // Send message (rate limited, check setting)
router.put('/:messageId', editMessage);                        // Edit message (owner only)
router.delete('/:messageId', deleteMessage);                   // Delete message (owner/admin only)

// PDF Upload
router.post('/upload-pdf', checkGroupSetting('allowChat'), messageLimiter, uploadPDF);  // Upload PDF
router.get('/:messageId/pdf', getPDFDownloadUrl);              // Get PDF download URL

module.exports = router;

