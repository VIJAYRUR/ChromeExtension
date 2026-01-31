/**
 * WhatsApp-like Groups Page
 * Two-column layout with state-based group switching
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
  selectedGroupId: null,
  groupsList: [],
  messagesByGroupId: {},
  jobsByGroupId: {},
  membersByGroupId: {},
  currentUser: null,
  searchQuery: '',
  jobsSearchQuery: '',
  jobsSortOrder: 'newest', // 'newest' or 'oldest'
  chatHidden: false, // Track if chat is hidden

  // Lazy loading state (per group)
  oldestTimestampByGroupId: {}, // Track oldest message timestamp for each group
  hasMoreByGroupId: {}, // Whether there are more messages to load
  isLoadingMoreByGroupId: {} // Prevent multiple simultaneous loads
};

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
  // Sidebar
  groupsList: document.getElementById('groups-list'),
  searchInput: document.getElementById('search-groups'),
  backToDashboard: document.getElementById('back-to-dashboard'),
  newGroupBtn: document.getElementById('new-group-btn'),
  discoverBtn: document.getElementById('discover-groups-btn'),
  joinGroupBtn: document.getElementById('join-group-btn'),
  sidebar: document.getElementById('groups-sidebar'),
  
  // Group Content
  emptyState: document.getElementById('empty-group-state'),
  groupView: document.getElementById('group-view'),
  groupAvatar: document.getElementById('group-avatar'),
  groupName: document.getElementById('group-name'),
  groupMeta: document.getElementById('group-meta'),
  mobileBackBtn: document.getElementById('mobile-back-btn'),
  
  // Tabs
  tabChat: document.getElementById('tab-chat'),
  tabJobs: document.getElementById('tab-jobs'),
  tabMembers: document.getElementById('tab-members'),
  contentChat: document.getElementById('content-chat'),
  contentJobs: document.getElementById('content-jobs'),
  contentMembers: document.getElementById('content-members'),
  jobsCount: document.getElementById('jobs-count'),
  membersCount: document.getElementById('members-count'),
  
  // Chat
  messagesContainer: document.getElementById('messages-container'),
  messageInput: document.getElementById('message-input'),
  attachBtn: document.getElementById('attach-btn'),
  emojiBtn: document.getElementById('emoji-btn'),
  sendBtn: document.getElementById('send-message-btn'),

  // Jobs
  jobsList: document.getElementById('jobs-list'),
  shareJobBtn: document.getElementById('share-job-btn'),
  
  // Members
  membersList: document.getElementById('members-list'),
  
  // Modals
  createModal: document.getElementById('create-group-modal'),
  discoverModal: document.getElementById('discover-modal'),
  createForm: document.getElementById('create-group-form'),
  closeCreateModal: document.getElementById('close-create-modal'),
  closeDiscoverModal: document.getElementById('close-discover-modal'),
  cancelCreateBtn: document.getElementById('cancel-create-btn'),
  discoverSearchInput: document.getElementById('discover-search-input'),
  discoverGroupsList: document.getElementById('discover-groups-list'),

  // Invite Link Modal
  inviteLinkModal: document.getElementById('invite-link-modal'),
  inviteLinkInput: document.getElementById('invite-link-input'),
  copyInviteBtn: document.getElementById('copy-invite-btn'),
  copySuccess: document.getElementById('copy-success'),
  closeInviteModal: document.getElementById('close-invite-modal'),

  // Join Group Modal
  joinGroupModal: document.getElementById('join-group-modal'),
  joinLinkInput: document.getElementById('join-link-input'),
  confirmJoinBtn: document.getElementById('confirm-join-btn'),
  cancelJoinBtn: document.getElementById('cancel-join-btn'),
  closeJoinModal: document.getElementById('close-join-modal'),

  // Job Details Modal
  jobDetailsModal: document.getElementById('job-details-modal'),
  jobDetailsContent: document.getElementById('job-details-content'),
  closeJobDetailsModal: document.getElementById('close-job-details-modal'),

  // Header actions
  inviteMembersBtn: document.getElementById('invite-members-btn'),
  groupMenuBtn: document.getElementById('group-menu-btn')
};

// ============================================
// INITIALIZATION
// ============================================

async function init() {
  console.log('[WhatsApp Groups] Initializing...');

  try {
    // Wait for auth
    console.log('[WhatsApp Groups] Waiting for auth...');
    await waitForAuth();
    console.log('[WhatsApp Groups] Auth ready');

    // Load current user
    state.currentUser = window.authManager.getUser();
    console.log('[WhatsApp Groups] Current user:', state.currentUser);

    // Setup event listeners
    setupEventListeners();
    console.log('[WhatsApp Groups] Event listeners setup');

    // Load groups
    console.log('[WhatsApp Groups] Loading groups...');
    await loadMyGroups();
    console.log('[WhatsApp Groups] Groups loaded:', state.groupsList.length);

    // Check if there's a groupId in URL params (from notification click)
    const urlParams = new URLSearchParams(window.location.search);
    const groupIdFromUrl = urlParams.get('groupId');
    const tabFromUrl = urlParams.get('tab');

    if (groupIdFromUrl && state.groupsList.find(g => g._id === groupIdFromUrl)) {
      console.log('[WhatsApp Groups] Selecting group from URL:', groupIdFromUrl);
      await selectGroup(groupIdFromUrl);
      // Switch to specified tab if provided
      if (tabFromUrl && ['chat', 'jobs', 'members'].includes(tabFromUrl)) {
        console.log('[WhatsApp Groups] Switching to tab from URL:', tabFromUrl);
        switchTab(tabFromUrl);
      }
    } else if (state.groupsList.length > 0) {
      // Auto-select first group if available
      console.log('[WhatsApp Groups] Auto-selecting first group');
      selectGroup(state.groupsList[0]._id);
    } else {
      console.log('[WhatsApp Groups] No groups to select');
    }

    // Setup socket listeners FIRST (before connection)
    setupSocketListeners();
    console.log('[WhatsApp Groups] Socket listeners setup');

    // Connect socket if not connected
    if (window.socketClient && !window.socketClient.isConnected) {
      console.log('[WhatsApp Groups] Connecting socket with token...');
      const token = window.authManager.getToken();
      await window.socketClient.connect(token);
      console.log('[WhatsApp Groups] Socket connected:', window.socketClient.isConnected);
    }

    // Inject global notifications bell
    if (window.globalNotifications) {
      window.globalNotifications.injectInto('#notification-bell-wrapper');
      console.log('[WhatsApp Groups] Global notifications injected');
    }

    // Initialize smart notifications
    initializeSmartNotifications();

    console.log('[WhatsApp Groups] ✅ Initialized successfully');
  } catch (error) {
    console.error('[WhatsApp Groups] ❌ Initialization error:', error);
    showError('Failed to initialize groups page');
  }
}

async function waitForAuth() {
  // First, wait for authManager to exist
  let attempts = 0;
  while (!window.authManager && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (!window.authManager) {
    throw new Error('AuthManager not loaded');
  }

  console.log('[WhatsApp Groups] AuthManager found, initializing...');

  // Initialize authManager if not already initialized
  if (!window.authManager.initialized) {
    console.log('[WhatsApp Groups] Calling authManager.init()...');
    await window.authManager.init();
    console.log('[WhatsApp Groups] AuthManager initialized');
  }

  // Check if user is authenticated
  if (!window.authManager.token) {
    console.error('[WhatsApp Groups] No auth token found, redirecting to login');
    window.location.href = '../auth/login.html';
    throw new Error('Not authenticated');
  }

  console.log('[WhatsApp Groups] Auth ready, token exists');
}

/**
 * Initialize smart notifications
 */
function initializeSmartNotifications() {
  if (typeof SmartNotificationManager !== 'undefined') {
    window.smartNotifications = new SmartNotificationManager();
    console.log('[WhatsApp Groups] ✅ Smart notifications initialized');
  } else {
    console.warn('[WhatsApp Groups] SmartNotificationManager not available');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Navigation
  elements.backToDashboard?.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
  
  elements.mobileBackBtn?.addEventListener('click', () => {
    // On mobile, hide group view and show sidebar
    elements.sidebar?.classList.remove('hidden');
  });
  
  // Search
  elements.searchInput?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderGroupsList();
  });
  
  // New group
  elements.newGroupBtn?.addEventListener('click', showCreateModal);

  // Discover groups
  elements.discoverBtn?.addEventListener('click', showDiscoverModal);

  // Join group by link
  elements.joinGroupBtn?.addEventListener('click', showJoinGroupModal);
  
  // Tabs
  elements.tabChat?.addEventListener('click', () => switchTab('chat'));
  elements.tabJobs?.addEventListener('click', () => switchTab('jobs'));
  elements.tabMembers?.addEventListener('click', () => switchTab('members'));
  
  // Chat
  elements.sendBtn?.addEventListener('click', sendMessage);
  elements.messageInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Attach button
  elements.attachBtn?.addEventListener('click', handleAttachClick);

  // Emoji button
  elements.emojiBtn?.addEventListener('click', handleEmojiClick);

  // Header actions
  elements.inviteMembersBtn?.addEventListener('click', showInviteLink);

  // Modals
  elements.closeCreateModal?.addEventListener('click', hideCreateModal);
  elements.closeDiscoverModal?.addEventListener('click', hideDiscoverModal);
  elements.cancelCreateBtn?.addEventListener('click', hideCreateModal);
  elements.createForm?.addEventListener('submit', handleCreateGroup);

  // Invite Link Modal
  elements.closeInviteModal?.addEventListener('click', hideInviteLinkModal);
  elements.copyInviteBtn?.addEventListener('click', copyInviteLink);

  // Join Group Modal
  elements.closeJoinModal?.addEventListener('click', hideJoinGroupModal);
  elements.cancelJoinBtn?.addEventListener('click', hideJoinGroupModal);
  elements.confirmJoinBtn?.addEventListener('click', handleJoinByLink);

  // Job Details Modal
  elements.closeJobDetailsModal?.addEventListener('click', closeJobDetailsModal);

  // Share Job Button
  elements.shareJobBtn?.addEventListener('click', showShareJobModal);

  // Jobs Search
  const jobsSearchInput = document.getElementById('jobs-search-input');
  jobsSearchInput?.addEventListener('input', (e) => {
    state.jobsSearchQuery = e.target.value.trim();
    renderJobs();
  });

  // Jobs Sort
  const jobsSortSelect = document.getElementById('jobs-sort-select');
  jobsSortSelect?.addEventListener('change', (e) => {
    state.jobsSortOrder = e.target.value;
    renderJobs();
  });

  // Toggle Chat
  const toggleChatBtn = document.getElementById('toggle-chat-btn');
  toggleChatBtn?.addEventListener('click', () => {
    state.chatHidden = !state.chatHidden;
    toggleChatVisibility();
  });

  // Discover search
  let discoverTimeout;
  elements.discoverSearchInput?.addEventListener('input', (e) => {
    clearTimeout(discoverTimeout);
    discoverTimeout = setTimeout(() => {
      loadPublicGroups(e.target.value);
    }, 300);
  });
}

