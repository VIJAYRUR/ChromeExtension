// Popup script

// Load stats
chrome.storage.local.get(['trackedJobs'], (result) => {
  const jobs = result.trackedJobs || [];
  const active = jobs.filter(j => j.status === 'applied' || j.status === 'interview').length;
  const interviews = jobs.filter(j => j.status === 'interview').length;

  document.getElementById('stat-total').textContent = jobs.length;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-interviews').textContent = interviews;
});

// Open dashboard
document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('tracking-dashboard/dashboard.html')
  });
});

// Open profile
document.getElementById('open-profile').addEventListener('click', () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('autofill/profile.html')
  });
});

// Toggle filter panel (only works on LinkedIn jobs pages)
document.getElementById('toggle-panel').addEventListener('click', () => {
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

// ========================================
// BACKUP FUNCTIONALITY
// ========================================

// Load backup manager
const script = document.createElement('script');
script.src = chrome.runtime.getURL('shared/backup-manager.js');
document.head.appendChild(script);

// Wait for backup manager to load
script.onload = async () => {
  // Load backup info
  const info = await window.backupManager.getBackupInfo();

  document.getElementById('profile-status').textContent =
    info.hasProfile ? `✅ ${info.profileName}` : '❌ Not set';
  document.getElementById('jobs-count').textContent = info.jobCount;

  // Export button
  document.getElementById('export-btn').addEventListener('click', async () => {
    const result = await window.backupManager.exportAllData();

    if (result.success) {
      alert(`✅ Backup saved!\n\nFile: ${result.filename}\n\nYour data is safe!`);
    } else {
      alert(`❌ Export failed!\n\n${result.error}`);
    }
  });

  // Import button
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  // File input change
  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.name.endsWith('.json')) {
      alert(
        '❌ Invalid file type!\n\n' +
        'Please select a JSON backup file.\n\n' +
        'Expected: job-tracker-backup-*.json'
      );
      e.target.value = '';
      return;
    }

    const confirmed = confirm(
      '⚠️ Import Backup?\n\n' +
      'This will REPLACE all current data.\n\n' +
      'Make sure you have a backup of current data first!\n\n' +
      'Continue?'
    );

    if (!confirmed) {
      e.target.value = '';
      return;
    }

    // Show loading state
    const importBtn = document.getElementById('import-btn');
    const originalText = importBtn.textContent;
    importBtn.textContent = '⏳ Importing...';
    importBtn.disabled = true;

    try {
      const result = await window.backupManager.importData(file, 'replace');

      if (result.success) {
        alert(
          `✅ Backup restored!\n\n` +
          `Jobs: ${result.jobCount}\n` +
          `Profile: ${result.hasProfile ? 'Yes' : 'No'}\n\n` +
          `Please close and reopen the popup to see updated data.`
        );

        // Refresh popup stats
        chrome.storage.local.get(['trackedJobs', 'userProfile'], (data) => {
          const jobs = data.trackedJobs || [];
          document.getElementById('stat-total').textContent = jobs.length;
          document.getElementById('jobs-count').textContent = jobs.length;

          const profileName = data.userProfile?.fullName || 'Not set';
          document.getElementById('profile-status').textContent =
            data.userProfile ? `✅ ${profileName}` : '❌ Not set';
        });
      } else {
        alert(
          `❌ Import failed!\n\n` +
          `Error: ${result.error}\n\n` +
          `Please make sure you selected a valid backup file.`
        );
      }
    } catch (error) {
      console.error('[Popup] Import error:', error);
      alert(
        `❌ Import failed!\n\n` +
        `Error: ${error.message}\n\n` +
        `Please try again or contact support.`
      );
    } finally {
      // Restore button state
      importBtn.textContent = originalText;
      importBtn.disabled = false;
      e.target.value = '';
    }
  });
};

