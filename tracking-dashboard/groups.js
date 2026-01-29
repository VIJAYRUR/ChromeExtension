/**
 * Groups View - Handles group listing, creation, and joining
 */

// State
let myGroups = [];
let publicGroups = [];
let currentGroupId = null;

// DOM Elements
const groupsPanel = document.getElementById('groups-panel');
const groupsPanelOverlay = document.getElementById('groups-panel-overlay');
const openGroupsPanelBtn = document.getElementById('open-groups-panel-btn');
const closeGroupsPanelBtn = document.getElementById('close-groups-panel-btn');
const myGroupsContainer = document.getElementById('my-groups-container');
const discoverGroupsContainer = document.getElementById('discover-groups-container');
const myGroupsCount = document.getElementById('my-groups-count');
const discoverSearch = document.getElementById('discover-search');

// Modals
const createGroupModal = document.getElementById('create-group-modal');
const joinGroupModal = document.getElementById('join-group-modal');

// Buttons
const createGroupBtn = document.getElementById('create-group-btn');
const createFirstGroupBtn = document.getElementById('create-first-group-btn');
const closeCreateGroupModal = document.getElementById('close-create-group-modal');
const cancelCreateGroup = document.getElementById('cancel-create-group');
const closeJoinGroupModal = document.getElementById('close-join-group-modal');
const cancelJoinGroup = document.getElementById('cancel-join-group');
const joinViaLinkBtn = document.getElementById('join-via-link-btn');
const joinLinkInput = document.getElementById('join-link-input');
const searchPublicGroupsBtn = document.getElementById('search-public-groups-btn');
const hidePublicGroupsBtn = document.getElementById('hide-public-groups-btn');
const publicGroupsList = document.getElementById('public-groups-list');

// Forms
const createGroupForm = document.getElementById('create-group-form');

/**
 * Initialize Groups Panel
 */
function initializeGroupsView() {
  // Open panel button
  if (openGroupsPanelBtn) {
    openGroupsPanelBtn.addEventListener('click', openGroupsPanel);
  }

  // Close panel button
  if (closeGroupsPanelBtn) {
    closeGroupsPanelBtn.addEventListener('click', closeGroupsPanel);
  }

  // Close on overlay click
  if (groupsPanelOverlay) {
    groupsPanelOverlay.addEventListener('click', closeGroupsPanel);
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && groupsPanel && groupsPanel.classList.contains('active')) {
      closeGroupsPanel();
    }
  });

  // Create group button handlers
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', showCreateGroupModal);
  }
  if (createFirstGroupBtn) {
    createFirstGroupBtn.addEventListener('click', showCreateGroupModal);
  }

  // Modal close handlers
  if (closeCreateGroupModal) {
    closeCreateGroupModal.addEventListener('click', hideCreateGroupModal);
  }
  if (cancelCreateGroup) {
    cancelCreateGroup.addEventListener('click', hideCreateGroupModal);
  }
  if (closeJoinGroupModal) {
    closeJoinGroupModal.addEventListener('click', hideJoinGroupModal);
  }
  if (cancelJoinGroup) {
    cancelJoinGroup.addEventListener('click', hideJoinGroupModal);
  }

  // Form submit handler
  if (createGroupForm) {
    createGroupForm.addEventListener('submit', handleCreateGroup);
  }

  // Search handler
  if (discoverSearch) {
    let searchTimeout;
    discoverSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadPublicGroups(e.target.value);
      }, 300);
    });
  }

  // Join via link button
  if (joinViaLinkBtn) {
    joinViaLinkBtn.addEventListener('click', handleJoinViaLink);
  }

  // Search public groups button
  if (searchPublicGroupsBtn) {
    searchPublicGroupsBtn.addEventListener('click', () => {
      if (publicGroupsList) {
        publicGroupsList.style.display = 'block';
        loadPublicGroups();
      }
    });
  }

  // Hide public groups button
  if (hidePublicGroupsBtn) {
    hidePublicGroupsBtn.addEventListener('click', () => {
      if (publicGroupsList) {
        publicGroupsList.style.display = 'none';
      }
    });
  }

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        hideCreateGroupModal();
        hideJoinGroupModal();
      }
    });
  });

  console.log('[Groups] Initialized groups panel');
}

/**
 * Open Groups Panel
 */
function openGroupsPanel() {
  if (groupsPanel) {
    groupsPanel.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // Load groups when panel opens
    loadMyGroups();
    loadPublicGroups();
  }
}

/**
 * Close Groups Panel
 */
function closeGroupsPanel() {
  if (groupsPanel) {
    groupsPanel.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
  }
}

/**
 * Load user's groups
 */
async function loadMyGroups() {
  try {
    const groups = await groupAPI.getMyGroups();
    myGroups = groups;
    renderMyGroups();
  } catch (error) {
    console.error('Failed to load my groups:', error);
    showNotification('Failed to load your groups', 'error');
  }
}

/**
 * Load public groups
 */