// ============================================
// GROUPS LOADING
// ============================================

async function loadMyGroups() {
  try {
    console.log('[WhatsApp Groups] Loading my groups...');

    if (!window.groupAPI) {
      throw new Error('groupAPI not available');
    }

    const groups = await window.groupAPI.getMyGroups();
    state.groupsList = groups || [];

    console.log('[WhatsApp Groups] Loaded', state.groupsList.length, 'groups:', state.groupsList);

    renderGroupsList();

    // Join all groups for socket notifications
    state.groupsList.forEach(group => {
      if (window.socketClient && window.socketClient.isConnected) {
        window.socketClient.joinGroup(group._id);
        console.log('[WhatsApp Groups] Joined group:', group.name);
      }
    });
  } catch (error) {
    console.error('[WhatsApp Groups] Error loading groups:', error);
    state.groupsList = [];
    renderGroupsList();
    showError('Failed to load groups: ' + error.message);
  }
}

function renderGroupsList() {
  if (!elements.groupsList) {
    console.warn('[WhatsApp Groups] groupsList element not found');
    return;
  }

  console.log('[WhatsApp Groups] Rendering groups list, total groups:', state.groupsList.length);

  // Filter groups by search query
  const filteredGroups = state.groupsList.filter(group => {
    if (!state.searchQuery) return true;
    return group.name.toLowerCase().includes(state.searchQuery);
  });

  console.log('[WhatsApp Groups] Filtered groups:', filteredGroups.length);

  if (filteredGroups.length === 0) {
    elements.groupsList.innerHTML = `
      <div class="empty-state-small">
        <p>${state.searchQuery ? 'No groups found' : 'No groups yet. Create or join a group to get started!'}</p>
      </div>
    `;
    return;
  }

  elements.groupsList.innerHTML = filteredGroups.map(group => createGroupListItem(group)).join('');

  // Attach click handlers
  elements.groupsList.querySelectorAll('.group-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const groupId = item.dataset.groupId;
      console.log('[WhatsApp Groups] Group clicked:', groupId);
      selectGroup(groupId);
    });
  });

  console.log('[WhatsApp Groups] Groups list rendered');
}

function createGroupListItem(group) {
  const isActive = state.selectedGroupId === group._id;
  const groupAvatarUrl = getGroupAvatar(group.name);
  const memberCount = group.stats?.memberCount || 0;
  const typeIcon = group.type === 'public' ? '🌍' : '🔒';
  const typeLabel = group.type === 'public' ? 'Public' : 'Private';
  const typeTitle = group.type === 'public' ? 'Public Group - Anyone can join' : 'Private Group - Join by invite link';

  // Get unread count (placeholder - would come from backend)
  const unreadCount = 0;

  // Get last message preview from state or group data from backend
  let lastMessage = 'No messages yet';
  let lastTime = '';

  // First check if we have messages loaded for this group (from viewing it)
  const groupMessages = state.messagesByGroupId[group._id];
  if (groupMessages && groupMessages.length > 0) {
    const lastMsg = groupMessages[groupMessages.length - 1];
    const senderName = lastMsg.userId?.firstName || lastMsg.userId?.name || 'Someone';

    if (lastMsg.messageType === 'job_share') {
      const jobTitle = lastMsg.jobData?.title || 'a job';
      lastMessage = `${senderName} shared ${jobTitle}`;
    } else {
      lastMessage = `${senderName}: ${lastMsg.content || ''}`;
    }

    // Truncate if too long
    if (lastMessage.length > 40) {
      lastMessage = lastMessage.substring(0, 37) + '...';
    }

    // Format time
    lastTime = formatTimeAgo(lastMsg.createdAt);
  } else if (group.lastMessage) {
    // Use last message from backend API response
    const senderName = group.lastMessage.sender?.firstName || 'Someone';

    if (group.lastMessage.messageType === 'job_share') {
      const jobTitle = group.lastMessage.jobData?.title || 'a job';
      lastMessage = `${senderName} shared ${jobTitle}`;
    } else {
      lastMessage = `${senderName}: ${group.lastMessage.content || ''}`;
    }

    if (lastMessage.length > 40) {
      lastMessage = lastMessage.substring(0, 37) + '...';
    }
    lastTime = formatTimeAgo(group.lastMessage.createdAt);
  }

  return `
    <div class="group-list-item ${isActive ? 'active' : ''}" data-group-id="${group._id}">
      <img src="${groupAvatarUrl}" alt="${escapeHtml(group.name)}" class="group-list-avatar" />
      <div class="group-list-info">
        <div class="group-list-header">
          <span class="group-list-name">${escapeHtml(group.name)}</span>
          ${lastTime ? `<span class="group-list-time">${lastTime}</span>` : ''}
        </div>
        <div class="group-list-preview">
          <span class="group-list-message">${lastMessage}</span>
          <div class="group-list-meta">
            <span class="group-type-icon" title="${typeTitle}">${typeIcon} ${typeLabel}</span>
            <span class="group-member-count">${memberCount}</span>
          </div>
        </div>
      </div>
      ${unreadCount > 0 ? `<div class="group-unread-badge">${unreadCount}</div>` : ''}
    </div>
  `;
}

// ============================================
// GROUP SELECTION
// ============================================

async function selectGroup(groupId) {
  console.log('[WhatsApp Groups] Selecting group:', groupId);

  state.selectedGroupId = groupId;

  // Update UI
  renderGroupsList(); // Re-render to update active state

  // Show group view, hide empty state
  if (elements.emptyState) elements.emptyState.style.display = 'none';
  if (elements.groupView) elements.groupView.style.display = 'flex';

  // On mobile, hide sidebar when group is selected
  if (window.innerWidth <= 768) {
    elements.sidebar?.classList.add('hidden');
  }

  // Join socket room for this group
  if (window.socketClient && window.socketClient.isConnected) {
    console.log('[WhatsApp Groups] Joining socket room for group:', groupId);
    window.socketClient.joinGroup(groupId);
  }

  // Load group data
  await loadGroupData(groupId);

  // Switch to chat tab by default
  switchTab('chat');
}

async function loadGroupData(groupId) {
  try {
    // Load group details ONCE
    const group = await window.groupAPI.getGroupDetails(groupId);

    // Update header
    if (elements.groupAvatar) {
      const groupAvatarUrl = getGroupAvatar(group.name);
      elements.groupAvatar.innerHTML = `<img src="${groupAvatarUrl}" alt="${escapeHtml(group.name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />`;
    }
    if (elements.groupName) {
      elements.groupName.textContent = group.name;
    }
    if (elements.groupMeta) {
      const memberCount = group.stats?.memberCount || 0;
      const typeIcon = group.type === 'public' ? '🌍' : '🔒';
      const typeText = group.type === 'public' ? 'Public' : 'Private';
      elements.groupMeta.textContent = `${memberCount} members • ${typeIcon} ${typeText}`;
    }

    // Update counts
    if (elements.membersCount) {
      elements.membersCount.textContent = group.stats?.memberCount || 0;
    }

    // Load jobs FIRST (needed for job share message linking), then messages, then members
    await loadJobs(groupId);
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    await loadMessages(groupId);
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    await loadMembers(groupId);

  } catch (error) {
    console.error('[WhatsApp Groups] Error loading group data:', error);
    showError('Failed to load group data: ' + error.message);
  }
}

// ============================================
// MESSAGES
// ============================================

async function loadMessages(groupId) {
  try {
    console.log('[WhatsApp Groups] Loading messages for group:', groupId);

    // Reset lazy loading state for this group
    state.oldestTimestampByGroupId[groupId] = null;
    state.hasMoreByGroupId[groupId] = true;
    state.isLoadingMoreByGroupId[groupId] = false;

    const response = await fetch(
      `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${groupId}/messages?limit=50`,
      {
        headers: {
          'Authorization': `Bearer ${window.authManager.token}`
        }
      }
    );

    if (!response.ok) throw new Error('Failed to fetch messages');

    const data = await response.json();
    const messages = data.data || [];
    const pagination = data.pagination || {};

    console.log('[WhatsApp Groups] Loaded', messages.length, 'messages');
    console.log('[WhatsApp Groups] Has more:', pagination.hasMore);
    console.log('[WhatsApp Groups] Oldest timestamp:', pagination.oldestTimestamp);

    // Update state
    state.messagesByGroupId[groupId] = messages;
    state.hasMoreByGroupId[groupId] = pagination.hasMore || false;
    state.oldestTimestampByGroupId[groupId] = pagination.oldestTimestamp;

    renderMessages();

    // Setup lazy loading scroll listener
    setupLazyLoading();

  } catch (error) {
    console.error('[WhatsApp Groups] Error loading messages:', error);
    state.messagesByGroupId[groupId] = [];
    renderMessages();
  }
}

/**
 * Load older messages (lazy loading)
 */
async function loadOlderMessages() {
  const groupId = state.selectedGroupId;
  if (!groupId) return;

  const hasMore = state.hasMoreByGroupId[groupId];
  const isLoadingMore = state.isLoadingMoreByGroupId[groupId];
  const oldestTimestamp = state.oldestTimestampByGroupId[groupId];

  if (!hasMore || isLoadingMore || !oldestTimestamp) {
    console.log('[WhatsApp Groups] Skipping load - hasMore:', hasMore, 'isLoadingMore:', isLoadingMore, 'oldestTimestamp:', oldestTimestamp);
    return;
  }

  try {
    state.isLoadingMoreByGroupId[groupId] = true;
    console.log('[WhatsApp Groups] 📜 Loading older messages before', oldestTimestamp);

    // Show loading indicator at top
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loading-more';
    loadingIndicator.style.cssText = 'text-align: center; padding: 10px; color: #888; font-size: 12px;';
    loadingIndicator.textContent = 'Loading older messages...';
    elements.messagesContainer.insertBefore(loadingIndicator, elements.messagesContainer.firstChild);

    // Remember scroll position
    const scrollBefore = elements.messagesContainer.scrollHeight - elements.messagesContainer.scrollTop;

    // Fetch older messages using cursor-based pagination
    const response = await fetch(
      `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${groupId}/messages?limit=50&before=${oldestTimestamp}`,
      {
        headers: {
          'Authorization': `Bearer ${window.authManager.token}`
        }
      }
    );

    if (!response.ok) throw new Error('Failed to fetch older messages');

    const data = await response.json();
    const olderMessages = data.data || [];
    const pagination = data.pagination || {};

    console.log('[WhatsApp Groups] Loaded', olderMessages.length, 'older messages');
    console.log('[WhatsApp Groups] Has more:', pagination.hasMore);

    if (olderMessages.length > 0) {
      // Prepend older messages to the beginning
      state.messagesByGroupId[groupId] = [...olderMessages, ...state.messagesByGroupId[groupId]];

      // Update state
      state.hasMoreByGroupId[groupId] = pagination.hasMore || false;
      state.oldestTimestampByGroupId[groupId] = pagination.oldestTimestamp;

      // Re-render all messages
      renderMessages();

      // Restore scroll position (stay at same visual position)
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight - scrollBefore;
    } else {
      state.hasMoreByGroupId[groupId] = false;
    }

    // Remove loading indicator
    const indicator = document.getElementById('loading-more');
    if (indicator) {
      indicator.remove();
    }

  } catch (error) {
    console.error('[WhatsApp Groups] Error loading older messages:', error);

    // Remove loading indicator on error
    const indicator = document.getElementById('loading-more');
    if (indicator) {
      indicator.remove();
    }
  } finally {
    state.isLoadingMoreByGroupId[groupId] = false;
  }
}

