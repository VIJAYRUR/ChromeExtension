// Background script - handles extension icon clicks and job tracking

console.log('🚀🚀🚀 BACKGROUND.JS LOADED - VERSION 2.0 - FIXED STATUS BUG 🚀🚀🚀');

// Get storage key namespaced by userId (consistent with JobTracker)
function getStorageKey(userId) {
  return userId ? `trackedJobs_${userId}` : 'trackedJobs_anonymous';
}

// Get current user ID from chrome.storage (where auth data is stored)
function getCurrentUserId(callback) {
  // Try to get from chrome.storage (where authToken and user data are stored)
  chrome.storage.local.get(['currentUser'], (result) => {
    if (result.currentUser) {
      try {
        const user = typeof result.currentUser === 'string'
          ? JSON.parse(result.currentUser)
          : result.currentUser;
        if (user?._id) {
          callback(user._id);
          return; // Exit here to avoid calling callback(null)
        }
      } catch (e) {
        console.log('[Background] Error parsing currentUser:', e);
      }
    }

    // Fallback: return null (will use anonymous key)
    callback(null);
  });
}

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

    // Use userId from message (passed by content script)
    const userId = message.userId;
    const storageKey = getStorageKey(userId);
    console.log('[Background] 💾 Saving to storage key:', storageKey);

    chrome.storage.local.get([storageKey], (result) => {
      const jobs = result[storageKey] || [];

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

      // Save to user-specific storage key
      const data = {};
      data[storageKey] = jobs;
      chrome.storage.local.set(data, () => {
        console.log('[Background] ✅ Job tracked:', job.company, '-', job.title);
        console.log('[Background] ✅ Final job status:', job.status);
        console.log('[Background] ✅ Full job object:', job);
        sendResponse({ success: true, job: job });

        // Sync to server immediately so new job doesn't get overwritten by sync manager
        chrome.storage.local.get(['authToken'], (result) => {
          if (result.authToken) {
            console.log('[Background] 🔄 Syncing new job to server...');
            // Send to API to create job on server
            fetch('https://job-tracker-api-j7ef.onrender.com/api/jobs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${result.authToken}`
              },
              body: JSON.stringify(job)
            })
              .then(res => {
                console.log('[Background] 📡 Sync response status:', res.status);
                return res.json().then(data => ({ status: res.status, data }));
              })
              .then(({ status, data }) => {
                if (status === 200 || status === 201) {
                  const mongoId = data.data?._id;
                  console.log('[Background] ✅ Job synced to server with ID:', mongoId);

                  // UPDATE LOCAL JOB WITH SERVER ID to prevent duplicates on next sync
                  if (mongoId) {
                    job._id = mongoId;
                    const updatedData = {};
                    updatedData[storageKey] = jobs;
                    chrome.storage.local.set(updatedData, () => {
                      console.log('[Background] ✅ Local job updated with server _id to prevent duplicates');
                    });
                  }
                } else {
                  console.error('[Background] ❌ Sync failed with status', status, ':', data);
                }
              })
              .catch(err => {
                console.error('[Background] ❌ Sync error:', err.message || err);
              });
          } else {
            console.warn('[Background] ⚠️ No authToken available - job NOT synced to server');
          }
        });
      });
    });

    return true; // Keep message channel open for async response
  }

  if (message.action === 'openJobDetail') {
    // Open job detail page
    console.log('[Background] Opening job detail for jobId:', message.jobId);
    chrome.tabs.create({
      url: chrome.runtime.getURL(`tracking-dashboard/job-detail.html?id=${message.jobId}`)
    }, (tab) => {
      console.log('[Background] Job detail tab created:', tab.id);
    });
    return true; // Acknowledge message
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
    console.log('[Background] 🔔 Creating notification:', {
      title: message.title,
      message: message.message,
      notificationId: message.notificationId
    });

    chrome.notifications.create(message.notificationId || `notif_${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: message.title || 'Job Tracker',
      message: message.message || '',
      priority: message.priority || 1,
      requireInteraction: message.requireInteraction || false
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('[Background] ❌ Notification error:', chrome.runtime.lastError);
        return;
      }

      console.log('[Background] ✅ Notification created:', notificationId);

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

