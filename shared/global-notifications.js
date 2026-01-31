/**
 * Global Notification Bell Component
 * Displays a notification bell icon with badge count and dropdown
 * Can be embedded in any page header
 */

class GlobalNotifications {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.isOpen = false;
    this.bellElement = null;
    this.dropdownElement = null;
    this.socketListenersSetup = false;
    this.currentUserId = null;

    // Load notifications from localStorage
    this.loadNotifications();

    // Wait for socket to be connected before setting up listeners
    this.waitForSocketAndSetupListeners();
  }

  /**
   * Get current user ID from auth manager
   */
  getCurrentUserId() {
    if (this.currentUserId) return this.currentUserId;

    if (window.authManager?.currentUser?._id) {
      this.currentUserId = window.authManager.currentUser._id;
      return this.currentUserId;
    }

    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?._id) {
          this.currentUserId = user._id;
          return this.currentUserId;
        }
      }
    } catch (e) {}

    return null;
  }

  /**
   * Get storage key namespaced by userId
   */
  getStorageKey() {
    const userId = this.getCurrentUserId();
    return userId ? `notifications_${userId}` : 'notifications_anonymous';
  }

  /**
   * Reload notifications for current user (call after login)
   */
  reloadForUser() {
    this.currentUserId = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.loadNotifications();
    this.updateBadge();
    this.renderNotifications();
  }

  /**
   * Clear notifications for current user (call on logout)
   */
  clearUserData() {
    const storageKey = this.getStorageKey();
    localStorage.removeItem(storageKey);
    this.notifications = [];
    this.unreadCount = 0;
    this.currentUserId = null;
    this.updateBadge();
    this.renderNotifications();
  }

  /**
   * Load notifications from localStorage
   */
  loadNotifications() {
    const storageKey = this.getStorageKey();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.unreadCount = this.notifications.filter(n => !n.read).length;
      }
    } catch (error) {
      console.error('[Global Notifications] Error loading notifications:', error);
    }
  }

  /**
   * Save notifications to localStorage
   */
  saveNotifications() {
    const storageKey = this.getStorageKey();
    try {
      localStorage.setItem(storageKey, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('[Global Notifications] Error saving notifications:', error);
    }
  }

  /**
   * Wait for socket to be connected before setting up listeners
   */
  waitForSocketAndSetupListeners(retryCount = 0) {
    const MAX_RETRIES = 5; // Maximum 5 retries (5 seconds total)

    // Stop retrying after max attempts
    if (retryCount >= MAX_RETRIES) {
      console.log('[Global Notifications] ⚠️ Socket not available after', MAX_RETRIES, 'retries. Running without real-time notifications.');
      return;
    }

    if (retryCount === 0) {
      console.log('[Global Notifications] 🔍 Checking for socket connection...');
    }

    // Check if socket exists and is connected
    if (window.socketClient && window.socketClient.isConnected) {
      console.log('[Global Notifications] ✅ Socket already connected, setting up listeners');
      this.setupSocketListeners();
      return;
    }

    // If socket exists but not connected, wait for connection
    if (window.socketClient) {
      console.log('[Global Notifications] ⏳ Socket exists but not connected, waiting...');

      // Listen for socket connection event
      window.socketClient.on('socket-connected', () => {
        console.log('[Global Notifications] ✅ Socket connected, setting up listeners');
        if (!this.socketListenersSetup) {
          this.setupSocketListeners();
        }
      });

      // Also retry after a delay in case we missed the connection event
      setTimeout(() => {
        if (!this.socketListenersSetup && window.socketClient?.isConnected) {
          console.log('[Global Notifications] ✅ Socket connected (retry check), setting up listeners');
          this.setupSocketListeners();
        }
      }, 2000);
    } else {
      // Socket doesn't exist yet, retry with backoff
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => this.waitForSocketAndSetupListeners(retryCount + 1), 1000);
      }
    }
  }

  /**
   * Setup socket listeners for real-time notifications
   */
  setupSocketListeners() {
    if (this.socketListenersSetup) {
      console.log('[Global Notifications] ⚠️ Socket listeners already set up, skipping');
      return;
    }
    if (!window.socketClient) {
      console.log('[Global Notifications] ❌ Socket client not available');
      return;
    }

    console.log('[Global Notifications] 🔔 Setting up socket listeners');
    this.socketListenersSetup = true;

    // Listen for various notification events
    // NOTE: job-shared notifications are now handled by SmartNotificationManager
    // in smart-notifications.js for better user presence detection
    // window.socketClient.on('job-shared', (data) => {
    //   ... disabled to prevent duplicate notifications
    // });

    window.socketClient.on('new-message', (data) => {
      // Skip job_share messages - they already have their own "New Job Shared" notification
      if (data.message?.messageType === 'job_share') {
        console.log('[Global Notifications] Skipping message notification for job_share (handled by job-shared event)');
        return;
      }

      // Extract sender name from userId object (backend sends firstName and lastName)
      const senderName = data.message?.userId
        ? `${data.message.userId.firstName || ''} ${data.message.userId.lastName || ''}`.trim()
        : 'Someone';

      const messagePreview = data.message?.content?.substring(0, 50) || 'sent a message';

      this.addNotification({
        type: 'message',
        title: 'New Message',
        message: `${senderName}: ${messagePreview}...`,
        data: data,
        timestamp: new Date().toISOString()
      });

      // Show Notion-style toast notification
      this.showNotionToast(`${senderName}: ${messagePreview}`, 'info', 4000, { groupId: data.groupId });
    });

    window.socketClient.on('member-joined', (data) => {
      const message = `${data.member?.name || 'Someone'} joined the group`;
      this.addNotification({
        type: 'member-joined',
        title: 'New Member',
        message: message,
        data: data,
        timestamp: new Date().toISOString()
      });
      this.showNotionToast(message, 'success', 3000);
    });

    window.socketClient.on('mention-notification', (data) => {
      const message = `${data.mentionedBy?.userName || 'Someone'} mentioned you`;
      this.addNotification({
        type: 'mention',
        title: 'You were mentioned',
        message: message,
        data: data,
        timestamp: new Date().toISOString()
      });
      this.showNotionToast(message, 'info', 4000, { groupId: data.groupId });
    });

    window.socketClient.on('job-application', (data) => {
      this.addNotification({
        type: 'job-application',
        title: 'Job Application',
        message: `${data.appliedBy?.name || 'Someone'} applied to ${data.job?.company || 'a job'}`,
        data: data,
        timestamp: new Date().toISOString()
      });
    });

    console.log('[Global Notifications] ✅ Socket listeners registered');
  }

  /**
   * Add a new notification
   */
  addNotification(notification) {
    notification.id = Date.now() + Math.random();
    notification.read = false;
    
    this.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    this.unreadCount++;
    this.saveNotifications();
    this.updateBadge();
    this.renderNotifications();
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount--;
      this.saveNotifications();
      this.updateBadge();
      this.renderNotifications();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    this.saveNotifications();
    this.updateBadge();
    this.renderNotifications();
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    this.saveNotifications();
    this.updateBadge();
    this.renderNotifications();
  }

  /**
   * Update badge count
   */
  updateBadge() {
    if (!this.bellElement) return;

    const badge = this.bellElement.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.unreadCount;
      badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
    }
  }

  /**
   * Render notifications in dropdown
   */
  renderNotifications() {
    if (!this.dropdownElement) return;

    const container = this.dropdownElement.querySelector('.notifications-list');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="notification-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" stroke-width="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications.map(notification => {
      const icon = this.getNotificationIcon(notification.type);
      const timeAgo = this.getTimeAgo(notification.timestamp);
      const unreadClass = notification.read ? '' : 'unread';

      return `
        <div class="notification-item ${unreadClass}" data-id="${notification.id}">
          <div class="notification-icon-wrapper">${icon}</div>
          <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${timeAgo}</div>
          </div>
          ${!notification.read ? '<div class="notification-unread-dot"></div>' : ''}
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseFloat(item.dataset.id);
        this.handleNotificationClick(id);
      });
    });
  }

  /**
   * Get icon for notification type
   */
  getNotificationIcon(type) {
    const icons = {
      'job-shared': '💼',
      'message': '💬',
      'member-joined': '👋',
      'mention': '@',
      'job-application': '✅',
      'default': '🔔'
    };
    return icons[type] || icons.default;
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return time.toLocaleDateString();
  }

  /**
   * Handle notification click
   */
  handleNotificationClick(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Mark as read
    this.markAsRead(notificationId);

    // Determine base path for navigation
    const isInTrackingDashboard = window.location.pathname.includes('tracking-dashboard');
    const basePath = isInTrackingDashboard ? '' : 'tracking-dashboard/';

    // Navigate based on notification type - all go to groups.html (main interface)
    const groupId = notification.data?.groupId;
    if (!groupId) return;

    if (notification.type === 'job-shared') {
      window.location.href = `${basePath}groups.html?groupId=${groupId}&tab=jobs`;
    } else if (notification.type === 'message') {
      window.location.href = `${basePath}groups.html?groupId=${groupId}&tab=chat`;
    } else if (notification.type === 'mention') {
      window.location.href = `${basePath}groups.html?groupId=${groupId}&tab=chat`;
    } else if (notification.type === 'member-joined') {
      window.location.href = `${basePath}groups.html?groupId=${groupId}&tab=members`;
    }

    // Close dropdown
    this.closeDropdown();
  }

  /**
   * Create and inject the notification bell HTML
   */
  createBellElement() {
    const bell = document.createElement('div');
    bell.className = 'notification-bell-container';
    bell.innerHTML = `
      <button class="notification-bell-btn" id="notification-bell-btn" title="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="notification-badge" style="display: none;">0</span>
      </button>
      <div class="notification-dropdown" id="notification-dropdown">
        <div class="notification-dropdown-header">
          <h3>Notifications</h3>
          <div class="notification-dropdown-actions">
            <button class="notification-action-btn" id="mark-all-read-btn" title="Mark all as read">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="notification-action-btn" id="clear-all-btn" title="Clear all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div class="notifications-list"></div>
      </div>
    `;

    this.bellElement = bell;
    this.dropdownElement = bell.querySelector('.notification-dropdown');

    // Add event listeners
    const bellBtn = bell.querySelector('#notification-bell-btn');
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    const markAllReadBtn = bell.querySelector('#mark-all-read-btn');
    markAllReadBtn.addEventListener('click', () => this.markAllAsRead());

    const clearAllBtn = bell.querySelector('#clear-all-btn');
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Clear all notifications?')) {
        this.clearAll();
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!bell.contains(e.target)) {
        this.closeDropdown();
      }
    });

    return bell;
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.dropdownElement) {
      this.dropdownElement.classList.toggle('show', this.isOpen);
    }
    if (this.isOpen) {
      this.renderNotifications();
    }
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    this.isOpen = false;
    if (this.dropdownElement) {
      this.dropdownElement.classList.remove('show');
    }
  }

  /**
   * Inject the notification bell into a container
   * @param {string|HTMLElement} container - CSS selector or DOM element
   */
  injectInto(container) {
    const targetElement = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!targetElement) {
      console.error('[Global Notifications] Container not found:', container);
      return;
    }

    const bell = this.createBellElement();
    targetElement.appendChild(bell);

    this.updateBadge();
    this.renderNotifications();

    console.log('[Global Notifications] ✅ Notification bell injected');
  }

  /**
   * Show Notion-style toast notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {number} duration - Duration in milliseconds (default: 4000)
   * @param {object} data - Optional data for click handling (e.g., groupId)
   */
  showNotionToast(message, type = 'info', duration = 4000, data = null) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.notion-toast');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notion-toast notion-toast-${type}`;

    // Parse message to extract user name and content if it's a message notification
    let displayContent = message;
    let userName = null;

    // Check if message contains a colon (user: message format)
    const colonIndex = message.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      userName = message.substring(0, colonIndex).trim();
      displayContent = message.substring(colonIndex + 1).trim();
    }

    // Set icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    // Create notification content
    if (userName) {
      // Message notification with user avatar
      const avatarLetter = userName.charAt(0).toUpperCase();
      toast.innerHTML = `
        <div class="notion-toast-avatar">${avatarLetter}</div>
        <div class="notion-toast-content">
          <div class="notion-toast-user">${this.escapeHtml(userName)}</div>
          <div class="notion-toast-message">${this.escapeHtml(displayContent)}</div>
        </div>
      `;

      // Make clickable if we have group data
      if (data && data.groupId) {
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', () => {
          // Remove the toast immediately on click
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);

          // Check if we're already on the groups page
          if (window.location.href.includes('groups.html')) {
            // If already on groups page, just select the group and switch to chat tab
            if (window.selectGroup && typeof window.selectGroup === 'function') {
              window.selectGroup(data.groupId);
              // Also switch to chat tab
              if (window.switchTab && typeof window.switchTab === 'function') {
                window.switchTab('chat');
              }
            }
          } else {
            // Navigate to groups page with the specific group and chat tab
            const isInTrackingDashboard = window.location.pathname.includes('tracking-dashboard');
            const basePath = isInTrackingDashboard ? '' : 'tracking-dashboard/';
            window.location.href = `${basePath}groups.html?groupId=${data.groupId}&tab=chat`;
          }
        });
      }
    } else {
      // Regular notification with icon
      toast.innerHTML = `
        <span class="notion-toast-icon">${icons[type] || icons.info}</span>
        <span class="notion-toast-message">${this.escapeHtml(message)}</span>
      `;
    }

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Add CSS styles
const globalNotificationStyles = document.createElement('style');
globalNotificationStyles.textContent = `
  /* Notification Bell Container - Inline in header */
  .notification-bell-container {
    position: relative;
    z-index: 9999;
  }

  .notification-bell-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #37352f;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  }

  .notification-bell-btn:hover {
    background: #4a4a45;
    color: #ffffff;
  }

  .notification-bell-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Notification Badge */
  .notification-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: #eb5757;
    color: white;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #2f3437;
  }

  /* Notification Dropdown - Dark Theme */
  .notification-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 380px;
    max-height: 500px;
    background: #2f3437;
    border-radius: 8px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.05),
      0 4px 24px rgba(0, 0, 0, 0.4);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .notification-dropdown.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  /* Dropdown Header */
  .notification-dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: #37393c;
  }

  .notification-dropdown-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .notification-dropdown-actions {
    display: flex;
    gap: 4px;
  }

  .notification-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    color: rgba(255, 255, 255, 0.5);
  }

  .notification-action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
  }

  /* Notifications List */
  .notifications-list {
    overflow-y: auto;
    max-height: 420px;
  }

  .notifications-list::-webkit-scrollbar {
    width: 8px;
  }

  .notifications-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .notifications-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
  }

  .notifications-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background 0.15s ease;
    position: relative;
  }

  .notification-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .notification-item.unread {
    background: rgba(46, 170, 220, 0.1);
  }

  .notification-item.unread:hover {
    background: rgba(46, 170, 220, 0.15);
  }

  .notification-icon-wrapper {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .notification-content {
    flex: 1;
    min-width: 0;
  }

  .notification-title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 4px;
  }

  .notification-message {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.4;
  }

  .notification-time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }

  .notification-unread-dot {
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background: #2eaadc;
    border-radius: 50%;
  }

  /* Empty State */
  .notification-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .notification-empty svg {
    margin-bottom: 16px;
    opacity: 0.3;
  }

  .notification-empty p {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.4);
  }

  /* Notion-style Toast Notifications - Dark Theme */
  .notion-toast {
    position: fixed;
    top: 70px;
    right: 16px;
    transform: translateX(120%);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    background: #2f3437;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.05),
      0 4px 24px rgba(0, 0, 0, 0.4);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Apple Color Emoji', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
    max-width: 380px;
    min-width: 300px;
    width: auto;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .notion-toast.show {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }

  .notion-toast[style*="cursor: pointer"]:hover {
    background: #3a3f42;
    border-color: rgba(255, 255, 255, 0.12);
  }

  /* Avatar for message notifications */
  .notion-toast-avatar {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
    text-transform: uppercase;
  }

  /* Content container for message notifications */
  .notion-toast-content {
    flex: 1;
    min-width: 0;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow: hidden;
  }

  .notion-toast-user {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Icon for regular notifications */
  .notion-toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .notion-toast-success {
    background: #2f3437;
  }

  .notion-toast-success .notion-toast-icon {
    background: rgba(0, 135, 107, 0.2);
    color: #0f7b6c;
  }

  .notion-toast-error {
    background: #2f3437;
  }

  .notion-toast-error .notion-toast-icon {
    background: rgba(235, 87, 87, 0.2);
    color: #eb5757;
  }

  .notion-toast-info {
    background: #2f3437;
  }

  .notion-toast-info .notion-toast-icon {
    background: rgba(46, 170, 220, 0.2);
    color: #2eaadc;
  }

  .notion-toast-warning {
    background: #2f3437;
  }

  .notion-toast-warning .notion-toast-icon {
    background: rgba(255, 163, 68, 0.2);
    color: #ffa344;
  }

  .notion-toast-message {
    flex: 1;
    line-height: 1.5;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.9);
    word-wrap: break-word;
    overflow-wrap: break-word;
    max-width: 100%;
  }

  /* Message content in notifications with avatar */
  .notion-toast-content .notion-toast-message {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
    white-space: normal;
    word-break: break-word;
    overflow: visible;
  }
`;
document.head.appendChild(globalNotificationStyles);

// Create singleton instance
const globalNotifications = new GlobalNotifications();

// Make it available globally
if (typeof window !== 'undefined') {
  window.globalNotifications = globalNotifications;
}


