// Job Detail Page Controller

class JobDetailPage {
  constructor() {
    this.jobId = null;
    this.job = null;
    this.init();
  }

  async init() {
    // Get job ID from URL
    const params = new URLSearchParams(window.location.search);
    this.jobId = params.get('id');

    if (!this.jobId) {
      alert('Job not found');
      window.close();
      return;
    }

    // Wait for tracker to load
    await this.waitForTracker();

    // Load job data
    await this.loadJob();

    // Setup event listeners
    this.setupEventListeners();

    // Render job data
    this.render();
  }

  async waitForTracker() {
    while (!window.jobTracker) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async loadJob() {
    await window.jobTracker.loadJobs();
    this.job = window.jobTracker.jobs.find(j => j.id === this.jobId);

    if (!this.job) {
      alert('Job not found');
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
      if (this.job.descriptionHtml) {
        // LinkedIn provides HTML - clean it up and display
        formattedDiv.innerHTML = window.linkedInCleaner.format(this.job.descriptionHtml);

        // Extract skills for future colored pills
        this.extractedSkills = window.linkedInCleaner.extractSkills(this.job.descriptionHtml);
        console.log('[Job Detail] Extracted skills:', this.extractedSkills);
      } else if (this.job.description) {
        // Fallback: plain text description
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

    if (this.job.resumeFileName) {
      emptyState.style.display = 'none';
      uploadedState.style.display = 'block';
      fileName.textContent = this.job.resumeFileName;
    } else {
      emptyState.style.display = 'flex';
      uploadedState.style.display = 'none';
    }
  }

  handleResumeUpload(file) {
    this.job.resumeFileName = file.name;
    this.updateResumeState();
    // TODO: Actually upload the file to storage
  }

  removeResume() {
    this.job.resumeFileName = null;
    this.updateResumeState();
    document.getElementById('resume-upload').value = '';
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

    // Update job
    await window.jobTracker.updateJob(this.jobId, updates);

    // Show success message
    alert('Changes saved successfully!');

    // Reload job data
    await this.loadJob();
    this.render();
  }

  async deleteJob() {
    await window.jobTracker.deleteJob(this.jobId);
    alert('Job deleted successfully!');
    window.close();
  }
}

// Initialize
const jobDetailPage = new JobDetailPage();

