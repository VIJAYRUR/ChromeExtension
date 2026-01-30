// Smart Notification Manager
// Intelligently chooses between desktop notifications and in-app toasts
// based on user presence and page visibility

class SmartNotificationManager {
  constructor() {
    this.isUserActive = true;
    this.lastActivityTime = Date.now();
    this.INACTIVITY_THRESHOLD = 60000; // 1 minute
    this.init();
  }

  init() {
    // Track user activity
    this.setupActivityTracking();

    // Track page visibility
    this.setupVisibilityTracking();

    // Request notification permission if not granted
    this.requestNotificationPermission();

    console.log('[Smart Notifications] Initialized');
  }

  setupActivityTracking() {
    // Track mouse movement, clicks, keyboard input
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
      this.isUserActive = true;
    };

    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check inactivity every 10 seconds
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      if (timeSinceLastActivity > this.INACTIVITY_THRESHOLD) {
        this.isUserActive = false;
      }
    }, 10000);
  }

  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.isUserActive = true;
        this.lastActivityTime = Date.now();
      }
    });
  }

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('[Smart Notifications] Permission:', permission);
      } catch (error) {
        console.error('[Smart Notifications] Permission error:', error);
      }
    }
  }

  /**
   * Check if user is away (tab not visible, window not focused, or inactive)
   */
  isUserAway() {
    const isTabHidden = document.hidden;
    const isWindowUnfocused = !document.hasFocus();
    const isInactive = !this.isUserActive;

    return isTabHidden || isWindowUnfocused || isInactive;
  }

  /**
   * Show smart notification - automatically chooses desktop vs in-app
   */
  async showNotification({ title, body, icon, data = {}, type = 'info' }) {
    const userAway = this.isUserAway();

    console.log('[Smart Notifications] User away:', userAway, {
      hidden: document.hidden,
      unfocused: !document.hasFocus(),
      inactive: !this.isUserActive
    });

    if (userAway) {
      // User is away - show desktop notification
      await this.showDesktopNotification({ title, body, icon, data });
    } else {
      // User is active - show in-app toast
      this.showInAppToast({ title, body, type });
    }
  }

  /**
   * Show desktop notification (macOS notification banner)
   */
  async showDesktopNotification({ title, body, icon, data = {} }) {
    // Use chrome.notifications for extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      console.log('[Smart Notifications] 🔔 Showing desktop notification:', title);

      chrome.runtime.sendMessage({
        action: 'showNotification',
        notificationId: `smart_${Date.now()}`,
        title: title,
        message: body,
        priority: 1,
        requireInteraction: false,
        data: data
      });
    }
    // Fallback to Web Notifications API
    else if ('Notification' in window && Notification.permission === 'granted') {
      console.log('[Smart Notifications] 🔔 Showing web notification:', title);

      const notification = new Notification(title, {
        body: body,
        icon: icon || '/icons/icon128.png',
        badge: '/icons/icon48.png',
        tag: `smart-notif-${Date.now()}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } else {
      console.warn('[Smart Notifications] Desktop notifications not available');
      // Fallback to in-app toast
      this.showInAppToast({ title, body, type: 'info' });
    }
  }

  /**
   * Show in-app toast notification (Notion-style)
   */
  showInAppToast({ title, body, type = 'info' }) {
    console.log('[Smart Notifications] 💬 Showing in-app toast:', title);

    // Use global notifications if available
    if (window.globalNotifications) {
      const message = body ? `${title}: ${body}` : title;
      window.globalNotifications.showNotionToast(message, type, 4000);
    } else {
      // Fallback to simple alert (should rarely happen)
      console.warn('[Smart Notifications] Global notifications not available');
    }
  }

  /**
   * Show chat message notification
   */
  showChatNotification({ senderName, message, groupName, groupId, messageId }) {
    this.showNotification({
      title: `${senderName} in ${groupName}`,
      body: message,
      data: {
        type: 'chat',
        groupId: groupId,
        messageId: messageId
      },
      type: 'info'
    });
  }

  /**
   * Show mention notification
   */
  showMentionNotification({ mentionedBy, message, groupName, groupId, messageId }) {
    this.showNotification({
      title: `${mentionedBy} mentioned you`,
      body: `In ${groupName}: ${message}`,
      data: {
        type: 'mention',
        groupId: groupId,
        messageId: messageId
      },
      type: 'warning'
    });
  }

  /**
   * Show job shared notification
   */
  showJobSharedNotification({ sharedBy, jobTitle, company, groupName, jobId }) {
    this.showNotification({
      title: `${sharedBy} shared a job`,
      body: `${jobTitle} at ${company} in ${groupName}`,
      data: {
        type: 'job-shared',
        jobId: jobId
      },
      type: 'success'
    });
  }
}

// Create global instance
window.smartNotifications = new SmartNotificationManager();

console.log('[Smart Notifications] ✅ Global instance created');
