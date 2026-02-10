// Job Application Tracker - Core Logic

class JobTracker {
  constructor() {
    this.jobs = [];
    this.isLoaded = false;
    this.currentUserId = null;
    this.storageChangeListeners = [];
    this.init();
  }

  async init() {
    await this.loadJobs();
    this.isLoaded = true;
    console.log('[Job Tracker] 📊 Loaded', this.jobs.length, 'tracked jobs for user:', this.getCurrentUserId());

    // Set up storage change listener for real-time updates
    this.setupStorageListener();
  }

  // Set up listener for storage changes (when jobs are tracked from content script)
  setupStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        // Check if any of the storage keys that start with 'trackedJobs_' have changed
        const trackedJobsKeys = Object.keys(changes).filter(key => key.startsWith('trackedJobs_'));

        if (trackedJobsKeys.length > 0) {
          const changedKey = trackedJobsKeys[0];
          const currentKey = this.getStorageKey();

          // Only reload if the current user's jobs have changed
          if (changedKey === currentKey) {
            console.log('[Job Tracker] 🔄 Storage updated, reloading jobs...');
            this.loadJobs().then(() => {
              console.log('[Job Tracker] ✅ Jobs reloaded from storage:', this.jobs.length, 'jobs');
              // Notify listeners that jobs have changed
              this.notifyStorageChangeListeners();
            });
          }
        }
      });
    }
  }

  // Register a callback to be notified when storage changes
  onStorageChange(callback) {
    this.storageChangeListeners.push(callback);
  }

  // Notify all listeners that storage has changed
  notifyStorageChangeListeners() {
    this.storageChangeListeners.forEach(callback => {
      try {
        callback(this.jobs);
      } catch (error) {
        console.error('[Job Tracker] Error in storage change listener:', error);
      }
    });
  }

  // Get storage key namespaced by userId to prevent data leakage between users
  getStorageKey() {
    const userId = this.getCurrentUserId();
    return userId ? `trackedJobs_${userId}` : 'trackedJobs_anonymous';
  }

  // Get current user ID from auth manager
  getCurrentUserId() {
    if (this.currentUserId) return this.currentUserId;

    // Try to get from auth manager
    if (window.authManager?.currentUser?._id) {
      this.currentUserId = window.authManager.currentUser._id;
      return this.currentUserId;
    }

    // Try localStorage as fallback
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?._id) {
          this.currentUserId = user._id;
          return this.currentUserId;
        }
      }
    } catch (e) {}

    return null;
  }

  // Reload jobs for current user (call after login)
  async reloadForUser() {
    this.currentUserId = null; // Reset cached userId
    this.jobs = [];
    await this.loadJobs();
    console.log('[Job Tracker] 🔄 Reloaded jobs for user:', this.getCurrentUserId());
  }

  // Clear jobs for current user (call on logout)
  async clearUserData() {
    const storageKey = this.getStorageKey();
    console.log('[Job Tracker] 🗑️ Clearing cached data for key:', storageKey);

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove([storageKey]);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.error('[Job Tracker] Error clearing user data:', error);
    }

    this.jobs = [];
    this.currentUserId = null;
  }

  async loadJobs() {
    const storageKey = this.getStorageKey();

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Extension mode
        return new Promise((resolve) => {
          chrome.storage.local.get([storageKey], (result) => {
            this.jobs = result[storageKey] || [];
            resolve();
          });
        });
      } else {
        // Standalone mode - use localStorage
        const stored = localStorage.getItem(storageKey);
        this.jobs = stored ? JSON.parse(stored) : [];
        return Promise.resolve();
      }
    } catch (error) {
      console.log('[Job Tracker] Running in standalone mode');
      const storageKey = this.getStorageKey();
      const stored = localStorage.getItem(storageKey);
      this.jobs = stored ? JSON.parse(stored) : [];
      return Promise.resolve();
    }
  }

  async saveJobs() {
    const storageKey = this.getStorageKey();

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Extension mode
        return new Promise((resolve) => {
          const data = {};
          data[storageKey] = this.jobs;
          chrome.storage.local.set(data, () => {
            console.log('[Job Tracker] 💾 Saved', this.jobs.length, 'jobs');
            resolve();
          });
        });
      } else {
        // Standalone mode - use localStorage
        localStorage.setItem(storageKey, JSON.stringify(this.jobs));
        console.log('[Job Tracker] 💾 Saved', this.jobs.length, 'jobs');
        return Promise.resolve();
      }
    } catch (error) {
      console.error('[Job Tracker] Error saving jobs:', error);
      localStorage.setItem(storageKey, JSON.stringify(this.jobs));
      return Promise.resolve();
    }
  }

  // Create a new job application entry
  async addJob(jobData) {
    const job = {
      id: this.generateId(),
      company: jobData.company || 'Unknown Company',
      title: jobData.title || 'Unknown Position',
      description: jobData.description || '',
      descriptionHtml: jobData.descriptionHtml || '',
      location: jobData.location || '',
      salary: jobData.salary || '',
      workType: jobData.workType || 'Not specified', // onsite, remote, hybrid
      linkedinUrl: jobData.linkedinUrl || '',
      dateApplied: new Date().toISOString(),
      status: jobData.status || 'applied', // applied, interview, offer, rejected, withdrawn, saved
      resumeFile: null, // Will store base64 or file reference
      coverLetter: '',
      notes: jobData.notes || '',
      timeline: jobData.timeline || [
        {
          date: new Date().toISOString(),
          event: 'Application tracked',
          type: 'created'
        }
      ],
      tags: jobData.tags || [],
      priority: jobData.priority || 'medium', // low, medium, high
      deadline: jobData.deadline || null,
      contactPerson: jobData.contactPerson || '',
      contactEmail: jobData.contactEmail || '',
      interviewDates: [],
      followUpDate: null,
      archived: false
    };

    // Check for duplicates before adding
    const existingJob = this.findExistingJob(jobData);
    if (existingJob) {
      console.log('[Job Tracker] ⚠️ Job already exists:', existingJob.company, '-', existingJob.title, '(status:', existingJob.status, ')');
      return { duplicate: true, existingJob };
    }

    // Save to MongoDB if authenticated
    if (window.apiClient?.isAuthenticated()) {
      try {
        console.log('[Job Tracker] 📤 Creating job in MongoDB:', job.company, '-', job.title);
        const response = await window.apiClient.createJob(job);

        if (response.success && response.data) {
          // Use MongoDB _id and update the job object with server response
          job._id = response.data._id;
          // Merge any additional fields from server response
          Object.assign(job, response.data);
          console.log('[Job Tracker] ✅ Job created in MongoDB with ID:', job._id);
        }
      } catch (error) {
        console.error('[Job Tracker] ❌ Failed to create job in MongoDB:', error);
        console.warn('[Job Tracker] Continuing with local storage only');
        // Continue with local save even if MongoDB fails
      }
    } else {
      console.warn('[Job Tracker] Not authenticated, saving to local storage only');
    }

    // Save locally
    this.jobs.unshift(job); // Add to beginning
    await this.saveJobs();

    console.log('[Job Tracker] ✅ Added job:', job.company, '-', job.title);
    return job;
  }

  // Check if a job already exists in the tracker
  findExistingJob(jobData) {
    const normalizeString = (str) => (str || '').toLowerCase().trim();

    return this.jobs.find(existingJob => {
      // Match by LinkedIn Job ID (most reliable)
      if (jobData.linkedinJobId && existingJob.linkedinJobId) {
        if (jobData.linkedinJobId === existingJob.linkedinJobId) {
          return true;
        }
      }

      // Match by LinkedIn URL
      if (jobData.linkedinUrl && existingJob.linkedinUrl) {
        // Extract job ID from URL for comparison
        const getJobIdFromUrl = (url) => {
          const match = url.match(/\/jobs\/view\/(\d+)/);
          return match ? match[1] : null;
        };
        const newJobId = getJobIdFromUrl(jobData.linkedinUrl);
        const existingJobId = getJobIdFromUrl(existingJob.linkedinUrl);
        if (newJobId && existingJobId && newJobId === existingJobId) {
          return true;
        }
      }

      // Match by company + title (fallback)
      const sameCompany = normalizeString(jobData.company) === normalizeString(existingJob.company);
      const sameTitle = normalizeString(jobData.title) === normalizeString(existingJob.title);

      if (sameCompany && sameTitle) {
        return true;
      }

      return false;
    });
  }

  // Update job status
  async updateJobStatus(jobId, newStatus, note = '') {
    console.log(`[Job Tracker] 🔍 Looking for job with ID: ${jobId}`);
    console.log(`[Job Tracker] 📊 Total jobs in tracker: ${this.jobs.length}`);

    // Try to find by both id and _id (MongoDB uses _id)
    const job = this.jobs.find(j => j.id === jobId || j._id === jobId);

    if (!job) {
      console.error(`[Job Tracker] ❌ Job not found with ID: ${jobId}`);
      console.log(`[Job Tracker] Available job IDs:`, this.jobs.map(j => ({ id: j.id, _id: j._id })).slice(0, 5));
      return false;
    }

    console.log(`[Job Tracker] ✅ Found job: ${job.company} - ${job.title}`);

    job.status = newStatus;
    job.timeline.push({
      date: new Date().toISOString(),
      event: `Status changed to ${newStatus}`,
      type: 'status_change',
      note: note
    });

    // Update in API if authenticated
    if (window.apiClient?.isAuthenticated()) {
      try {
        const mongoId = job._id || job.id;
        await window.apiClient.updateJobStatus(mongoId, newStatus, note);
        console.log('[Job Tracker] 📝 Updated status in MongoDB:', job.company, '-', newStatus);

        // 🔥 CRITICAL FIX: Reload from API to get fresh data (cache was invalidated on backend)
        console.log('[Job Tracker] 🔄 Reloading jobs from API to get fresh data...');
        await this.loadJobs();
        console.log('[Job Tracker] ✅ Jobs reloaded from API');
      } catch (error) {
        console.error('[Job Tracker] Failed to update status in MongoDB:', error);
        // Continue with local update even if API fails
        await this.saveJobs();
      }
    } else {
      // Offline mode - just save locally
      await this.saveJobs();
    }

    console.log('[Job Tracker] 📝 Updated status:', job.company, '-', newStatus);
    return true;
  }

  // Update job details
  async updateJob(jobId, updates) {
    // Find job by id or _id (MongoDB compatibility)
    const job = this.jobs.find(j => j.id === jobId || j._id === jobId);
    if (!job) {
      console.error('[Job Tracker] Job not found for update:', jobId);
      return false;
    }

    console.log('[Job Tracker] Updating job:', job.company, 'with updates:', Object.keys(updates));

    Object.assign(job, updates);

    job.timeline.push({
      date: new Date().toISOString(),
      event: 'Job details updated',
      type: 'update'
    });

    // Save locally first
    await this.saveJobs();
    console.log('[Job Tracker] 💾 Saved locally');

    // Update in API if authenticated
    if (window.apiClient?.isAuthenticated()) {
      try {
        const mongoId = job._id || job.id;
        console.log('[Job Tracker] 📤 Syncing to MongoDB with ID:', mongoId);

        await window.apiClient.updateJob(mongoId, job);
        console.log('[Job Tracker] ✅ Updated job in MongoDB:', job.company);
      } catch (error) {
        console.error('[Job Tracker] ❌ Failed to update job in MongoDB:', error);
        // Continue with local update even if API fails
      }
    } else {
      console.warn('[Job Tracker] Not authenticated, skipping MongoDB sync');
    }

    return true;
  }

  // Delete job
  async deleteJob(jobId) {
    // Find job by id or _id (MongoDB compatibility)
    const index = this.jobs.findIndex(j => j.id === jobId || j._id === jobId);
    if (index === -1) {
      console.error('[Job Tracker] Job not found for deletion:', jobId);
      return false;
    }

    const job = this.jobs[index];
    console.log('[Job Tracker] 🗑️ Deleting job:', job.company, '-', job.title);

    // Delete from API if authenticated
    if (window.apiClient?.isAuthenticated()) {
      try {
        // Try to find the MongoDB _id from the job
        const mongoId = job._id || job.id;
        console.log('[Job Tracker] 🗑️ Deleting from MongoDB with ID:', mongoId);
        await window.apiClient.deleteJob(mongoId);
        console.log('[Job Tracker] ✅ Deleted from MongoDB:', job.company, '-', job.title);
      } catch (error) {
        console.error('[Job Tracker] ❌ Failed to delete from MongoDB:', error);
        // Continue with local deletion even if API fails
      }
    }

    // Delete from local storage
    this.jobs.splice(index, 1);
    await this.saveJobs();

    console.log('[Job Tracker] ✅ Deleted job from local storage:', job.company, '-', job.title);
    return true;
  }

  // Search and filter jobs
  searchJobs(query, filters = {}) {
    let results = [...this.jobs];

    // Text search
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(job => 
        job.company.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      results = results.filter(job => job.status === filters.status);
    }

    // Filter by work type
    if (filters.workType && filters.workType !== 'all') {
      results = results.filter(job => job.workType === filters.workType);
    }

    // Filter by date range
    if (filters.dateFrom) {
      results = results.filter(job => new Date(job.dateApplied) >= new Date(filters.dateFrom));
    }
    if (filters.dateTo) {
      results = results.filter(job => new Date(job.dateApplied) <= new Date(filters.dateTo));
    }

    return results;
  }

  generateId() {
    return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Find and remove duplicate jobs
  async findDuplicates() {
    const duplicates = [];
    const seen = new Map(); // Track unique jobs by LinkedIn ID or company+title

    this.jobs.forEach((job, index) => {
      // Extract LinkedIn job ID
      const linkedinId = job.linkedinUrl?.match(/\/jobs\/view\/(\d+)/)?.[1];

      // Create unique key
      let uniqueKey;
      if (linkedinId) {
        uniqueKey = `linkedin_${linkedinId}`;
      } else {
        // Fallback to company + title
        uniqueKey = `${job.company.toLowerCase().trim()}_${job.title.toLowerCase().trim()}`;
      }

      if (seen.has(uniqueKey)) {
        // This is a duplicate!
        const originalIndex = seen.get(uniqueKey);
        duplicates.push({
          duplicate: job,
          duplicateIndex: index,
          original: this.jobs[originalIndex],
          originalIndex: originalIndex,
          matchedBy: linkedinId ? 'LinkedIn ID' : 'Company + Title',
          uniqueKey: uniqueKey
        });
      } else {
        // First time seeing this job
        seen.set(uniqueKey, index);
      }
    });

    return duplicates;
  }

  async removeDuplicates(dryRun = true) {
    const duplicates = await this.findDuplicates();

    if (duplicates.length === 0) {
      console.log('[Job Tracker] ✅ No duplicates found!');
      return {
        found: 0,
        removed: 0,
        duplicates: []
      };
    }

    console.log(`[Job Tracker] 🔍 Found ${duplicates.length} duplicate(s)`);

    if (dryRun) {
      // Just report what would be removed
      console.log('[Job Tracker] 📋 DRY RUN - No jobs will be removed');
      duplicates.forEach((dup, i) => {
        console.log(`\n${i + 1}. DUPLICATE:`);
        console.log(`   Company: ${dup.duplicate.company}`);
        console.log(`   Title: ${dup.duplicate.title}`);
        console.log(`   Applied: ${new Date(dup.duplicate.dateApplied).toLocaleDateString()}`);
        console.log(`   Matched by: ${dup.matchedBy}`);
        console.log(`   Will keep: ${dup.original.company} (applied ${new Date(dup.original.dateApplied).toLocaleDateString()})`);
      });

      return {
        found: duplicates.length,
        removed: 0,
        duplicates: duplicates
      };
    }

    // Actually remove duplicates (keep the first occurrence)
    // Sort by index in reverse order to avoid index shifting issues
    const indicesToRemove = duplicates
      .map(dup => dup.duplicateIndex)
      .sort((a, b) => b - a); // Descending order

    const removedJobs = [];
    indicesToRemove.forEach(index => {
      const removed = this.jobs.splice(index, 1)[0];
      removedJobs.push(removed);
      console.log(`[Job Tracker] 🗑️ Removed duplicate: ${removed.company} - ${removed.title}`);
    });

    await this.saveJobs();

    console.log(`[Job Tracker] ✅ Removed ${removedJobs.length} duplicate(s)`);

    return {
      found: duplicates.length,
      removed: removedJobs.length,
      duplicates: duplicates,
      removedJobs: removedJobs
    };
  }
}

// Make it globally available
window.jobTracker = new JobTracker();