/**
 * Setup lazy loading scroll listener
 */
function setupLazyLoading() {
  if (!elements.messagesContainer) return;

  // Remove existing listener if any
  elements.messagesContainer.removeEventListener('scroll', handleMessagesScroll);

  // Add scroll listener
  elements.messagesContainer.addEventListener('scroll', handleMessagesScroll);

  console.log('[WhatsApp Groups] 📜 Lazy loading enabled - scroll to top to load older messages');
}

/**
 * Handle scroll event for lazy loading
 */
function handleMessagesScroll() {
  // Check if scrolled to top (with 100px threshold)
  if (elements.messagesContainer.scrollTop < 100) {
    const groupId = state.selectedGroupId;
    const hasMore = state.hasMoreByGroupId[groupId];
    const isLoadingMore = state.isLoadingMoreByGroupId[groupId];

    if (hasMore && !isLoadingMore) {
      console.log('[WhatsApp Groups] 📜 User scrolled to top - loading older messages');
      loadOlderMessages();
    }
  }
}

function renderMessages() {
  if (!elements.messagesContainer) return;

  const messages = state.messagesByGroupId[state.selectedGroupId] || [];

  if (messages.length === 0) {
    elements.messagesContainer.innerHTML = `
      <div class="empty-state-small">
        <p>No discussion yet. Add a comment to start collaborating.</p>
      </div>
    `;
    return;
  }

  elements.messagesContainer.innerHTML = messages.map(msg => createMessageItem(msg)).join('');

  // Attach event listeners to "Save to Jobs" buttons
  attachSaveJobListeners();

  // Attach event listeners to job cards for opening modal
  attachJobCardClickListeners();

  // Scroll to bottom
  scrollMessagesToBottom();
}

function attachSaveJobListeners() {
  const saveButtons = elements.messagesContainer.querySelectorAll('.btn-save-job');

  saveButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent card click from triggering
      await handleSaveJobFromMessage(btn);
    });
  });
}

function attachJobCardClickListeners() {
  const jobCards = elements.messagesContainer.querySelectorAll('.clickable-job-card');
  console.log('[WhatsApp Groups] Attaching click listeners to', jobCards.length, 'clickable job cards');

  jobCards.forEach(card => {
    card.addEventListener('click', async (e) => {
      // Don't open if clicking on Save button or action zone
      if (e.target.closest('.btn-save-job') || e.target.closest('.job-share-action-zone')) {
        return;
      }

      // Get shared job ID from card
      const sharedJobId = card.getAttribute('data-shared-job-id');
      console.log('[WhatsApp Groups] Job card clicked, sharedJobId:', sharedJobId, 'groupId:', state.selectedGroupId);

      // Open popup modal if we have a valid sharedJobId
      if (sharedJobId && sharedJobId.length > 0 && state.selectedGroupId) {
        await openJobDetailPopup(sharedJobId, state.selectedGroupId);
      } else {
        console.warn('[WhatsApp Groups] Missing sharedJobId or groupId. sharedJobId:', sharedJobId, 'groupId:', state.selectedGroupId);
        showError('This job cannot be viewed. Please ask the sender to re-share it.');
      }
    });
  });
}

// ============================================
// JOB DETAIL POPUP - NOTION STYLE
// ============================================

async function openJobDetailPopup(sharedJobId, groupId) {
  try {
    console.log('[WhatsApp Groups] Opening job detail popup for:', sharedJobId);

    // Create or get the popup modal
    let popup = document.getElementById('job-detail-popup');
    if (!popup) {
      popup = createJobDetailPopup();
      document.body.appendChild(popup);
    }

    // Show loading state
    const content = popup.querySelector('.popup-content');
    content.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 16px;">
        <div style="width: 32px; height: 32px; border: 2px solid var(--border-subtle); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <p style="color: var(--text-muted); font-size: 14px;">Loading job details...</p>
      </div>
    `;
    popup.style.display = 'flex';

    // Fetch job details from API
    const response = await fetch(
      `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${groupId}/jobs/${sharedJobId}`,
      {
        headers: {
          'Authorization': `Bearer ${window.authManager.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to load job details');
    }

    const data = await response.json();
    const sharedJob = data.data;

    console.log('[WhatsApp Groups] Job details loaded:', sharedJob);

    // Render job details in popup
    renderJobDetailPopup(popup, sharedJob);

  } catch (error) {
    console.error('[WhatsApp Groups] Error opening job detail popup:', error);
    showError('Failed to load job details');

    // Close popup on error
    const popup = document.getElementById('job-detail-popup');
    if (popup) popup.style.display = 'none';
  }
}

function createJobDetailPopup() {
  const popup = document.createElement('div');
  popup.id = 'job-detail-popup';
  popup.className = 'job-detail-popup-overlay';
  popup.innerHTML = `
    <div class="job-detail-popup-container">
      <div class="popup-header">
        <button class="popup-close-btn" id="close-job-popup">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="popup-header-actions">
          <button class="popup-save-btn" id="popup-save-job">Save to Tracker</button>
        </div>
      </div>
      <div class="popup-content">
        <!-- Content will be dynamically inserted -->
      </div>
    </div>
  `;

  // Close button handler
  popup.querySelector('#close-job-popup').addEventListener('click', () => {
    popup.style.display = 'none';
  });

  // Click outside to close
  popup.addEventListener('click', (e) => {
    if (e.target === popup) {
      popup.style.display = 'none';
    }
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.style.display === 'flex') {
      popup.style.display = 'none';
    }
  });

  return popup;
}