async function loadPublicGroups(search = '') {
  try {
    const groups = await groupAPI.getPublicGroups(search);
    publicGroups = groups.filter(g => !myGroups.find(mg => mg._id === g._id));
    renderPublicGroups();
  } catch (error) {
    console.error('Failed to load public groups:', error);
    showNotification('Failed to load public groups', 'error');
  }
}

/**
 * Render my groups
 */
function renderMyGroups() {
  if (!myGroupsContainer) return;

  // Update count
  if (myGroupsCount) {
    myGroupsCount.textContent = myGroups.length;
  }

  if (myGroups.length === 0) {
    myGroupsContainer.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <p class="empty-state-title">No groups yet</p>
        <p class="empty-state-text">Create or join a group to start collaborating on your job search</p>
        <button class="btn-primary" id="create-first-group-btn">Create Your First Group</button>
      </div>
    `;
    // Re-attach event listener
    const btn = document.getElementById('create-first-group-btn');
    if (btn) btn.addEventListener('click', showCreateGroupModal);
    return;
  }

  myGroupsContainer.innerHTML = myGroups.map(group => createGroupCard(group)).join('');

  // Attach click handlers to group cards (CSP compliant - no inline onclick)
  myGroupsContainer.querySelectorAll('.group-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const groupId = card.dataset.groupId;
      if (groupId) {
        openGroupDetail(groupId);
      }
    });
  });
}

/**
 * Render public groups
 */
function renderPublicGroups() {
  if (!discoverGroupsContainer) return;

  if (publicGroups.length === 0) {
    discoverGroupsContainer.innerHTML = `
      <div class="empty-state-small">
        <p>No public groups found</p>
      </div>
    `;
    return;
  }

  discoverGroupsContainer.innerHTML = publicGroups.map(group => createGroupCard(group, true)).join('');

  // Attach click handlers to group cards (CSP compliant - no inline onclick)
  discoverGroupsContainer.querySelectorAll('.group-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const groupId = card.dataset.groupId;
      if (groupId) {
        openGroupDetail(groupId);
      }
    });
  });
}

/**
 * Create group card HTML
 */
function createGroupCard(group, isPublic = false) {
  const memberCount = group.stats?.memberCount || group.members?.length || 0;
  const jobCount = group.stats?.jobsShared || 0;
  const unreadCount = group.unreadCount || 0;
  const typeClass = group.type === 'public' ? 'public' : 'private';
  const typeIcon = group.type === 'public' ? '🌍' : '🔒';

  // Generate group icon (first letter of name)
  const iconLetter = group.name.charAt(0).toUpperCase();

  return `
    <div class="group-card" data-group-id="${group._id}">
      ${unreadCount > 0 ? `<div class="group-unread-badge">${unreadCount}</div>` : ''}

      <div class="group-card-header">
        <div class="group-icon">${iconLetter}</div>
        <div class="group-card-info">
          <div class="group-name">${escapeHtml(group.name)}</div>
          <div class="group-meta">
            <span class="group-type-badge ${typeClass}">${typeIcon} ${group.type}</span>
            <span>•</span>
            <span>${memberCount} member${memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      ${group.description ? `<div class="group-description">${escapeHtml(group.description)}</div>` : ''}

      <div class="group-stats">
        <div class="group-stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <span><span class="group-stat-value">${jobCount}</span> jobs</span>
        </div>
        ${!isPublic ? `
        <div class="group-stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span><span class="group-stat-value">${group.stats?.messagesCount || 0}</span> messages</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Open group detail page
 */
function openGroupDetail(groupId) {
  console.log('[Groups] Opening group detail:', groupId);
  window.location.href = `group-detail.html?id=${groupId}`;
}

/**
 * Show create group modal
 */
function showCreateGroupModal() {
  if (createGroupModal) {
    createGroupModal.style.display = 'flex';
    // Reset form
    if (createGroupForm) {
      createGroupForm.reset();
      document.getElementById('group-created-success').style.display = 'none';
      createGroupForm.style.display = 'block';
    }
  }
}

/**
 * Hide create group modal
 */
function hideCreateGroupModal() {
  if (createGroupModal) {
    createGroupModal.style.display = 'none';
  }
}

/**
 * Handle create group form submission
 */
async function handleCreateGroup(e) {
  e.preventDefault();

  const name = document.getElementById('group-name').value.trim();
  const description = document.getElementById('group-description').value.trim();
  const type = document.querySelector('input[name="group-type"]:checked').value;
  const allowJobSharing = document.getElementById('allow-job-sharing').checked;

  if (!name) {
    showNotification('Please enter a group name', 'error');
    return;
  }

  try {
    const groupData = {
      name,
      description,
      type,
      settings: {
        allowJobSharing
      }
    };

    const newGroup = await groupAPI.createGroup(groupData);

    // Show success state
    createGroupForm.style.display = 'none';
    const successDiv = document.getElementById('group-created-success');
    successDiv.style.display = 'block';

    // Set invite link
    const inviteLink = `${window.location.origin}/tracking-dashboard/dashboard.html?join=${newGroup._id}&code=${newGroup.inviteCode}`;
    document.getElementById('invite-link').value = inviteLink;

    // Copy invite link handler
    document.getElementById('copy-invite-link').onclick = () => {
      navigator.clipboard.writeText(inviteLink);
      showNotification('Invite link copied!', 'success');
    };

    // Go to group handler
    document.getElementById('go-to-group').onclick = () => {
      openGroupDetail(newGroup._id);
    };

    // Reload groups
    loadMyGroups();

    showNotification('Group created successfully!', 'success');
  } catch (error) {
    console.error('Create group error:', error);
    showNotification(error.message || 'Failed to create group', 'error');
  }
}

/**
 * Handle join via link
 */
async function handleJoinViaLink() {
  try {
    if (!joinLinkInput) return;

    const inviteLink = joinLinkInput.value.trim();

    if (!inviteLink) {
      showNotification('Please paste an invite link', 'error');
      return;
    }

    // Parse the invite link
    // Format: .../dashboard.html?join=GROUP_ID&code=INVITE_CODE
    const url = new URL(inviteLink);
    const groupId = url.searchParams.get('join');
    const inviteCode = url.searchParams.get('code');

    if (!groupId || !inviteCode) {
      showNotification('Invalid invite link format', 'error');
      return;
    }

    // Join the group
    showNotification('Joining group...', 'info');

    const result = await groupAPI.joinGroup(groupId, inviteCode);

    showNotification('Successfully joined group!', 'success');

    // Clear input
    joinLinkInput.value = '';

    // Reload groups
    loadMyGroups();

    // Optionally open the group detail
    // openGroupDetail(groupId);

  } catch (error) {
    console.error('Join via link error:', error);
    showNotification(error.message || 'Failed to join group', 'error');
  }
}

/**
 * Show join group modal
 */
function showJoinGroupModal(groupId) {
  currentGroupId = groupId;
  if (joinGroupModal) {
    joinGroupModal.style.display = 'flex';
    loadGroupPreview(groupId);
  }
}

/**
 * Hide join group modal
 */
function hideJoinGroupModal() {
  if (joinGroupModal) {
    joinGroupModal.style.display = 'none';
    currentGroupId = null;
  }
}

/**
 * Load group preview for join modal
 */
async function loadGroupPreview(groupId) {
  const preview = document.getElementById('group-preview');
  const loading = document.getElementById('join-loading');

  preview.style.display = 'none';
  loading.style.display = 'block';

  try {
    const group = await groupAPI.getGroupDetails(groupId);

    // Update preview
    document.getElementById('group-preview-icon').textContent = group.name.charAt(0).toUpperCase();
    document.getElementById('group-preview-name').textContent = group.name;
    document.getElementById('group-preview-type').textContent = group.type === 'public' ? '🌍 Public' : '🔒 Private';
    document.getElementById('group-preview-members').textContent = `${group.stats?.memberCount || 0} members`;
    document.getElementById('group-preview-description').textContent = group.description || 'No description';

    // Show/hide invite code section
    const inviteCodeSection = document.getElementById('invite-code-section');
    if (group.type === 'private') {
      inviteCodeSection.style.display = 'block';
    } else {
      inviteCodeSection.style.display = 'none';
    }

    loading.style.display = 'none';
    preview.style.display = 'block';

    // Join button handler
    document.getElementById('confirm-join-group').onclick = () => handleJoinGroup(groupId, group.type);
  } catch (error) {
    console.error('Load group preview error:', error);
    showNotification('Failed to load group details', 'error');
    hideJoinGroupModal();
  }
}

/**
 * Handle join group
 */
async function handleJoinGroup(groupId, groupType) {
  let inviteCode = null;

  if (groupType === 'private') {
    inviteCode = document.getElementById('invite-code-input').value.trim();
    if (!inviteCode) {
      showNotification('Please enter the invite code', 'error');
      return;
    }
  }

  try {
    await groupAPI.joinGroup(groupId, inviteCode);
    showNotification('Successfully joined the group!', 'success');
    hideJoinGroupModal();
    loadMyGroups();
    openGroupDetail(groupId);
  } catch (error) {
    console.error('Join group error:', error);
    showNotification(error.message || 'Failed to join group', 'error');
  }
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
 * Show notification
 */
function showNotification(message, type = 'info') {
  // Use Notion-style toast if available
  if (window.globalNotifications) {
    window.globalNotifications.showNotionToast(message, type);
  } else {
    // Fallback to simple toast
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGroupsView);
} else {
  initializeGroupsView();
}

// Check for join group URL parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('join')) {
  const groupId = urlParams.get('join');
  const inviteCode = urlParams.get('code');

  // Wait for page to load then show join modal
  window.addEventListener('load', () => {
    setTimeout(() => {
      showJoinGroupModal(groupId);
      if (inviteCode) {
        document.getElementById('invite-code-input').value = inviteCode;
      }
    }, 500);
  });
}

