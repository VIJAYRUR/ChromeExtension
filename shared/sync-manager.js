// Sync Manager - Handles data synchronization between local storage and cloud
// Supports offline-first with automatic sync when online

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncQueue = [];
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.currentUserId = null;
    this.SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    this.init();
  }

  // Get current user ID from auth manager
  getCurrentUserId() {
    if (this.currentUserId) return this.currentUserId;

    if (window.authManager?.currentUser?._id) {
      this.currentUserId = window.authManager.currentUser._id;
      return this.currentUserId;
    }

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

  // Get storage key namespaced by userId
  getStorageKey(baseKey) {
    const userId = this.getCurrentUserId();
    return userId ? `${baseKey}_${userId}` : `${baseKey}_anonymous`;
  }

  // Reset user-specific state (call on logout)
  resetUserState() {
    this.currentUserId = null;
    this.syncQueue = [];
    this.lastSyncTime = null;
  }

  async init() {
    // Load last sync time
    await this.loadLastSyncTime();

    // Set up online/offline listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Start periodic sync if authenticated
    if (window.apiClient?.isAuthenticated()) {
      this.startPeriodicSync();
    }

    console.log('[Sync Manager] Initialized', { isOnline: this.isOnline });
  }

  async loadLastSyncTime() {
    const storageKey = this.getStorageKey('lastSyncTime');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([storageKey]);
        this.lastSyncTime = result[storageKey] ? new Date(result[storageKey]) : null;
      } else {
        const stored = localStorage.getItem(storageKey);
        this.lastSyncTime = stored ? new Date(stored) : null;
      }
    } catch (error) {
      console.error('[Sync Manager] Error loading last sync time:', error);
    }
  }

  async saveLastSyncTime() {
    const storageKey = this.getStorageKey('lastSyncTime');
    const now = new Date().toISOString();
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = {};
        data[storageKey] = now;
        await chrome.storage.local.set(data);
      } else {
        localStorage.setItem(storageKey, now);
      }
      this.lastSyncTime = new Date(now);
    } catch (error) {
      console.error('[Sync Manager] Error saving last sync time:', error);
    }
  }

  handleOnline() {
    console.log('[Sync Manager] Back online');
    this.isOnline = true;

    // Process any queued operations
    this.processQueue();

    // Perform a full sync
    this.syncAll();
  }

  handleOffline() {
    console.log('[Sync Manager] Gone offline');
    this.isOnline = false;
  }

  startPeriodicSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline && window.apiClient?.isAuthenticated()) {
        this.syncAll();
      }
    }, this.SYNC_INTERVAL_MS);

    console.log('[Sync Manager] Periodic sync started');
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[Sync Manager] Periodic sync stopped');
    }
  }

  // ==================== Queue Management ====================

  queueOperation(operation) {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now()
    });

    // Save queue to storage
    this.saveQueue();

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  async saveQueue() {
    const storageKey = this.getStorageKey('syncQueue');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = {};
        data[storageKey] = this.syncQueue;
        await chrome.storage.local.set(data);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(this.syncQueue));
      }
    } catch (error) {
      console.error('[Sync Manager] Error saving queue:', error);
    }
  }

  async loadQueue() {
    const storageKey = this.getStorageKey('syncQueue');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([storageKey]);
        this.syncQueue = result[storageKey] || [];
      } else {
        const stored = localStorage.getItem(storageKey);
        this.syncQueue = stored ? JSON.parse(stored) : [];
      }
    } catch (error) {
      console.error('[Sync Manager] Error loading queue:', error);
    }
  }

  async processQueue() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    console.log(`[Sync Manager] Processing ${this.syncQueue.length} queued operations`);

    const failedOperations = [];

    for (const operation of this.syncQueue) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('[Sync Manager] Operation failed:', error);
        failedOperations.push(operation);
      }
    }

    // Keep failed operations in queue
    this.syncQueue = failedOperations;
    await this.saveQueue();

    this.isSyncing = false;
  }

  async executeOperation(operation) {
    const { type, data } = operation;

    switch (type) {
      case 'create_job':
        await window.apiClient.createJob(data);
        break;
      case 'update_job':
        await window.apiClient.updateJob(data.id, data);
        break;
      case 'delete_job':
        await window.apiClient.deleteJob(data.id);
        break;
      case 'update_status':
        await window.apiClient.updateJobStatus(data.id, data.status, data.note);
        break;
      case 'update_profile':
        await window.apiClient.updateProfile(data);
        break;
      default:
        console.warn('[Sync Manager] Unknown operation type:', type);
    }
  }

  // ==================== Full Sync ====================

  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;

    if (!window.apiClient?.isAuthenticated()) {
      console.log('[Sync Manager] Not authenticated, skipping sync');
      return;
    }

    this.isSyncing = true;
    console.log('[Sync Manager] Starting full sync...');

    try {
      // Sync jobs
      await this.syncJobs();

      // Sync profile
      await this.syncProfile();

      await this.saveLastSyncTime();
      console.log('[Sync Manager] Full sync completed');

      // Dispatch sync complete event
      window.dispatchEvent(new CustomEvent('syncComplete', {
        detail: { timestamp: this.lastSyncTime }
      }));

    } catch (error) {
      console.error('[Sync Manager] Sync failed:', error);

      // Dispatch sync error event
      window.dispatchEvent(new CustomEvent('syncError', {
        detail: { error: error.message }
      }));
    } finally {
      this.isSyncing = false;
    }
  }

  async syncJobs() {
    const storageKey = this.getStorageKey('trackedJobs');
    try {
      // Get local jobs
      let localJobs = [];
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([storageKey]);
        localJobs = result[storageKey] || [];
      } else {
        const stored = localStorage.getItem(storageKey);
        localJobs = stored ? JSON.parse(stored) : [];
      }

      if (localJobs.length === 0) {
        // No local jobs, just pull from server
        const response = await window.apiClient.getJobs({ limit: 1000 });
        if (response.success) {
          await this.saveLocalJobs(response.data.jobs);
        }
        return;
      }

      // Sync local jobs to server
      const response = await window.apiClient.syncJobs(localJobs);

      if (response.success) {
        console.log(`[Sync Manager] Jobs synced: ${response.data.created} created, ${response.data.updated} updated`);

        // Pull all jobs from server to get the canonical state
        const pullResponse = await window.apiClient.getJobs({ limit: 1000 });
        if (pullResponse.success) {
          await this.saveLocalJobs(pullResponse.data.jobs);
        }
      }
    } catch (error) {
      console.error('[Sync Manager] Job sync failed:', error);
      throw error;
    }
  }

  async syncProfile() {
    const storageKey = this.getStorageKey('userProfile');
    try {
      // Get local profile
      let localProfile = null;
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([storageKey]);
        localProfile = result[storageKey];
      } else {
        const stored = localStorage.getItem(storageKey);
        localProfile = stored ? JSON.parse(stored) : null;
      }

      if (localProfile) {
        // Push local profile to server
        await window.apiClient.syncProfile(localProfile);
      }

      // Pull profile from server
      const response = await window.apiClient.getProfile();
      if (response.success) {
        await this.saveLocalProfile(response.data);
      }
    } catch (error) {
      console.error('[Sync Manager] Profile sync failed:', error);
      // Don't throw - profile sync failure shouldn't stop job sync
    }
  }

  async saveLocalJobs(jobs) {
    // Convert server jobs to local format
    const localJobs = jobs.map(job => ({
      id: job._id,
      company: job.company,
      title: job.title,
      description: job.description,
      descriptionHtml: job.descriptionHtml,
      location: job.location,
      salary: job.salary,
      workType: job.workType,
      linkedinUrl: job.linkedinUrl || job.jobUrl,
      dateApplied: job.dateApplied,
      status: job.status,
      resumeFile: job.resumeUsed,
      coverLetter: job.coverLetter,
      notes: job.notes,
      timeline: job.timeline,
      tags: job.tags,
      priority: job.priority,
      deadline: job.deadline,
      contactPerson: job.contactPerson,
      contactEmail: job.contactEmail,
      interviewDates: job.interviews?.map(i => i.date) || [],
      followUpDate: job.followUpDate,
      archived: job.isArchived
    }));

    const storageKey = this.getStorageKey('trackedJobs');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = {};
        data[storageKey] = localJobs;
        await chrome.storage.local.set(data);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(localJobs));
      }
      console.log(`[Sync Manager] Saved ${localJobs.length} jobs locally for user:`, this.getCurrentUserId());
    } catch (error) {
      console.error('[Sync Manager] Error saving local jobs:', error);
    }
  }

  async saveLocalProfile(profile) {
    // Convert server profile to local format
    const localProfile = {
      ...profile,
      // Ensure all expected fields exist
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      fullName: profile.fullName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      phoneCountryCode: profile.phoneCountryCode || '+1',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || '',
      linkedin: profile.linkedin || '',
      github: profile.github || '',
      portfolio: profile.portfolio || '',
      professionalSummary: profile.professionalSummary || '',
      experiences: profile.experiences || [],
      education: profile.education || [],
      skills: profile.skills || '',
      skillsArray: profile.skillsArray || [],
      workAuthorization: profile.workAuthorization || '',
      workAuthorizationType: profile.workAuthorizationType || '',
      requireSponsorship: profile.requireSponsorship || '',
      resumeFile: profile.resumeFile || null,
      coverLetterFile: profile.coverLetterFile || null
    };

    const storageKey = this.getStorageKey('userProfile');
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = {};
        data[storageKey] = localProfile;
        await chrome.storage.local.set(data);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(localProfile));
      }
      console.log('[Sync Manager] Profile saved locally for user:', this.getCurrentUserId());
    } catch (error) {
      console.error('[Sync Manager] Error saving local profile:', error);
    }
  }

  // ==================== Manual Sync Triggers ====================

  async pullFromCloud() {
    if (!window.apiClient?.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    // Pull jobs
    const jobsResponse = await window.apiClient.getJobs({ limit: 1000 });
    if (jobsResponse.success) {
      await this.saveLocalJobs(jobsResponse.data.jobs);
    }

    // Pull profile
    const profileResponse = await window.apiClient.getProfile();
    if (profileResponse.success) {
      await this.saveLocalProfile(profileResponse.data);
    }

    await this.saveLastSyncTime();
    return { jobs: jobsResponse.data?.jobs?.length || 0 };
  }

  async pushToCloud() {
    if (!window.apiClient?.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const jobsKey = this.getStorageKey('trackedJobs');
    const profileKey = this.getStorageKey('userProfile');

    // Push jobs
    let localJobs = [];
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([jobsKey]);
      localJobs = result[jobsKey] || [];
    } else {
      const stored = localStorage.getItem(jobsKey);
      localJobs = stored ? JSON.parse(stored) : [];
    }

    const jobsResponse = await window.apiClient.syncJobs(localJobs);

    // Push profile
    let localProfile = null;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([profileKey]);
      localProfile = result[profileKey];
    } else {
      const stored = localStorage.getItem(profileKey);
      localProfile = stored ? JSON.parse(stored) : null;
    }

    if (localProfile) {
      await window.apiClient.syncProfile(localProfile);
    }

    await this.saveLastSyncTime();
    return jobsResponse.data;
  }

  // ==================== Status ====================

  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.syncQueue.length,
      isAuthenticated: window.apiClient?.isAuthenticated() || false
    };
  }
}

// Export singleton
if (typeof window !== 'undefined') {
  window.SyncManager = SyncManager;
  window.syncManager = new SyncManager();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncManager;
}