function renderJobDetailPopup(popup, sharedJob) {
  const job = sharedJob.jobId || sharedJob;
  const sharedByObj = sharedJob.sharedBy || {};
  const sharedBy = sharedByObj.name ||
    (sharedByObj.firstName && sharedByObj.lastName ? `${sharedByObj.firstName} ${sharedByObj.lastName}` :
    (sharedByObj.firstName || sharedByObj.email || 'Someone'));
  const sharedAt = sharedJob.sharedAt ? formatTimeAgo(sharedJob.sharedAt) : '';
  const companyInitial = (job.company || 'C').charAt(0).toUpperCase();

  // Build details items
  const detailItems = [];
  if (job.location) detailItems.push({ label: 'Location', value: escapeHtml(job.location) });
  if (job.workType) detailItems.push({ label: 'Work Type', value: escapeHtml(job.workType) });
  if (job.jobType) detailItems.push({ label: 'Job Type', value: escapeHtml(job.jobType) });
  if (job.salary) detailItems.push({ label: 'Compensation', value: escapeHtml(job.salary) });
  if (job.applicationDeadline) detailItems.push({ label: 'Deadline', value: formatDate(job.applicationDeadline) });

  // Format description
  let descriptionHtml = '';
  if (window.linkedInCleaner) {
    if (job.descriptionHtml) {
      descriptionHtml = window.linkedInCleaner.format(job.descriptionHtml);
    } else if (job.description) {
      descriptionHtml = window.linkedInCleaner.structureContent(escapeHtml(job.description));
    }
  } else if (job.description) {
    descriptionHtml = `<p>${escapeHtml(job.description).replace(/\n/g, '<br>')}</p>`;
  }

  const content = popup.querySelector('.popup-content');
  content.innerHTML = `
    <!-- Job Header -->
    <div class="popup-job-header">
      <div class="popup-job-header-top">
        <div class="popup-company-logo">${companyInitial}</div>
        <div class="popup-job-info">
          <h1 class="popup-job-title">${escapeHtml(job.position || job.title || 'Unknown Position')}</h1>
          <div class="popup-job-company">${escapeHtml(job.company || 'Unknown Company')}</div>
          <div class="popup-job-meta">
            <span>Shared by ${escapeHtml(sharedBy)}</span>
            ${sharedAt ? `<span>• ${sharedAt}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Properties -->
      ${detailItems.length > 0 || job.link || job.linkedinUrl ? `
        <div class="popup-details-grid">
          ${detailItems.map(item => `
            <div class="popup-detail-item">
              <div class="popup-detail-label">${item.label}</div>
              <div class="popup-detail-value">${item.value}</div>
            </div>
          `).join('')}
          ${job.link || job.linkedinUrl ? `
            <div class="popup-detail-item">
              <div class="popup-detail-label">Link</div>
              <div class="popup-detail-value">
                <a href="${escapeHtml(job.link || job.linkedinUrl)}" target="_blank" class="popup-link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  View Original
                </a>
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>

    <!-- Description -->
    ${descriptionHtml ? `
      <div class="popup-section">
        <h2 class="popup-section-title">Description</h2>
        <div class="popup-description job-description formatted">${descriptionHtml}</div>
      </div>
    ` : ''}
  `;

  // Setup save button handler
  const saveBtn = popup.querySelector('#popup-save-job');

  // Check if job already exists in tracker
  if (window.jobTracker) {
    const jobDataForCheck = {
      company: job.company || 'Unknown Company',
      title: job.position || job.title || 'Unknown Position',
      linkedinUrl: job.link || job.linkedinUrl || job.jobUrl || '',
      linkedinJobId: job.linkedinJobId || ''
    };
    const existingJob = window.jobTracker.findExistingJob(jobDataForCheck);
    if (existingJob) {
      const statusLabels = {
        'saved': 'Saved',
        'applied': 'Applied',
        'interview': 'Interview',
        'offer': 'Offer',
        'rejected': 'Rejected',
        'withdrawn': 'Withdrawn'
      };
      const statusLabel = statusLabels[existingJob.status] || existingJob.status;
      saveBtn.textContent = `Already ${statusLabel}`;
      saveBtn.disabled = true;
      saveBtn.style.background = 'var(--text-muted)';
    }
  }
  saveBtn.onclick = async () => {
    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      // Save to local tracker
      if (window.jobTracker) {
        const jobData = {
          company: job.company || 'Unknown Company',
          title: job.position || job.title || 'Unknown Position',
          description: job.description || '',
          descriptionHtml: job.descriptionHtml || '',
          location: job.location || '',
          salary: job.salary || '',
          workType: job.workType || 'Not specified',
          jobType: job.jobType || '',
          linkedinUrl: job.link || job.linkedinUrl || job.jobUrl || '',
          jobUrl: job.link || job.jobUrl || '',
          linkedinJobId: job.linkedinJobId || '',
          source: 'Shared in group',
          status: 'saved',
          dateSaved: new Date().toISOString()
        };

        const result = await window.jobTracker.addJob(jobData);

        // Check if job already exists
        if (result && result.duplicate) {
          const existingStatus = result.existingJob.status || 'tracked';
          saveBtn.textContent = 'Already in Tracker';
          saveBtn.style.background = 'var(--text-muted)';
          showError(`Job already in tracker (${existingStatus})`);
          return;
        }
      }

      saveBtn.textContent = 'Saved!';
      saveBtn.classList.add('saved');
      showSuccess('Job saved to your tracker!');

    } catch (error) {
      console.error('[WhatsApp Groups] Error saving job:', error);
      showError('Failed to save job');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save to Tracker';
    }
  };
}

async function handleSaveJobFromMessage(button) {
  try {
    const jobDataStr = button.getAttribute('data-job-data');
    if (!jobDataStr) {
      console.error('[WhatsApp Groups] No job data found');
      return;
    }

    const jobData = JSON.parse(jobDataStr);

    console.log('[WhatsApp Groups] Saving job to tracker:', jobData);

    // Disable button
    button.disabled = true;
    button.textContent = 'Saving...';

    // Use Chrome extension API to save job to tracker
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      const messageData = {
        action: 'trackJob',
        jobData: {
          company: jobData.company,
          title: jobData.title,
          description: jobData.description || '',
          descriptionHtml: jobData.descriptionHtml || '',
          location: jobData.location || '',
          salary: jobData.salary || '',
          workType: jobData.workType || '',
          linkedinUrl: jobData.linkedinUrl || '',
          jobUrl: jobData.jobUrl || '',
          linkedinJobId: jobData.linkedinJobId || '',
          jobPostedHoursAgo: jobData.jobPostedHoursAgo || null,
          applicantsAtApplyTime: jobData.applicantsAtApplyTime || null,
          applicantsText: jobData.applicantsText || null,
          timeToApplyBucket: jobData.timeToApplyBucket || null,
          competitionBucket: jobData.competitionBucket || null,
          status: 'saved',  // Save to "saved" column (lowercase), not "applied"
          source: jobData.source || 'WhatsApp Group'
        }
      };

      console.log('[WhatsApp Groups] 🔍 Sending to background.js:', messageData);
      console.log('[WhatsApp Groups] 🔍 Status being sent:', messageData.jobData.status);

      chrome.runtime.sendMessage(messageData, (response) => {
        if (response && response.success) {
          console.log('[WhatsApp Groups] Job saved successfully');
          button.textContent = 'Saved';
          button.classList.add('saved');
          showSuccess('Job saved to your tracker!');
        } else if (response && response.duplicate) {
          console.log('[WhatsApp Groups] Job already tracked');
          button.textContent = 'Saved';
          button.classList.add('saved');
          button.disabled = true;
          showError('This job is already in your tracker');
        } else {
          console.error('[WhatsApp Groups] Failed to save job');
          button.disabled = false;
          button.textContent = '💾 Save to Jobs';
          showError('Failed to save job');
        }
      });
    } else {
      throw new Error('Chrome extension API not available');
    }

  } catch (error) {
    console.error('[WhatsApp Groups] Error saving job:', error);
    button.disabled = false;
    button.textContent = 'Save';
    showError('Failed to save job');
  }
}

/**
 * Generate Notion-style avatar URL for users
 * Using notionists style - black illustrated people on colorful backgrounds (perfect Notion match!)
 */
function getNotionAvatar(userName) {
  const seed = encodeURIComponent(userName);
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`;
}

/**
 * Generate group avatar URL - Neutral-First Palette (Very Notion-Core)
 * Using initials with paper + ink tones (not pastels)
 * Rounded square shape, calm editorial style
 */
function getGroupAvatar(groupName) {
  const seed = encodeURIComponent(groupName);
  // Notion-core neutral palette: Warm Gray, Paper Beige, Soft Stone, Light Ash, Subtle Blue-Gray
  const notionNeutrals = 'F2F2F1,F5F3EF,ECECEC,EFEFEF,EEF1F4';
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=${notionNeutrals}&textColor=3A3A3A&fontWeight=500&radius=8`;
}

/**
 * Create message item - Chat style with left/right alignment
 * Own messages on right, others on left
 */
function createMessageItem(message) {
  const senderName = message.userId?.firstName
    ? `${message.userId.firstName} ${message.userId.lastName || ''}`.trim()
    : 'Unknown';
  const avatarUrl = getNotionAvatar(senderName);
  const time = formatRelativeTime(message.createdAt);

  // Check if this is the current user's message
  const isOwnMessage = message.userId?._id === state.currentUser?._id ||
                       message.userId === state.currentUser?._id;

  // Handle job_share messages differently
  if (message.messageType === 'job_share' && message.jobData) {
    return createJobShareMessage(message, senderName, avatarUrl, time, isOwnMessage);
  }

  // Regular text message - Chat bubble style with alignment
  return `
    <div class="message-item ${isOwnMessage ? 'own-message' : 'other-message'}" data-message-id="${message._id}">
      <img src="${avatarUrl}" alt="${escapeHtml(senderName)}" class="message-avatar" />
      <div class="message-bubble">
        <div class="message-header">
          <span class="message-sender">${escapeHtml(senderName)}</span>
          <span class="message-time">${time}</span>
        </div>
        <p class="message-text">${escapeHtml(message.content)}</p>
      </div>
    </div>
  `;
}

/**
 * Create job share message - Notion embedded database card style
 */
function createJobShareMessage(message, senderName, avatarUrl, time, isOwnMessage) {
  const job = message.jobData;
  const companyInitial = (job.company || 'C').charAt(0).toUpperCase();

  // Format location and work type (muted, no emojis)
  const locationText = job.location ? escapeHtml(job.location) : '';
  const workTypeText = job.workType ? escapeHtml(job.workType) : '';
  const metaItems = [locationText, workTypeText].filter(Boolean);

  // Get shared job ID - try multiple sources:
  // 1. message.sharedJobId (new messages have this)
  // 2. Look up in loaded jobs by matching title/company (fallback for older messages)
  let sharedJobId = '';

  if (message.sharedJobId) {
    sharedJobId = typeof message.sharedJobId === 'object' ? message.sharedJobId.toString() : message.sharedJobId;
  } else {
    // Fallback: try to find matching SharedJob in loaded jobs list
    const groupJobs = state.jobsByGroupId[state.selectedGroupId] || [];
    const matchingJob = groupJobs.find(sj => {
      const sjJob = sj.jobId || sj;
      return (sjJob.title === job.title && sjJob.company === job.company) ||
             (sjJob.linkedinJobId && sjJob.linkedinJobId === job.linkedinJobId);
    });
    if (matchingJob) {
      sharedJobId = matchingJob._id || matchingJob.id || '';
      console.log('[WhatsApp Groups] Found matching SharedJob for legacy message:', sharedJobId);
    }
  }

  const hasSharedJobId = sharedJobId && sharedJobId.length > 0;

  console.log('[WhatsApp Groups] Creating job share message:', {
    'message.sharedJobId': message.sharedJobId,
    'resolved sharedJobId': sharedJobId,
    'hasSharedJobId': hasSharedJobId
  });

  // Notion-style discussion block structure with left/right alignment
  return `
    <div class="discussion-block ${isOwnMessage ? 'own-message' : 'other-message'}" data-message-id="${message._id}">
      <div class="discussion-wrapper">
        <div class="discussion-meta-row">
          <img src="${avatarUrl}" alt="${escapeHtml(senderName)}" class="discussion-avatar" />
          <span class="discussion-sender">${escapeHtml(senderName)}</span>
          <span class="discussion-time">${time}</span>
        </div>

        <div class="discussion-content">
          <div class="job-share-card ${hasSharedJobId ? 'clickable-job-card' : ''}"
               data-sender-name="${escapeHtml(senderName)}"
               data-shared-at="${message.createdAt || new Date().toISOString()}"
               data-job-id="${job._id || job.id || ''}"
               data-shared-job-id="${sharedJobId}">
            <!-- 1️⃣ Information Zone (flexible - adapts to space) -->
            <div class="job-share-info-zone">
              <div class="job-share-header">
                <div class="job-share-icon">${companyInitial}</div>
                <div class="job-share-info">
                  <div class="job-share-title">${escapeHtml(job.title)}</div>
                  <div class="job-share-company">${escapeHtml(job.company)}</div>
                  ${metaItems.length > 0 ? `<div class="job-share-meta">${metaItems.join(' · ')}</div>` : ''}
                </div>
              </div>
            </div>

            <!-- 2️⃣ Action Zone (fixed - always visible, always same place) -->
            <div class="job-share-action-zone">
              <div class="job-share-actions">
                <button class="btn-save-job" data-job-data='${JSON.stringify(job).replace(/'/g, '&apos;')}'>Save</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Format relative time - Notion style
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

  const options = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('en-US', options);
}

function scrollMessagesToBottom() {
  if (elements.messagesContainer) {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
  }
}

/**
 * Handle attach button click - opens file picker
 */
function handleAttachClick() {
  // Create a hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf,.doc,.docx,.txt';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[WhatsApp Groups] File selected:', file.name);
      // TODO: Implement file upload functionality
      showError('File upload feature coming soon!');
    }
  });

  // Trigger file picker
  fileInput.click();
}

/**
 * Handle emoji button click - shows emoji picker
 */
