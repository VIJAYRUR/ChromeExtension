// Job Detail Page Controller

class JobDetailPage {
  constructor() {
    this.jobId = null;
    this.job = null;
    this.init();
  }

  async init() {
    console.log('[Job Detail] 🚀 Initializing job detail page...');

    // Get job ID from URL
    const params = new URLSearchParams(window.location.search);
    this.jobId = params.get('id');

    console.log('[Job Detail] Job ID from URL:', this.jobId);

    if (!this.jobId) {
      alert('Job not found');
      window.close();
      return;
    }

    // Wait for tracker to load
    await this.waitForTracker();

    // Load job data (don't trigger sync here to preserve recent uploads)
    await this.loadJob();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize global notifications
    this.setupGlobalNotifications();

    // Render job data
    this.render();

    console.log('[Job Detail] ✅ Job detail page initialized');
  }

  setupGlobalNotifications() {
    // Initialize global notifications
    if (window.globalNotifications) {
      window.globalNotifications.injectInto('#notification-bell-wrapper');
      console.log('[Job Detail] ✅ Global notifications initialized');
    } else {
      console.warn('[Job Detail] Global notifications not available');
    }
  }

  async waitForTracker() {
    console.log('[Job Detail] Waiting for JobTracker...');
    let attempts = 0;
    while (!window.jobTracker && attempts < 50) { // 5 seconds max
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.jobTracker) {
      throw new Error('JobTracker not available after 5 seconds');
    }

    // Wait for jobs to be loaded
    console.log('[Job Detail] JobTracker found, waiting for jobs to load...');
    attempts = 0;
    while (!window.jobTracker.isLoaded && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // Wait for auth if needed
    if (window.authManager && !window.authManager.initialized) {
      console.log('[Job Detail] Waiting for auth manager...');
      await window.authManager.init();
    }

    // CRITICAL: Reload jobs for the authenticated user if user ID changed
    // JobTracker might have loaded with user: null before auth initialized
    const currentUserId = window.jobTracker.getCurrentUserId();
    console.log('[Job Detail] Current user ID:', currentUserId);

    if (currentUserId && window.jobTracker.jobs.length === 0) {
      console.log('[Job Detail] 🔄 Reloading jobs for authenticated user...');
      await window.jobTracker.reloadForUser();
      console.log('[Job Detail] ✅ Reloaded:', window.jobTracker.jobs.length, 'jobs');
    }

    console.log('[Job Detail] JobTracker ready with', window.jobTracker.jobs.length, 'jobs');
  }

  async loadJob() {
    await window.jobTracker.loadJobs();

    // Try to find job by id or _id (MongoDB compatibility)
    this.job = window.jobTracker.jobs.find(j =>
      j.id === this.jobId || j._id === this.jobId
    );

    if (!this.job) {
      console.error('[Job Detail] Job not found with ID:', this.jobId);
      console.error('[Job Detail] Available jobs:', window.jobTracker.jobs.map(j => ({ id: j.id, _id: j._id, title: j.title })));
      alert('Job not found. The job may have been deleted or not synced yet.');
      window.close();
    }
  }

  setupEventListeners() {
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
      window.close();
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveChanges();
    });

