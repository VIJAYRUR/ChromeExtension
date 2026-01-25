// Popup script with Authentication

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

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
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
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
  loadBackupInfo();
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
  const result = await chrome.storage.local.get(['trackedJobs']);
  const jobs = result.trackedJobs || [];
  const active = jobs.filter(j => j.status === 'applied' || j.status === 'interview').length;
  const interviews = jobs.filter(j => j.status === 'interview').length;

  document.getElementById('stat-total').textContent = jobs.length;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-interviews').textContent = interviews;
}

async function loadBackupInfo() {
  // Load backup manager dynamically
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('shared/backup-manager.js');
  document.head.appendChild(script);

  script.onload = async () => {
    const info = await window.backupManager.getBackupInfo();

    document.getElementById('profile-status').textContent =
      info.hasProfile ? `${info.profileName}` : 'Not set';
    document.getElementById('jobs-count').textContent = info.jobCount;
  };
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

  // Logout button
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;

    try {
      const result = await chrome.storage.local.get(['authToken']);
      if (result.authToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
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

  // Export button
  document.getElementById('export-btn')?.addEventListener('click', async () => {
    if (!window.backupManager) {
      alert('Backup manager not loaded. Please try again.');
      return;
    }

    const result = await window.backupManager.exportAllData();

    if (result.success) {
      alert(`Backup saved!\n\nFile: ${result.filename}`);
    } else {
      alert(`Export failed!\n\n${result.error}`);
    }
  });

  // Import button
  document.getElementById('import-btn')?.addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  // File input change
  document.getElementById('import-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Invalid file type!\n\nPlease select a JSON backup file.');
      e.target.value = '';
      return;
    }

    const confirmed = confirm(
      'Import Backup?\n\n' +
      'This will REPLACE all current data.\n\n' +
      'Continue?'
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    const importBtn = document.getElementById('import-btn');
    const originalText = importBtn.textContent;
    importBtn.textContent = 'Importing...';
    importBtn.disabled = true;

    try {
      const result = await window.backupManager.importData(file, 'replace');

      if (result.success) {
        alert(
          `Backup restored!\n\n` +
          `Jobs: ${result.jobCount}\n` +
          `Profile: ${result.hasProfile ? 'Yes' : 'No'}`
        );
        loadStats();
        loadBackupInfo();
      } else {
        alert(`Import failed!\n\n${result.error}`);
      }
    } catch (error) {
      alert(`Import failed!\n\n${error.message}`);
    } finally {
      importBtn.textContent = originalText;
      importBtn.disabled = false;
      e.target.value = '';
    }
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
      const syncResponse = await fetch(`${API_BASE_URL}/jobs/sync`, {
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