function handleEmojiClick() {
  // Common emojis for quick access
  const emojis = ['😀', '😊', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✅', '👏', '🚀', '💼', '📝', '📧'];

  // Create emoji picker popup
  const existingPicker = document.getElementById('emoji-picker-popup');
  if (existingPicker) {
    existingPicker.remove();
    return;
  }

  const picker = document.createElement('div');
  picker.id = 'emoji-picker-popup';
  picker.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 12px;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    z-index: 1000;
  `;

  // Position near emoji button
  const emojiBtn = elements.emojiBtn;
  if (emojiBtn) {
    const rect = emojiBtn.getBoundingClientRect();
    picker.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    picker.style.left = `${rect.left}px`;
  }

  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.style.cssText = `
      border: none;
      background: transparent;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background 0.15s ease;
    `;
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--bg-hover)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    btn.addEventListener('click', () => {
      if (elements.messageInput) {
        const cursorPos = elements.messageInput.selectionStart || 0;
        const text = elements.messageInput.value;
        elements.messageInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
        elements.messageInput.focus();

        // Move cursor after emoji
        const newPos = cursorPos + emoji.length;
        elements.messageInput.setSelectionRange(newPos, newPos);
      }
      picker.remove();
    });
    picker.appendChild(btn);
  });

  document.body.appendChild(picker);

  // Close picker when clicking outside
  setTimeout(() => {
    const closeOnClick = (e) => {
      if (!picker.contains(e.target) && e.target !== emojiBtn) {
        picker.remove();
        document.removeEventListener('click', closeOnClick);
      }
    };
    document.addEventListener('click', closeOnClick);
  }, 100);
}

async function sendMessage() {
  if (!elements.messageInput) return;

  const content = elements.messageInput.value.trim();
  if (!content || !state.selectedGroupId) return;

  try {
    console.log('[WhatsApp Groups] Sending message:', content);

    // Create optimistic message for immediate UI update
    const optimisticMessage = {
      _id: 'temp-' + Date.now(),
      content: content,
      userId: state.currentUser,
      createdAt: new Date().toISOString(),
      messageType: 'text'
    };

    // Add to state immediately for instant feedback
    if (!state.messagesByGroupId[state.selectedGroupId]) {
      state.messagesByGroupId[state.selectedGroupId] = [];
    }
    state.messagesByGroupId[state.selectedGroupId].push(optimisticMessage);

    // Render immediately
    renderMessages();

    // Clear input
    elements.messageInput.value = '';

    // Send via socket with proper data structure
    window.socketClient.sendMessage(state.selectedGroupId, {
      content: content,
      messageType: 'text'
    });

    console.log('[WhatsApp Groups] Message sent and displayed optimistically');

  } catch (error) {
    console.error('[WhatsApp Groups] Error sending message:', error);
    showError('Failed to send message');
  }
}

// ============================================
// JOBS
// ============================================

async function loadJobs(groupId) {
  try {
    console.log('[WhatsApp Groups] Loading jobs for group:', groupId);

    // Check if sharedJobsAPI is available
    if (!window.sharedJobsAPI) {
      console.error('[WhatsApp Groups] sharedJobsAPI not available!');
      state.jobsByGroupId[groupId] = [];
      renderJobs();
      return;
    }

    const jobs = await window.sharedJobsAPI.getSharedJobs(groupId);
    console.log('[WhatsApp Groups] API returned jobs:', jobs);
    console.log('[WhatsApp Groups] Jobs count:', jobs ? jobs.length : 0);

    state.jobsByGroupId[groupId] = jobs || [];

    // Update count
    if (elements.jobsCount) {
      elements.jobsCount.textContent = (jobs || []).length;
    }

    renderJobs();

  } catch (error) {
    console.error('[WhatsApp Groups] Error loading jobs:', error);
    state.jobsByGroupId[groupId] = [];
    renderJobs();
  }
}

function renderJobs() {
  console.log('[WhatsApp Groups] renderJobs called');
  console.log('[WhatsApp Groups] elements.jobsList exists:', !!elements.jobsList);
  console.log('[WhatsApp Groups] state.selectedGroupId:', state.selectedGroupId);

  if (!elements.jobsList) {
    console.error('[WhatsApp Groups] jobsList element not found!');
    return;
  }

  let jobs = state.jobsByGroupId[state.selectedGroupId] || [];
  console.log('[WhatsApp Groups] Jobs to render:', jobs.length, jobs);

  // Apply search filter
  if (state.jobsSearchQuery) {
    const query = state.jobsSearchQuery.toLowerCase();
    jobs = jobs.filter(job => {
      const company = (job.company || '').toLowerCase();
      const title = (job.title || '').toLowerCase();
      const location = (job.location || '').toLowerCase();

      return company.includes(query) ||
             title.includes(query) ||
             location.includes(query);
    });
  }

  // Apply sorting
  jobs = [...jobs]; // Create a copy to avoid mutating original
  if (state.jobsSortOrder === 'newest') {
    jobs.sort((a, b) => new Date(b.sharedAt || 0) - new Date(a.sharedAt || 0));
  } else {
    jobs.sort((a, b) => new Date(a.sharedAt || 0) - new Date(b.sharedAt || 0));
  }

  if (jobs.length === 0) {
    const message = state.jobsSearchQuery
      ? `No jobs found matching "${state.jobsSearchQuery}"`
      : 'No jobs shared yet';
    elements.jobsList.innerHTML = `
      <div class="empty-state-small">
        <p>${message}</p>
      </div>
    `;
    return;
  }

  const html = jobs.map(job => createJobCard(job)).join('');
  console.log('[WhatsApp Groups] Generated HTML length:', html.length);
  elements.jobsList.innerHTML = html;

  // Attach click handlers to job cards
  attachJobCardClickHandlers();
  console.log('[WhatsApp Groups] Jobs rendered successfully');
}

function attachJobCardClickHandlers() {
  const jobCards = elements.jobsList.querySelectorAll('.job-card');
  jobCards.forEach(card => {
    // Handle job action buttons
    const actionButtons = card.querySelectorAll('.job-action-btn');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const action = btn.dataset.action;
        const jobId = card.dataset.jobId;

        if (action === 'share') {
          handleShareJob(jobId);
        } else if (action === 'save') {
          handleSaveJob(jobId, card);
        } else if (action === 'view') {
          handleViewJob(jobId);
        }
        // Open link is handled by anchor tag directly
      });
    });

    // Handle card click (only when not clicking action buttons)
    card.addEventListener('click', (e) => {
      // Don't open page if clicking on action buttons or links
      if (e.target.closest('.job-action-btn')) {
        return;
      }

      const jobId = card.dataset.jobId;
      // Navigate to shared job detail page
      handleViewJob(jobId);
    });
  });
}

function handleShareJob(jobId) {
  showShareJobModal();
}

function handleSaveJob(jobId, cardElement) {
  // Toggle save state
  const saveBtn = cardElement.querySelector('[data-action="save"]');
  if (saveBtn) {
    const isSaved = saveBtn.classList.toggle('saved');

    if (isSaved) {
      // Fill the bookmark icon
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      saveBtn.style.color = '#2383e2';
      if (window.globalNotifications) {
        window.globalNotifications.showNotionToast('Job saved!', 'success', 2000);
      }
    } else {
      // Outline the bookmark icon
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      saveBtn.style.color = '';
      if (window.globalNotifications) {
        window.globalNotifications.showNotionToast('Job unsaved', 'info', 2000);
      }
    }
  }
}

function handleViewJob(jobId) {
  window.location.href = `shared-job-detail.html?jobId=${jobId}&groupId=${state.selectedGroupId}`;
}

function createJobCard(sharedJob) {
  const job = sharedJob.jobId || sharedJob;
  const sharedByObj = sharedJob.sharedBy || {};
  const sharedBy = sharedByObj.name ||
    (sharedByObj.firstName && sharedByObj.lastName ? `${sharedByObj.firstName} ${sharedByObj.lastName}` :
    (sharedByObj.firstName || sharedByObj.email || 'Someone'));
  const sharedAt = sharedJob.sharedAt ? formatTimeAgo(sharedJob.sharedAt) : '';

  // Company logo initial
  const companyInitial = (job.company || 'C').charAt(0).toUpperCase();

  // Format salary
  const salaryText = job.salary ? `💰 ${escapeHtml(job.salary)}` : '';

  // Format deadline
  const deadlineText = job.applicationDeadline
    ? `⏰ Deadline: ${formatDate(job.applicationDeadline)}`
    : '';

  // Job description (truncated)
  const description = job.description
    ? (job.description.length > 150
        ? escapeHtml(job.description.substring(0, 150)) + '...'
        : escapeHtml(job.description))
    : '';

  return `
    <div class="job-card" data-job-id="${job._id}">
      <!-- Job Header -->
      <div class="job-card-header">
        <div class="job-company-logo">${companyInitial}</div>
        <div class="job-card-info">
          <h3 class="job-title">${escapeHtml(job.position || job.title || 'Unknown Position')}</h3>
          <p class="job-company">${escapeHtml(job.company || 'Unknown Company')}</p>
        </div>
      </div>

      <!-- Job Details -->
      <div class="job-details">
        ${job.location ? `<div class="job-detail-item">📍 ${escapeHtml(job.location)}</div>` : ''}
        ${job.workType ? `<div class="job-detail-item">💼 ${escapeHtml(job.workType)}</div>` : ''}
        ${job.jobType ? `<div class="job-detail-item">🏢 ${escapeHtml(job.jobType)}</div>` : ''}
        ${salaryText ? `<div class="job-detail-item">${salaryText}</div>` : ''}
      </div>

      <!-- Description -->
      ${description ? `<div class="job-description">${description}</div>` : ''}

      <!-- Additional Info -->
      <div class="job-additional-info">
        ${job.status ? `<span class="job-status-badge status-${job.status.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(job.status)}</span>` : ''}
        ${deadlineText ? `<span class="job-deadline">${deadlineText}</span>` : ''}
      </div>

      <!-- Footer -->
      <div class="job-card-footer">
        <div class="job-shared-info">
          <span class="job-shared-by">Shared by ${escapeHtml(sharedBy)}</span>
          ${sharedAt ? `<span class="job-shared-time"> • ${sharedAt}</span>` : ''}
        </div>
        <div class="job-actions">
          <button class="job-action-btn" data-action="share" title="Share Job">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
          <button class="job-action-btn" data-action="save" title="Save Job">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
          <button class="job-action-btn" data-action="view" title="View Details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          ${job.link ? `
          <a href="${escapeHtml(job.link)}" target="_blank" class="job-action-btn" title="Open Job Posting">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ============================================
// MEMBERS
// ============================================

async function loadMembers(groupId) {
  try {
    console.log('[WhatsApp Groups] Loading members for group:', groupId);

    // Fetch members using the proper API endpoint
    const members = await window.groupAPI.getMembers(groupId);
    state.membersByGroupId[groupId] = members;

    console.log('[WhatsApp Groups] Loaded', members.length, 'members');

    // Update member count in UI
    updateMemberCount(members.length);

    renderMembers();

  } catch (error) {
    console.error('[WhatsApp Groups] Error loading members:', error);
    state.membersByGroupId[groupId] = [];
    updateMemberCount(0);
    renderMembers();
  }
}

function updateMemberCount(count) {
  // Update member count in header
  if (elements.groupMeta) {
    const currentText = elements.groupMeta.textContent || '';
    const isPublic = currentText.includes('Public') || currentText.includes('🌍');
    const typeIcon = isPublic ? '🌍' : '🔒';
    const typeText = isPublic ? 'Public' : 'Private';
    elements.groupMeta.textContent = `${count} ${count === 1 ? 'member' : 'members'} • ${typeIcon} ${typeText}`;
  }

  // Update member count badge in tab
  if (elements.membersCount) {
    elements.membersCount.textContent = count;
  }
}

function renderMembers() {
  if (!elements.membersList) return;

  const members = state.membersByGroupId[state.selectedGroupId] || [];

  if (members.length === 0) {
    elements.membersList.innerHTML = `
      <div class="empty-state-small">
        <p>No members found</p>
      </div>
    `;
    return;
  }

  // Check if current user is admin
  const currentUserEmail = state.currentUser?.email;
  const currentUserMember = members.find(m => m.email === currentUserEmail);
  const isCurrentUserAdmin = currentUserMember?.role === 'admin';

  elements.membersList.innerHTML = members.map(member => createMemberItem(member, isCurrentUserAdmin, currentUserEmail)).join('');

  // Add event delegation for remove buttons
  attachMemberRemoveHandlers();
}

function createMemberItem(member, isCurrentUserAdmin, currentUserEmail) {
  // Backend returns: { userId, name, email, role, stats, joinedAt }
  const name = member.name || member.email || 'Unknown';
  const initial = name.charAt(0).toUpperCase();
  const role = member.role || 'member';
  const isCurrentUser = member.email === currentUserEmail;

  // Show remove button only if:
  // 1. Current user is admin
  // 2. This is not the current user themselves
  const showRemoveBtn = isCurrentUserAdmin && !isCurrentUser;

  return `
    <div class="member-item" data-member-id="${member.userId || ''}" data-member-email="${escapeHtml(member.email || '')}">
      <div class="member-avatar">${initial}</div>
      <div class="member-info">
        <p class="member-name">${escapeHtml(name)}</p>
        <p class="member-email">${escapeHtml(member.email || '')}</p>
      </div>
      <span class="member-role">${escapeHtml(role)}</span>
      ${showRemoveBtn ? `
        <button class="btn-remove-member" title="Remove member">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Attach event handlers for member remove buttons
 */
function attachMemberRemoveHandlers() {
  if (!elements.membersList) return;

  const removeButtons = elements.membersList.querySelectorAll('.btn-remove-member');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const memberItem = btn.closest('.member-item');
      const memberId = memberItem.dataset.memberId;
      const memberEmail = memberItem.dataset.memberEmail;

      if (memberId && state.selectedGroupId) {
        await handleRemoveMember(memberId, memberEmail);
      }
    });
  });
}

