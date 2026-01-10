// Background script - handles extension icon clicks and job tracking

chrome.action.onClicked.addListener((tab) => {
  // Only work on LinkedIn jobs pages
  if (tab.url && tab.url.includes('linkedin.com/jobs')) {
    // Send message to content script to toggle the floating panel
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  } else {
    // Show a notification if not on LinkedIn jobs page
    console.log('Please navigate to LinkedIn Jobs page first');
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'trackJob') {
    // Save job to storage
    chrome.storage.local.get(['trackedJobs'], (result) => {
      const jobs = result.trackedJobs || [];

      // Create job entry
      const job = {
        id: 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        company: message.jobData.company || 'Unknown Company',
        title: message.jobData.title || 'Unknown Position',
        description: message.jobData.description || '',
        location: message.jobData.location || '',
        salary: message.jobData.salary || '',
        workType: message.jobData.workType || 'Not specified',
        linkedinUrl: message.jobData.linkedinUrl || '',
        dateApplied: new Date().toISOString(),
        status: 'applied',
        resumeFile: null,
        coverLetter: '',
        notes: '',
        timeline: [
          {
            date: new Date().toISOString(),
            event: 'Application tracked from LinkedIn',
            type: 'created'
          }
        ],
        tags: [],
        priority: 'medium',
        deadline: null,
        contactPerson: '',
        contactEmail: '',
        interviewDates: [],
        followUpDate: null,
        archived: false
      };

      jobs.unshift(job);

      chrome.storage.local.set({ trackedJobs: jobs }, () => {
        console.log('[Background] ✅ Job tracked:', job.company, '-', job.title);
        sendResponse({ success: true, job: job });
      });
    });

    return true; // Keep message channel open for async response
  }

  if (message.action === 'openJobDetail') {
    // Open job detail page
    chrome.tabs.create({
      url: chrome.runtime.getURL(`job-detail.html?id=${message.jobId}`)
    });
  }

  if (message.action === 'openDashboard') {
    // Open dashboard
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html')
    });
  }

  if (message.action === 'openProfileSetup') {
    // Open profile setup page
    chrome.tabs.create({
      url: chrome.runtime.getURL('profile-setup.html')
    });
  }
});

