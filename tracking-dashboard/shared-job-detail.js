/**
 * Shared Job Detail Page
 * Displays full details of a job shared in a group
 */

class SharedJobDetailPage {
  constructor() {
    this.jobId = null;
    this.groupId = null;
    this.job = null;
    this.init();
  }

  async init() {
    console.log('[Shared Job Detail] Initializing...');

    // Get job ID and group ID from URL
    const params = new URLSearchParams(window.location.search);
    this.jobId = params.get('jobId');
    this.groupId = params.get('groupId');

    if (!this.jobId || !this.groupId) {
      this.showError('Invalid job link');
      return;
    }

    // Wait for authentication
    try {
      await this.waitForAuth();
    } catch (error) {
      console.error('[Shared Job Detail] Auth error:', error);
      this.showError('Authentication required');
      setTimeout(() => {
        window.location.href = '../auth/login.html';
      }, 2000);
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Load job data
    await this.loadJob();
  }

  async waitForAuth() {
    // First, wait for authManager to exist
    let attempts = 0;
    while (!window.authManager && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.authManager) {
      throw new Error('AuthManager not loaded');
    }

    console.log('[Shared Job Detail] AuthManager found, initializing...');

    // Initialize authManager if not already initialized
    if (!window.authManager.initialized) {
      console.log('[Shared Job Detail] Calling authManager.init()...');
      await window.authManager.init();
      console.log('[Shared Job Detail] AuthManager initialized');
    }

    // Check if user is authenticated
    if (!window.authManager.token) {
      console.error('[Shared Job Detail] No auth token found');
      throw new Error('Not authenticated');
    }

    console.log('[Shared Job Detail] Auth ready, token exists');
  }

  setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }

    // Save to tracker button
    const saveBtn = document.getElementById('save-job-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveToTracker());
    }
  }

  async loadJob() {
    try {
      console.log('[Shared Job Detail] Loading job:', this.jobId);

      // Show loading state
      document.getElementById('loading-state').style.display = 'flex';
      document.getElementById('job-content').style.display = 'none';
      document.getElementById('error-state').style.display = 'none';

      // Fetch job details from API
      const response = await fetch(
        `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${this.groupId}/jobs/${this.jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${window.authManager.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load job details');
      }

      const data = await response.json();
      this.job = data.data;

      console.log('[Shared Job Detail] Job loaded:', this.job);

      // Render job
      this.render();

      // Hide loading, show content
      document.getElementById('loading-state').style.display = 'none';
      document.getElementById('job-content').style.display = 'block';

    } catch (error) {
      console.error('[Shared Job Detail] Error loading job:', error);
      this.showError('Failed to load job details');
    }
  }

  render() {
    const jobContent = document.getElementById('job-content');
    if (!jobContent || !this.job) return;

    const job = this.job.jobId || this.job;
    const sharedByObj = this.job.sharedBy || {};
    const sharedBy = sharedByObj.name ||
      (sharedByObj.firstName && sharedByObj.lastName ? `${sharedByObj.firstName} ${sharedByObj.lastName}` :
      (sharedByObj.firstName || sharedByObj.email || 'Someone'));
    const sharedAt = this.job.sharedAt ? this.formatTimeAgo(this.job.sharedAt) : '';
    const companyInitial = (job.company || 'C').charAt(0).toUpperCase();

    // Build details items - only include if they have values
    const detailItems = [];
    if (job.location) {
      detailItems.push({ label: 'Location', value: this.escapeHtml(job.location) });
    }
    if (job.workType) {
      detailItems.push({ label: 'Work Type', value: this.escapeHtml(job.workType) });
    }
    if (job.jobType) {
      detailItems.push({ label: 'Job Type', value: this.escapeHtml(job.jobType) });
    }
    if (job.salary) {
      detailItems.push({ label: 'Compensation', value: this.escapeHtml(job.salary) });
    }
    if (job.applicationDeadline) {
      detailItems.push({ label: 'Deadline', value: this.formatDate(job.applicationDeadline) });
    }

    jobContent.innerHTML = `
      <!-- Job Header - Notion Page Style -->
      <div class="job-header">
        <div class="job-header-top">
          <div class="company-logo">${companyInitial}</div>
          <div class="job-header-info">
            <h1 class="job-title">${this.escapeHtml(job.position || job.title || 'Unknown Position')}</h1>
            <div class="job-company">${this.escapeHtml(job.company || 'Unknown Company')}</div>
            <div class="job-meta-info">
              <span>Shared by ${this.escapeHtml(sharedBy)}</span>
              ${sharedAt ? `<span>• ${sharedAt}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Properties Grid - Notion Style -->
        ${detailItems.length > 0 ? `
          <div class="job-details-grid">
            ${detailItems.map(item => `
              <div class="detail-item">
                <div class="detail-label">${item.label}</div>
                <div class="detail-value">${item.value}</div>
              </div>
            `).join('')}
            ${job.link || job.linkedinUrl ? `
              <div class="detail-item">
                <div class="detail-label">Link</div>
                <div class="detail-value">
                  <a href="${this.escapeHtml(job.link || job.linkedinUrl)}" target="_blank" style="color: var(--accent-blue); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    View Original
                  </a>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Job Description - Notion Content Block -->
      ${job.description || job.descriptionHtml ? `
        <div class="job-section">
          <h2 class="section-title">Description</h2>
          <div class="job-description formatted">${this.formatDescription(job)}</div>
        </div>
      ` : ''}
    `;
  }

  formatDescription(job) {
    // Use linkedInCleaner for both HTML and plain text to get proper structure
    if (window.linkedInCleaner) {
      if (job.descriptionHtml) {
        // Has HTML - clean and format it
        return window.linkedInCleaner.format(job.descriptionHtml);
      } else if (job.description) {
        // Plain text - structure it into paragraphs and headings
        return window.linkedInCleaner.structureContent(this.escapeHtml(job.description));
      }
    } else {
      // No cleaner available - basic formatting
      if (job.descriptionHtml) {
        return job.descriptionHtml;
      } else if (job.description) {
        return `<p>${this.escapeHtml(job.description).replace(/\n/g, '<br>')}</p>`;
      }
    }
    return '<p>No description available</p>';
  }

  formatTimeAgo(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return 'just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Less than 30 days
    if (diff < 2592000000) {
      const weeks = Math.floor(diff / 604800000);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }

    // Format as date
    return date.toLocaleDateString();
  }

  formatDate(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    console.error('[Shared Job Detail] Error:', message);

    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('job-content').style.display = 'none';
    document.getElementById('error-state').style.display = 'flex';
  }

  async saveToTracker() {
    try {
      console.log('[Shared Job Detail] Saving job to tracker...');

      const job = this.job.jobId || this.job;

      // Save to Chrome local storage (for dashboard)
      await this.saveToLocalStorage(job);

      // Also save to backend (for sync across devices)
      try {
        const response = await fetch(
          `${window.API_CONFIG.API_URL.replace('/api', '')}/api/groups/${this.groupId}/jobs/${this.jobId}/save`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${window.authManager.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          console.log('[Shared Job Detail] Job also saved to backend');
        }
      } catch (backendError) {
        console.warn('[Shared Job Detail] Backend save failed, but local save succeeded:', backendError);
      }

      alert('Job saved to your tracker successfully!');

      // Optionally redirect to dashboard
      // window.location.href = 'dashboard.html';

    } catch (error) {
      console.error('[Shared Job Detail] Error saving job:', error);
      alert('Failed to save job. Please try again.');
    }
  }

  async saveToLocalStorage(job) {
    // Wait for job tracker to be available
    let attempts = 0;
    while (!window.jobTracker && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.jobTracker) {
      throw new Error('Job tracker not available');
    }

    // Prepare job data for local storage
    const jobData = {
      company: job.company || 'Unknown Company',
      title: job.position || job.title || 'Unknown Position',
      description: job.description || '',
      descriptionHtml: job.descriptionHtml || '',
      location: job.location || '',
      salary: job.salary || '',
      workType: job.workType || 'Not specified',
      jobType: job.jobType || '',
      linkedinUrl: job.link || job.linkedinUrl || job.jobUrl || '',
      jobUrl: job.link || job.jobUrl || '',
      linkedinJobId: job.linkedinJobId || '',
      source: `Shared in group`,
      jobPostedHoursAgo: job.jobPostedHoursAgo || null,
      applicantCount: job.applicantCount || null,
      timeToApplyBucket: job.timeToApplyBucket || null,
      competitionBucket: job.competitionBucket || null,
      status: 'saved',
      dateApplied: null,
      dateSaved: new Date().toISOString()
    };

    // Add job using job tracker
    await window.jobTracker.addJob(jobData);
    console.log('[Shared Job Detail] Job saved to local storage');
  }
}

// Initialize page
new SharedJobDetailPage();

