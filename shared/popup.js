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

