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
      const wasInactive = !this.isUserActive;
      this.lastActivityTime = Date.now();
      this.isUserActive = true;

      if (wasInactive) {
        console.log('[Smart Notifications] 👆 User became ACTIVE');
      }
    };

    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    console.log('[Smart Notifications] ✅ Activity tracking enabled');

    // Check inactivity every 10 seconds
    setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      if (timeSinceLastActivity > this.INACTIVITY_THRESHOLD) {
        if (this.isUserActive) {
          console.log('[Smart Notifications] 😴 User became INACTIVE (no activity for 1 minute)');
        }
        this.isUserActive = false;
      }
    }, 10000);
  }

  setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[Smart Notifications] 👁️ Tab became VISIBLE');
        this.isUserActive = true;
        this.lastActivityTime = Date.now();
      } else {
        console.log('[Smart Notifications] 🙈 Tab became HIDDEN');
      }
    });

    console.log('[Smart Notifications] ✅ Visibility tracking enabled');
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
    const timeSinceActivity = Date.now() - this.lastActivityTime;

    console.log('[Smart Notifications] 🔍 User Status Check:', {
      isTabHidden,
      isWindowUnfocused,
      isInactive,
      timeSinceActivity: `${Math.floor(timeSinceActivity / 1000)}s`,
      threshold: `${this.INACTIVITY_THRESHOLD / 1000}s`
    });

    return isTabHidden || isWindowUnfocused || isInactive;
  }

  /**
   * Show smart notification - automatically chooses desktop vs in-app
   */
  async showNotification({ title, body, icon, data = {}, type = 'info' }) {
    console.log('[Smart Notifications] 📬 Incoming notification:', { title, body });

    const userAway = this.isUserAway();

    console.log('[Smart Notifications] User away:', userAway, {
      hidden: document.hidden,
      unfocused: !document.hasFocus(),
      inactive: !this.isUserActive
    });

    if (userAway) {
      // User is away - show desktop notification
      console.log('[Smart Notifications] 🔔 User is AWAY → Showing DESKTOP notification');
      await this.showDesktopNotification({ title, body, icon, data });
    } else {
      // User is active - show in-app toast
      console.log('[Smart Notifications] 💬 User is ACTIVE → Showing IN-APP toast');
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
    console.log('[Smart Notifications] 💬 Attempting in-app toast...');

    // Use global notifications if available
    if (window.globalNotifications) {
      const message = body ? `${title}: ${body}` : title;
      window.globalNotifications.showNotionToast(message, type, 4000);
      console.log('[Smart Notifications] ✅ In-app toast shown');
    } else {
      // Fallback to simple alert (should rarely happen)
      console.warn('[Smart Notifications] ❌ Global notifications not available');
    }
  }

  /**
   * Show chat message notification
   */
  showChatNotification({ senderName, message, groupName, groupId, messageId }) {
    console.log('[Smart Notifications] 💬 Chat notification:', {
      senderName,
      groupName,
      messagePreview: message.substring(0, 50) + '...'
    });

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
    console.log('[Smart Notifications] 🏷️ Mention notification:', {
      mentionedBy,
      groupName,
      messagePreview: message.substring(0, 50) + '...'
    });

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
  showJobSharedNotification({ sharedBy, jobTitle, company, salary, location, groupName, groupId, jobId }) {
    console.log('[Smart Notifications] 💼 Job shared notification:', {
      sharedBy,
      jobTitle,
      company,
      groupName
    });

    // Build notification body with bullet points
    let bodyParts = [];
    if (jobTitle) bodyParts.push(jobTitle);
    if (company) bodyParts.push(company);
    if (salary) bodyParts.push(salary);
    if (location) bodyParts.push(location);

    const body = bodyParts.join(' • ');

    this.showNotification({
      title: `${sharedBy} shared a job in ${groupName}`,
      body: body,
      data: {
        type: 'job-shared',
        groupId: groupId,
        jobId: jobId
      },
      type: 'info'
    });
  }
}

// Create global instance
window.smartNotifications = new SmartNotificationManager();

console.log('[Smart Notifications] ✅ Global instance created');