/**
 * Handle removing a member from the group
 */
async function handleRemoveMember(userId, userEmail) {
  try {
    const confirmMessage = `Are you sure you want to remove ${userEmail} from this group?`;
    if (!confirm(confirmMessage)) return;

    console.log('[WhatsApp Groups] Removing member:', userId, 'from group:', state.selectedGroupId);

    // Call API to remove member
    await window.groupAPI.removeMember(state.selectedGroupId, userId);

    showSuccess('Member removed successfully');

    // Reload members list
    await loadMembers(state.selectedGroupId);

    // Reload groups list to update member count
    await loadMyGroups();

  } catch (error) {
    console.error('[WhatsApp Groups] Error removing member:', error);
    showError('Failed to remove member: ' + error.message);
  }
}

// ============================================
// TABS
// ============================================

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeTabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (activeTabBtn) {
    activeTabBtn.classList.add('active');
  }

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const activeContent = document.getElementById(`content-${tabName}`);
  if (activeContent) {
    activeContent.classList.add('active');
  }

  // Scroll messages to bottom when switching to chat
  if (tabName === 'chat') {
    setTimeout(scrollMessagesToBottom, 100);
  }
}

function toggleChatVisibility() {
  const messagesContainer = document.getElementById('messages-container');
  const messageInputContainer = document.querySelector('.message-input-container');
  const toggleBtn = document.getElementById('toggle-chat-btn');

  if (state.chatHidden) {
    // Hide only text messages, keep job postings visible
    if (messagesContainer) messagesContainer.classList.add('hide-text-messages');
    if (messageInputContainer) messageInputContainer.style.display = 'none';

    // Update button
    if (toggleBtn) {
      toggleBtn.classList.add('chat-hidden');
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
        Show Messages
      `;
    }
  } else {
    // Show all messages
    if (messagesContainer) messagesContainer.classList.remove('hide-text-messages');
    if (messageInputContainer) messageInputContainer.style.display = '';

    // Update button
    if (toggleBtn) {
      toggleBtn.classList.remove('chat-hidden');
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Hide Messages
      `;
    }
  }
}

// ============================================
// MODALS
// ============================================

function showCreateModal() {
  if (elements.createModal) {
    elements.createModal.style.display = 'flex';
  }
}

function hideCreateModal() {
  if (elements.createModal) {
    elements.createModal.style.display = 'none';
  }
  if (elements.createForm) {
    elements.createForm.reset();
  }
}

async function handleCreateGroup(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const groupData = {
    name: formData.get('group-name-input') || document.getElementById('group-name-input')?.value,
    description: formData.get('group-description-input') || document.getElementById('group-description-input')?.value,
    type: formData.get('group-type') || 'public'
  };

  try {
    console.log('[WhatsApp Groups] Creating group:', groupData);

    const newGroup = await window.groupAPI.createGroup(groupData);

    console.log('[WhatsApp Groups] Group created:', newGroup);

    // Reload groups
    await loadMyGroups();

    // Select the new group
    selectGroup(newGroup._id);

    // Hide modal
    hideCreateModal();

    showSuccess('Group created successfully!');

  } catch (error) {
    console.error('[WhatsApp Groups] Error creating group:', error);
    showError('Failed to create group');
  }
}

function showDiscoverModal() {
  if (elements.discoverModal) {
    elements.discoverModal.style.display = 'flex';
  }
  loadPublicGroups();
}

function hideDiscoverModal() {
  if (elements.discoverModal) {
    elements.discoverModal.style.display = 'none';
  }
}

async function loadPublicGroups(search = '') {
  try {
    const groups = await window.groupAPI.getPublicGroups(search);

    // Filter out groups user is already in
    const availableGroups = groups.filter(g =>
      !state.groupsList.find(myGroup => myGroup._id === g._id)
    );

    if (!elements.discoverGroupsList) return;

    if (availableGroups.length === 0) {
      elements.discoverGroupsList.innerHTML = `
        <div class="empty-state-small">
          <p>No public groups found</p>
        </div>
      `;
      return;
    }

    elements.discoverGroupsList.innerHTML = availableGroups.map(group => createDiscoverGroupCard(group)).join('');

    // Attach join handlers
    elements.discoverGroupsList.querySelectorAll('.btn-join-group').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.groupId;
        await joinGroup(groupId);
      });
    });

  } catch (error) {
    console.error('[WhatsApp Groups] Error loading public groups:', error);
  }
}

function createDiscoverGroupCard(group) {
  const iconLetter = group.name.charAt(0).toUpperCase();
  const memberCount = group.stats?.memberCount || 0;

  return `
    <div class="group-card">
      <div class="group-card-header">
        <div class="group-list-avatar">${iconLetter}</div>
        <div class="group-list-info">
          <div class="group-list-name">${escapeHtml(group.name)}</div>
          <div class="group-list-meta">
            <span class="group-type-icon" title="Public Group - Anyone can join">🌍 Public</span>
            <span class="group-member-count">${memberCount} members</span>
          </div>
        </div>
        <button class="btn-primary btn-join-group" data-group-id="${group._id}">Join</button>
      </div>
      ${group.description ? `<p style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">${escapeHtml(group.description)}</p>` : ''}
    </div>
  `;
}

async function joinGroup(groupId) {
  try {
    await window.groupAPI.joinGroup(groupId);

    showSuccess('Joined group successfully!');

    // Reload groups
    await loadMyGroups();

    // Select the joined group
    selectGroup(groupId);

    // Hide discover modal
    hideDiscoverModal();

  } catch (error) {
    console.error('[WhatsApp Groups] Error joining group:', error);
    showError('Failed to join group');
  }
}

// ============================================
// INVITE LINK
// ============================================

// Debounce flag for invite link generation
let isGeneratingInvite = false;

async function showInviteLink() {
  if (!state.selectedGroupId) return;

  // Prevent multiple rapid clicks
  if (isGeneratingInvite) {
    console.log('[WhatsApp Groups] Already generating invite link, please wait...');
    return;
  }

  try {
    isGeneratingInvite = true;
    console.log('[WhatsApp Groups] Generating invite link for group:', state.selectedGroupId);

    // Generate invite link via API
    const response = await fetch(
      `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${state.selectedGroupId}/invite`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.authManager.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to generate invite link');
    }

    const data = await response.json();
    const inviteCode = data.data?.inviteCode || data.inviteCode;

    if (!inviteCode) {
      throw new Error('No invite code received');
    }

    // Create invite URL with both groupId and inviteCode
    const inviteUrl = `${window.location.origin}/tracking-dashboard/groups.html?groupId=${state.selectedGroupId}&code=${inviteCode}`;

    console.log('[WhatsApp Groups] Invite link generated:', inviteUrl);

    // Show invite link in modal
    if (elements.inviteLinkInput) {
      elements.inviteLinkInput.value = inviteUrl;
    }
    if (elements.inviteLinkModal) {
      elements.inviteLinkModal.style.display = 'flex';
    }
    // Hide success message initially
    if (elements.copySuccess) {
      elements.copySuccess.style.display = 'none';
    }

  } catch (error) {
    console.error('[WhatsApp Groups] Error generating invite link:', error);
    alert('Error: ' + error.message);
  } finally {
    // Reset flag after 2 seconds to allow retry
    setTimeout(() => {
      isGeneratingInvite = false;
    }, 2000);
  }
}

// ============================================
// SOCKET LISTENERS
// ============================================

function setupSocketListeners() {
  if (!window.socketClient) {
    console.warn('[WhatsApp Groups] Socket client not available');
    return;
  }

  console.log('[WhatsApp Groups] 🔔 Registering socket event listeners...');

  // New message
  window.socketClient.on('new-message', (data) => {
    console.log('[WhatsApp Groups] 📨 New message received:', data);

    const groupId = data.groupId;
    const newMessage = data.message;

    // Initialize messages array if needed
    if (!state.messagesByGroupId[groupId]) {
      state.messagesByGroupId[groupId] = [];
    }

    // Check if this is our own message (already added optimistically)
    const isOwnMessage = newMessage.userId?._id === state.currentUser?._id ||
                         newMessage.userId === state.currentUser?._id;

    if (isOwnMessage) {
      // Replace the optimistic message with the real one from server
      const messages = state.messagesByGroupId[groupId];
      const tempIndex = messages.findIndex(msg =>
        msg._id.toString().startsWith('temp-') &&
        msg.content === newMessage.content &&
        Math.abs(new Date(msg.createdAt) - new Date(newMessage.createdAt)) < 5000 // Within 5 seconds
      );

      if (tempIndex !== -1) {
        // Replace temp message with real one
        messages[tempIndex] = newMessage;
        console.log('[WhatsApp Groups] Replaced optimistic message with server message');
      } else {
        // Temp message not found, just add it (shouldn't happen normally)
        messages.push(newMessage);
      }
    } else {
      // Message from another user, just add it
      state.messagesByGroupId[groupId].push(newMessage);
      console.log('[WhatsApp Groups] Added message from another user');

      // Show smart notification for messages from others
      // Skip notifications for job_share messages (they have their own job-shared notification)
      if (newMessage.messageType === 'job_share') {
        console.log('[WhatsApp Groups] ⏭️ Skipping chat notification for job_share message (handled by job-shared event)');
        return;
      }

      if (window.smartNotifications) {
        const group = state.groupsList.find(g => g._id === groupId);

        // Try multiple ways to get sender name
        let senderName = 'Someone';

        // Check sender object first
        if (newMessage.sender?.name) {
          senderName = newMessage.sender.name;
        } else if (newMessage.sender?.userName) {
          senderName = newMessage.sender.userName;
        } else if (newMessage.sender?.firstName || newMessage.sender?.lastName) {
          senderName = `${newMessage.sender.firstName || ''} ${newMessage.sender.lastName || ''}`.trim();
        }
        // Check userId object
        else if (newMessage.userId?.name) {
          senderName = newMessage.userId.name;
        } else if (newMessage.userId?.userName) {
          senderName = newMessage.userId.userName;
        } else if (newMessage.userId?.firstName || newMessage.userId?.lastName) {
          senderName = `${newMessage.userId.firstName || ''} ${newMessage.userId.lastName || ''}`.trim();
        }
        // If userId is just an ID string, try to find the user in members
        else if (typeof newMessage.userId === 'string') {
          const member = state.membersByGroupId[groupId]?.find(m => m._id === newMessage.userId || m.userId?._id === newMessage.userId);
          if (member) {
            senderName = member.name || member.userName ||
                        `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                        member.userId?.name || member.userId?.userName ||
                        `${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`.trim() ||
                        'Someone';
          }
        }

        console.log('[WhatsApp Groups] 🔍 Notification sender debug:', {
          senderName,
          'newMessage.sender': newMessage.sender,
          'newMessage.userId': newMessage.userId,
          'newMessage full': newMessage
        });

        const preview = newMessage.content.substring(0, 100);
        const groupName = group?.name || 'Group';

        window.smartNotifications.showChatNotification({
          senderName: senderName,
          message: preview,
          groupName: groupName,
          groupId: groupId,
          messageId: newMessage._id
        });
      }
    }

    // Re-render if this is the selected group
    if (groupId === state.selectedGroupId) {
      renderMessages();
    }

    // Update group list (would show new message preview)
    renderGroupsList();
  });

  // Job shared
  window.socketClient.on('job-shared', (data) => {
    console.log('[WhatsApp Groups] 🔔🔔🔔 JOB-SHARED EVENT RECEIVED 🔔🔔🔔');
    console.log('[WhatsApp Groups] Job shared data:', data);
    console.log('[WhatsApp Groups] Stack trace:', new Error().stack);

    const groupId = data.groupId;

    // Show smart notification for job shares
    if (window.smartNotifications && data.sharedBy) {
      const group = state.groupsList.find(g => g._id === groupId);

      // Get sharer name
      let sharerName = 'Someone';
      if (data.sharedBy.name) {
        sharerName = data.sharedBy.name;
      } else if (data.sharedBy.userName) {
        sharerName = data.sharedBy.userName;
      } else if (data.sharedBy.firstName || data.sharedBy.lastName) {
        sharerName = `${data.sharedBy.firstName || ''} ${data.sharedBy.lastName || ''}`.trim();
      }

      // Check if this is our own share
      const isOwnShare = data.sharedBy._id === state.currentUser?._id ||
                         data.sharedBy.userId === state.currentUser?._id;

      console.log('[WhatsApp Groups] 🔍 Notification check:', {
        sharerName,
        isOwnShare,
        'currentUser._id': state.currentUser?._id,
        'sharedBy._id': data.sharedBy._id,
        'sharedBy.userId': data.sharedBy.userId
      });

      if (!isOwnShare) {
        console.log('[WhatsApp Groups] ✅ CALLING showJobSharedNotification');
        window.smartNotifications.showJobSharedNotification({
          sharedBy: sharerName,
          jobTitle: data.job?.title || 'Job',
          company: data.job?.company || '',
          salary: data.job?.salary || '',
          location: data.job?.location || '',
          groupName: group?.name || 'Group',
          groupId: groupId,
          jobId: data.job?._id || data.jobId
        });
      } else {
        console.log('[WhatsApp Groups] ⏭️ SKIPPING notification (own share)');
      }
    }

    // Reload jobs for this group
    if (groupId === state.selectedGroupId) {
      loadJobs(groupId);
    }
  });

  // Member joined
  window.socketClient.on('member-joined', (data) => {
    console.log('[WhatsApp Groups] Member joined:', data);

    const groupId = data.groupId;

    // Reload members for this group
    if (groupId === state.selectedGroupId) {
      loadMembers(groupId);
    }

    // Reload groups list to update member count in sidebar
    loadMyGroups();
  });

  // Socket connected/reconnected - rejoin current group room
  window.socketClient.on('socket-connected', () => {
    console.log('[WhatsApp Groups] Socket connected/reconnected');

    // Rejoin the current group room if one is selected
    if (state.selectedGroupId) {
      console.log('[WhatsApp Groups] Rejoining group room:', state.selectedGroupId);
      window.socketClient.joinGroup(state.selectedGroupId);
    }
  });

  // Socket disconnected
  window.socketClient.on('socket-disconnected', (data) => {
    console.warn('[WhatsApp Groups] Socket disconnected:', data.reason);
  });

  console.log('[WhatsApp Groups] ✅ Socket event listeners registered successfully');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMessageTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  // Format as date
  return date.toLocaleDateString();
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Less than 30 days
  if (diff < 2592000000) {
    const weeks = Math.floor(diff / 604800000);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }

  // Format as date
  return date.toLocaleDateString();
}

