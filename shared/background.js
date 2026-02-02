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

      console.log('[Background] 🔎 Checking against', jobs.length, 'existing jobs');
      console.log('[Background] 🔎 New job data:', {
        company: message.jobData.company,
        title: message.jobData.title,
        location: message.jobData.location,
        linkedinJobId: message.jobData.linkedinJobId,
        linkedinUrl: message.jobData.linkedinUrl
      });

      // Check for duplicates using multiple strategies
      const isDuplicate = jobs.some(existingJob => {
        // Primary check: LinkedIn Job ID (most reliable - unique identifier)
        if (message.jobData.linkedinJobId && existingJob.linkedinJobId) {
          if (message.jobData.linkedinJobId === existingJob.linkedinJobId) {
            console.log('[Background] 🔍 Duplicate found by linkedinJobId:', message.jobData.linkedinJobId);
            return true;
          }
        }

        // Secondary check: Extract job ID from LinkedIn URL
        if (message.jobData.linkedinUrl && existingJob.linkedinUrl) {
          const newJobId = message.jobData.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];
          const existingJobId = existingJob.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];

          if (newJobId && existingJobId && newJobId === existingJobId) {
            console.log('[Background] 🔍 Duplicate found by URL job ID:', newJobId);
            return true;
          }
        }

        // Fallback check: Company + Title + Location (case-insensitive, trimmed)
        const sameCompany = (existingJob.company || '').toLowerCase().trim() ===
                           (message.jobData.company || '').toLowerCase().trim();
        const sameTitle = (existingJob.title || '').toLowerCase().trim() ===
                         (message.jobData.title || '').toLowerCase().trim();
        const sameLocation = (existingJob.location || '').toLowerCase().trim() ===
                            (message.jobData.location || '').toLowerCase().trim();

        // Debug logging for comparison
        console.log('[Background] 🔎 Comparing with existing job:', {
          existingCompany: existingJob.company,
          existingTitle: existingJob.title,
          existingLocation: existingJob.location,
          sameCompany,
          sameTitle,
          sameLocation
        });

        // Match if company + title + location are the same
        if (sameCompany && sameTitle && sameLocation) {
          console.log('[Background] 🔍 Duplicate found by company+title+location:', message.jobData.company, message.jobData.title);
          return true;
        }

        return false;
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

      // Handle resume file if provided - store metadata only, upload to S3 later
      let resumeMetadata = null;
      let resumeUploadData = null; // Store temporarily for S3 upload
      let timelineEvent = 'Application tracked from LinkedIn';

      if (message.jobData.resumeFile) {
        console.log('[Background] 📎 Resume file included:', message.jobData.resumeFile.name);
        resumeMetadata = {
          name: message.jobData.resumeFile.name,
          type: message.jobData.resumeFile.type,
          size: message.jobData.resumeFile.size
        };
        resumeUploadData = message.jobData.resumeFile.data; // Keep for S3 upload
        timelineEvent = 'Application tracked from LinkedIn with resume';
      }

      if (message.jobData.source === 'WhatsApp Group') {
        timelineEvent = 'Job saved from WhatsApp group';
      }

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
        // Resume metadata only - no base64 data stored locally!
        resumeFileName: resumeMetadata ? resumeMetadata.name : null,
        resumeFileType: resumeMetadata ? resumeMetadata.type : null,
        resumeFileSize: resumeMetadata ? resumeMetadata.size : null,
        resumeS3Key: null, // Will be set after S3 upload
        uploadedAt: null, // Will be set after S3 upload
        coverLetter: '',
        notes: '',
        timeline: [
          {
            date: new Date().toISOString(),
            event: timelineEvent,
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
        chrome.storage.local.get(['authToken'], async (result) => {
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
              .then(async ({ status, data }) => {
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

                    // UPLOAD RESUME TO S3 if resume data exists
                    if (resumeUploadData && resumeMetadata) {
                      try {
                        console.log('[Background] ☁️ Uploading resume to S3 for new job...');

                        // Convert base64 to blob
                        const base64Data = resumeUploadData.split(',')[1];
                        const byteCharacters = atob(base64Data);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: resumeMetadata.type });

                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('resume', blob, resumeMetadata.name);

                        // Upload to backend API
                        const uploadResponse = await fetch(`https://job-tracker-api-j7ef.onrender.com/api/jobs/${mongoId}/resume`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${result.authToken}`
                          },
                          body: formData
                        });

                        const uploadResult = await uploadResponse.json();

                        if (uploadResponse.ok && uploadResult.success) {
                          console.log('[Background] ✅ Resume uploaded to S3:', uploadResult.data);

                          // Update local job with S3 metadata
                          job.resumeS3Key = uploadResult.data.resumeS3Key || uploadResult.data.s3Key;
                          job.uploadedAt = new Date().toISOString();

                          const finalData = {};
                          finalData[storageKey] = jobs;
                          chrome.storage.local.set(finalData, () => {
                            console.log('[Background] ✅ Resume S3 metadata saved locally');
                          });
                        } else {
                          console.error('[Background] ❌ Resume upload failed:', uploadResult.message);
                        }
                      } catch (error) {
                        console.error('[Background] ❌ Resume upload error:', error);
                      }
                    }
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

  // Handle updating a job with resume data
  if (message.action === 'updateJobResume') {
    console.log('[Background] 📎 Updating job with resume:', message.linkedinUrl);
    console.log('[Background] 📎 Resume data received:', {
      fileName: message.resumeFile?.name,
      fileType: message.resumeFile?.type,
      fileSize: message.resumeFile?.size,
      hasData: !!message.resumeFile?.data,
      dataLength: message.resumeFile?.data?.length
    });

    const userId = message.userId;
    const storageKey = getStorageKey(userId);

    chrome.storage.local.get([storageKey, 'authToken'], async (result) => {
      const jobs = result[storageKey] || [];
      const authToken = result.authToken;

      console.log('[Background] 📎 Searching for job in', jobs.length, 'jobs');

      // Find the job by LinkedIn URL
      const jobIndex = jobs.findIndex(job => job.linkedinUrl === message.linkedinUrl);

      if (jobIndex === -1) {
        console.error('[Background] ❌ Job not found for resume update');
        console.error('[Background] ❌ Looking for:', message.linkedinUrl);
        console.error('[Background] ❌ Available URLs:', jobs.map(j => j.linkedinUrl).slice(0, 3));
        sendResponse({ success: false, error: 'Job not found' });
        return;
      }

      console.log('[Background] ✅ Found job at index', jobIndex);

      // UPLOAD TO S3 FIRST (don't store large base64 in local storage!)
      if (authToken && jobs[jobIndex]._id) {
        try {
          console.log('[Background] ☁️ Uploading resume to S3...');

          // Convert base64 to blob
          const base64Data = message.resumeFile.data.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: message.resumeFile.type });

          // Create FormData for file upload
          const formData = new FormData();
          formData.append('resume', blob, message.resumeFile.name);

          // Upload to backend API (which uploads to S3)
          const uploadResponse = await fetch(`https://job-tracker-api-j7ef.onrender.com/api/jobs/${jobs[jobIndex]._id}/resume`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });

          const uploadResult = await uploadResponse.json();

          if (!uploadResponse.ok || !uploadResult.success) {
            throw new Error(uploadResult.message || 'S3 upload failed');
          }

          console.log('[Background] ✅ Resume uploaded to S3:', uploadResult.data);

          // Update job with S3 metadata ONLY (no base64 data!)
          jobs[jobIndex].resumeFileName = uploadResult.data.resumeFileName || uploadResult.data.fileName;
          jobs[jobIndex].resumeFileType = uploadResult.data.resumeFileType || uploadResult.data.fileType;
          jobs[jobIndex].resumeFileSize = uploadResult.data.resumeFileSize || uploadResult.data.fileSize;
          jobs[jobIndex].resumeS3Key = uploadResult.data.resumeS3Key || uploadResult.data.s3Key;
          jobs[jobIndex].uploadedAt = new Date().toISOString();

          // DO NOT store base64 data - it's too large!
          delete jobs[jobIndex].resumeFile;
          delete jobs[jobIndex].resumeFileData;

          console.log('[Background] 📎 Updated job resume fields (S3 metadata only):', {
            resumeFileName: jobs[jobIndex].resumeFileName,
            resumeS3Key: jobs[jobIndex].resumeS3Key,
            resumeFileSize: jobs[jobIndex].resumeFileSize
          });

          // Add timeline entry
          const timelineEntry = {
            date: new Date().toISOString(),
            event: 'Resume uploaded',
            details: `Uploaded ${message.resumeFile.name} to cloud storage`
          };

          if (!jobs[jobIndex].timeline) {
            jobs[jobIndex].timeline = [];
          }
          jobs[jobIndex].timeline.push(timelineEntry);

          // Save updated jobs (only metadata, no large files!)
          const updatedData = {};
          updatedData[storageKey] = jobs;

          chrome.storage.local.set(updatedData, () => {
            if (chrome.runtime.lastError) {
              console.error('[Background] ❌ Failed to save resume metadata:', chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
              return;
            }

            console.log('[Background] ✅ Resume metadata saved to local storage');
            console.log('[Background] ✅ Full base64 data uploaded to S3 and NOT stored locally');
            sendResponse({ success: true });
          });

        } catch (error) {
          console.error('[Background] ❌ S3 upload failed:', error);
          sendResponse({ success: false, error: error.message });
          return;
        }
      } else {
        console.warn('[Background] ⚠️ Not authenticated or no server job ID - cannot upload to S3');
        sendResponse({ success: false, error: 'Not authenticated. Please log in to upload resumes.' });
        return;
      }
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