    // Delete button
    document.getElementById('delete-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this job application?')) {
        this.deleteJob();
      }
    });

    // Work Type - Update color on change
    const workTypeSelect = document.getElementById('work-type');
    if (workTypeSelect) {
      workTypeSelect.addEventListener('change', (e) => {
        this.updateWorkTypeColor(e.target);
      });
    }

    // Status - Update color on change
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.updateStatusColor(e.target);
      });
    }

    // Resume upload
    document.getElementById('upload-btn').addEventListener('click', () => {
      document.getElementById('resume-upload').click();
    });

    document.getElementById('resume-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleResumeUpload(file);
      }
    });

    // View resume
    const viewResumeBtn = document.getElementById('view-resume');
    if (viewResumeBtn) {
      viewResumeBtn.addEventListener('click', () => {
        this.viewResume();
      });
    }

    // Download resume
    const downloadResumeBtn = document.getElementById('download-resume');
    if (downloadResumeBtn) {
      downloadResumeBtn.addEventListener('click', () => {
        this.downloadResume();
      });
    }

    // Remove resume
    const removeResumeBtn = document.getElementById('remove-resume');
    if (removeResumeBtn) {
      removeResumeBtn.addEventListener('click', () => {
        this.removeResume();
      });
    }

    // Description view toggle
    const viewFormattedBtn = document.getElementById('view-formatted');
    const viewPlainBtn = document.getElementById('view-plain');

    if (viewFormattedBtn) {
      viewFormattedBtn.addEventListener('click', () => {
        this.showFormattedDescription();
      });
    }

    if (viewPlainBtn) {
      viewPlainBtn.addEventListener('click', () => {
        this.showPlainDescription();
      });
    }
  }

  showFormattedDescription() {
    const formattedDiv = document.getElementById('description-formatted');
    const plainTextarea = document.getElementById('description');
    const viewFormattedBtn = document.getElementById('view-formatted');
    const viewPlainBtn = document.getElementById('view-plain');

    if (formattedDiv) formattedDiv.style.display = 'block';
    if (plainTextarea) plainTextarea.style.display = 'none';
    if (viewFormattedBtn) viewFormattedBtn.classList.add('active');
    if (viewPlainBtn) viewPlainBtn.classList.remove('active');
  }

  showPlainDescription() {
    const formattedDiv = document.getElementById('description-formatted');
    const plainTextarea = document.getElementById('description');
    const viewFormattedBtn = document.getElementById('view-formatted');
    const viewPlainBtn = document.getElementById('view-plain');

    if (formattedDiv) formattedDiv.style.display = 'none';
    if (plainTextarea) plainTextarea.style.display = 'block';
    if (viewFormattedBtn) viewFormattedBtn.classList.remove('active');
    if (viewPlainBtn) viewPlainBtn.classList.add('active');
  }

  render() {
    // Populate form fields
    document.getElementById('job-title').value = this.job.title || '';
    document.getElementById('job-company').value = this.job.company || '';
    document.getElementById('location').value = this.job.location || '';
    document.getElementById('salary').value = this.job.salary || '';

    // Work Type with color styling
    const workTypeSelect = document.getElementById('work-type');
    workTypeSelect.value = this.job.workType || 'Not specified';
    this.updateWorkTypeColor(workTypeSelect);

    // Status with color styling
    const statusSelect = document.getElementById('status');
    statusSelect.value = this.job.status || 'applied';
    this.updateStatusColor(statusSelect);

    document.getElementById('description').value = this.job.description || '';
    document.getElementById('notes').value = this.job.notes || '';

    // Date Applied
    const dateAppliedInput = document.getElementById('date-applied');
    if (dateAppliedInput && this.job.dateApplied) {
      const date = new Date(this.job.dateApplied);
      dateAppliedInput.value = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Render formatted description
    const formattedDiv = document.getElementById('description-formatted');
    if (formattedDiv) {
      console.log('[Job Detail] Has descriptionHtml:', !!this.job.descriptionHtml);
      console.log('[Job Detail] descriptionHtml length:', this.job.descriptionHtml?.length || 0);
      console.log('[Job Detail] linkedInCleaner available:', !!window.linkedInCleaner);

      if (this.job.descriptionHtml && window.linkedInCleaner) {
        // LinkedIn provides HTML - clean it up and display
        const formatted = window.linkedInCleaner.format(this.job.descriptionHtml);
        console.log('[Job Detail] Formatted HTML length:', formatted?.length || 0);
        formattedDiv.innerHTML = formatted;

        // Extract skills for future colored pills
        this.extractedSkills = window.linkedInCleaner.extractSkills(this.job.descriptionHtml);
        console.log('[Job Detail] Extracted skills:', this.extractedSkills);
      } else if (this.job.description) {
        // Fallback: plain text description
        console.log('[Job Detail] Using plain text fallback');
        formattedDiv.innerHTML = `<p>${this.job.description.replace(/\n/g, '<br>')}</p>`;
      } else {
        formattedDiv.innerHTML = this.renderEmptyState('📄', 'No description', 'Job description will appear here');
      }
    }

    // LinkedIn URL
    const linkedinLink = document.getElementById('linkedin-url');
    if (this.job.linkedinUrl) {
      linkedinLink.href = this.job.linkedinUrl;
      linkedinLink.style.display = 'inline-flex';
    } else {
      linkedinLink.style.display = 'none';
    }

    // Timing and Competition Badges
    this.renderTimingBadge();
    this.renderCompetitionBadge();

    // Update resume state
    this.updateResumeState();

    // Render timeline
    this.renderTimeline();
  }

  // Update work type select color based on value
  updateWorkTypeColor(select) {
    // Remove all work type classes
    select.classList.remove('work-type-remote', 'work-type-hybrid', 'work-type-onsite', 'work-type-not-specified');

    // Add appropriate class based on value
    const value = select.value.toLowerCase().replace(/\s+/g, '-');
    select.classList.add(`work-type-${value}`);
  }

  // Update status select color based on value
  updateStatusColor(select) {
    // Remove all status classes
    select.classList.remove('status-applied', 'status-interview', 'status-offer', 'status-rejected', 'status-withdrawn');

    // Add appropriate class based on value
    select.classList.add(`status-${select.value}`);
  }

  updateResumeState() {
    const emptyState = document.getElementById('resume-empty-state');
    const uploadedState = document.getElementById('resume-uploaded-state');
    const fileName = document.getElementById('file-name');

    console.log('[Job Detail] 📄 Resume state (S3):', {
      hasFileName: !!this.job.resumeFileName,
      fileName: this.job.resumeFileName,
      fileSize: this.job.resumeFileSize,
      resumeS3Key: this.job.resumeS3Key,
      uploadedAt: this.job.resumeUploadedAt
    });

    if (this.job.resumeFileName) {
      emptyState.style.display = 'none';
      uploadedState.style.display = 'block';

      // Format file size
      let fileInfo = this.job.resumeFileName;
      if (this.job.resumeFileSize) {
        const sizeKB = (this.job.resumeFileSize / 1024).toFixed(1);
        const sizeMB = (this.job.resumeFileSize / (1024 * 1024)).toFixed(1);
        const sizeStr = this.job.resumeFileSize > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
        fileInfo += ` (${sizeStr})`;
      }

      fileName.textContent = fileInfo + ' ☁️'; // Cloud icon to indicate S3 storage
      console.log('[Job Detail] ✅ Showing S3 resume:', fileInfo);
    } else {
      emptyState.style.display = 'flex';
      uploadedState.style.display = 'none';
      console.log('[Job Detail] ℹ️ No resume uploaded');
    }
  }

  async handleResumeUpload(file) {
    // Get button and save original text (outside try block for scope)
    const uploadBtn = document.getElementById('upload-btn');
    const originalText = uploadBtn.innerHTML;

    try {
      console.log('[Job Detail] 📄 Uploading resume to S3:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');

      // Show loading state
      uploadBtn.innerHTML = 'Uploading to Cloud...';
      uploadBtn.disabled = true;

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('resume', file);

      // Get auth token
      const authToken = await window.apiClient.getToken();
      if (!authToken) {
        throw new Error('Not authenticated. Please log in.');
      }

      console.log('[Job Detail] 📤 Uploading to backend API...');

      // Upload to backend API (which will upload to S3)
      const response = await fetch(`https://job-tracker-api-j7ef.onrender.com/api/jobs/${this.jobId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      console.log('[Job Detail] ✅ Resume uploaded to S3:', result.data);

      // Update local job object with resume info from server response
      this.job.resumeFileName = result.data.resumeFileName || result.data.fileName;
      this.job.resumeFileType = result.data.resumeFileType || result.data.fileType;
      this.job.resumeFileSize = result.data.resumeFileSize || result.data.fileSize;
      this.job.resumeS3Key = result.data.resumeS3Key || result.data.s3Key;
      this.job.resumeUploadedAt = result.data.resumeUploadedAt || result.data.uploadedAt;
      delete this.job.resumeFileData; // Remove old base64 data if present

      console.log('[Job Detail] 💾 Updated job object with resume data:', {
        fileName: this.job.resumeFileName,
        fileSize: this.job.resumeFileSize,
        s3Key: this.job.resumeS3Key
      });

      // Save to local storage via jobTracker
      const jobIndex = window.jobTracker.jobs.findIndex(j => (j.id === this.jobId || j._id === this.jobId));
      if (jobIndex !== -1) {
        window.jobTracker.jobs[jobIndex] = this.job;
        await window.jobTracker.saveJobs();
        console.log('[Job Detail] 💾 Saved to local storage');
      }

      // Update UI
      this.updateResumeState();
      console.log('[Job Detail] ✅ Resume saved successfully');

      // Show success feedback
      if (window.globalNotifications) {
        window.globalNotifications.showNotionToast('Resume uploaded to cloud successfully', 'success', 2000);
      }

      // Restore button
      uploadBtn.innerHTML = originalText;
      uploadBtn.disabled = false;

    } catch (error) {
      console.error('[Job Detail] Resume upload error:', error);
      alert(`❌ Failed to upload resume: ${error.message}`);

      // Restore button
      uploadBtn.innerHTML = originalText;
      uploadBtn.disabled = false;
    }
  }

  async viewResume() {
    if (!this.job.resumeFileName) {
      alert('⚠️ Resume file not found.');
      return;
    }

    try {
      console.log('[Job Detail] 📥 Fetching resume view URL from S3...');

      // Get auth token
      const authToken = await window.apiClient.getToken();
      if (!authToken) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Get pre-signed download URL from backend
      const response = await fetch(`https://job-tracker-api-j7ef.onrender.com/api/jobs/${this.jobId}/resume`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to get view URL');
      }

      console.log('[Job Detail] ✅ Got view URL, opening resume...');

      // Open resume in new tab using pre-signed URL
      const newWindow = window.open(result.data.downloadUrl, '_blank');
      if (!newWindow) {
        alert('⚠️ Please allow popups to view the resume.');
      }
    } catch (error) {
      console.error('[Job Detail] Failed to view resume:', error);
      alert(`❌ Failed to view resume: ${error.message}`);
    }
  }

  async downloadResume() {
    if (!this.job.resumeFileName) {
      alert('⚠️ Resume file not found.');
      return;
    }

    try {
      console.log('[Job Detail] 📥 Fetching resume download URL from S3...');

      // Get auth token
      const authToken = await window.apiClient.getToken();
      if (!authToken) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Get pre-signed download URL from backend
      const response = await fetch(`https://job-tracker-api-j7ef.onrender.com/api/jobs/${this.jobId}/resume`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to get download URL');
      }

      console.log('[Job Detail] ✅ Got download URL, initiating download...');

      // Create download link with pre-signed URL
      const link = document.createElement('a');
      link.href = result.data.downloadUrl;
      link.download = result.data.fileName || 'resume.pdf';
      link.target = '_blank';
      link.click();

      console.log('[Job Detail] ✅ Resume download started:', result.data.fileName);
    } catch (error) {
      console.error('[Job Detail] Failed to download resume:', error);
      alert(`❌ Failed to download resume: ${error.message}`);
    }
  }

  async removeResume() {
    const confirmed = confirm('Are you sure you want to remove this resume from cloud storage?');
    if (!confirmed) return;

    try {
      console.log('[Job Detail] 🗑️ Deleting resume from S3...');

      // Get auth token
      const authToken = await window.apiClient.getToken();
      if (!authToken) {
        throw new Error('Not authenticated. Please log in.');
      }

      // Delete from S3 via backend API
      const response = await fetch(`https://job-tracker-api-j7ef.onrender.com/api/jobs/${this.jobId}/resume`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete resume');
      }

      console.log('[Job Detail] ✅ Resume deleted from S3');

      // Update local job object
      this.job.resumeFileName = null;
      this.job.resumeFileType = null;
      this.job.resumeFileSize = null;
      this.job.resumeUploadedAt = null;
      delete this.job.resumeFileData; // Remove old base64 data if present

      // Reload jobs from storage
      await window.jobTracker.loadJobs();
      this.job = window.jobTracker.jobs.find(j => j.id === this.jobId || j._id === this.jobId);

      // Update UI
      this.updateResumeState();
      document.getElementById('resume-upload').value = '';

      // Show success feedback
      if (window.globalNotifications) {
        window.globalNotifications.showNotionToast('Resume deleted successfully', 'success', 2000);
      }

      console.log('[Job Detail] ✅ Resume removed from job');
    } catch (error) {
      console.error('[Job Detail] Failed to remove resume:', error);
      alert(`❌ Failed to remove resume: ${error.message}`);
    }
  }

  renderEmptyState(icon, title, description) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-description">${description}</div>
      </div>
    `;
  }


  renderTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    if (!this.job.timeline || this.job.timeline.length === 0) {
      timeline.innerHTML = this.renderEmptyState('⏱️', 'No activity yet', 'Timeline events will appear here as you update the job status');
      return;
    }

    // Sort timeline by date (newest first)
    const sortedTimeline = [...this.job.timeline].sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );

    sortedTimeline.forEach(event => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      // Add color class based on event type
      if (event.type) {
        item.classList.add(event.type);
      }

      // Detect status changes from event text
      const eventLower = event.event.toLowerCase();
      if (eventLower.includes('applied')) {
        item.classList.add('status-applied');
      } else if (eventLower.includes('interview')) {
        item.classList.add('status-interview');
      } else if (eventLower.includes('offer')) {
        item.classList.add('status-offer');
      } else if (eventLower.includes('rejected')) {
        item.classList.add('status-rejected');
      } else if (eventLower.includes('withdrawn')) {
        item.classList.add('status-withdrawn');
      } else if (eventLower.includes('tracked') || eventLower.includes('created')) {
        item.classList.add('created');
      }

      const date = new Date(event.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      item.innerHTML = `
        <div class="timeline-date">${formattedDate}<br>${formattedTime}</div>
        <div class="timeline-content">
          <div class="timeline-event">${event.event}</div>
          ${event.note ? `<div class="timeline-note">${event.note}</div>` : ''}
        </div>
      `;

      timeline.appendChild(item);
    });
  }

  async saveChanges() {
    console.log('[Job Detail] Saving changes for job:', this.jobId);

    // Get updated values
    const updates = {
      title: document.getElementById('job-title').value,
      company: document.getElementById('job-company').value,
      location: document.getElementById('location').value,
      salary: document.getElementById('salary').value,
      workType: document.getElementById('work-type').value,
      status: document.getElementById('status').value,
      description: document.getElementById('description').value,
      notes: document.getElementById('notes').value
    };

    console.log('[Job Detail] Updates to save:', updates);

    // Update job
    const success = await window.jobTracker.updateJob(this.jobId, updates);

    if (success) {
      console.log('[Job Detail] ✅ Save successful');
      // Show success message
      alert('Changes saved successfully!');

      // Reload job data
      await this.loadJob();
      this.render();
    } else {
      console.error('[Job Detail] ❌ Save failed');
      alert('Failed to save changes. Please try again.');
    }
  }

  async deleteJob() {
    await window.jobTracker.deleteJob(this.jobId);
    alert('Job deleted successfully!');
    window.close();
  }

  renderTimingBadge() {
    const timingMeta = document.getElementById('timing-meta');
    const timingBadge = document.getElementById('timing-badge');

    console.log('[Job Detail] 🕐 Timing data:', {
      jobPostedHoursAgo: this.job.jobPostedHoursAgo,
      hasValue: this.job.jobPostedHoursAgo !== undefined && this.job.jobPostedHoursAgo !== null
    });

    if (this.job.jobPostedHoursAgo !== undefined && this.job.jobPostedHoursAgo !== null) {
      // Show the meta item
      timingMeta.style.display = 'flex';

      // Format the timing text
      const hours = this.job.jobPostedHoursAgo;
      let displayText;

      if (hours < 1) {
        displayText = 'Less than 1 hour';
      } else if (hours === 1) {
        displayText = '1 hour';
      } else if (hours < 24) {
        displayText = `${Math.round(hours)} hours`;
      } else if (hours < 48) {
        displayText = '1 day';
      } else if (hours < 168) {
        const days = Math.round(hours / 24);
        displayText = `${days} days`;
      } else if (hours < 336) {
        displayText = '1 week';
      } else if (hours < 730) {
        const weeks = Math.round(hours / 168);
        displayText = `${weeks} weeks`;
      } else {
        const months = Math.round(hours / 730);
        displayText = `${months} month${months > 1 ? 's' : ''}`;
      }

      timingBadge.textContent = displayText;
    } else {
      // Hide if no data
      timingMeta.style.display = 'none';
    }
  }

  renderCompetitionBadge() {
    const competitionMeta = document.getElementById('competition-meta');
    const competitionBadge = document.getElementById('competition-badge');

    console.log('[Job Detail] 👥 Competition data:', {
      applicantsText: this.job.applicantsText,
      applicantsAtApplyTime: this.job.applicantsAtApplyTime,
      hasValue: !!(this.job.applicantsText || this.job.applicantsAtApplyTime)
    });

    if (this.job.applicantsText) {
      // Show the meta item
      competitionMeta.style.display = 'flex';

      // Use the stored applicants text (e.g., "23", "Over 100")
      competitionBadge.textContent = this.job.applicantsText;
    } else if (this.job.applicantsAtApplyTime !== undefined && this.job.applicantsAtApplyTime !== null) {
      // Fallback to count if text not available
      competitionMeta.style.display = 'flex';
      competitionBadge.textContent = this.job.applicantsAtApplyTime.toString();
    } else {
      // Hide if no data
      competitionMeta.style.display = 'none';
    }
  }
}

// Initialize
const jobDetailPage = new JobDetailPage();

