// Popup script with Authentication

// Get API base URL from config
const getAPIBaseURL = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG.API_URL;
  }
  return 'https://job-tracker-api-j7ef.onrender.com/api'; // Fallback
};

// ========================================
// AUTHENTICATION CHECK
// ========================================

let isAuthenticated = false;
let currentUser = null;

async function checkAuth() {
  try {
    const result = await chrome.storage.local.get(['authToken', 'currentUser', 'isAuthenticated']);

    if (!result.authToken) {
      showLoginRequired();
      return false;
    }

    // Verify token is still valid (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${getAPIBaseURL()}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${result.authToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Token expired or invalid
        await chrome.storage.local.remove(['authToken', 'refreshToken', 'currentUser', 'isAuthenticated']);
        showLoginRequired();
        return false;
      }

      const data = await response.json();
      currentUser = data.data;
      isAuthenticated = true;

      // Update user info in storage
      await chrome.storage.local.set({ currentUser: currentUser, isAuthenticated: true });

      showMainContent();
      return true;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('[Popup] Auth check error:', error);
    // If server is down or timeout, check local auth state
    const result = await chrome.storage.local.get(['isAuthenticated', 'currentUser']);
    if (result.isAuthenticated) {
      currentUser = result.currentUser;
      isAuthenticated = true;
      showMainContent();
      showOfflineWarning();
      return true;
    }
    showLoginRequired();
    return false;
  }
}

function showLoginRequired() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('login-required').style.display = 'flex';
  document.getElementById('main-content').style.display = 'none';
}

function showMainContent() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('login-required').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';

  // Update user display
  if (currentUser) {
    const displayName = currentUser.fullName ||
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
      currentUser.email?.split('@')[0] ||
      'User';

    document.getElementById('user-name').textContent = displayName;
    document.getElementById('user-email').textContent = currentUser.email || '';

    // Set initials
    const parts = displayName.split(' ').filter(Boolean);
    let initials = displayName.substring(0, 2).toUpperCase();
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    document.getElementById('user-initials').textContent = initials;
  }

  loadStats();

  // Initialize notifications and socket
  initializeNotifications();
}

async function initializeNotifications() {
  try {
    // Get auth token
    const result = await chrome.storage.local.get(['authToken']);
    if (!result.authToken) return;

    // Inject notification bell
    if (window.globalNotifications) {
      window.globalNotifications.injectInto('#notification-bell-wrapper');
      console.log('[Popup] Global notifications injected');
    }

    // Connect socket for real-time notifications
    if (window.socketClient && !window.socketClient.isConnected) {
      console.log('[Popup] Connecting socket...');
      await window.socketClient.connect(result.authToken);
      console.log('[Popup] Socket connected:', window.socketClient.isConnected);
    }
  } catch (error) {
    console.error('[Popup] Error initializing notifications:', error);
  }
}

function showOfflineWarning() {
  const warning = document.createElement('div');
  warning.className = 'offline-warning';
  warning.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    Server offline - Using cached data
  `;
  const header = document.querySelector('.header');
  if (header && header.nextSibling) {
    document.querySelector('.container').insertBefore(warning, header.nextSibling);
  }
}

// ========================================
// STATS & DATA
// ========================================

async function loadStats() {
  // Get current user to determine storage key
  const userResult = await chrome.storage.local.get(['currentUser']);
  const currentUser = userResult.currentUser;
  const userId = currentUser?._id || null;

  // Use user-specific storage key (same as background.js)
  const storageKey = userId ? `trackedJobs_${userId}` : 'trackedJobs_anonymous';

  const result = await chrome.storage.local.get([storageKey]);
  const jobs = result[storageKey] || [];

  console.log('[Popup] 📊 Loading stats from key:', storageKey);
  console.log('[Popup] 📊 Found jobs:', jobs.length);

  const active = jobs.filter(j => j.status === 'applied' || j.status === 'interview').length;
  const interviews = jobs.filter(j => j.status === 'interview').length;

  document.getElementById('stat-total').textContent = jobs.length;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-interviews').textContent = interviews;
}



// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  await checkAuth();

  // Login button
  document.getElementById('login-btn')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('auth/login.html')
    });
    window.close();
  });

  // Register button
  document.getElementById('register-btn')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('auth/register.html')
    });
    window.close();
  });

  // Open dashboard
  document.getElementById('open-dashboard')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('tracking-dashboard/dashboard.html')
    });
  });

  // Open profile
  document.getElementById('open-profile')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('autofill/profile.html')
    });
  });

  // Toggle filter panel (only works on LinkedIn jobs pages)
  document.getElementById('toggle-panel')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url && tab.url.includes('linkedin.com/jobs')) {
        chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
        window.close();
      } else {
        alert('Please navigate to LinkedIn Jobs page first!');
      }
    });
  });

  // User avatar dropdown toggle
  document.getElementById('user-avatar')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('user-dropdown')?.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.getElementById('user-dropdown')?.classList.remove('show');
  });

  // Profile button in dropdown
  document.getElementById('profile-btn')?.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('autofill/profile.html')
    });
    window.close();
  });

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    try {
      const result = await chrome.storage.local.get(['authToken']);
      if (result.authToken) {
        await fetch(`${getAPIBaseURL()}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${result.authToken}`
          }
        });
      }
    } catch (error) {
      console.log('[Popup] Logout API call failed, clearing local state');
    }

    await chrome.storage.local.remove(['authToken', 'refreshToken', 'currentUser', 'isAuthenticated']);
    showLoginRequired();
  });

  // Sync button
  document.getElementById('sync-btn')?.addEventListener('click', async () => {
    const syncBtn = document.getElementById('sync-btn');
    const originalText = syncBtn.innerHTML;

    syncBtn.innerHTML = `
      <svg class="spinning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 11-6.219-8.56"/>
      </svg>
      Syncing...
    `;
    syncBtn.style.pointerEvents = 'none';

    try {
      // Get auth token
      const result = await chrome.storage.local.get(['authToken', 'trackedJobs', 'userProfile']);

      if (!result.authToken) {
        alert('Please login to sync');
        return;
      }

      // Sync jobs
      const jobs = result.trackedJobs || [];
      const syncResponse = await fetch(`${getAPIBaseURL()}/jobs/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${result.authToken}`
        },
        body: JSON.stringify({ jobs })
      });

      const syncData = await syncResponse.json();

      if (syncResponse.ok) {
        alert(`Sync complete!\n\nCreated: ${syncData.data.created}\nUpdated: ${syncData.data.updated}`);
      } else {
        throw new Error(syncData.message || 'Sync failed');
      }

    } catch (error) {
      console.error('[Popup] Sync error:', error);
      alert(`Sync failed!\n\n${error.message}`);
    } finally {
      syncBtn.innerHTML = originalText;
      syncBtn.style.pointerEvents = '';
    }
  });
});