function formatDate(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function showSuccess(message) {
  console.log('[WhatsApp Groups] Success:', message);
  if (window.globalNotifications) {
    window.globalNotifications.showNotionToast(message, 'success');
  } else {
    alert(message);
  }
}

function showError(message) {
  console.error('[WhatsApp Groups] Error:', message);
  if (window.globalNotifications) {
    window.globalNotifications.showNotionToast(message, 'error');
  } else {
    alert('Error: ' + message);
  }
}

// ============================================
// INVITE LINK MODAL FUNCTIONS
// ============================================

function hideInviteLinkModal() {
  if (elements.inviteLinkModal) {
    elements.inviteLinkModal.style.display = 'none';
  }
  if (elements.copySuccess) {
    elements.copySuccess.style.display = 'none';
  }
}

async function copyInviteLink() {
  const inviteUrl = elements.inviteLinkInput?.value;
  if (!inviteUrl) return;

  try {
    await navigator.clipboard.writeText(inviteUrl);

    // Show success message
    if (elements.copySuccess) {
      elements.copySuccess.style.display = 'flex';

      // Hide after 3 seconds
      setTimeout(() => {
        if (elements.copySuccess) {
          elements.copySuccess.style.display = 'none';
        }
      }, 3000);
    }

    console.log('[WhatsApp Groups] Invite link copied to clipboard');
  } catch (err) {
    console.error('[WhatsApp Groups] Failed to copy:', err);
    alert('Failed to copy link. Please copy it manually.');
  }
}

// ============================================
// JOIN GROUP MODAL FUNCTIONS
// ============================================

function showJoinGroupModal() {
  if (elements.joinGroupModal) {
    elements.joinGroupModal.style.display = 'flex';
  }
  if (elements.joinLinkInput) {
    elements.joinLinkInput.value = '';
  }
}

function hideJoinGroupModal() {
  if (elements.joinGroupModal) {
    elements.joinGroupModal.style.display = 'none';
  }
}

async function handleJoinByLink() {
  const inviteUrl = elements.joinLinkInput?.value?.trim();

  if (!inviteUrl) {
    alert('Please paste an invite link');
    return;
  }

  try {
    // Parse the invite URL to extract groupId and invite code
    const url = new URL(inviteUrl);
    const groupId = url.searchParams.get('groupId');
    const inviteCode = url.searchParams.get('code');

    if (!groupId || !inviteCode) {
      throw new Error('Invalid invite link format. Please make sure you copied the complete link.');
    }

    console.log('[WhatsApp Groups] Joining group:', groupId, 'with invite code:', inviteCode);

    // Join the group using the API
    const response = await fetch(
      `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${groupId}/join`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${window.authManager.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteCode })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to join group');
    }

    const data = await response.json();
    const group = data.data || data;

    console.log('[WhatsApp Groups] Successfully joined group:', group);

    // Hide modal
    hideJoinGroupModal();

    // Reload groups and select the new group
    await loadMyGroups();
    selectGroup(groupId);

    showSuccess(`Successfully joined "${group.name}"!`);

  } catch (error) {
    console.error('[WhatsApp Groups] Error joining by link:', error);
    alert(error.message || 'Failed to join group. Please check the invite link and try again.');
  }
}

// ============================================
// JOB DETAILS MODAL FUNCTIONS
// ============================================

/**
 * Parse job description into Notion-style sections with proper headings
 */
function parseJobDescription(description) {
  if (!description) return '';

  // Common section heading patterns (case-insensitive, flexible matching)
  const headingPatterns = [
    /^About The Company/i,
    /^About The Role/i,
    /^About the role/i,
    /^The Role/i,
    /^Requirements?$/i,
    /^Required Skills/i,
    /^Desired Skills/i,
    /^Skills and Experience/i,
    /^Experience/i,
    /^Qualifications?$/i,
    /^Responsibilities/i,
    /^What [Yy]ou'?ll [Dd]o/i,
    /^What [Ww]e'?re [Ll]ooking [Ff]or/i,
    /^Perks & Benefits/i,
    /^Benefits?$/i,
    /^Compensation$/i,
    /^Salary$/i,
    /^Nice to [Hh]ave/i,
    /^Bonus [Pp]oints/i
  ];

  let sections = [];
  let currentSection = null;
  let currentContent = [];

  const lines = description.split('\n');

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue; // Skip empty lines

    // Check if this line matches any heading pattern
    let isHeading = false;
    for (let pattern of headingPatterns) {
      if (pattern.test(trimmedLine)) {
        // Save previous section
        if (currentSection !== null) {
          sections.push({
            heading: currentSection,
            content: currentContent.join('\n')
          });
        }
        currentSection = trimmedLine;
        currentContent = [];
        isHeading = true;
        break;
      }
    }

    if (!isHeading) {
      currentContent.push(trimmedLine);
    }
  }

  // Add final section
  if (currentSection !== null) {
    sections.push({
      heading: currentSection,
      content: currentContent.join('\n')
    });
  } else if (currentContent.length > 0) {
    // No headings found, treat entire content as one section
    sections.push({
      heading: '',
      content: currentContent.join('\n')
    });
  }

  // Format sections into HTML
  let formattedHtml = '';
  for (let section of sections) {
    formattedHtml += formatSection(section.heading, section.content);
  }

  return formattedHtml || `<div style="font-size: 14px; color: var(--text-secondary); line-height: 1.7; white-space: pre-wrap;">${escapeHtml(description)}</div>`;
}

/**
 * Format a section with Notion-style heading and content
 */
function formatSection(heading, content) {
  if (!heading && !content) return '';

  let html = '';

  if (heading) {
    html += `<h3 style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 20px 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #e5e5e5;">${escapeHtml(heading)}</h3>`;
  }

  if (content) {
    // Format content with proper line breaks and spacing
    html += `<div style="font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px; white-space: pre-line;">${escapeHtml(content)}</div>`;
  }

  return html;
}

