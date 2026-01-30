/**
 * Group Detail Page - Main functionality
 */

// State
let currentGroupId = null;
let currentGroup = null;
let currentUser = null;
let isAdmin = false;
let isModerator = false;
let typingTimeout = null;
let isTyping = false;

// DOM Elements
const backBtn = document.getElementById('back-btn');
const groupNameEl = document.getElementById('group-name');
const memberCountEl = document.getElementById('member-count');
const groupTypeBadge = document.getElementById('group-type-badge');
const inviteBtn = document.getElementById('invite-btn');
const settingsBtn = document.getElementById('settings-btn');
const leaveBtn = document.getElementById('leave-btn');

// Mobile tabs
const mobileTabs = document.querySelectorAll('.mobile-tab');
const sectionJobs = document.getElementById('section-jobs');
const sectionChat = document.getElementById('section-chat');
const sectionMembers = document.getElementById('section-members');

// Containers
const jobsContainer = document.getElementById('jobs-container');
const messagesContainer = document.getElementById('messages-container');
const membersContainer = document.getElementById('members-container');
const memberCountBadge = document.getElementById('member-count-badge');

// Buttons
const shareJobBtn = document.getElementById('share-job-btn');
const sendMessageBtn = document.getElementById('send-message-btn');
const messageInput = document.getElementById('message-input');
const attachJobBtn = document.getElementById('attach-job-btn');

// Job Picker Dropdown
const jobPickerDropdown = document.getElementById('job-picker-dropdown');
const closeJobPickerBtn = document.getElementById('close-job-picker');
const jobPickerSearch = document.getElementById('job-picker-search');
const jobPickerList = document.getElementById('job-picker-list');

// Share Job Modal
const shareJobModal = document.getElementById('share-job-modal');
const closeShareModalBtn = document.getElementById('close-share-modal');
const shareJobSearch = document.getElementById('share-job-search');
const shareJobsList = document.getElementById('share-jobs-list');
const shareEmptyState = document.getElementById('share-empty-state');

// Job Details Modal
const jobDetailsModal = document.getElementById('job-details-modal');
const closeJobDetailsModalBtn = document.getElementById('close-job-details-modal');
const jobDetailsContent = document.getElementById('job-details-content');

// Job Tracker
let userJobs = [];
let filteredJobs = [];
let sharedJobsData = []; // Store shared jobs data for details view

/**
 * Initialize page
 */
