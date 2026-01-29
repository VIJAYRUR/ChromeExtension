/**
 * DEBUG CONSOLE COMMANDS
 * Copy and paste these commands into the browser console to debug issues
 */

// ============================================
// 1. CHECK AUTH STATE
// ============================================
console.log('=== AUTH STATE ===');
console.log('AuthManager exists:', !!window.authManager);
if (window.authManager) {
  console.log('Token:', window.authManager.token ? 'EXISTS (length: ' + window.authManager.token.length + ')' : 'NULL');
  console.log('User:', window.authManager.currentUser);
  console.log('Is Authenticated:', window.authManager.isAuthenticated);
  console.log('Initialized:', window.authManager.initialized);
}

// ============================================
// 2. CHECK SOCKET CONNECTION
// ============================================
console.log('\n=== SOCKET STATE ===');
console.log('SocketClient exists:', !!window.socketClient);
if (window.socketClient) {
  console.log('Socket connected:', window.socketClient.socket?.connected);
  console.log('Socket ID:', window.socketClient.socket?.id);
  console.log('Current groups:', window.socketClient.currentGroups);
}

// ============================================
// 3. CHECK NOTIFICATIONS
// ============================================
console.log('\n=== NOTIFICATIONS STATE ===');
console.log('GlobalNotifications exists:', !!window.globalNotifications);
if (window.globalNotifications) {
  console.log('Notifications count:', window.globalNotifications.notifications.length);
  console.log('Unread count:', window.globalNotifications.unreadCount);
  console.log('All notifications:', window.globalNotifications.notifications);
}

// ============================================
// 4. TEST API REQUEST
// ============================================
console.log('\n=== TESTING API REQUEST ===');
if (window.apiClient) {
  window.apiClient.getJobs({ limit: 10 })
    .then(response => {
      console.log('✅ API Request successful:', response);
    })
    .catch(error => {
      console.error('❌ API Request failed:', error);
      console.error('Error details:', error.message);
    });
}

// ============================================
// 5. MANUALLY TRIGGER NOTIFICATION
// ============================================
console.log('\n=== MANUAL NOTIFICATION TEST ===');
console.log('Run this to test notifications:');
console.log(`
window.globalNotifications.addNotification({
  type: 'job-shared',
  title: 'Test Notification',
  message: 'This is a test notification',
  data: { groupId: 'test-group', jobId: 'test-job' }
});
`);

// ============================================
// 6. CHECK SOCKET LISTENERS
// ============================================
console.log('\n=== SOCKET LISTENERS ===');
if (window.socketClient?.socket) {
  const listeners = window.socketClient.socket._callbacks || {};
  console.log('Registered socket events:', Object.keys(listeners));
}

// ============================================
// 7. FORCE SOCKET RECONNECT
// ============================================
console.log('\n=== FORCE SOCKET RECONNECT ===');
console.log('Run this to reconnect socket:');
console.log(`
(async () => {
  if (window.authManager && window.socketClient) {
    await window.authManager.init();
    const token = window.authManager.getToken();
    if (token) {
      await window.socketClient.connect(token);
      console.log('✅ Socket reconnected');
    } else {
      console.error('❌ No token available');
    }
  }
})();
`);

// ============================================
// 8. CHECK LOCAL STORAGE
// ============================================
console.log('\n=== LOCAL STORAGE ===');
console.log('Auth Token:', localStorage.getItem('authToken') ? 'EXISTS' : 'NULL');
console.log('Notifications:', localStorage.getItem('globalNotifications'));

// ============================================
// 9. SIMULATE JOB SHARE NOTIFICATION
// ============================================
console.log('\n=== SIMULATE JOB SHARE ===');
console.log('Run this to simulate a job share notification:');
console.log(`
if (window.socketClient?.socket) {
  window.socketClient.socket.emit('test-notification', {
    type: 'job-shared',
    groupId: 'test-group',
    jobId: 'test-job',
    sharedBy: { name: 'Test User', userId: 'test-user-id' },
    job: { title: 'Software Engineer', company: 'Test Company' }
  });
}
`);

// ============================================
// 10. FULL DIAGNOSTIC
// ============================================
console.log('\n=== FULL DIAGNOSTIC ===');
const diagnostic = {
  authManager: {
    exists: !!window.authManager,
    hasToken: !!window.authManager?.token,
    isAuthenticated: window.authManager?.isAuthenticated,
    user: window.authManager?.currentUser?.email
  },
  socketClient: {
    exists: !!window.socketClient,
    connected: window.socketClient?.socket?.connected,
    socketId: window.socketClient?.socket?.id
  },
  globalNotifications: {
    exists: !!window.globalNotifications,
    count: window.globalNotifications?.notifications?.length || 0,
    unread: window.globalNotifications?.unreadCount || 0
  },
  apiClient: {
    exists: !!window.apiClient,
    hasToken: !!window.apiClient?.token
  }
};
console.table(diagnostic);

