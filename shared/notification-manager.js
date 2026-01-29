/**
 * Notification Manager
 * Handles both in-app toast notifications and browser push notifications
 */

class NotificationManager {
  constructor() {
    this.notificationPermission = 'default';
    this.checkPermission();
  }

  /**
   * Check current notification permission status
   */
  async checkPermission() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      console.log('[Notification Manager] Permission status:', this.notificationPermission);
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notification Manager] Browser does not support notifications');
      return false;
    }

    if (this.notificationPermission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      console.log('[Notification Manager] Permission granted:', permission === 'granted');
      return permission === 'granted';
    } catch (error) {
      console.error('[Notification Manager] Error requesting permission:', error);
      return false;
    }
  }

  /**
   * Show in-app toast notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  showToast(message, type = 'info', duration = 4000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.notification-toast');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-${type}`;
    
    // Set icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    
    toast.innerHTML = `
      <span class="notification-icon">${icons[type] || icons.info}</span>
      <span class="notification-message">${message}</span>
    `;

    // Set styles
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      error: { bg: '#ef4444', border: '#dc2626' },
      info: { bg: '#3b82f6', border: '#2563eb' },
      warning: { bg: '#f59e0b', border: '#d97706' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 20px;
      background: ${color.bg};
      color: white;
      border-radius: 8px;
      border-left: 4px solid ${color.border};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      animation: slideInRight 0.3s ease;
      max-width: 400px;
    `;

    document.body.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Show browser push notification
   * @param {string} title - Notification title
   * @param {object} options - Notification options
   * @returns {Promise<Notification>}
   */
  async showBrowserNotification(title, options = {}) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('[Notification Manager] Browser notifications not supported');
      return null;
    }

    // Request permission if not granted
    if (this.notificationPermission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('[Notification Manager] Notification permission denied');
        return null;
      }
    }

    try {
      const notification = new Notification(title, {
        icon: chrome.runtime.getURL('icons/icon128.png'),
        badge: chrome.runtime.getURL('icons/icon48.png'),
        ...options
      });

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      return notification;
    } catch (error) {
      console.error('[Notification Manager] Error showing browser notification:', error);
      return null;
    }
  }

  /**
   * Show notification for new job shared
   * @param {object} data - Job share data
   */
  async notifyJobShared(data) {
    const { job, sharedBy, groupId } = data;
    const message = `${sharedBy.name} shared a job: ${job.title} at ${job.company}`;

    // Show toast
    this.showToast(message, 'info', 5000);

    // Show browser notification
    await this.showBrowserNotification('New Job Shared', {
      body: message,
      tag: `job-shared-${job._id}`,
      data: { type: 'job-shared', groupId, jobId: job._id }
    });
  }

  /**
   * Show notification for new message
   * @param {object} data - Message data
   */
  async notifyNewMessage(data) {
    const { message, groupId } = data;
    const senderName = message.sender?.name || 'Someone';
    const preview = message.content.substring(0, 100);

    // Show toast
    this.showToast(`New message from ${senderName}`, 'info', 4000);

    // Show browser notification
    await this.showBrowserNotification(`New message from ${senderName}`, {
      body: preview,
      tag: `message-${message._id}`,
      data: { type: 'new-message', groupId, messageId: message._id }
    });
  }

  /**
   * Show notification for job application
   * @param {object} data - Application data
   */
  async notifyJobApplication(data) {
    const { appliedBy, job } = data;
    const message = `${appliedBy.name} applied to ${job.company}`;

    this.showToast(message, 'success', 4000);
  }

  /**
   * Show notification for member joined
   * @param {object} data - Member data
   */
  async notifyMemberJoined(data) {
    const { member } = data;
    const message = `${member.name} joined the group!`;

    this.showToast(message, 'success', 3000);
  }

  /**
   * Show notification for mention
   * @param {object} data - Mention data
   */
  async notifyMention(data) {
    const { mentionedBy, groupId } = data;
    const message = `${mentionedBy.userName} mentioned you in a message`;

    // Show toast
    this.showToast(message, 'warning', 5000);

    // Show browser notification
    await this.showBrowserNotification('You were mentioned', {
      body: message,
      tag: `mention-${Date.now()}`,
      data: { type: 'mention', groupId }
    });
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .notification-toast {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .notification-toast:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important;
  }

  .notification-icon {
    font-size: 18px;
    font-weight: bold;
  }

  .notification-message {
    flex: 1;
    line-height: 1.4;
  }
`;
document.head.appendChild(style);

// Create singleton instance
const notificationManager = new NotificationManager();

// Make it available globally
if (typeof window !== 'undefined') {
  window.notificationManager = notificationManager;
}