async function initializePage() {
  console.log('[Group Detail] Initializing...');

  // Get group ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentGroupId = urlParams.get('id');

  if (!currentGroupId) {
    showNotification('No group ID provided', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  // Get current user
  await loadCurrentUser();

  // Load group details
  await loadGroupDetails();

  // Check membership
  if (!checkMembership()) {
    showNotification('You are not a member of this group', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  // Initialize event listeners
  initializeEventListeners();

  // Initialize Socket.io connection
  await initializeSocket();

  // Load content
  loadSharedJobs();
  loadMessages();
  loadMembers();

  // Initialize global notifications
  initializeGlobalNotifications();

  // Handle tab URL parameter (for navigation from notifications)
  const tab = urlParams.get('tab');
  if (tab && ['jobs', 'chat', 'members'].includes(tab)) {
    switchSection(tab);
    console.log('[Group Detail] Switched to tab from URL:', tab);
  }

  console.log('[Group Detail] Initialized successfully');
}

/**
 * Initialize global notifications
 */
function initializeGlobalNotifications() {
  if (window.globalNotifications) {
    window.globalNotifications.injectInto('#notification-bell-wrapper');
    console.log('[Group Detail] ✅ Global notifications initialized');
  } else {
    console.warn('[Group Detail] Global notifications not available');
  }
}

/**
 * Load current user
 */
async function loadCurrentUser() {
  try {
    // Wait for auth manager to initialize
    if (window.authManager) {
      await window.authManager.init();
      currentUser = window.authManager.getUser();
    }

    if (!currentUser) {
      throw new Error('User not found');
    }

    console.log('[Group Detail] Current user:', currentUser.email);
  } catch (error) {
    console.error('[Group Detail] Error loading user:', error);
    showNotification('Please login first', 'error');
    setTimeout(() => {
      window.location.href = '../auth/login.html';
    }, 1500);
  }
}

/**
 * Load group details
 */
async function loadGroupDetails() {
  try {
    console.log('[Group Detail] Loading group:', currentGroupId);

    currentGroup = await groupAPI.getGroupDetails(currentGroupId);

    if (!currentGroup) {
      throw new Error('Group not found');
    }

    // Update UI
    groupNameEl.textContent = currentGroup.name;
    memberCountEl.textContent = `${currentGroup.stats?.memberCount || 0} members`;
    
    // Update type badge
    groupTypeBadge.textContent = currentGroup.type === 'public' ? 'Public' : 'Private';
    if (currentGroup.type === 'private') {
      groupTypeBadge.classList.add('private');
    }

    console.log('[Group Detail] Group loaded:', currentGroup.name);
  } catch (error) {
    console.error('[Group Detail] Error loading group:', error);
    showNotification(error.message || 'Failed to load group', 'error');
  }
}

/**
 * Check if user is a member
 */
function checkMembership() {
  if (!currentGroup || !currentUser) return false;

  // Check if user is in members array
  const isMember = currentGroup.members?.some(m => 
    m._id === currentUser._id || m === currentUser._id
  );

  if (!isMember) return false;

  // Check if user is admin
  isAdmin = currentGroup.admins?.some(a => 
    a._id === currentUser._id || a === currentUser._id
  ) || currentGroup.createdBy === currentUser._id;

  // Check if user is moderator
  isModerator = currentGroup.moderators?.some(m => 
    m._id === currentUser._id || m === currentUser._id
  );

  // Show settings button for admins
  if (isAdmin && settingsBtn) {
    settingsBtn.style.display = 'flex';
  }

  console.log('[Group Detail] Membership check:', { isMember, isAdmin, isModerator });

  return true;
}

/**
 * Initialize Socket.io connection
 */
async function initializeSocket() {
  try {
    console.log('[Group Detail] Initializing Socket.io...');

    // Get auth token
    const token = window.authManager.token;
    if (!token) {
      console.error('[Group Detail] No auth token available');
      return;
    }

    // Register event handlers first (before connecting)
    registerSocketEventHandlers();

    // Connect to Socket.io server
    await window.socketClient.connect(token);

    // If already connected, join immediately
    // Otherwise, the socket-connected event handler will join the group
    if (window.socketClient.connected()) {
      console.log('[Group Detail] Already connected, joining group...');
      window.socketClient.joinGroup(currentGroupId);
    } else {
      console.log('[Group Detail] Waiting for socket connection...');
    }

    console.log('[Group Detail] ✅ Socket.io initialized');

  } catch (error) {
    console.error('[Group Detail] Error initializing Socket.io:', error);
    showNotification('Real-time features unavailable', 'warning');
  }
}

/**
 * Register Socket.io event handlers
 */
function registerSocketEventHandlers() {
  // New message received
  window.socketClient.on('new-message', (data) => {
    console.log('[Group Detail] 🔍 New message received:', data);
    console.log('[Group Detail] 🔍 currentGroupId:', currentGroupId);
    console.log('[Group Detail] 🔍 data.groupId:', data.groupId);
    console.log('[Group Detail] 🔍 Match:', data.groupId === currentGroupId);

    if (data.groupId === currentGroupId) {
      console.log('[Group Detail] 🔍 Processing message for current group');
      console.log('[Group Detail] 🔍 message.userId:', data.message.userId);
      console.log('[Group Detail] 🔍 currentUser._id:', currentUser._id);

      // Check if this is our own message (from optimistic update)
      const isOwnMessage = data.message.userId?._id === currentUser._id || data.message.userId === currentUser._id;
      console.log('[Group Detail] 🔍 isOwnMessage:', isOwnMessage);

      if (isOwnMessage) {
        // Remove pending message if it exists (from optimistic update)
        const pendingMessages = messagesContainer.querySelectorAll('.message-pending');
        console.log('[Group Detail] 🔍 Pending messages found:', pendingMessages.length);
        pendingMessages.forEach(msg => {
          const messageText = msg.querySelector('.message-text')?.textContent;
          if (messageText === data.message.content) {
            console.log('[Group Detail] 🔍 Removing pending message');
            msg.remove();
          }
        });
      } else {
        // Use smart notifications - shows desktop if away, in-app toast if active
        if (window.smartNotifications) {
          const senderName = data.message.sender?.name || 'Someone';
          const preview = data.message.content.substring(0, 100);
          const groupName = document.getElementById('group-name')?.textContent || 'Group';

          window.smartNotifications.showChatNotification({
            senderName: senderName,
            message: preview,
            groupName: groupName,
            groupId: data.groupId,
            messageId: data.message._id
          });
        }
      }

      // Add the real message from server
      console.log('[Group Detail] 🔍 Adding message to UI');
      appendMessageToUI(data.message);
      scrollMessagesToBottom();
    }
  });

  // Message edited
  window.socketClient.on('message-edited', (data) => {
    console.log('[Group Detail] Message edited:', data);
    if (data.groupId === currentGroupId) {
      updateMessageInUI(data.messageId, data.content);
    }
  });

  // Message deleted
  window.socketClient.on('message-deleted', (data) => {
    console.log('[Group Detail] Message deleted:', data);
    if (data.groupId === currentGroupId) {
      removeMessageFromUI(data.messageId);
    }
  });

  // Typing indicator
  window.socketClient.on('user-typing', (data) => {
    if (data.groupId === currentGroupId && data.userId !== currentUser._id) {
      showTypingIndicator(data.userName);
    }
  });

  window.socketClient.on('user-stopped-typing', (data) => {
    if (data.groupId === currentGroupId) {
      hideTypingIndicator();
    }
  });

  // Job shared
  window.socketClient.on('job-shared', (data) => {
    console.log('[Group Detail] Job shared:', data);

    // Add to global notifications (for all groups, not just current)
    // Don't show notification if user is the one who shared
    if (currentUser && data.sharedBy.userId !== currentUser._id) {
      if (window.globalNotifications) {
        window.globalNotifications.addNotification({
          type: 'job-shared',
          title: 'New Job Shared',
          message: `${data.sharedBy.name} shared "${data.job.title}" at ${data.job.company}`,
          data: {
            groupId: data.groupId,
            jobId: data.job._id || data.jobId,
            sharedBy: data.sharedBy
          }
        });
        console.log('[Group Detail] ✅ Added job-shared notification to global notifications');
      }
    }

    if (data.groupId === currentGroupId) {
      const message = `${data.sharedBy.name} shared: ${data.job.title} at ${data.job.company}`;
      showNotification(message, 'success');
      loadSharedJobs(); // Reload jobs list

      // Show browser notification if not on this page
      if (document.hidden && typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'showNotification',
          notificationId: `job-shared-${data.job._id}`,
          title: 'New Job Shared',
          message: message,
          priority: 1,
          data: { type: 'job-shared', groupId: data.groupId, jobId: data.job._id }
        });
      }
    }
  });

  // Job saved
  window.socketClient.on('job-saved', (data) => {
    console.log('[Group Detail] Job saved:', data);
    if (data.groupId === currentGroupId) {
      updateJobSaveCount(data.jobId, data.saveCount);
    }
  });

  // Job application
  window.socketClient.on('job-application', (data) => {
    console.log('[Group Detail] Job application:', data);
    if (data.groupId === currentGroupId) {
      updateJobApplicationCount(data.jobId, data.applicationCount);
      showNotification(`${data.appliedBy.name} applied to ${data.job.company}!`, 'info');
    }
  });

  // Member joined
  window.socketClient.on('member-joined', (data) => {
    console.log('[Group Detail] Member joined:', data);

    // Add to global notifications
    if (window.globalNotifications) {
      window.globalNotifications.addNotification({
        type: 'member-joined',
        title: 'New Member',
        message: `${data.member.name} joined the group`,
        data: {
          groupId: data.groupId,
          userId: data.member._id || data.member.userId,
          member: data.member
        }
      });
      console.log('[Group Detail] ✅ Added member-joined notification to global notifications');
    }

    if (data.groupId === currentGroupId) {
      showNotification(`${data.member.name} joined the group!`, 'success');
      loadMembers(); // Reload members list
    }
  });

  // Member left
  window.socketClient.on('member-left', (data) => {
    console.log('[Group Detail] Member left:', data);
    if (data.groupId === currentGroupId) {
      showNotification(`${data.member.name} left the group`, 'info');
      loadMembers(); // Reload members list
    }
  });

  // Mention notification
  window.socketClient.on('mention-notification', (data) => {
    console.log('[Group Detail] You were mentioned:', data);

    // Add to global notifications
    if (window.globalNotifications) {
      const message = `${data.mentionedBy.userName} mentioned you in a message`;
      window.globalNotifications.addNotification({
        type: 'mention',
        title: 'You were mentioned',
        message: message,
        data: {
          groupId: data.groupId,
          messageId: data.messageId,
          mentionedBy: data.mentionedBy
        }
      });
      console.log('[Group Detail] ✅ Added mention notification to global notifications');
    }

    if (data.groupId === currentGroupId) {
      // Use smart notifications for mentions
      if (window.smartNotifications) {
        const groupName = document.getElementById('group-name')?.textContent || 'Group';
        const messagePreview = data.message?.substring(0, 100) || 'mentioned you in a message';

        window.smartNotifications.showMentionNotification({
          mentionedBy: data.mentionedBy.userName,
          message: messagePreview,
          groupName: groupName,
          groupId: data.groupId,
          messageId: data.messageId
        });
      }
    }
  });

  // Reaction added to message
  window.socketClient.on('message-reaction-added', (data) => {
    console.log('[Group Detail] Reaction added:', data);
    if (data.groupId === currentGroupId) {
      updateMessageReaction(data.messageId, data.reactionType, data.userId, 'add');
    }
  });

  // Reaction removed from message
  window.socketClient.on('message-reaction-removed', (data) => {
    console.log('[Group Detail] Reaction removed:', data);
    if (data.groupId === currentGroupId) {
      updateMessageReaction(data.messageId, data.reactionType, data.userId, 'remove');
    }
  });

  // Socket error handling
  window.socketClient.on('socket-error', (data) => {
    console.error('[Group Detail] Socket error:', data);
    console.error('[Group Detail] Socket error message:', data.message);
    console.error('[Group Detail] Socket error details:', JSON.stringify(data, null, 2));
    showNotification(data.message || 'Connection error. Please try again.', 'error');

    // Remove any pending messages on error
    const pendingMessages = messagesContainer.querySelectorAll('.message-pending');
    pendingMessages.forEach(msg => {
      msg.classList.add('message-failed');
      msg.classList.remove('message-pending');
      const statusEl = msg.querySelector('.message-status');
      if (statusEl) {
        statusEl.textContent = 'Failed to send';
        statusEl.style.color = '#eb5757';
      }
    });
  });

  // Socket disconnected
  window.socketClient.on('socket-disconnected', (data) => {
    console.warn('[Group Detail] Socket disconnected:', data.reason);
    showNotification('Disconnected from chat. Reconnecting...', 'warning');
  });

  // Socket reconnected
  window.socketClient.on('socket-connected', () => {
    console.log('[Group Detail] Socket reconnected');
    showNotification('Reconnected to chat!', 'success');

    // Rejoin the group room after reconnection
    if (currentGroupId) {
      console.log('[Group Detail] Rejoining group after reconnection...');
      window.socketClient.joinGroup(currentGroupId);
    }
  });

  console.log('[Group Detail] Socket event handlers registered');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  // Invite button
  if (inviteBtn) {
    inviteBtn.addEventListener('click', showInviteModal);
  }

  // Settings button
  if (settingsBtn) {
    settingsBtn.addEventListener('click', showSettingsModal);
  }

  // Leave button
  if (leaveBtn) {
    leaveBtn.addEventListener('click', handleLeaveGroup);
  }

  // Mobile tabs
  mobileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const section = tab.dataset.section;
      switchSection(section);
    });
  });

  // Share job button
  if (shareJobBtn) {
    shareJobBtn.addEventListener('click', openShareJobModal);
  }

  // Close share modal button
  if (closeShareModalBtn) {
    closeShareModalBtn.addEventListener('click', closeShareJobModal);
  }

  // Close modal on overlay click
  if (shareJobModal) {
    shareJobModal.addEventListener('click', (e) => {
      if (e.target === shareJobModal) {
        closeShareJobModal();
      }
    });
  }

  // Search jobs
  if (shareJobSearch) {
    shareJobSearch.addEventListener('input', (e) => {
      filterShareJobs(e.target.value);
    });
  }

  // Close job details modal button
  if (closeJobDetailsModalBtn) {
    closeJobDetailsModalBtn.addEventListener('click', closeJobDetailsModal);
  }

  // Close job details modal on overlay click
  if (jobDetailsModal) {
    jobDetailsModal.addEventListener('click', (e) => {
      if (e.target === jobDetailsModal) {
        closeJobDetailsModal();
      }
    });
  }

  // Attach job button
  if (attachJobBtn) {
    attachJobBtn.addEventListener('click', toggleJobPicker);
  }

  // Close job picker button
  if (closeJobPickerBtn) {
    closeJobPickerBtn.addEventListener('click', closeJobPicker);
  }

  // Job picker search
  if (jobPickerSearch) {
    jobPickerSearch.addEventListener('input', (e) => {
      filterJobPickerJobs(e.target.value);
    });
  }

  // Send message button
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', handleSendMessage);
  }

  // Message input - Enter to send
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-resize textarea and typing indicator
    messageInput.addEventListener('input', () => {
      messageInput.style.height = 'auto';
      messageInput.style.height = messageInput.scrollHeight + 'px';

      // Typing indicator
      handleTypingIndicator();
    });
  }

  // Close job picker when clicking outside
  document.addEventListener('click', (e) => {
    if (jobPickerDropdown && jobPickerDropdown.style.display !== 'none') {
      if (!jobPickerDropdown.contains(e.target) && e.target !== attachJobBtn && !attachJobBtn.contains(e.target)) {
        closeJobPicker();
      }
    }
  });

  console.log('[Group Detail] Event listeners initialized');
}

