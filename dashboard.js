// Dashboard UI Controller

class DashboardUI {
  constructor() {
    this.currentView = 'kanban';
    this.currentFilters = {
      query: '',
      status: 'all',
      workType: 'all',
      sort: 'date-desc'
    };
    this.isUpdating = false; // Flag to prevent duplicate updates
    this.init();
  }

  async init() {
    console.log('[Dashboard] 🚀 Initializing dashboard...');

    // Show loading state immediately
    this.showLoadingState();

    await this.waitForTracker();

    console.log('[Dashboard] ✅ JobTracker loaded with', window.jobTracker.jobs.length, 'jobs');

    this.setupEventListeners();
    this.render();

    console.log('[Dashboard] 🎨 Dashboard initialized');
  }

  async waitForTracker() {
    console.log('[Dashboard] ⏳ Waiting for JobTracker...');
    while (!window.jobTracker) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Also wait for jobs to be loaded
    while (!window.jobTracker.jobs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  showLoadingState() {
    // Show loading in Kanban columns
    const columns = ['applied', 'interview', 'offer', 'rejected'];
    columns.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      if (column) {
        column.innerHTML = `
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading jobs...</p>
          </div>
        `;
      }
    });

    // Show loading in table
    const tableBody = document.getElementById('table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading jobs...</p>
          </td>
        </tr>
      `;
    }
  }

  setupEventListeners() {
    // Search
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.currentFilters.query = e.target.value;
      this.render();
    });

    document.getElementById('clear-search').addEventListener('click', () => {
      document.getElementById('search-input').value = '';
      this.currentFilters.query = '';
      this.render();
    });

    // Filters
    document.getElementById('filter-status').addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.render();
    });

    document.getElementById('filter-worktype').addEventListener('change', (e) => {
      this.currentFilters.workType = e.target.value;
      this.render();
    });

    document.getElementById('filter-sort').addEventListener('change', (e) => {
      this.currentFilters.sort = e.target.value;
      this.render();
    });

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.view);
      });
    });

    // Add job button
    document.getElementById('add-job-btn').addEventListener('click', () => {
      this.showAddJobModal();
    });

    // Export button
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportData();
    });
  }

  switchView(view) {
    this.currentView = view;
    
    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view-container').forEach(container => {
      container.classList.remove('active');
    });
    document.getElementById(`${view}-view`).classList.add('active');

    this.render();
  }

  render() {
    const jobs = this.getFilteredJobs();
    this.updateStats(jobs);

    if (this.currentView === 'kanban') {
      this.renderKanban(jobs);
    } else if (this.currentView === 'table') {
      this.renderTable(jobs);
    }
  }

  getFilteredJobs() {
    let jobs = window.jobTracker.searchJobs(this.currentFilters.query, {
      status: this.currentFilters.status,
      workType: this.currentFilters.workType
    });

    // Sort
    jobs = this.sortJobs(jobs, this.currentFilters.sort);

    return jobs;
  }

  sortJobs(jobs, sortBy) {
    const sorted = [...jobs];
    
    switch (sortBy) {
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.dateApplied) - new Date(b.dateApplied));
      case 'company-asc':
        return sorted.sort((a, b) => a.company.localeCompare(b.company));
      case 'company-desc':
        return sorted.sort((a, b) => b.company.localeCompare(a.company));
      default:
        return sorted;
    }
  }

  updateStats(jobs) {
    const total = jobs.length;
    const active = jobs.filter(j => j.status === 'applied' || j.status === 'interview').length;
    const interviews = jobs.filter(j => j.status === 'interview').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-interviews').textContent = interviews;
  }

  renderKanban(jobs) {
    const statuses = ['applied', 'interview', 'offer', 'rejected'];

    statuses.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      const count = document.getElementById(`count-${status}`);
      const statusJobs = jobs.filter(j => j.status === status);

      count.textContent = statusJobs.length;

      // Clear only the content, not the entire innerHTML to preserve data attributes
      while (column.firstChild) {
        column.removeChild(column.firstChild);
      }

      if (statusJobs.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = '<p>No jobs</p>';
        column.appendChild(emptyState);
      } else {
        statusJobs.forEach(job => {
          column.appendChild(this.createJobCard(job));
        });
      }

      // Setup drop zone only once (it checks the flag internally)
      this.setupDropZone(column, status);
    });
  }

  setupDropZone(column, status) {
    // Store reference to avoid issues
    const col = column;

    // Mark as setup to avoid duplicate listeners
    if (col.dataset.dropZoneSetup === 'true') {
      return;
    }
    col.dataset.dropZoneSetup = 'true';

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      col.classList.add('drag-over');

      // Get the dragging card and find where to insert
      const draggingCard = document.querySelector('.dragging');
      if (!draggingCard) return;

      const afterElement = this.getDragAfterElement(col, e.clientY);

      if (afterElement == null) {
        col.appendChild(draggingCard);
      } else {
        col.insertBefore(draggingCard, afterElement);
      }
    });

    col.addEventListener('dragleave', (e) => {
      if (e.target === col) {
        col.classList.remove('drag-over');
      }
    });

    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');

      const jobId = e.dataTransfer.getData('jobId');

      if (jobId) {
        await this.updateJobStatus(jobId, status);
      }
    });
  }

  getDragAfterElement(column, y) {
    const draggableElements = [...column.querySelectorAll('.job-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  async updateJobStatus(jobId, newStatus) {
    // Prevent duplicate updates
    if (this.isUpdating) {
      console.log(`[Dashboard] ⏭️ Skipping duplicate update for job ${jobId}`);
      return;
    }

    this.isUpdating = true;
    console.log(`[Dashboard] 🔄 Updating job ${jobId} to status: ${newStatus}`);

    try {
      // Use updateJobStatus instead of updateJob to avoid duplicate timeline entries
      await window.jobTracker.updateJobStatus(jobId, newStatus, 'Moved via Kanban board');

      this.render();

      this.showStatusUpdateFeedback(newStatus);
    } finally {
      // Reset flag after a short delay to allow the update to complete
      setTimeout(() => {
        this.isUpdating = false;
      }, 500);
    }
  }

  showStatusUpdateFeedback(status) {
    const toast = document.createElement('div');
    toast.className = 'status-toast';
    toast.textContent = `✓ Moved to ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.jobId = job.id;

    // Make card draggable
    card.draggable = true;

    const daysAgo = Math.floor((Date.now() - new Date(job.dateApplied)) / (1000 * 60 * 60 * 24));

    card.innerHTML = `
      <div class="job-card-header">
        <div class="drag-handle">⋮⋮</div>
        <div class="job-company">${this.escapeHtml(job.company)}</div>
        <div class="job-title">${this.escapeHtml(job.title)}</div>
      </div>
      <div class="job-meta">
        ${job.location ? `<div class="job-meta-item">📍 ${this.escapeHtml(job.location)}</div>` : ''}
        ${job.salary ? `<div class="job-meta-item">💰 ${this.escapeHtml(job.salary)}</div>` : ''}
      </div>
      <div class="job-tags">
        ${job.workType !== 'Not specified' ? `<span class="job-tag ${job.workType.toLowerCase()}">${job.workType}</span>` : ''}
      </div>
      <div class="job-footer">
        <div class="job-date">${daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</div>
        <div class="job-actions">
          <button class="job-action-btn" title="View details">View</button>
          <button class="job-action-btn" title="Edit">Edit</button>
        </div>
      </div>
    `;

    // Add drag event listeners
    card.addEventListener('dragstart', (e) => this.handleDragStart(e, job));
    card.addEventListener('dragend', (e) => this.handleDragEnd(e));

    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('job-action-btn')) {
        this.showJobDetail(job);
      }
    });

    return card;
  }

  handleDragStart(e, job) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.dataTransfer.setData('jobId', job.id);

    // Add a subtle opacity to the dragged card
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    e.target.style.opacity = '1';

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }

  renderTable(jobs) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (jobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><p>No jobs found</p></td></tr>';
      return;
    }

    jobs.forEach(job => {
      const row = document.createElement('tr');
      row.dataset.jobId = job.id;

      const date = new Date(job.dateApplied).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      row.innerHTML = `
        <td><strong>${this.escapeHtml(job.company)}</strong></td>
        <td>${this.escapeHtml(job.title)}</td>
        <td>${this.escapeHtml(job.location || '-')}</td>
        <td>${this.escapeHtml(job.salary || '-')}</td>
        <td>${this.escapeHtml(job.workType)}</td>
        <td><span class="status-badge ${job.status}">${job.status}</span></td>
        <td>${date}</td>
        <td>
          <button class="job-action-btn" title="View">View</button>
          <button class="job-action-btn" title="Edit">Edit</button>
          <button class="job-action-btn" title="Delete">Delete</button>
        </td>
      `;

      row.addEventListener('click', (e) => {
        if (!e.target.classList.contains('job-action-btn')) {
          this.showJobDetail(job);
        }
      });

      tbody.appendChild(row);
    });
  }

  showJobDetail(job) {
    // Open job detail page
    chrome.runtime.sendMessage({
      action: 'openJobDetail',
      jobId: job.id
    });
  }

  showAddJobModal() {
    alert('Add job manually - feature coming soon!\nFor now, use the "Track Application" button on LinkedIn job pages.');
  }

  exportData() {
    const jobs = window.jobTracker.jobs;
    const dataStr = JSON.stringify(jobs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    console.log('[Dashboard] 📊 Exported', jobs.length, 'jobs');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard
const dashboard = new DashboardUI();

