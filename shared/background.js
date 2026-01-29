// Background script - handles extension icon clicks and job tracking

console.log('🚀🚀🚀 BACKGROUND.JS LOADED - VERSION 2.0 - FIXED STATUS BUG 🚀🚀🚀');

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
    console.log('[Background] 🔍 Received trackJob message:', message);
    console.log('[Background] 🔍 Status received:', message.jobData?.status);

    // Save job to storage
    chrome.storage.local.get(['trackedJobs'], (result) => {
      const jobs = result.trackedJobs || [];

      // Check for duplicates based on LinkedIn URL or company + title
      const isDuplicate = jobs.some(existingJob => {
        // Primary check: LinkedIn URL (most reliable)
        if (message.jobData.linkedinUrl && existingJob.linkedinUrl) {
          // Extract job ID from LinkedIn URL for comparison
          const newJobId = message.jobData.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];
          const existingJobId = existingJob.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];

          if (newJobId && existingJobId && newJobId === existingJobId) {
            return true;
          }
        }

        // Fallback check: Company + Title (case-insensitive)
        const sameCompany = existingJob.company.toLowerCase().trim() ===
                           (message.jobData.company || '').toLowerCase().trim();
        const sameTitle = existingJob.title.toLowerCase().trim() ===
                         (message.jobData.title || '').toLowerCase().trim();

        return sameCompany && sameTitle;
      });

      if (isDuplicate) {
        console.log('[Background] ⚠️ Job already tracked:', message.jobData.company, '-', message.jobData.title);
        sendResponse({
          success: false,
          duplicate: true,
          message: 'This job is already tracked in your dashboard'
        });
        return;
      }

      // Create job entry
      const jobStatus = message.jobData.status || 'applied';
      console.log('[Background] 🔍 Creating job with status:', jobStatus);

      const job = {
        id: 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        company: message.jobData.company || 'Unknown Company',
        title: message.jobData.title || 'Unknown Position',
        description: message.jobData.description || '',
        descriptionHtml: message.jobData.descriptionHtml || '',
        location: message.jobData.location || '',
        salary: message.jobData.salary || '',
        workType: message.jobData.workType || 'Not specified',
        linkedinUrl: message.jobData.linkedinUrl || '',
        dateApplied: new Date().toISOString(),
        status: jobStatus,  // Use status from jobData (e.g., 'saved' from WhatsApp groups)
        // Timing and competition data
        jobPostedHoursAgo: message.jobData.jobPostedHoursAgo || null,
        applicantsAtApplyTime: message.jobData.applicantsAtApplyTime || null,
        applicantsText: message.jobData.applicantsText || null,
        timeToApplyBucket: message.jobData.timeToApplyBucket || null,
        competitionBucket: message.jobData.competitionBucket || null,
        resumeFile: null,
        coverLetter: '',
        notes: '',
        timeline: [
          {
            date: new Date().toISOString(),
            event: message.jobData.source === 'WhatsApp Group'
              ? 'Job saved from WhatsApp group'
              : 'Application tracked from LinkedIn',
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
        console.log('[Background] ✅ Final job status:', job.status);
        console.log('[Background] ✅ Full job object:', job);
        sendResponse({ success: true, job: job });
      });
    });

    return true; // Keep message channel open for async response
  }

  if (message.action === 'openJobDetail') {
    // Open job detail page
    chrome.tabs.create({
      url: chrome.runtime.getURL(`tracking-dashboard/job-detail.html?id=${message.jobId}`)
    });
  }

  if (message.action === 'openDashboard') {
    // Open dashboard
    chrome.tabs.create({
      url: chrome.runtime.getURL('tracking-dashboard/dashboard.html')
    });
  }

  if (message.action === 'openProfileSetup') {
    // Open profile setup page (old wizard - kept for backward compatibility)
    chrome.tabs.create({
      url: chrome.runtime.getURL('autofill/profile-setup.html')
    });
  }

  if (message.action === 'openProfile') {
    // Open new profile page (view mode with inline editing)
    chrome.tabs.create({
      url: chrome.runtime.getURL('autofill/profile.html')
    });
  }

  if (message.action === 'showNotification') {
    // Show browser notification
    chrome.notifications.create(message.notificationId || `notif_${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: message.title || 'Job Tracker',
      message: message.message || '',
      priority: message.priority || 1,
      requireInteraction: message.requireInteraction || false
    }, (notificationId) => {
      console.log('[Background] Notification created:', notificationId);

      // Store notification data for click handling
      if (message.data) {
        chrome.storage.local.get(['notificationData'], (result) => {
          const notificationData = result.notificationData || {};
          notificationData[notificationId] = message.data;
          chrome.storage.local.set({ notificationData });
        });
      }
    });
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('[Background] Notification clicked:', notificationId);

  // Get notification data
  chrome.storage.local.get(['notificationData'], (result) => {
    const notificationData = result.notificationData || {};
    const data = notificationData[notificationId];

    if (!data) {
      console.log('[Background] No data for notification');
      return;
    }

    // Handle different notification types
    if (data.type === 'job-shared' && data.groupId) {
      // Open group detail page
      chrome.tabs.create({
        url: chrome.runtime.getURL(`tracking-dashboard/group-detail.html?id=${data.groupId}`)
      });
    } else if (data.type === 'new-message' && data.groupId) {
      // Open group detail page (chat tab)
      chrome.tabs.create({
        url: chrome.runtime.getURL(`tracking-dashboard/group-detail.html?id=${data.groupId}&tab=chat`)
      });
    } else if (data.type === 'mention' && data.groupId) {
      // Open group detail page (chat tab)
      chrome.tabs.create({
        url: chrome.runtime.getURL(`tracking-dashboard/group-detail.html?id=${data.groupId}&tab=chat`)
      });
    }

    // Clear notification
    chrome.notifications.clear(notificationId);

    // Clean up notification data
    delete notificationData[notificationId];
    chrome.storage.local.set({ notificationData });
  });
});

// Handle notification closed
chrome.notifications.onClosed.addListener((notificationId) => {
  // Clean up notification data
  chrome.storage.local.get(['notificationData'], (result) => {
    const notificationData = result.notificationData || {};
    delete notificationData[notificationId];
    chrome.storage.local.set({ notificationData });
  });
});