function openJobDetailsModal(sharedJob) {
  const job = sharedJob.jobId || sharedJob;
  const sharedByObj = sharedJob.sharedBy || {};
  const sharedBy = sharedByObj.name ||
    (sharedByObj.firstName && sharedByObj.lastName ? `${sharedByObj.firstName} ${sharedByObj.lastName}` :
    (sharedByObj.firstName || sharedByObj.email || 'Someone'));
  const sharedAt = sharedJob.sharedAt ? formatTimeAgo(sharedJob.sharedAt) : '';
  const companyInitial = (job.company || 'C').charAt(0).toUpperCase();

  // Format description using linkedInCleaner for proper formatting
  let descriptionHtml = '';
  if (window.linkedInCleaner) {
    if (job.descriptionHtml) {
      // Has HTML - clean and format it with proper headings
      descriptionHtml = window.linkedInCleaner.format(job.descriptionHtml);
    } else if (job.description) {
      // Plain text - structure it into paragraphs and headings
      descriptionHtml = window.linkedInCleaner.structureContent(escapeHtml(job.description));
    }
  } else {
    // Fallback to old parser if linkedInCleaner not available
    descriptionHtml = parseJobDescription(job.description);
  }

  // Build the modal content
  const modalContent = `
    <!-- Job Header -->
    <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #F2F2F1; color: #3A3A3A; border: 1px solid #ECECEC; border-radius: 12px; font-size: 28px; font-weight: 500; flex-shrink: 0;">
        ${companyInitial}
      </div>
      <div style="flex: 1; min-width: 0;">
        <h2 style="font-size: 20px; font-weight: 600; color: var(--text-primary); margin: 0 0 8px 0;">
          ${escapeHtml(job.position || job.title || 'Unknown Position')}
        </h2>
        <div style="font-size: 16px; color: var(--text-secondary); margin-bottom: 8px;">
          ${escapeHtml(job.company || 'Unknown Company')}
        </div>
        <div style="font-size: 13px; color: var(--text-muted);">
          Shared by ${escapeHtml(sharedBy)}${sharedAt ? ` • ${sharedAt}` : ''}
        </div>
      </div>
    </div>

    <!-- Job Details Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; padding: 20px; background: var(--bg-soft); border-radius: 8px;">
      ${job.location ? `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Location</div>
          <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHtml(job.location)}</div>
        </div>
      ` : ''}
      ${job.workType ? `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Work Type</div>
          <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHtml(job.workType)}</div>
        </div>
      ` : ''}
      ${job.jobType ? `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Job Type</div>
          <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHtml(job.jobType)}</div>
        </div>
      ` : ''}
      ${job.salary ? `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Salary</div>
          <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${escapeHtml(job.salary)}</div>
        </div>
      ` : ''}
      ${job.status ? `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Status</div>
          <div style="font-size: 14px;">
            <span class="job-status-badge status-${job.status.toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(job.status)}</span>
          </div>
        </div>
      ` : ''}
      ${job.applicationDeadline ? `
        <div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Deadline</div>
          <div style="font-size: 14px; color: var(--text-primary); font-weight: 500;">${formatDate(job.applicationDeadline)}</div>
        </div>
      ` : ''}
    </div>

    <!-- Job Description with Notion-style sections -->
    ${descriptionHtml ? `
      <div class="job-description formatted" style="margin-bottom: 24px;">
        ${descriptionHtml}
      </div>
    ` : ''}

    <!-- Actions -->
    <div style="display: flex; gap: 12px; padding-top: 20px; border-top: 1px solid var(--border-subtle);">
      ${job.link ? `
        <a href="${escapeHtml(job.link)}" target="_blank" class="btn-primary" style="flex: 1; text-align: center; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          View Job Posting
        </a>
      ` : ''}
      <button class="btn-secondary" onclick="closeJobDetailsModal()" style="flex: 1;">Close</button>
    </div>
  `;

  // Insert content and show modal
  if (elements.jobDetailsContent) {
    elements.jobDetailsContent.innerHTML = modalContent;
  }
  if (elements.jobDetailsModal) {
    elements.jobDetailsModal.style.display = 'flex';
  }

  console.log('[WhatsApp Groups] Job details modal opened');
}

function closeJobDetailsModal() {
  if (elements.jobDetailsModal) {
    elements.jobDetailsModal.style.display = 'none';
  }
  console.log('[WhatsApp Groups] Job details modal closed');
}

// ============================================
// SHARE JOB MODAL FUNCTIONS
// ============================================

let userTrackedJobs = [];

async function showShareJobModal() {
  if (!state.selectedGroupId) {
    showError('Please select a group first');
    return;
  }

  console.log('[WhatsApp Groups] Opening share job modal');

  // Create modal if it doesn't exist
  let modal = document.getElementById('share-job-modal-wa');
  if (!modal) {
    modal = createShareJobModal();
    document.body.appendChild(modal);
  }

  // Show modal
  modal.style.display = 'flex';

  // Load user's tracked jobs
  await loadUserTrackedJobs();
}

function createShareJobModal() {
  const modal = document.createElement('div');
  modal.id = 'share-job-modal-wa';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal modal-large">
      <div class="modal-header">
        <h3>Share a Job</h3>
        <button class="btn-close-modal" id="close-share-job-modal-wa">×</button>
      </div>
      <div class="modal-body">
        <div class="sidebar-search" style="margin-bottom: 16px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="text" id="share-job-search-wa" placeholder="Search your jobs..." autocomplete="off">
        </div>
        <div id="share-jobs-list-wa" style="max-height: 400px; overflow-y: auto;">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading your jobs...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add event listeners
  modal.querySelector('#close-share-job-modal-wa').addEventListener('click', hideShareJobModal);
  modal.querySelector('#share-job-search-wa').addEventListener('input', (e) => {
    filterShareJobList(e.target.value);
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideShareJobModal();
    }
  });

  return modal;
}

function hideShareJobModal() {
  const modal = document.getElementById('share-job-modal-wa');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function loadUserTrackedJobs() {
  const listContainer = document.getElementById('share-jobs-list-wa');
  if (!listContainer) return;

  try {
    // Get jobs from Chrome storage via job tracker
    if (window.jobTracker) {
      userTrackedJobs = await window.jobTracker.getJobs();
    } else {
      // Fallback: try to get from chrome storage directly
      userTrackedJobs = await new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['trackedJobs'], (result) => {
            resolve(result.trackedJobs || []);
          });
        } else {
          resolve([]);
        }
      });
    }

    console.log('[WhatsApp Groups] Loaded tracked jobs:', userTrackedJobs.length);

    renderShareJobList(userTrackedJobs);
  } catch (error) {
    console.error('[WhatsApp Groups] Error loading tracked jobs:', error);
    listContainer.innerHTML = `
      <div class="empty-state-small">
        <p>Failed to load your jobs</p>
      </div>
    `;
  }
}

function filterShareJobList(searchQuery) {
  const query = searchQuery.toLowerCase();
  const filtered = userTrackedJobs.filter(job => {
    const title = (job.title || job.position || '').toLowerCase();
    const company = (job.company || '').toLowerCase();
    return title.includes(query) || company.includes(query);
  });
  renderShareJobList(filtered);
}

function renderShareJobList(jobs) {
  const listContainer = document.getElementById('share-jobs-list-wa');
  if (!listContainer) return;

  if (!jobs || jobs.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state-small">
        <p>No jobs found in your tracker</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = jobs.map(job => {
    const companyInitial = (job.company || 'C').charAt(0).toUpperCase();
    return `
      <div class="share-job-item" data-job-id="${job.id || job._id}" style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 0.2s;">
        <div style="width: 40px; height: 40px; background: #F5F3EF; color: #3A3A3A; border: 1px solid #ECECEC; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 500; margin-right: 12px; flex-shrink: 0;">
          ${companyInitial}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 500; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(job.title || job.position || 'Unknown Position')}
          </div>
          <div style="font-size: 13px; color: var(--text-secondary);">
            ${escapeHtml(job.company || 'Unknown Company')}
          </div>
        </div>
        <button class="btn-primary btn-sm share-this-job-btn" style="margin-left: 12px; flex-shrink: 0;">Share</button>
      </div>
    `;
  }).join('');

  // Add hover effect
  listContainer.querySelectorAll('.share-job-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      item.style.background = 'var(--bg-soft)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
  });

  // Add click handlers for share buttons
  listContainer.querySelectorAll('.share-this-job-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const jobItem = btn.closest('.share-job-item');
      const jobId = jobItem.dataset.jobId;
      const job = userTrackedJobs.find(j => (j.id || j._id) === jobId);
      if (job) {
        await shareJobToCurrentGroup(job, btn);
      }
    });
  });
}

async function shareJobToCurrentGroup(job, button) {
  if (!state.selectedGroupId) {
    showError('No group selected');
    return;
  }

  try {
    console.log('[WhatsApp Groups] Sharing job to group:', state.selectedGroupId);

    button.disabled = true;
    button.textContent = 'Sharing...';

    const jobData = {
      company: job.company,
      title: job.title || job.position,
      position: job.title || job.position,
      description: job.description || '',
      descriptionHtml: job.descriptionHtml || '',
      location: job.location || '',
      salary: job.salary || '',
      workType: job.workType || '',
      link: job.linkedinUrl || job.jobUrl || job.link || '',
      linkedinUrl: job.linkedinUrl || '',
      jobUrl: job.jobUrl || '',
      linkedinJobId: job.linkedinJobId || '',
      source: job.source || 'Manual'
    };

    // Create SharedJob record via API
    let sharedJob = null;
    if (window.sharedJobsAPI) {
      sharedJob = await window.sharedJobsAPI.shareJob(state.selectedGroupId, jobData);
      console.log('[WhatsApp Groups] SharedJob record created:', sharedJob);
    }

    // Also send as chat message with sharedJobId
    if (window.socketClient && window.socketClient.isConnected) {
      // Get the shared job ID (could be _id or id depending on response format)
      const sharedJobId = sharedJob?._id || sharedJob?.id || null;
      console.log('[WhatsApp Groups] sharedJob full object:', sharedJob);
      console.log('[WhatsApp Groups] Extracted sharedJobId:', sharedJobId);

      window.socketClient.sendMessage(state.selectedGroupId, {
        content: 'Shared a job', // Notion-style: context only, no data duplication
        messageType: 'job_share',
        sharedJobId: sharedJobId,
        jobData: jobData
      });
      console.log('[WhatsApp Groups] Chat message sent with sharedJobId:', sharedJobId);
    }

    button.textContent = '✓ Shared';
    button.classList.add('shared');

    showSuccess('Job shared to group!');

    // Reload jobs list
    await loadJobs(state.selectedGroupId);

    // Close modal after delay
    setTimeout(() => {
      hideShareJobModal();
    }, 1000);

  } catch (error) {
    console.error('[WhatsApp Groups] Error sharing job:', error);
    showError(error.message || 'Failed to share job');
    button.disabled = false;
    button.textContent = 'Share';
  }
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

// Expose functions globally for notifications
window.selectGroup = selectGroup;
window.switchTab = switchTab;

// Wait for DOM and dependencies
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


