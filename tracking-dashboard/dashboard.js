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
    this.isUpdating = false;
    this.compactMode = false;

    // Pagination
    this.currentPage = 1;
    this.itemsPerPage = 10;

    // Job-related icons in Notion style (all same gray color like Notion)
    this.jobIcons = [
      '💼', '🎯', '🚀', '💻', '🔧', '⚡',
      '🎨', '📊', '🔍', '⚙️', '🌟', '📱',
      '🏢', '👨‍💻', '🎓', '🔬', '📈', '🛠️'
    ];

    this.init();
  }

  async init() {
    console.log('[Dashboard] 🚀 Initializing dashboard...');

    this.showLoadingState();

    // Initialize sync manager and API client
    await this.initializeSync();

    await this.waitForTracker();
    await this.loadCompactMode();
    await this.setupUserMenu();

    console.log('[Dashboard] ✅ JobTracker loaded with', window.jobTracker.jobs.length, 'jobs');

    this.setupEventListeners();
    this.render();

    console.log('[Dashboard] 🎨 Dashboard initialized');
  }

  async setupUserMenu() {
    // Wait for auth manager to be ready (with timeout to prevent blocking)
    if (window.authManager) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );
        await Promise.race([window.authManager.init(), timeoutPromise]);
      } catch (error) {
        console.warn('[Dashboard] Auth init timeout or error:', error.message);
      }

      const user = window.authManager.getUser();
      if (user) {
        const displayName = window.authManager.getUserDisplayName();
        const initials = window.authManager.getUserInitials();

        const nameEl = document.getElementById('header-user-name');
        const emailEl = document.getElementById('header-user-email');
        const initialsEl = document.getElementById('header-user-initials');

        if (nameEl) nameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = user.email || '';
        if (initialsEl) initialsEl.textContent = initials;
      }

      // User avatar dropdown toggle
      const avatarBtn = document.getElementById('user-avatar-btn');
      const dropdown = document.getElementById('header-user-dropdown');

      if (avatarBtn && dropdown) {
        avatarBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
          dropdown.classList.remove('show');
        });
      }

      // Logout button
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          const confirmed = confirm('Are you sure you want to logout?');
          if (confirmed) {
            await window.authManager.logout();
            window.location.href = '../auth/login.html';
          }
        });
      }

      // Sync button
      const syncBtn = document.getElementById('sync-data-btn');
      if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
          syncBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Syncing...
          `;

          try {
            const jobs = window.jobTracker.jobs || [];
            await window.authManager.apiRequest('/jobs/sync', {
              method: 'POST',
              body: JSON.stringify({ jobs })
            });

            alert('Data synced successfully!');
          } catch (error) {
            console.error('Sync failed:', error);
            alert('Sync failed: ' + error.message);
          } finally {
            syncBtn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                <polyline points="21 3 21 9 15 9"/>
              </svg>
              Sync Data
            `;
          }
        });
      }
    }
  }

  async initializeSync() {
    try {
      // Initialize API client
      if (typeof window.apiClient === 'undefined' && typeof APIClient !== 'undefined') {
        window.apiClient = new APIClient();
      }

      // Initialize sync manager
      if (typeof window.syncManager === 'undefined' && typeof SyncManager !== 'undefined') {
        window.syncManager = new SyncManager();
      }

      // Trigger initial sync if authenticated
      if (window.apiClient?.isAuthenticated() && window.syncManager) {
        console.log('[Dashboard] Triggering initial sync...');
        await window.syncManager.syncAll();

        // Reload jobs after sync
        await window.jobTracker.loadJobs();
        console.log('[Dashboard] Sync complete, jobs reloaded');
      }
    } catch (error) {
      console.error('[Dashboard] Sync initialization failed:', error);
    }
  }

  async loadCompactMode() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['compactMode']);
        this.compactMode = result.compactMode || false;
      } else {
        // Fallback to localStorage for non-extension environment
        this.compactMode = localStorage.getItem('compactMode') === 'true';
      }
      if (this.compactMode) {
        document.body.classList.add('compact-mode');
      }
    } catch (error) {
      console.log('[Dashboard] Running in non-extension mode');
      this.compactMode = false;
    }
  }

  async waitForTracker() {
    console.log('[Dashboard] ⏳ Waiting for JobTracker...');
    while (!window.jobTracker) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Wait for jobs to be fully loaded from storage
    while (!window.jobTracker.isLoaded) {
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
    // Inline search toggle
    const searchBtn = document.getElementById('search-btn');
    const inlineSearchContainer = document.getElementById('inline-search-container');
    const inlineSearchInput = document.getElementById('inline-search-input');

    searchBtn.addEventListener('click', () => {
      const isHidden = inlineSearchContainer.style.display === 'none';

      if (isHidden) {
        // Show inline search, hide search button
        inlineSearchContainer.style.display = 'flex';
        searchBtn.style.display = 'none';
        setTimeout(() => {
          inlineSearchInput.focus();
        }, 50);
      } else {
        // Hide inline search, show search button
        inlineSearchContainer.style.display = 'none';
        searchBtn.style.display = 'flex';
        inlineSearchInput.value = '';
        this.currentFilters.query = '';
        this.render();
      }
    });

    // Inline search input
    inlineSearchInput.addEventListener('input', (e) => {
      this.currentFilters.query = e.target.value;
      this.currentPage = 1; // Reset to first page
      this.render();
    });

    // Close search on Escape key
    inlineSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        inlineSearchContainer.style.display = 'none';
        searchBtn.style.display = 'flex';
        inlineSearchInput.value = '';
        this.currentFilters.query = '';
        this.render();
      }
    });

    // Filters
    document.getElementById('filter-status').addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.currentPage = 1; // Reset to first page
      this.render();
    });

    document.getElementById('filter-worktype').addEventListener('change', (e) => {
      this.currentFilters.workType = e.target.value;
      this.currentPage = 1; // Reset to first page
      this.render();
    });

    document.getElementById('filter-sort').addEventListener('change', (e) => {
      this.currentFilters.sort = e.target.value;
      this.currentPage = 1; // Reset to first page
      this.render();
    });

    // View toggle
    document.querySelectorAll('.view-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchView(btn.dataset.view);
      });
    });

    // Add job button
    document.getElementById('add-job-btn').addEventListener('click', () => {
      this.showAddJobModal();
    });

    // Manual Add Job button
    const addJobManualBtn = document.getElementById('add-job-manual-btn');
    if (addJobManualBtn) {
      addJobManualBtn.addEventListener('click', () => {
        this.showManualAddJobModal();
      });
    }

    // Close manual add job modal
    const closeAddJobModal = document.getElementById('close-add-job-modal');
    if (closeAddJobModal) {
      closeAddJobModal.addEventListener('click', () => {
        this.hideManualAddJobModal();
      });
    }

    // Cancel manual add job
    const cancelAddJob = document.getElementById('cancel-add-job');
    if (cancelAddJob) {
      cancelAddJob.addEventListener('click', () => {
        this.hideManualAddJobModal();
      });
    }

    // Manual add job form submission
    const addJobForm = document.getElementById('add-job-form');
    if (addJobForm) {
      addJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleAddJobManually();
      });
    }

    // Close modal on overlay click
    const addJobModal = document.getElementById('add-job-modal');
    if (addJobModal) {
      addJobModal.addEventListener('click', (e) => {
        if (e.target === addJobModal) {
          this.hideManualAddJobModal();
        }
      });
    }



    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        this.toggleCompactMode();
      }
    });

    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshData();
      });
    }

    // Pagination controls
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');

    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable(this.currentJobs);
        }
      });
    }

    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.currentJobs.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderTable(this.currentJobs);
        }
      });
    }
  }

  async toggleCompactMode() {
    this.compactMode = !this.compactMode;
    document.body.classList.toggle('compact-mode', this.compactMode);
    await chrome.storage.local.set({ compactMode: this.compactMode });
  }

  async refreshData() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.classList.add('spinning');
    }

    try {
      // Reload jobs from storage
      if (window.jobTracker) {
        await window.jobTracker.loadJobs();
      }

      // Re-render the current view
      this.render();

      // Update stats view if active
      if (this.currentView === 'stats' && window.statsManager) {
        window.statsManager.jobs = window.jobTracker.jobs;
        window.statsManager.render();
      }

      console.log('[Dashboard] Data refreshed');
    } catch (error) {
      console.error('[Dashboard] Refresh failed:', error);
    } finally {
      if (refreshBtn) {
        setTimeout(() => {
          refreshBtn.classList.remove('spinning');
        }, 500);
      }
    }
  }

  switchView(view) {
    this.currentView = view;

    // Update buttons
    document.querySelectorAll('.view-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update views
    document.querySelectorAll('.view-container').forEach(container => {
      container.classList.remove('active');
    });
    document.getElementById(`${view}-view`).classList.add('active');

    // Initialize calendar if switching to calendar view
    if (view === 'calendar' && !this.calendarInitialized) {
      this.initCalendar();
      this.calendarInitialized = true;
    }

    // Initialize stats if switching to stats view
    if (view === 'stats' && window.statsManager && window.jobTracker) {
      console.log('[Dashboard] Switching to stats view, passing', window.jobTracker.jobs.length, 'jobs');
      window.statsManager.jobs = window.jobTracker.jobs;
      window.statsManager.render();
    }

    this.render();
  }

  render() {
    const jobs = this.getFilteredJobs();
    this.currentJobs = jobs;
    this.updateStats(jobs);

    if (this.currentView === 'kanban') {
      this.renderKanban(jobs);
    } else if (this.currentView === 'table') {
      this.renderTable(jobs);
    } else if (this.currentView === 'calendar') {
      if (this.calendarInitialized) {
        this.renderCalendar();
      }
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

    // Update stats if elements exist
    const statTotal = document.getElementById('stat-total');
    const statActive = document.getElementById('stat-active');
    const statInterviews = document.getElementById('stat-interviews');

    if (statTotal) statTotal.textContent = total;
    if (statActive) statActive.textContent = active;
    if (statInterviews) statInterviews.textContent = interviews;
  }

  renderKanban(jobs) {
    const statuses = ['applied', 'interview', 'offer', 'rejected'];

    statuses.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      const count = document.getElementById(`count-${status}`);
      const statusJobs = jobs.filter(j => j.status === status);

      count.textContent = statusJobs.length;

      column.innerHTML = '';

      statusJobs.forEach(job => {
        column.appendChild(this.createJobCard(job));
      });

      const addButton = document.createElement('div');
      addButton.role = 'button';
      addButton.tabIndex = 0;
      addButton.className = 'add-card-btn';

      const statusColors = {
        'applied': 'var(--c-graTexAccPri)',
        'interview': 'var(--c-bluTexAccPri)',
        'offer': 'var(--c-greTexAccPri)',
        'rejected': 'var(--c-redTexAccPri)'
      };

      addButton.style.cssText = `
        user-select: none;
        transition: background 20ms ease-in;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 9px;
        height: 32px;
        padding-inline: 10px;
        border-radius: 10px;
        white-space: nowrap;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.2;
        color: ${statusColors[status] || 'var(--text-secondary)'};
        box-shadow: rgb(from ${statusColors[status] || 'var(--text-secondary)'} r g b / 0.1) 0px 0px 0px 1px;
        min-height: 40px;
      `;

      addButton.innerHTML = `
        <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" style="width: 16px; height: 16px; display: block; fill: inherit; flex-shrink: 0; color: inherit; margin-inline-start: 2px;">
          <path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74"></path>
        </svg>New page
      `;

      addButton.addEventListener('click', () => {
        this.showAddJobModal(status);
      });

      column.appendChild(addButton);

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
    card.draggable = true;

    card.innerHTML = `
      <div class="job-actions">
        <div role="button" tabindex="0" class="job-action-btn" title="Edit">
          <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" style="width: 16px; height: 16px; display: block; fill: inherit; flex-shrink: 0;">
            <path d="M11.243 3.457a.803.803 0 0 0-1.13 0l-.554.552a.075.075 0 0 0 0 .106l1.03 1.03a.075.075 0 0 0 .107 0l.547-.546a.1.1 0 0 0 .019-.032.804.804 0 0 0-.02-1.11m-2.246 1.22a.075.075 0 0 0-.106 0l-6.336 6.326a1.1 1.1 0 0 0-.237.393l-.27.87v.002c-.062.232.153.466.389.383l.863-.267q.221-.061.397-.239l6.332-6.331a.075.075 0 0 0 0-.106zm-3.355 6.898a.08.08 0 0 0-.053.022l-1.1 1.1a.075.075 0 0 0 .053.128h9.06a.625.625 0 1 0 0-1.25z"></path>
          </svg>
        </div>
        <div role="button" tabindex="0" class="job-action-btn" title="More">
          <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" style="width: 16px; height: 16px; display: block; fill: inherit; flex-shrink: 0;">
            <path d="M3.2 6.725a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55m4.8 0a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55m4.8 0a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0-2.55"></path>
          </svg>
        </div>
      </div>
      <div class="job-card-header">
        <div class="job-company">${this.escapeHtml(job.title)}</div>
      </div>
      <div class="job-meta">
        <div class="job-meta-item">
          <div style="display: flex; min-width: 0; flex-shrink: 0; flex-wrap: wrap; width: 100%; gap: 4px 6px; align-items: center;">
            <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary);">${this.escapeHtml(job.company)}</div>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('dragstart', (e) => this.handleDragStart(e, job));
    card.addEventListener('dragend', (e) => this.handleDragEnd(e));

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.job-action-btn')) {
        this.showJobDetail(job);
      }
    });

    const editBtn = card.querySelector('.job-action-btn[title="Edit"]');
    const moreBtn = card.querySelector('.job-action-btn[title="More"]');

    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showJobDetail(job);
      });
    }

    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showJobDetail(job);
      });
    }

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
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No jobs found</p></td></tr>';
      this.updatePagination(0, 0, 0);
      return;
    }

    // Calculate pagination
    const totalItems = jobs.length;
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, totalItems);
    const paginatedJobs = jobs.slice(startIndex, endIndex);

    // Render paginated jobs
    paginatedJobs.forEach((job, index) => {
      const row = document.createElement('tr');
      row.dataset.jobId = job.id;

      const date = new Date(job.dateApplied).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      // Status text with proper capitalization
      const statusText = job.status.charAt(0).toUpperCase() + job.status.slice(1);

      // Get status style
      const statusStyle = this.getStatusStyle(job.status);

      // Serial number (global index, not page index)
      const serialNumber = startIndex + index + 1;

      row.innerHTML = `
        <td class="td-icon">
          <div style="width: 24px; height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; color: rgba(55, 53, 47, 0.4);">
            ${serialNumber}
          </div>
        </td>
        <td class="td-title">
          <span style="font-weight: 500; color: rgba(55, 53, 47, 0.95);">${this.escapeHtml(job.title)}</span>
        </td>
        <td class="td-company">
          <span style="color: rgba(55, 53, 47, 0.65);">${this.escapeHtml(job.company)}</span>
        </td>
        <td class="td-location">
          <span style="color: rgba(55, 53, 47, 0.65);">${this.escapeHtml(job.location || '-')}</span>
        </td>
        <td class="td-status">
          <span style="display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 3px; font-size: 14px; font-weight: 500; background: ${statusStyle.bg}; color: ${statusStyle.color}; white-space: nowrap;">
            ${statusText}
          </span>
        </td>
        <td class="td-worktype">
          <span style="color: rgba(55, 53, 47, 0.65);">${this.escapeHtml(job.workType)}</span>
        </td>
        <td class="td-date">
          <span style="color: rgba(55, 53, 47, 0.65);">${date}</span>
        </td>
      `;

      row.addEventListener('click', (e) => {
        this.showJobDetail(job);
      });

      tbody.appendChild(row);
    });

    // Update pagination controls
    this.updatePagination(startIndex + 1, endIndex, totalItems);
  }

  updatePagination(start, end, total) {
    const paginationContainer = document.getElementById('table-pagination');
    const paginationInfo = document.getElementById('pagination-info-text');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (!paginationContainer) return;

    // Show/hide pagination based on total items
    if (total <= this.itemsPerPage) {
      paginationContainer.style.display = 'none';
      return;
    } else {
      paginationContainer.style.display = 'flex';
    }

    // Update info text
    if (paginationInfo) {
      paginationInfo.textContent = `${start}-${end} of ${total}`;
    }

    // Update button states
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 1;
    }

    if (nextBtn) {
      const totalPages = Math.ceil(total / this.itemsPerPage);
      nextBtn.disabled = this.currentPage >= totalPages;
    }
  }

  showJobDetail(job) {
    // Open job detail page
    chrome.runtime.sendMessage({
      action: 'openJobDetail',
      jobId: job.id
    });
  }

  showAddJobModal(defaultStatus = 'applied') {
    alert('Add job manually - feature coming soon!\nFor now, use the "Track Application" button on LinkedIn job pages.');
  }



  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Manual Add Job Modal Methods
  showManualAddJobModal() {
    const modal = document.getElementById('add-job-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  hideManualAddJobModal() {
    const modal = document.getElementById('add-job-modal');
    if (modal) {
      modal.style.display = 'none';
      // Reset form
      const form = document.getElementById('add-job-form');
      if (form) {
        form.reset();
      }
    }
  }

  async handleAddJobManually() {
    // Get form values
    const company = document.getElementById('manual-company').value.trim();
    const title = document.getElementById('manual-title').value.trim();
    const description = document.getElementById('manual-description').value.trim();
    const location = document.getElementById('manual-location').value.trim();
    const workType = document.getElementById('manual-work-type').value;
    const linkedinUrl = document.getElementById('manual-url').value.trim();
    const salary = document.getElementById('manual-salary').value.trim();
    const status = document.getElementById('manual-status').value;
    const notes = document.getElementById('manual-notes').value.trim();

    // Validate required fields
    if (!company || !title || !description) {
      alert('⚠️ Please fill in all required fields:\n- Company\n- Position\n- Job Description');
      return;
    }

    // Format the description HTML (same as LinkedIn formatting)
    const descriptionHtml = this.formatJobDescription(description);

    // Create job object
    const jobData = {
      company,
      title,
      description,  // Plain text version
      descriptionHtml,  // Formatted HTML version (like LinkedIn)
      location: location || '',
      workType: workType || 'Not specified',
      linkedinUrl: linkedinUrl || '',
      salary: salary || '',
      status: status || 'applied',
      notes: notes || '',
      dateApplied: new Date().toISOString(),
      timeline: [
        {
          date: new Date().toISOString(),
          event: 'Job added manually',
          type: 'applied'
        }
      ]
    };

    try {
      // Add job to tracker
      await window.jobTracker.addJob(jobData);

      // Hide modal
      this.hideManualAddJobModal();

      // Refresh dashboard
      this.render();

      // Show success message
      console.log('[Dashboard] ✅ Job added manually:', company, '-', title);

      // Optional: Show a subtle success notification
      this.showSuccessNotification(`✅ ${company} - ${title} added successfully!`);
    } catch (error) {
      console.error('[Dashboard] Failed to add job:', error);
      alert('❌ Failed to add job. Please try again.');
    }
  }

  formatJobDescription(text) {
    if (!text) return '';

    // Patterns for detecting headings
    const headingPatterns = [
      /^(About|Overview|Summary|Description|Role|Position|Opportunity)/i,
      /^(Responsibilities|Duties|What [Yy]ou'?ll [Dd]o|Your [Rr]ole)/i,
      /^(Requirements|Qualifications|Skills|Experience|What [Ww]e'?re [Ll]ooking [Ff]or)/i,
      /^(Nice [Tt]o [Hh]ave|Preferred|Bonus|Plus)/i,
      /^(Benefits|Perks|What [Ww]e [Oo]ffer|Compensation)/i,
      /^(About [Uu]s|About [Tt]he [Cc]ompany|Company|Our [Tt]eam)/i,
      /^(How [Tt]o [Aa]pply|Application|Next [Ss]teps)/i,
      /^(Equal [Oo]pportunity|Diversity|Inclusion)/i
    ];

    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/);

    const formatted = paragraphs.map(para => {
      para = para.trim();
      if (!para) return '';

      const lines = para.split('\n');
      const firstLine = lines[0].trim();

      // Check if this is a heading
      const isHeading = headingPatterns.some(pattern => pattern.test(firstLine));
      const isShortHeading = firstLine.length < 60 && firstLine.endsWith(':');

      if (isHeading || isShortHeading) {
        // This is a heading - wrap in <p><strong>
        const headingText = firstLine.replace(/:$/, '');
        const restOfPara = lines.slice(1).join('<br>');

        if (restOfPara) {
          return `<p><strong>${headingText}</strong></p><p>${restOfPara}</p>`;
        } else {
          return `<p><strong>${headingText}</strong></p>`;
        }
      }

      // Check if paragraph contains bullet points
      const bulletPattern = /^[\-\*\•]\s+/;
      const hasBullets = lines.some(line => bulletPattern.test(line.trim()));

      if (hasBullets) {
        // Convert to HTML list
        const listItems = lines
          .filter(line => line.trim())
          .map(line => {
            const cleaned = line.trim().replace(bulletPattern, '');
            return `<li>${cleaned}</li>`;
          })
          .join('');
        return `<ul>${listItems}</ul>`;
      }

      // Regular paragraph - preserve line breaks
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).filter(p => p).join('');

    return formatted;
  }

  showSuccessNotification(message) {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #000;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }



  // Calendar methods
  initCalendar() {
    this.currentDate = new Date();
    this.renderCalendar();

    // Event listeners for calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
    });

    document.getElementById('today-btn').addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Update month label
    const monthLabel = document.getElementById('calendar-month-label');
    monthLabel.textContent = new Date(year, month, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get previous month's last days
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate calendar days
    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';

    // Group jobs by date
    const jobsByDate = this.groupJobsByDate(this.currentJobs);

    // Previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const dayElement = this.createCalendarDay(day, true, null, []);
      calendarDays.appendChild(dayElement);
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0);
      const isToday = currentDate.getTime() === today.getTime();
      const dateKey = this.getDateKey(currentDate);
      const dayJobs = jobsByDate[dateKey] || [];

      const dayElement = this.createCalendarDay(day, false, isToday, dayJobs);
      calendarDays.appendChild(dayElement);
    }

    // Next month's days
    const totalCells = calendarDays.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const dayElement = this.createCalendarDay(day, true, false, []);
      calendarDays.appendChild(dayElement);
    }
  }

  createCalendarDay(dayNumber, isOtherMonth, isToday, jobs) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';

    if (isOtherMonth) {
      dayElement.classList.add('other-month');
    }
    if (isToday) {
      dayElement.classList.add('today');
    }

    // Create header with day number and badges
    const headerElement = document.createElement('div');
    headerElement.className = 'calendar-day-header';

    const dayNumberElement = document.createElement('div');
    dayNumberElement.className = 'calendar-day-number';
    dayNumberElement.textContent = dayNumber;
    headerElement.appendChild(dayNumberElement);

    // Add status badges if there are jobs
    if (jobs && jobs.length > 0) {
      const badgesContainer = document.createElement('div');
      badgesContainer.className = 'calendar-day-badges';

      // Count jobs by status
      const statusCounts = {
        applied: 0,
        interview: 0,
        offer: 0,
        rejected: 0
      };

      jobs.forEach(job => {
        if (statusCounts.hasOwnProperty(job.status)) {
          statusCounts[job.status]++;
        }
      });

      // Status labels for tooltips
      const statusLabels = {
        applied: 'Applied',
        interview: 'Interview',
        offer: 'Offer',
        rejected: 'Rejected'
      };

      // Create badges for each status that has jobs
      Object.entries(statusCounts).forEach(([status, count]) => {
        if (count > 0) {
          const badge = document.createElement('div');
          badge.className = `calendar-badge badge-${status}`;

          // Add tooltip
          const label = statusLabels[status] || status;
          badge.setAttribute('data-tooltip', `${count} ${label}`);

          const dot = document.createElement('div');
          dot.className = 'calendar-badge-dot';
          badge.appendChild(dot);

          const countText = document.createTextNode(count.toString());
          badge.appendChild(countText);

          badgesContainer.appendChild(badge);
        }
      });

      headerElement.appendChild(badgesContainer);
    }

    dayElement.appendChild(headerElement);

    if (jobs && jobs.length > 0) {
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'calendar-events';

      // Show first 2 jobs only
      const maxVisible = 2;
      const visibleJobs = jobs.slice(0, maxVisible);

      visibleJobs.forEach(job => {
        const eventCard = document.createElement('div');
        eventCard.className = `calendar-event-card status-${job.status}`;

        const titleElement = document.createElement('div');
        titleElement.className = 'calendar-event-title';
        titleElement.textContent = job.title;
        eventCard.appendChild(titleElement);

        const companyElement = document.createElement('div');
        companyElement.className = 'calendar-event-company';
        companyElement.textContent = job.company;
        eventCard.appendChild(companyElement);

        eventCard.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showJobDetail(job);
        });

        eventsContainer.appendChild(eventCard);
      });

      // Show "more" indicator if there are more jobs
      if (jobs.length > maxVisible) {
        const moreElement = document.createElement('div');
        moreElement.className = 'calendar-more-events';
        moreElement.textContent = `+${jobs.length - maxVisible} more`;
        moreElement.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showDayJobsList(jobs, dayNumber, this.currentDate.getMonth(), this.currentDate.getFullYear());
        });
        eventsContainer.appendChild(moreElement);
      }

      dayElement.appendChild(eventsContainer);
    }

    // Add click handler to day element to show all jobs for that day
    if (jobs && jobs.length > 0 && !isOtherMonth) {
      dayElement.style.cursor = 'pointer';
      dayElement.addEventListener('click', () => {
        this.showDayJobsList(jobs, dayNumber, this.currentDate.getMonth(), this.currentDate.getFullYear());
      });
    }

    return dayElement;
  }

  groupJobsByDate(jobs) {
    const grouped = {};

    jobs.forEach(job => {
      const date = new Date(job.dateApplied);
      const dateKey = this.getDateKey(date);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(job);
    });

    return grouped;
  }

  getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStatusStyle(status) {
    const statusColors = {
      'applied': { bg: 'rgba(206, 205, 202, 0.5)', color: 'rgba(55, 53, 47, 0.85)' },
      'interview': { bg: 'rgba(219, 237, 255, 0.9)', color: 'rgb(11, 110, 153)' },
      'offer': { bg: 'rgba(219, 237, 219, 0.9)', color: 'rgb(0, 135, 107)' },
      'rejected': { bg: 'rgba(255, 226, 221, 0.9)', color: 'rgb(180, 35, 24)' },
      'withdrawn': { bg: 'rgba(206, 205, 202, 0.5)', color: 'rgba(55, 53, 47, 0.85)' }
    };
    return statusColors[status] || statusColors['applied'];
  }

  getJobIcon(jobId) {
    // Use job ID to consistently assign the same icon to the same job
    const hash = jobId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    const index = Math.abs(hash) % this.jobIcons.length;
    return this.jobIcons[index];
  }

  showDayJobsList(jobs, day, month, year) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dateTitle = `${monthNames[month]} ${day}, ${year}`;

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    // Create modal container - smaller, more compact
    const modal = document.createElement('div');
    modal.className = 'day-jobs-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 6px;
      width: 420px;
      max-width: 90vw;
      max-height: 480px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    `;

    // Modal header - more compact
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid rgba(55, 53, 47, 0.09);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    `;

    const headerTitle = document.createElement('div');
    headerTitle.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: rgb(55, 53, 47);
    `;
    headerTitle.textContent = `${dateTitle}`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: rgba(55, 53, 47, 0.5);
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 20ms ease-in;
    `;
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = 'rgba(55, 53, 47, 0.08)';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'none';
    });
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);

    // Modal body with Notion-style list - compact and scrollable
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 4px 0;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    `;

    // Create Notion-style list items - more compact
    jobs.forEach((job, index) => {
      const listItem = document.createElement('div');
      listItem.style.cssText = `
        display: flex;
        align-items: center;
        padding: 4px 16px;
        cursor: pointer;
        transition: background 20ms ease-in;
        min-height: 32px;
      `;

      listItem.addEventListener('mouseover', () => {
        listItem.style.background = 'rgba(55, 53, 47, 0.08)';
      });
      listItem.addEventListener('mouseout', () => {
        listItem.style.background = 'transparent';
      });
      listItem.addEventListener('click', () => {
        document.body.removeChild(overlay);
        this.showJobDetail(job);
      });

      // Bullet point - smaller
      const bullet = document.createElement('div');
      bullet.style.cssText = `
        width: 3px;
        height: 3px;
        border-radius: 50%;
        background: rgba(55, 53, 47, 0.4);
        margin-right: 10px;
        flex-shrink: 0;
      `;

      // Job content
      const content = document.createElement('div');
      content.style.cssText = `
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      `;

      // Job title and company
      const textContainer = document.createElement('div');
      textContainer.style.cssText = `
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;

      const titleText = document.createElement('span');
      titleText.style.cssText = `
        color: rgb(55, 53, 47);
        font-size: 13px;
        font-weight: 500;
      `;
      titleText.textContent = job.title;

      const companyText = document.createElement('span');
      companyText.style.cssText = `
        color: rgba(55, 53, 47, 0.65);
        font-size: 13px;
        margin-left: 4px;
      `;
      companyText.textContent = `at ${job.company}`;

      textContainer.appendChild(titleText);
      textContainer.appendChild(companyText);

      // Status badge - smaller
      const statusStyle = this.getStatusStyle(job.status);
      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = `
        display: inline-flex;
        align-items: center;
        height: 20px;
        padding: 0 6px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 500;
        background: ${statusStyle.bg};
        color: ${statusStyle.color};
        white-space: nowrap;
        flex-shrink: 0;
      `;
      const statusLabels = {
        'applied': 'Applied',
        'interview': 'Interview',
        'offer': 'Offer',
        'rejected': 'Rejected',
        'withdrawn': 'Withdrawn'
      };
      statusBadge.textContent = statusLabels[job.status] || job.status;

      content.appendChild(textContainer);
      content.appendChild(statusBadge);

      listItem.appendChild(bullet);
      listItem.appendChild(content);

      body.appendChild(listItem);
    });

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    document.body.appendChild(overlay);
  }
}

// Initialize dashboard
const dashboard = new DashboardUI();