/**
 * Switch section (mobile)
 */
function switchSection(section) {
  // Update tabs
  mobileTabs.forEach(tab => {
    if (tab.dataset.section === section) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update sections
  sectionJobs.classList.remove('active');
  sectionChat.classList.remove('active');
  sectionMembers.classList.remove('active');

  if (section === 'jobs') {
    sectionJobs.classList.add('active');
  } else if (section === 'chat') {
    sectionChat.classList.add('active');
  } else if (section === 'members') {
    sectionMembers.classList.add('active');
  }
}

/**
 * Load shared jobs
 */
async function loadSharedJobs() {
  try {
    console.log('[Group Detail] Loading shared jobs for group:', currentGroupId);

    // Load jobs from API
    let jobs = [];
    try {
      jobs = await sharedJobsAPI.getSharedJobs(currentGroupId);
      console.log('[Group Detail] API returned shared jobs:', jobs);
    } catch (error) {
      console.error('[Group Detail] Failed to load jobs from API:', error);
      showNotification('Failed to load shared jobs', 'error');
      // Show empty state on error
      renderSharedJobs([]);
      return;
    }

    // Render the jobs (empty array will show empty state)
    renderSharedJobs(jobs || []);

    console.log('[Group Detail] Shared jobs loaded:', (jobs || []).length);
  } catch (error) {
    console.error('[Group Detail] Error loading shared jobs:', error);
    showNotification('Failed to load shared jobs', 'error');
  }
}

/**
 * Load messages
 */
async function loadMessages() {
  try {
    console.log('[Group Detail] Loading messages...');

    // Fetch messages from API
    const response = await fetch(
      `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${currentGroupId}/messages?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${window.authManager.token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = await response.json();
    const messages = data.data || [];

    console.log('[Group Detail] Loaded', messages.length, 'messages');

    // Render messages
    renderMessages(messages);

    // Scroll to bottom
    scrollMessagesToBottom();

  } catch (error) {
    console.error('[Group Detail] Error loading messages:', error);

    // Show empty state on error
    messagesContainer.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p class="empty-state-title">No discussion yet</p>
        <p class="empty-state-text">Start collaborating with your group by adding a comment below</p>
      </div>
    `;
  }
}

/**
 * Load members
 */
async function loadMembers() {
  try {
    console.log('[Group Detail] Loading members...');

    // Try to load real members from API
    let members = [];
    try {
      members = await groupAPI.getMembers(currentGroupId);
    } catch (error) {
      console.warn('[Group Detail] Could not load members from API, using dummy data');
    }

    // If no members, use dummy data for testing
    if (!members || members.length === 0) {
      console.log('[Group Detail] Using dummy members for testing');
      members = [
        {
          userId: {
            _id: '1',
            name: 'Sarah Johnson',
            email: 'sarah.j@example.com'
          },
          role: 'admin'
        },
        {
          userId: {
            _id: '2',
            name: 'Michael Chen',
            email: 'michael.c@example.com'
          },
          role: 'moderator'
        },
        {
          userId: {
            _id: '3',
            name: 'Emily Rodriguez',
            email: 'emily.r@example.com'
          },
          role: 'member'
        },
        {
          userId: {
            _id: '4',
            name: 'David Kim',
            email: 'david.k@example.com'
          },
          role: 'member'
        },
        {
          userId: {
            _id: '5',
            name: 'Jessica Taylor',
            email: 'jessica.t@example.com'
          },
          role: 'member'
        },
        {
          userId: {
            _id: '6',
            name: 'Alex Martinez',
            email: 'alex.m@example.com'
          },
          role: 'member'
        }
      ];
    }

    renderMembers(members);

    // Update member count badge
    if (memberCountBadge) {
      memberCountBadge.textContent = members.length;
    }

    // Update header member count
    if (memberCountEl) {
      memberCountEl.textContent = `${members.length} member${members.length !== 1 ? 's' : ''}`;
    }

    console.log('[Group Detail] Members loaded:', members.length);
  } catch (error) {
    console.error('[Group Detail] Error loading members:', error);
    showNotification('Failed to load members', 'error');
  }
}

/**
 * Render shared jobs
 */
function renderSharedJobs(jobs) {
  // Store jobs data for details view
  sharedJobsData = jobs || [];

  if (!jobs || jobs.length === 0) {
    jobsContainer.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </svg>
        <p class="empty-state-title">No shared jobs</p>
        <p class="empty-state-text">Share job opportunities with your group to help each other</p>
      </div>
    `;
    return;
  }

  jobsContainer.innerHTML = jobs.map(job => createJobCard(job)).join('');

  // Attach event listeners to job cards
  attachJobCardListeners();
}

/**
 * Create job card HTML - Notion database card style
 */
function createJobCard(job) {
  const jobData = job.jobId || job;
  const sharedBy = job.sharedBy || {};
  // Build name from firstName/lastName if name is not present
  const sharedByName = sharedBy.name ||
    (sharedBy.firstName && sharedBy.lastName ? `${sharedBy.firstName} ${sharedBy.lastName}` :
    (sharedBy.firstName || sharedBy.email || 'Unknown'));
  const stats = job.stats || { views: 0, saves: 0, applications: 0, comments: 0 };
  // Handle reactions as either arrays (from API) or numbers (from dummy data)
  const rawReactions = job.reactions || { upvotes: [], downvotes: [], fire: [], heart: [] };
  const reactions = {
    upvotes: Array.isArray(rawReactions.upvotes) ? rawReactions.upvotes.length : (rawReactions.upvotes || 0),
    fire: Array.isArray(rawReactions.fire) ? rawReactions.fire.length : (rawReactions.fire || 0),
    heart: Array.isArray(rawReactions.heart) ? rawReactions.heart.length : (rawReactions.heart || 0)
  };
  const timeAgo = formatTimeAgo(job.sharedAt);
  const companyInitial = jobData.company ? jobData.company.charAt(0).toUpperCase() : 'C';

  return `
    <div class="job-card" data-job-id="${job._id}">
      <!-- Job Header -->
      <div class="job-card-header">
        <div class="job-company-logo">${companyInitial}</div>
        <div class="job-card-info">
          <h3 class="job-title">${escapeHtml(jobData.title)}</h3>
          <div class="job-company">${escapeHtml(jobData.company)}</div>
        </div>
      </div>

      <!-- Job Details - Muted metadata -->
      <div class="job-details">
        <span class="job-detail-item">${escapeHtml(jobData.location || 'Remote')}</span>
        <span class="job-detail-item">${escapeHtml(jobData.workType || 'Full-time')}</span>
        ${jobData.salary ? `<span class="job-detail-item">${escapeHtml(jobData.salary)}</span>` : ''}
      </div>

      <!-- Shared By -->
      <div class="job-shared-by">
        <span class="shared-by-text">Shared by <strong>${escapeHtml(sharedByName)}</strong></span>
        <span class="shared-time">${timeAgo}</span>
      </div>

      <!-- Reactions - Subtle tag style -->
      <div class="job-reactions">
        <button class="reaction-btn" data-reaction="upvote">👍 <span>${reactions.upvotes || 0}</span></button>
        <button class="reaction-btn" data-reaction="fire">🔥 <span>${reactions.fire || 0}</span></button>
        <button class="reaction-btn" data-reaction="heart">❤️ <span>${reactions.heart || 0}</span></button>
      </div>

      <!-- Stats -->
      <div class="job-stats">
        <span class="job-stat">${stats.saves || 0} saves</span>
        <span class="job-stat">${stats.applications || 0} applied</span>
        <span class="job-stat">${stats.comments || 0} comments</span>
      </div>

      <!-- Actions - Secondary text buttons (no large blue CTAs) -->
      <div class="job-actions">
        <button class="btn-job-action btn-save" data-action="save">Save</button>
        <button class="btn-job-action btn-view-details" data-action="view">View</button>
        <button class="btn-job-action btn-apply" data-action="apply">Applied</button>
      </div>
    </div>
  `;
}

/**
 * Render members
 */
function renderMembers(members) {
  membersContainer.innerHTML = members.map(member => {
    // Backend returns flat structure: { userId, name, email, role, ... }
    const name = member.name || member.email || 'Unknown';
    const role = member.role || 'member';

    return `
      <div class="member-card">
        <div class="member-avatar">
          ${name.charAt(0).toUpperCase()}
        </div>
        <div class="member-info">
          <div class="member-name">${name}</div>
          <div class="member-role-badge ${role}">${role}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render messages
 */
function renderMessages(messages) {
  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p class="empty-state-title">No discussion yet</p>
        <p class="empty-state-text">Start collaborating with your group by adding a comment below</p>
      </div>
    `;
    return;
  }

  // Clear container
  messagesContainer.innerHTML = '';

  // Render each message as a Notion comment block
  messages.forEach(msg => {
    const messageEl = createMessageElement(msg);
    messagesContainer.appendChild(messageEl);
  });

  // Scroll to bottom
  scrollMessagesToBottom();
}

/**
 * Format time ago (for job cards)
 */
function formatTimeAgo(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format relative time (Notion-style for messages)
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  // For older messages, show date
  const options = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('en-US', options);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format job description using linkedInCleaner if available
 */
function formatJobDescription(jobData) {
  // Use linkedInCleaner for both HTML and plain text to get proper structure
  if (window.linkedInCleaner) {
    if (jobData.descriptionHtml) {
      // Has HTML - clean and format it
      return window.linkedInCleaner.format(jobData.descriptionHtml);
    } else if (jobData.description) {
      // Plain text - structure it into paragraphs and headings
      return window.linkedInCleaner.structureContent(escapeHtml(jobData.description));
    }
  } else {
    // No cleaner available - basic formatting
    if (jobData.descriptionHtml) {
      return jobData.descriptionHtml;
    } else if (jobData.description) {
      return `<p>${escapeHtml(jobData.description).replace(/\n/g, '<br>')}</p>`;
    }
  }
  return '<p class="empty-description">No description available</p>';
}

/**
 * Attach event listeners to job cards
 */
function attachJobCardListeners() {
  // View Details buttons
  document.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const jobCard = btn.closest('.job-card');
      const jobId = jobCard.dataset.jobId;
      handleViewDetails(jobId);
    });
  });

  // Save to My Jobs buttons
  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobCard = btn.closest('.job-card');
      const jobId = jobCard.dataset.jobId;
      await handleSaveToMyJobs(jobId, btn);
    });
  });

  // Mark as Applied buttons
  document.querySelectorAll('.btn-apply').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobCard = btn.closest('.job-card');
      const jobId = jobCard.dataset.jobId;
      await handleMarkAsApplied(jobId, btn);
    });
  });

  // Reaction buttons
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobCard = btn.closest('.job-card');
      const jobId = jobCard.dataset.jobId;
      const reaction = btn.dataset.reaction;
      await handleReaction(jobId, reaction, btn);
    });
  });
}

/**
 * Handle view details - opens the shared-job-detail page for proper Notion-style formatting
 */
function handleViewDetails(jobId) {
  console.log('[Group Detail] View details for job:', jobId);

  // Open the shared-job-detail page with proper formatting
  if (jobId && currentGroupId) {
    window.open(`shared-job-detail.html?jobId=${jobId}&groupId=${currentGroupId}`, '_blank');
  } else {
    showNotification('Job not found', 'error');
  }
}

/**
 * Open job details modal
 */
function openJobDetailsModal(job) {
  const jobData = job.jobId || job;
  const sharedBy = job.sharedBy || {};
  // Build name from firstName/lastName if name is not present
  const sharedByName = sharedBy.name ||
    (sharedBy.firstName && sharedBy.lastName ? `${sharedBy.firstName} ${sharedBy.lastName}` :
    (sharedBy.firstName || sharedBy.email || 'Unknown'));
  const stats = job.stats || { views: 0, saves: 0, applications: 0, comments: 0 };
  // Handle reactions as either arrays (from API) or numbers (from dummy data)
  const rawReactions = job.reactions || { upvotes: [], downvotes: [], fire: [], heart: [] };
  const reactions = {
    upvotes: Array.isArray(rawReactions.upvotes) ? rawReactions.upvotes.length : (rawReactions.upvotes || 0),
    downvotes: Array.isArray(rawReactions.downvotes) ? rawReactions.downvotes.length : (rawReactions.downvotes || 0),
    fire: Array.isArray(rawReactions.fire) ? rawReactions.fire.length : (rawReactions.fire || 0),
    heart: Array.isArray(rawReactions.heart) ? rawReactions.heart.length : (rawReactions.heart || 0)
  };
  const timeAgo = formatTimeAgo(job.sharedAt);
  const companyInitial = jobData.company ? jobData.company.charAt(0).toUpperCase() : 'C';
  const sharedByInitial = sharedByName.charAt(0).toUpperCase();

  jobDetailsContent.innerHTML = `
    <!-- Header -->
    <div class="job-details-header">
      <div class="job-details-logo">${companyInitial}</div>
      <div class="job-details-info">
        <div class="job-details-company">${escapeHtml(jobData.company)}</div>
        <h1 class="job-details-title-text">${escapeHtml(jobData.title)}</h1>
        <div class="job-details-meta">
          ${jobData.location ? `
          <div class="job-details-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${escapeHtml(jobData.location)}</span>
          </div>
          ` : ''}
          ${jobData.workType ? `
          <div class="job-details-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>${escapeHtml(jobData.workType)}</span>
          </div>
          ` : ''}
          ${jobData.salary ? `
          <div class="job-details-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <span>${escapeHtml(jobData.salary)}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Shared By Info -->
    <div class="job-details-shared-info">
      <div class="job-details-shared-by">
        <div class="job-details-shared-avatar">${sharedByInitial}</div>
        <span>Shared by <strong>${escapeHtml(sharedByName)}</strong></span>
      </div>
      <span>${timeAgo}</span>
    </div>

    <!-- Stats -->
    <div class="job-details-section">
      <h3 class="job-details-section-title">Engagement</h3>
      <div class="job-details-stats-grid">
        <div class="job-details-stat-card">
          <div class="job-details-stat-value">${reactions.upvotes || 0}</div>
          <div class="job-details-stat-label">👍 Upvotes</div>
        </div>
        <div class="job-details-stat-card">
          <div class="job-details-stat-value">${reactions.fire || 0}</div>
          <div class="job-details-stat-label">🔥 Fire</div>
        </div>
        <div class="job-details-stat-card">
          <div class="job-details-stat-value">${reactions.heart || 0}</div>
          <div class="job-details-stat-label">❤️ Hearts</div>
        </div>
        <div class="job-details-stat-card">
          <div class="job-details-stat-value">${stats.views || 0}</div>
          <div class="job-details-stat-label">👁️ Views</div>
        </div>
        <div class="job-details-stat-card">
          <div class="job-details-stat-value">${stats.saves || 0}</div>
          <div class="job-details-stat-label">📑 Saves</div>
        </div>
        <div class="job-details-stat-card">
          <div class="job-details-stat-value">${stats.applications || 0}</div>
          <div class="job-details-stat-label">✅ Applied</div>
        </div>
      </div>
    </div>

    <!-- Description -->
    ${jobData.descriptionHtml || jobData.description ? `
    <div class="job-details-section">
      <h3 class="job-details-section-title">Job Description</h3>
      <div class="job-details-description formatted">
        ${formatJobDescription(jobData)}
      </div>
    </div>
    ` : ''}

    <!-- Actions -->
    <div class="job-details-actions">
      <button class="btn-job-action btn-save-details" data-job-id="${job._id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        Save to My Jobs
      </button>
      <button class="btn-job-action btn-apply-details" data-job-id="${job._id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Mark as Applied
      </button>
      ${jobData.linkedinUrl ? `
      <button class="btn-job-action btn-linkedin-details" data-linkedin-url="${escapeHtml(jobData.linkedinUrl)}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
        View on LinkedIn
      </button>
      ` : ''}
    </div>
  `;

  // Show modal
  jobDetailsModal.classList.add('show');

  // Attach event listeners to action buttons
  attachJobDetailsListeners();

  console.log('[Group Detail] Job details modal opened');
}

/**
 * Close job details modal
 */
function closeJobDetailsModal() {
  jobDetailsModal.classList.remove('show');
  console.log('[Group Detail] Job details modal closed');
}

/**
 * Open inline job details (for jobs shared in chat)
 */
function openInlineJobDetails(jobData) {
  console.log('[Group Detail] Opening inline job details:', jobData);

  const companyInitial = jobData.company ? jobData.company.charAt(0).toUpperCase() : 'C';

  jobDetailsContent.innerHTML = `
    <!-- Header -->
    <div class="job-details-header">
      <div class="job-details-logo">${companyInitial}</div>
      <div class="job-details-info">
        <div class="job-details-company">${escapeHtml(jobData.company)}</div>
        <h1 class="job-details-title-text">${escapeHtml(jobData.title)}</h1>
        <div class="job-details-meta">
          ${jobData.location ? `
          <div class="job-details-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>${escapeHtml(jobData.location)}</span>
          </div>
          ` : ''}
          ${jobData.workType ? `
          <div class="job-details-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>${escapeHtml(jobData.workType)}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="job-details-actions">
      ${jobData.linkedinUrl ? `
        <button class="btn-linkedin-inline" data-linkedin-url="${escapeHtml(jobData.linkedinUrl)}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          View on LinkedIn
        </button>
      ` : ''}
    </div>

    <!-- Info Message -->
    <div style="padding: 16px; background: rgba(35, 131, 226, 0.06); border-radius: 8px; margin-top: 16px;">
      <p style="margin: 0; font-size: 13px; color: rgba(55, 53, 47, 0.65);">
        💡 This job was shared directly in chat. To save or apply, ask the person who shared it for more details.
      </p>
    </div>
  `;

  // Show modal
  jobDetailsModal.classList.add('show');

  // Attach LinkedIn button listener
  const linkedinBtn = jobDetailsContent.querySelector('.btn-linkedin-inline');
  if (linkedinBtn) {
    linkedinBtn.addEventListener('click', () => {
      const linkedinUrl = linkedinBtn.dataset.linkedinUrl;
      if (linkedinUrl) {
        window.open(linkedinUrl, '_blank');
      }
    });
  }

  console.log('[Group Detail] Inline job details modal opened');
}

/**
 * Attach event listeners to job details action buttons
 */
function attachJobDetailsListeners() {
  // Save button
  const saveBtn = document.querySelector('.btn-save-details');
  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      const jobId = saveBtn.dataset.jobId;
      await handleSaveToMyJobs(jobId, saveBtn);
    });
  }

  // Apply button
  const applyBtn = document.querySelector('.btn-apply-details');
  if (applyBtn) {
    applyBtn.addEventListener('click', async (e) => {
      const jobId = applyBtn.dataset.jobId;
      await handleMarkAsApplied(jobId, applyBtn);
    });
  }

  // LinkedIn button
  const linkedinBtn = document.querySelector('.btn-linkedin-details');
  if (linkedinBtn) {
    linkedinBtn.addEventListener('click', (e) => {
      const linkedinUrl = linkedinBtn.dataset.linkedinUrl;
      if (linkedinUrl) {
        window.open(linkedinUrl, '_blank');
      }
    });
  }
}

/**
 * Handle save to my jobs
 */
async function handleSaveToMyJobs(jobId, btn) {
  try {
    console.log('[Group Detail] Saving job to my jobs:', jobId);

    // Find the job in shared jobs data
    const sharedJob = sharedJobsData.find(j => j._id === jobId);
    if (!sharedJob) {
      showNotification('Job not found', 'error');
      return;
    }

    const jobData = sharedJob.jobId || sharedJob;

    // Check if job tracker is available
    if (!window.jobTracker) {
      showNotification('Job tracker not available', 'error');
      return;
    }

    // Check if job already exists in tracker
    const existingJob = window.jobTracker.jobs.find(j =>
      j.company === jobData.company &&
      j.title === jobData.title
    );

    if (existingJob) {
      showNotification('This job is already in your tracker!', 'info');

      // Update button to show it's already saved
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        Already Saved
      `;
      btn.classList.add('saved');
      btn.disabled = true;
      return;
    }

    // Disable button
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      Saving...
    `;

    // Add job to local tracker with "saved" status
    const newJob = await window.jobTracker.addJob({
      company: jobData.company,
      title: jobData.title,
      description: jobData.description,
      descriptionHtml: jobData.descriptionHtml,
      location: jobData.location,
      salary: jobData.salary,
      workType: jobData.workType,
      linkedinUrl: jobData.linkedinUrl,
      status: 'saved', // Mark as saved, not applied
      tags: ['from-group']
    });

    console.log('[Group Detail] Job added to tracker:', newJob);

    // Call API to update stats
    try {
      await sharedJobsAPI.saveToMyJobs(currentGroupId, jobId);
    } catch (apiError) {
      console.warn('[Group Detail] API call failed, but job saved locally:', apiError);
    }

    // Update button
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      Saved!
    `;
    btn.classList.add('saved');

    showNotification('Job saved to your tracker!', 'success');

    // Update stats
    const jobCard = btn.closest('.job-card');
    const savesEl = jobCard.querySelector('.job-stat:nth-child(2) span');
    if (savesEl) {
      const currentSaves = parseInt(savesEl.textContent) || 0;
      savesEl.textContent = `${currentSaves + 1} saves`;
    }

    // Refresh dashboard if it exists
    if (window.dashboardUI) {
      window.dashboardUI.render();
    }
  } catch (error) {
    console.error('[Group Detail] Error saving job:', error);
    showNotification('Failed to save job', 'error');

    // Reset button
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      Save to My Jobs
    `;
  }
}

/**
 * Handle mark as applied
 */
async function handleMarkAsApplied(jobId, btn) {
  try {
    console.log('[Group Detail] Marking job as applied:', jobId);

    // Find the job in shared jobs data
    const sharedJob = sharedJobsData.find(j => j._id === jobId);
    if (!sharedJob) {
      showNotification('Job not found', 'error');
      return;
    }

    const jobData = sharedJob.jobId || sharedJob;

    // Check if job tracker is available
    if (!window.jobTracker) {
      showNotification('Job tracker not available', 'error');
      return;
    }

    // Check if job already exists in tracker
    let existingJob = window.jobTracker.jobs.find(j =>
      j.company === jobData.company &&
      j.title === jobData.title
    );

    // Disable button
    btn.disabled = true;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Updating...
    `;

    if (existingJob) {
      // Job exists - check if already applied
      if (existingJob.status === 'applied') {
        showNotification('You already applied to this job!', 'info');

        // Update button to show it's already applied
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Already Applied
        `;
        btn.classList.add('applied');
        btn.disabled = true;
        return;
      }

      // Update existing job status to "applied"
      await window.jobTracker.updateJobStatus(existingJob.id, 'applied', 'Applied from group');
      console.log('[Group Detail] Updated existing job status to applied');
    } else {
      // Job doesn't exist - add it with "applied" status
      const newJob = await window.jobTracker.addJob({
        company: jobData.company,
        title: jobData.title,
        description: jobData.description,
        descriptionHtml: jobData.descriptionHtml,
        location: jobData.location,
        salary: jobData.salary,
        workType: jobData.workType,
        linkedinUrl: jobData.linkedinUrl,
        status: 'applied', // Mark as applied
        tags: ['from-group']
      });

      console.log('[Group Detail] Job added to tracker with applied status:', newJob);
    }

    // Call API to update stats
    try {
      await sharedJobsAPI.markAsApplied(currentGroupId, jobId);
    } catch (apiError) {
      console.warn('[Group Detail] API call failed, but job updated locally:', apiError);
    }

    // Update button
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Applied!
    `;
    btn.classList.add('applied');

    showNotification('Marked as applied! Check your dashboard.', 'success');

    // Update stats
    const jobCard = btn.closest('.job-card');
    const appliedEl = jobCard.querySelector('.job-stat:nth-child(3) span');
    if (appliedEl) {
      const currentApplied = parseInt(appliedEl.textContent) || 0;
      appliedEl.textContent = `${currentApplied + 1} applied`;
    }

    // Refresh dashboard if it exists
    if (window.dashboardUI) {
      window.dashboardUI.render();
    }
  } catch (error) {
    console.error('[Group Detail] Error marking as applied:', error);
    showNotification('Failed to mark as applied', 'error');

    // Reset button
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      Mark as Applied
    `;
  }
}

/**
 * Handle reaction
 */
async function handleReaction(jobId, reaction, btn) {
  try {
    console.log('[Group Detail] Adding reaction:', reaction, 'to job:', jobId);

    // Optimistic update
    const countEl = btn.querySelector('span');
    const currentCount = parseInt(countEl.textContent) || 0;
    countEl.textContent = currentCount + 1;
    btn.classList.add('active');

    // Call API
    await sharedJobsAPI.addReaction(jobId, reaction);

    showNotification(`Reaction added!`, 'success');
  } catch (error) {
    console.error('[Group Detail] Error adding reaction:', error);

    // Revert optimistic update
    const countEl = btn.querySelector('span');
    const currentCount = parseInt(countEl.textContent) || 0;
    countEl.textContent = Math.max(0, currentCount - 1);
    btn.classList.remove('active');

    showNotification('Failed to add reaction', 'error');
  }
}

/**
 * Handle send message
 */
async function handleSendMessage() {
  try {
    const content = messageInput.value.trim();

    if (!content) {
      return;
    }

    console.log('[Group Detail] Sending message:', content);

    // Check if socket is connected
    if (!window.socketClient || !window.socketClient.connected()) {
      showNotification('Not connected to chat server. Reconnecting...', 'error');
      // Try to reconnect
      await initializeSocket();
      return;
    }

    // Optimistic UI update - show message immediately
    const optimisticMessage = {
      _id: 'temp-' + Date.now(),
      content,
      userId: currentUser,
      createdAt: new Date().toISOString(),
      messageType: 'text',
      pending: true // Mark as pending
    };

    // Add to UI immediately for better UX
    appendMessageToUI(optimisticMessage);
    scrollMessagesToBottom();

    // Send message via Socket.io
    window.socketClient.sendMessage(currentGroupId, {
      content,
      messageType: 'text'
    });

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Stop typing indicator
    if (isTyping) {
      window.socketClient.stopTyping(currentGroupId);
      isTyping = false;
    }

    console.log('[Group Detail] ✅ Message sent successfully');

  } catch (error) {
    console.error('[Group Detail] Error sending message:', error);
    showNotification('Failed to send message', 'error');
  }
}

/**
 * Show invite modal
 */
function showInviteModal() {
  if (!currentGroup) return;

  const inviteLink = `${window.location.origin}/tracking-dashboard/dashboard.html?join=${currentGroup._id}&code=${currentGroup.inviteCode}`;

  // Create simple prompt for now
  const message = `Invite Link:\n\n${inviteLink}\n\nClick OK to copy to clipboard.`;

  if (confirm(message)) {
    navigator.clipboard.writeText(inviteLink);
    showNotification('Invite link copied!', 'success');
  }
}

/**
 * Show settings modal
 */
function showSettingsModal() {
  showNotification('Group settings coming soon! (Task 4.4)', 'info');
}

/**
 * Handle leave group
 */
async function handleLeaveGroup() {
  if (!currentGroup) return;

  const confirmLeave = confirm(`Are you sure you want to leave "${currentGroup.name}"?`);

  if (!confirmLeave) return;

  try {
    console.log('[Group Detail] Leaving group...');

    await groupAPI.leaveGroup(currentGroupId);

    showNotification('Left group successfully', 'success');

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);

  } catch (error) {
    console.error('[Group Detail] Error leaving group:', error);
    showNotification(error.message || 'Failed to leave group', 'error');
  }
}

/**
 * Handle typing indicator
 */
function handleTypingIndicator() {
  if (!window.socketClient || !window.socketClient.connected()) return;

  const content = messageInput.value.trim();

  if (content && !isTyping) {
    // Start typing
    isTyping = true;
    window.socketClient.startTyping(currentGroupId);
    console.log('[Group Detail] Started typing indicator');
  }

  // Clear existing timeout
  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  // Set new timeout to stop typing after 2 seconds of inactivity
  typingTimeout = setTimeout(() => {
    if (isTyping) {
      isTyping = false;
      window.socketClient.stopTyping(currentGroupId);
      console.log('[Group Detail] Stopped typing indicator');
    }
  }, 2000);
}

/**
 * Show typing indicator
 */
function showTypingIndicator(userName) {
  console.log('[Group Detail] Showing typing indicator for:', userName);
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    const typingText = typingIndicator.querySelector('.typing-text');
    if (typingText) {
      typingText.textContent = `${userName} is typing`;
    }
    typingIndicator.style.display = 'flex';

    // Auto-scroll to show typing indicator
    scrollMessagesToBottom();
  }
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
  console.log('[Group Detail] Hiding typing indicator');
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.style.display = 'none';
  }
}

/**
 * Append new message to UI
 */
function appendMessageToUI(message) {
  const messageEl = createMessageElement(message);

  // Remove empty state if exists
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  messagesContainer.appendChild(messageEl);
}

/**
 * Create message element - Notion comment block style
 * NO chat bubbles, NO left/right alignment, all messages flow top-to-bottom
 */
function createMessageElement(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  messageDiv.dataset.messageId = message._id;

  // Add pending class for optimistic messages
  if (message.pending) {
    messageDiv.classList.add('message-pending');
  }

  // Build user display name
  const userName = message.userId?.firstName
    ? `${message.userId.firstName} ${message.userId.lastName}`
    : message.userId?.email || 'Unknown User';

  // Format timestamp - Notion uses relative time
  const timestamp = new Date(message.createdAt || message.timestamp);
  const timeStr = formatRelativeTime(timestamp);

  // Status indicator for pending/edited messages
  const statusIndicator = message.pending
    ? '<span class="message-status">Posting...</span>'
    : message.edited
    ? '<span class="message-edited">(edited)</span>'
    : '';

  // Get user initials for avatar
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  // Get reactions
  const reactions = message.reactions || {};
  const thumbsUpCount = reactions.thumbsUp?.length || 0;
  const heartCount = reactions.heart?.length || 0;
  const fireCount = reactions.fire?.length || 0;
  const laughCount = reactions.laugh?.length || 0;

  // Check if current user has reacted
  const hasThumbsUp = reactions.thumbsUp?.includes(currentUser._id) || false;
  const hasHeart = reactions.heart?.includes(currentUser._id) || false;
  const hasFire = reactions.fire?.includes(currentUser._id) || false;
  const hasLaugh = reactions.laugh?.includes(currentUser._id) || false;

  // Check if there are any reactions at all
  const hasAnyReactions = thumbsUpCount > 0 || heartCount > 0 || fireCount > 0 || laughCount > 0;

  // Render embedded job card if message type is job_share (Notion database card style)
  let jobCardHTML = '';
  if (message.messageType === 'job_share' && message.jobData) {
    const job = message.jobData;
    const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';
    // Include sharedJobId if available for looking up full job data
    const jobDataWithId = { ...job, sharedJobId: message.sharedJobId || null };
    jobCardHTML = `
      <div class="message-job-card" data-job-data='${JSON.stringify(jobDataWithId).replace(/'/g, "&#39;")}' data-shared-job-id="${message.sharedJobId || ''}">
        <div class="message-job-header">
          <div class="message-job-icon">${companyInitial}</div>
          <div class="message-job-info">
            <h4 class="message-job-title">${escapeHtml(job.title)}</h4>
            <div class="message-job-company">${escapeHtml(job.company)}</div>
          </div>
        </div>
        <div class="message-job-details">
          ${job.location ? `<span class="message-job-detail">${escapeHtml(job.location)}</span>` : ''}
          ${job.workType ? `<span class="message-job-detail">${escapeHtml(job.workType)}</span>` : ''}
        </div>
        <div class="message-job-actions">
          <button class="message-job-action" data-action="save">Save</button>
          <button class="message-job-action" data-action="view">View</button>
        </div>
      </div>
    `;
  }

  // Build message HTML - Notion comment block style
  messageDiv.innerHTML = `
    <div class="message-avatar">${initials}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-user">${escapeHtml(userName)}</span>
        <span class="message-time">${timeStr}</span>
        ${statusIndicator}
      </div>
      <div class="message-text">${escapeHtml(message.content)}</div>
      ${jobCardHTML}
      ${!message.pending ? `
        <div class="message-reactions ${hasAnyReactions ? 'has-reactions' : ''}">
          <button class="message-reaction-btn ${hasThumbsUp ? 'active' : ''}" data-reaction="thumbsUp" title="Like">
            👍${thumbsUpCount > 0 ? ` <span>${thumbsUpCount}</span>` : ''}
          </button>
          <button class="message-reaction-btn ${hasHeart ? 'active' : ''}" data-reaction="heart" title="Love">
            ❤️${heartCount > 0 ? ` <span>${heartCount}</span>` : ''}
          </button>
          <button class="message-reaction-btn ${hasFire ? 'active' : ''}" data-reaction="fire" title="Fire">
            🔥${fireCount > 0 ? ` <span>${fireCount}</span>` : ''}
          </button>
          <button class="message-reaction-btn ${hasLaugh ? 'active' : ''}" data-reaction="laugh" title="Funny">
            😂${laughCount > 0 ? ` <span>${laughCount}</span>` : ''}
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Add reaction button event listeners (only for non-pending messages)
  if (!message.pending) {
    const reactionBtns = messageDiv.querySelectorAll('.message-reaction-btn');
    reactionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const reactionType = btn.dataset.reaction;
        handleMessageReaction(message._id, reactionType, btn);
      });
    });
  }

  // Add event listeners for inline job card actions
  if (message.messageType === 'job_share' && message.jobData) {
    const jobCard = messageDiv.querySelector('.message-job-card');
    if (jobCard) {
      // Helper to get full job data from sharedJobsData or fetch from API
      const getFullJobData = async () => {
        const sharedJobId = message.sharedJobId;

        // First try to find in local cache
        if (sharedJobId && sharedJobsData && sharedJobsData.length > 0) {
          const fullJob = sharedJobsData.find(j => j._id === sharedJobId);
          if (fullJob) {
            console.log('[Group Detail] Found job in local cache:', fullJob._id);
            return fullJob;
          }
        }

        // If not found locally and we have sharedJobId, fetch from API
        if (sharedJobId && currentGroupId && window.sharedJobsAPI) {
          try {
            console.log('[Group Detail] Fetching job from API:', sharedJobId);
            const jobDetails = await window.sharedJobsAPI.getSharedJobDetails(currentGroupId, sharedJobId);
            if (jobDetails) {
              console.log('[Group Detail] Got job from API:', jobDetails);
              return jobDetails;
            }
          } catch (error) {
            console.error('[Group Detail] Failed to fetch job from API:', error);
          }
        }

        // Final fallback to minimal data from chat message
        console.log('[Group Detail] Using minimal job data from chat message');
        return {
          company: message.jobData.company,
          title: message.jobData.title,
          location: message.jobData.location,
          workType: message.jobData.workType,
          linkedinUrl: message.jobData.linkedinUrl,
          sharedBy: message.sender
        };
      };

      // Handle action buttons
      const actionBtns = jobCard.querySelectorAll('.message-job-action');
      actionBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          if (action === 'view') {
            // Open the shared-job-detail page for proper Notion-style formatting
            if (message.sharedJobId && currentGroupId) {
              window.open(`shared-job-detail.html?jobId=${message.sharedJobId}&groupId=${currentGroupId}`, '_blank');
            } else {
              // Fallback to modal if no sharedJobId
              const fullJob = await getFullJobData();
              openJobDetailsModal(fullJob);
            }
          } else if (action === 'save') {
            // Save job to user's tracker
            handleSaveInlineJob(message.jobData, btn);
          }
        });
      });

      // Click on card itself opens details
      jobCard.addEventListener('click', async (e) => {
        // Don't open if clicking on action buttons
        if (!e.target.closest('.message-job-action')) {
          // Open the shared-job-detail page for proper Notion-style formatting
          if (message.sharedJobId && currentGroupId) {
            window.open(`shared-job-detail.html?jobId=${message.sharedJobId}&groupId=${currentGroupId}`, '_blank');
          } else {
            // Fallback to modal if no sharedJobId
            const fullJob = await getFullJobData();
            openJobDetailsModal(fullJob);
          }
        }
      });
    }
  }

  return messageDiv;
}

/**
 * Handle saving an inline job to user's tracker
 */
async function handleSaveInlineJob(jobData, btn) {
  try {
    btn.disabled = true;
    btn.textContent = 'Saving...';

    // Create job in user's tracker
    const response = await fetch(`${window.API_CONFIG.API_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${window.authManager.token}`
      },
      body: JSON.stringify({
        title: jobData.title,
        company: jobData.company,
        location: jobData.location || '',
        workType: jobData.workType || 'Full-time',
        linkedinUrl: jobData.linkedinUrl || '',
        description: jobData.description || '',
        status: 'saved'
      })
    });

    if (response.ok) {
      btn.textContent = 'Saved';
      btn.classList.add('saved');
      showNotification('Job saved to your tracker', 'success');
    } else {
      throw new Error('Failed to save job');
    }
  } catch (error) {
    console.error('[Group Detail] Error saving inline job:', error);
    btn.textContent = 'Save';
    btn.disabled = false;
    showNotification('Failed to save job', 'error');
  }
}

/**
 * Update message in UI
 */
function updateMessageInUI(messageId, newContent) {
  const messageEl = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (messageEl) {
    const contentEl = messageEl.querySelector('.message-content');
    if (contentEl) {
      contentEl.textContent = newContent;
    }

    // Add edited indicator if not already present
    if (!messageEl.querySelector('.message-edited')) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'message-edited';
      editedSpan.textContent = '(edited)';
      messageEl.appendChild(editedSpan);
    }
  }
}

/**
 * Remove message from UI
 */
function removeMessageFromUI(messageId) {
  const messageEl = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (messageEl) {
    messageEl.remove();
  }
}

/**
 * Handle message reaction (add/remove)
 */
async function handleMessageReaction(messageId, reactionType, btn) {
  try {
    const isActive = btn.classList.contains('active');
    const reactionsContainer = btn.closest('.message-reactions');

    console.log('[Group Detail] Toggling reaction:', reactionType, 'on message:', messageId);

    // Optimistic UI update
    if (isActive) {
      // Remove reaction
      btn.classList.remove('active');
      const countEl = btn.querySelector('span');
      if (countEl) {
        const currentCount = parseInt(countEl.textContent) || 0;
        const newCount = Math.max(0, currentCount - 1);
        if (newCount === 0) {
          countEl.remove();
        } else {
          countEl.textContent = newCount;
        }
      }

      // Emit to Socket.io
      window.socketClient.removeReaction(messageId, reactionType, currentGroupId);
    } else {
      // Add reaction
      btn.classList.add('active');
      let countEl = btn.querySelector('span');
      if (!countEl) {
        countEl = document.createElement('span');
        btn.appendChild(countEl);
      }
      const currentCount = parseInt(countEl.textContent) || 0;
      countEl.textContent = currentCount + 1;

      // Emit to Socket.io
      window.socketClient.addReaction(messageId, reactionType, currentGroupId);
    }

    // Update has-reactions class
    const hasAnyReactions = Array.from(reactionsContainer.querySelectorAll('.message-reaction-btn span')).length > 0;
    if (hasAnyReactions) {
      reactionsContainer.classList.add('has-reactions');
    } else {
      reactionsContainer.classList.remove('has-reactions');
    }

    console.log('[Group Detail] ✅ Reaction toggled successfully');

  } catch (error) {
    console.error('[Group Detail] Error toggling reaction:', error);
    showNotification('Failed to update reaction', 'error');
  }
}

/**
 * Update message reaction (from Socket.io event)
 */
function updateMessageReaction(messageId, reactionType, userId, action) {
  console.log('[Group Detail] Update reaction from socket:', { messageId, reactionType, userId, action });

  const messageEl = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) {
    console.warn('[Group Detail] Message element not found:', messageId);
    return;
  }

  const reactionsContainer = messageEl.querySelector('.message-reactions');
  const reactionBtn = messageEl.querySelector(`[data-reaction="${reactionType}"]`);
  if (!reactionBtn) {
    console.warn('[Group Detail] Reaction button not found:', reactionType);
    return;
  }

  // Don't update if it's the current user (already updated optimistically)
  if (userId === currentUser._id) {
    console.log('[Group Detail] Skipping own reaction update (already optimistic)');
    return;
  }

  let countEl = reactionBtn.querySelector('span');

  if (action === 'add') {
    // Add reaction
    if (!countEl) {
      countEl = document.createElement('span');
      reactionBtn.appendChild(countEl);
      countEl.textContent = '1';
    } else {
      const currentCount = parseInt(countEl.textContent) || 0;
      countEl.textContent = currentCount + 1;
    }
  } else if (action === 'remove') {
    // Remove reaction
    if (countEl) {
      const currentCount = parseInt(countEl.textContent) || 0;
      const newCount = Math.max(0, currentCount - 1);
      if (newCount === 0) {
        countEl.remove();
      } else {
        countEl.textContent = newCount;
      }
    }
  }

  // Update has-reactions class based on whether any reactions exist
  const hasAnyReactions = Array.from(reactionsContainer.querySelectorAll('.message-reaction-btn span')).length > 0;
  if (hasAnyReactions) {
    reactionsContainer.classList.add('has-reactions');
  } else {
    reactionsContainer.classList.remove('has-reactions');
  }

  console.log('[Group Detail] ✅ Reaction updated in UI');
}

/**
 * Scroll messages to bottom
 */
function scrollMessagesToBottom() {
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Update job save count
 */
function updateJobSaveCount(jobId, saveCount) {
  const jobCard = jobsContainer.querySelector(`[data-job-id="${jobId}"]`);
  if (jobCard) {
    const saveCountEl = jobCard.querySelector('.save-count');
    if (saveCountEl) {
      saveCountEl.textContent = saveCount;
    }
  }
}

/**
 * Update job application count
 */
function updateJobApplicationCount(jobId, applicationCount) {
  const jobCard = jobsContainer.querySelector(`[data-job-id="${jobId}"]`);
  if (jobCard) {
    const appCountEl = jobCard.querySelector('.application-count');
    if (appCountEl) {
      appCountEl.textContent = applicationCount;
    }
  }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Style the toast
  Object.assign(toast.style, {
    position: 'fixed',
    top: '24px',
    right: '24px',
    padding: '12px 20px',
    background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
    color: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '10000',
    fontSize: '14px',
    fontWeight: '500',
    maxWidth: '400px',
    animation: 'slideIn 0.3s ease'
  });

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

/**
 * Open share job modal
 */
async function openShareJobModal() {
  try {
    console.log('[Group Detail] Opening share job modal...');

    // Load user's jobs from job tracker
    await loadUserJobs();

    // Show modal
    shareJobModal.classList.add('show');

    // Clear search
    if (shareJobSearch) {
      shareJobSearch.value = '';
    }

    // Render all jobs
    filteredJobs = [...userJobs];
    renderShareJobs();

    console.log('[Group Detail] Share job modal opened');
  } catch (error) {
    console.error('[Group Detail] Error opening share job modal:', error);
    showNotification('Failed to load jobs', 'error');
  }
}

/**
 * Close share job modal
 */
function closeShareJobModal() {
  shareJobModal.classList.remove('show');
  console.log('[Group Detail] Share job modal closed');
}

/**
 * Load user's jobs from job tracker
 */
async function loadUserJobs() {
  try {
    console.log('[Group Detail] Loading user jobs...');

    // Wait for job tracker to be ready
    if (window.jobTracker) {
      await window.jobTracker.init();
      userJobs = window.jobTracker.jobs || [];
    } else {
      // Fallback: load from storage directly
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['trackedJobs']);
        userJobs = result.trackedJobs || [];
      } else {
        const stored = localStorage.getItem('trackedJobs');
        userJobs = stored ? JSON.parse(stored) : [];
      }
    }

    console.log('[Group Detail] Loaded', userJobs.length, 'user jobs');
  } catch (error) {
    console.error('[Group Detail] Error loading user jobs:', error);
    userJobs = [];
  }
}

/**
 * Filter share jobs by search query
 */
function filterShareJobs(query) {
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) {
    filteredJobs = [...userJobs];
  } else {
    filteredJobs = userJobs.filter(job => {
      return (
        job.company.toLowerCase().includes(searchTerm) ||
        job.title.toLowerCase().includes(searchTerm) ||
        (job.location && job.location.toLowerCase().includes(searchTerm))
      );
    });
  }

  renderShareJobs();
}

/**
 * Render share jobs list
 */
function renderShareJobs() {
  if (!filteredJobs || filteredJobs.length === 0) {
    shareJobsList.style.display = 'none';
    shareEmptyState.style.display = 'flex';
    return;
  }

  shareJobsList.style.display = 'flex';
  shareEmptyState.style.display = 'none';

  shareJobsList.innerHTML = filteredJobs.map(job => createShareJobItem(job)).join('');

  // Attach event listeners
  attachShareJobListeners();
}

/**
 * Create share job item HTML
 */
function createShareJobItem(job) {
  const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';

  return `
    <div class="share-job-item" data-job-id="${job.id}">
      <div class="share-job-icon">${companyInitial}</div>
      <div class="share-job-info">
        <h3 class="share-job-title">${escapeHtml(job.title)}</h3>
        <div class="share-job-company">${escapeHtml(job.company)}</div>
        <div class="share-job-details">
          ${job.location ? `<span class="share-job-detail">📍 ${escapeHtml(job.location)}</span>` : ''}
          ${job.workType ? `<span class="share-job-detail">💼 ${escapeHtml(job.workType)}</span>` : ''}
          <span class="share-job-status ${job.status}">${job.status}</span>
        </div>
      </div>
      <button class="btn-share-to-group" data-job-id="${job.id}">
        Share
      </button>
    </div>
  `;
}

/**
 * Attach event listeners to share job items
 */
function attachShareJobListeners() {
  document.querySelectorAll('.btn-share-to-group').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobId = btn.dataset.jobId;
      await handleShareJobToGroup(jobId, btn);
    });
  });
}

/**
 * Handle share job to group
 */
async function handleShareJobToGroup(jobId, btn) {
  try {
    console.log('[Group Detail] Sharing job to group:', jobId);

    // Find the job
    const job = userJobs.find(j => j.id === jobId);
    if (!job) {
      showNotification('Job not found', 'error');
      return;
    }

    // Disable button
    btn.disabled = true;
    btn.textContent = 'Sharing...';

    // Call API to share job
    await sharedJobsAPI.shareJob(currentGroupId, {
      company: job.company,
      title: job.title,
      description: job.description,
      descriptionHtml: job.descriptionHtml,
      location: job.location,
      salary: job.salary,
      workType: job.workType,
      linkedinUrl: job.linkedinUrl
    });

    // Update button
    btn.textContent = '✓ Shared';
    btn.classList.add('shared');

    showNotification('Job shared successfully!', 'success');

    // Reload shared jobs list
    setTimeout(() => {
      loadSharedJobs();
      closeShareJobModal();
    }, 1000);

  } catch (error) {
    console.error('[Group Detail] Error sharing job:', error);
    showNotification('Failed to share job', 'error');

    // Reset button
    btn.disabled = false;
    btn.textContent = 'Share';
  }
}

/**
 * Toggle job picker dropdown
 */
async function toggleJobPicker() {
  if (jobPickerDropdown.style.display === 'none' || !jobPickerDropdown.style.display) {
    await openJobPicker();
  } else {
    closeJobPicker();
  }
}

/**
 * Open job picker dropdown
 */
async function openJobPicker() {
  try {
    console.log('[Group Detail] Opening job picker...');

    // Load user's jobs if not already loaded
    if (userJobs.length === 0) {
      await loadUserJobs();
    }

    // Show dropdown
    jobPickerDropdown.style.display = 'flex';

    // Clear search
    if (jobPickerSearch) {
      jobPickerSearch.value = '';
    }

    // Render all jobs
    renderJobPickerJobs(userJobs);

    console.log('[Group Detail] Job picker opened');
  } catch (error) {
    console.error('[Group Detail] Error opening job picker:', error);
    showNotification('Failed to load jobs', 'error');
  }
}

/**
 * Close job picker dropdown
 */
function closeJobPicker() {
  jobPickerDropdown.style.display = 'none';
  console.log('[Group Detail] Job picker closed');
}

/**
 * Filter job picker jobs
 */
function filterJobPickerJobs(searchTerm) {
  const filtered = userJobs.filter(job => {
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      job.company.toLowerCase().includes(searchLower) ||
      (job.location && job.location.toLowerCase().includes(searchLower))
    );
  });

  renderJobPickerJobs(filtered);
}

/**
 * Render job picker jobs
 */
function renderJobPickerJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    jobPickerList.innerHTML = `
      <div style="padding: 24px; text-align: center; color: rgba(55, 53, 47, 0.65);">
        <p>No jobs found</p>
      </div>
    `;
    return;
  }

  jobPickerList.innerHTML = jobs.map(job => {
    const companyInitial = job.company ? job.company.charAt(0).toUpperCase() : 'C';
    return `
      <div class="job-picker-item" data-job-id="${job.id}">
        <div class="job-picker-item-icon">${companyInitial}</div>
        <div class="job-picker-item-info">
          <h3 class="job-picker-item-title">${escapeHtml(job.title)}</h3>
          <div class="job-picker-item-company">${escapeHtml(job.company)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners
  jobPickerList.querySelectorAll('.job-picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const jobId = item.dataset.jobId;
      handleShareJobInChat(jobId);
    });
  });
}

/**
 * Handle share job in chat
 */
async function handleShareJobInChat(jobId) {
  try {
    console.log('[Group Detail] Sharing job in chat:', jobId);

    // Find the job
    const job = userJobs.find(j => j.id === jobId);
    if (!job) {
      showNotification('Job not found', 'error');
      return;
    }

    // Close job picker
    closeJobPicker();

    // First, create a SharedJob record in the database so it appears in the Jobs section
    let sharedJob = null;
    try {
      console.log('[Group Detail] Creating SharedJob via API...');
      sharedJob = await sharedJobsAPI.shareJob(currentGroupId, {
        company: job.company,
        title: job.title,
        description: job.description,
        descriptionHtml: job.descriptionHtml,
        location: job.location,
        salary: job.salary,
        workType: job.workType || 'Not specified',
        linkedinUrl: job.linkedinUrl,
        jobUrl: job.jobUrl || job.linkedinUrl,
        linkedinJobId: job.linkedinJobId,
        source: job.source || 'Manual'
      });
      console.log('[Group Detail] SharedJob created successfully:', sharedJob);
      showNotification('Job shared to group!', 'success');
    } catch (apiError) {
      console.error('[Group Detail] Failed to create SharedJob record:', apiError);
      showNotification('Failed to share job to group', 'error');
      // Don't continue if API fails - the job won't be in the Jobs section
      return;
    }

    // Send job_share message via Socket.io
    window.socketClient.sendMessage(currentGroupId, {
      content: `Shared a job: ${job.title} at ${job.company}`,
      messageType: 'job_share',
      sharedJobId: sharedJob?._id || null,
      jobData: {
        company: job.company,
        title: job.title,
        location: job.location,
        workType: job.workType,
        linkedinUrl: job.linkedinUrl
      }
    });

    console.log('[Group Detail] Job shared in chat successfully');

    // Reload shared jobs to show the new entry
    loadSharedJobs();

  } catch (error) {
    console.error('[Group Detail] Error sharing job in chat:', error);
    showNotification('Failed to share job', 'error');
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.socketClient && currentGroupId) {
    console.log('[Group Detail] Cleaning up Socket.io connection...');
    window.socketClient.leaveGroup(currentGroupId);
    window.socketClient.disconnect();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

