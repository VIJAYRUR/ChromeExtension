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

    // Resume upload
    document.getElementById('upload-btn').addEventListener('click', () => {
      document.getElementById('resume-upload').click();
    });

    document.getElementById('resume-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById('file-name').textContent = file.name;
        // TODO: Handle file upload
      }
    });

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
    document.getElementById('work-type').value = this.job.workType || 'Not specified';
    document.getElementById('status').value = this.job.status || 'applied';
    document.getElementById('description').value = this.job.description || '';
    document.getElementById('notes').value = this.job.notes || '';

    // Render formatted description
    const formattedDiv = document.getElementById('description-formatted');
    if (formattedDiv) {
      if (this.job.descriptionHtml) {
        // Use HTML version if available
        formattedDiv.innerHTML = this.job.descriptionHtml;
      } else if (this.job.description) {
        // Fallback to plain text with basic formatting
        formattedDiv.innerHTML = this.formatPlainTextDescription(this.job.description);
      } else {
        formattedDiv.innerHTML = '<p class="empty-description">No description available</p>';
      }
    }

    // LinkedIn URL
    const linkedinLink = document.getElementById('linkedin-url');
    if (this.job.linkedinUrl) {
      linkedinLink.href = this.job.linkedinUrl;
    } else {
      linkedinLink.style.display = 'none';
    }

    // Render timeline
    this.renderTimeline();
  }

  formatPlainTextDescription(text) {
    // Convert plain text to basic HTML formatting
    return text
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  renderTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    if (!this.job.timeline || this.job.timeline.length === 0) {
      timeline.innerHTML = '<p style="color: var(--gray-500); font-size: 14px;">No timeline events yet</p>';
      return;
    }

    this.job.timeline.forEach(event => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      const date = new Date(event.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      item.innerHTML = `
        <div class="timeline-date">${date}</div>
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

