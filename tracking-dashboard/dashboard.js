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

    // Show loading state immediately
    this.showLoadingState();

    // Track loading start time to ensure minimum loading time for better UX
    const loadingStartTime = Date.now();
    const MIN_LOADING_TIME = 400; // Minimum 400ms to show loading state

    // Initialize sync manager and API client
    await this.initializeSync();

    await this.waitForTracker();
    await this.loadCompactMode();
    await this.setupUserMenu();

    console.log('[Dashboard] ✅ JobTracker loaded with', window.jobTracker.jobs.length, 'jobs');

    // Ensure loading state is visible for at least MIN_LOADING_TIME
    const loadingElapsed = Date.now() - loadingStartTime;
    if (loadingElapsed < MIN_LOADING_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - loadingElapsed));
    }

    this.setupEventListeners();
    this.setupSocketListeners();
    this.setupGlobalNotifications();
    this.setupJobTrackerListener();
    this.render();

    console.log('[Dashboard] 🎨 Dashboard initialized');
  }

  // Listen for job tracker storage changes and auto-refresh the display
  setupJobTrackerListener() {
    if (window.jobTracker && window.jobTracker.onStorageChange) {
      window.jobTracker.onStorageChange((jobs) => {
        console.log('[Dashboard] 📥 Detected job changes in storage, refreshing display with', jobs.length, 'jobs');
        // Refresh the display without the spinning icon
        this.render();

        // Update stats
        const filteredJobs = this.getFilteredJobs();
        this.updateStats(filteredJobs);

        // Show a subtle notification
        if (window.globalNotifications) {
          window.globalNotifications.showNotionToast('Jobs updated', 'success', 2000);
        }
      });
    }
  }

  setupGlobalNotifications() {
    // Initialize global notifications
    if (window.globalNotifications) {
      window.globalNotifications.injectInto('#notification-bell-wrapper');
      console.log('[Dashboard] ✅ Global notifications initialized');
    } else {
      console.warn('[Dashboard] Global notifications not available');
    }
  }

  async setupSocketListeners() {
    // Connect to socket if available and authenticated
    if (typeof window.socketClient !== 'undefined' && window.authManager) {
      try {
        // Wait for auth manager to initialize
        await window.authManager.init();

        const token = window.authManager.getToken();
        if (token) {
          await window.socketClient.connect(token);
          console.log('[Dashboard] Socket connected');

          // Join all user's groups to receive notifications
          await this.joinAllUserGroups();

          // NOTE: job-shared notifications are now handled by global-notifications.js
          // to avoid duplicate notifications. The global-notifications.js file
          // listens to the socket event and shows both the notification panel entry
          // and the Notion-style toast.

          // NOTE: new-message notifications are now handled by global-notifications.js
          // to avoid duplicate notifications.

          // Listen for mention notifications
          window.socketClient.on('mention-notification', (data) => {
            console.log('[Dashboard] Mention notification:', data);

            const message = `${data.mentionedBy.userName} mentioned you in a message`;

            // Add to global notifications
            if (window.globalNotifications) {
              window.globalNotifications.addNotification({
                type: 'mention',
                title: 'You were mentioned',
                message: message,
                data: {
                  groupId: data.groupId,
                  messageId: data.messageId,
                  mentionedBy: data.mentionedBy
                }
              });
              console.log('[Dashboard] ✅ Added mention notification to global notifications');
            }

            // Show Notion-style toast notification
            if (window.globalNotifications) {
              window.globalNotifications.showNotionToast(message, 'warning', 5000);
            }

            // Show browser notification via background script
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.sendMessage({
                action: 'showNotification',
                notificationId: `mention-${Date.now()}`,
                title: 'You were mentioned',
                message: message,
                priority: 2,
                requireInteraction: true,
                data: { type: 'mention', groupId: data.groupId }
              });
            }
          });

          // Listen for member joined
          window.socketClient.on('member-joined', (data) => {
            console.log('[Dashboard] Member joined:', data);
            if (window.globalNotifications) {
              window.globalNotifications.showNotionToast(`${data.member.name} joined a group!`, 'success', 3000);
            }
          });

          // Listen for job application
          window.socketClient.on('job-application', (data) => {
            console.log('[Dashboard] Job application:', data);
            if (window.globalNotifications && data.job) {
              window.globalNotifications.showNotionToast(`${data.appliedBy.name} applied to ${data.job.company}`, 'success', 4000);
            }
          });
        }
      } catch (error) {
        console.error('[Dashboard] Socket setup failed:', error);
      }
    }
  }

  async joinAllUserGroups() {
    try {
      console.log('[Dashboard] 🔗 Joining all user groups for notifications...');

      // Get user's groups from API
      if (!window.groupAPI) {
        console.warn('[Dashboard] groupAPI not available');
        return;
      }

      const groups = await window.groupAPI.getMyGroups();
      console.log(`[Dashboard] Found ${groups.length} groups to join`);

      // Join each group room
      for (const group of groups) {
        if (window.socketClient && window.socketClient.isConnected) {
          window.socketClient.joinGroup(group._id);
          console.log(`[Dashboard] ✅ Joined group: ${group.name}`);
        }
      }

      console.log('[Dashboard] ✅ Joined all user groups');
    } catch (error) {
      console.error('[Dashboard] Error joining groups:', error);
    }
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
      // CRITICAL: Initialize auth manager first before syncing
      if (window.authManager && !window.authManager.initialized) {
        console.log('[Dashboard] Initializing AuthManager before sync...');
        await window.authManager.init();
      }

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

    // Wait for auth manager to be initialized
    if (window.authManager && !window.authManager.initialized) {
      console.log('[Dashboard] ⏳ Waiting for AuthManager...');
      await window.authManager.init();
    }

    // IMPORTANT: Reload jobs for the current user after auth is ready
    // This ensures we load from the correct user-specific storage key
    // (JobTracker may have loaded before auth was ready)
    if (window.authManager?.currentUser?._id) {
      const currentStorageKey = window.jobTracker.getStorageKey();
      const expectedKey = `trackedJobs_${window.authManager.currentUser._id}`;

      if (currentStorageKey !== expectedKey) {
        console.log('[Dashboard] 🔄 Reloading jobs for authenticated user...');
        await window.jobTracker.reloadForUser();
      }
    }
  }

  showLoadingState() {
    // Show loading in Kanban columns
    const columns = ['saved', 'applied', 'interview', 'offer', 'rejected'];
    columns.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      if (column) {
        column.innerHTML = `
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Fetching your jobs...</p>
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
            <p>Fetching your jobs...</p>
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

    // Add job button (New button)
    document.getElementById('add-job-btn').addEventListener('click', () => {
      this.showManualAddJobModal();
    });

    // Groups button - navigate to groups page
    const openGroupsBtn = document.getElementById('open-groups-btn');
    if (openGroupsBtn) {
      openGroupsBtn.addEventListener('click', () => {
        window.location.href = 'groups.html';
      });
    }

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
    const statuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];

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
        'saved': 'var(--c-purTexAccPri)',
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
    const message = `Moved to ${status.charAt(0).toUpperCase() + status.slice(1)}`;

    // Use Notion-style toast if available
    if (window.globalNotifications) {
      window.globalNotifications.showNotionToast(message, 'success', 2000);
    } else {
      // Fallback to old toast
      const toast = document.createElement('div');
      toast.className = 'status-toast';
      toast.textContent = `✓ ${message}`;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 10);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.jobId = job.id;
    card.draggable = true;

    card.innerHTML = `
      <div class="job-actions">
        <div role="button" tabindex="0" class="job-action-btn" title="Share to Group">
          <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" style="width: 16px; height: 16px; display: block; fill: inherit; flex-shrink: 0;">
            <path d="M8.5 1a.5.5 0 0 0-1 0v6H1.5a.5.5 0 0 0 0 1h6v6a.5.5 0 0 0 1 0V8h6a.5.5 0 0 0 0-1h-6V1z"></path>
          </svg>
        </div>
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

    const shareBtn = card.querySelector('.job-action-btn[title="Share to Group"]');
    const editBtn = card.querySelector('.job-action-btn[title="Edit"]');
    const moreBtn = card.querySelector('.job-action-btn[title="More"]');

    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showShareToGroupModal(job);
      });
    }

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
    // Use _id if available (MongoDB ID), otherwise use id (local ID)
    const jobId = job._id || job.id;
    console.log('[Dashboard] Opening job detail for:', { jobId, title: job.title, company: job.company });

    // Check if chrome.runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.error('[Dashboard] chrome.runtime not available, opening directly');
      // Fallback: open directly in new tab
      window.open(`job-detail.html?id=${jobId}`, '_blank');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'openJobDetail',
      jobId: jobId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Dashboard] Error sending message:', chrome.runtime.lastError);
        // Fallback: open directly
        window.open(`job-detail.html?id=${jobId}`, '_blank');
      } else {
        console.log('[Dashboard] Message sent successfully');
      }
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
      'saved': { bg: 'rgba(232, 222, 238, 0.9)', color: 'rgb(103, 36, 131)' },
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
      background: rgba(15, 15, 15, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(3px);
      padding: 20px;
    `;

    // Create modal container - clean and minimal
    const modal = document.createElement('div');
    modal.className = 'day-jobs-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 400px;
      max-width: 90vw;
      max-height: 70vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px;
      animation: modalFadeIn 0.2s ease;
    `;

    // Add animation keyframes if not already present
    if (!document.querySelector('#modal-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-animation-styles';
      style.textContent = `
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    // Modal header - clean and minimal
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid rgba(55, 53, 47, 0.09);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    `;

    const headerTitle = document.createElement('div');
    headerTitle.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: rgb(55, 53, 47);
      line-height: 1.2;
    `;
    headerTitle.textContent = `${dateTitle}`;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      font-size: 24px;
      color: rgba(55, 53, 47, 0.5);
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      transition: background 20ms ease-in;
    `;
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = 'rgba(55, 53, 47, 0.08)';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'transparent';
    });
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);

    // Modal body with clean list
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 8px 0;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    `;

    // Create clean list items matching the screenshot
    jobs.forEach((job, index) => {
      const listItem = document.createElement('div');
      listItem.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 20px;
        cursor: pointer;
        transition: background 20ms ease-in;
        min-height: 44px;
        gap: 12px;
      `;

      listItem.addEventListener('mouseover', () => {
        listItem.style.background = 'rgba(55, 53, 47, 0.04)';
      });
      listItem.addEventListener('mouseout', () => {
        listItem.style.background = 'transparent';
      });
      listItem.addEventListener('click', () => {
        document.body.removeChild(overlay);
        this.showJobDetail(job);
      });

      // Left side: Bullet + Job info
      const leftSide = document.createElement('div');
      leftSide.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
      `;

      // Bullet point
      const bullet = document.createElement('div');
      bullet.style.cssText = `
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(55, 53, 47, 0.4);
        flex-shrink: 0;
      `;

      // Job title and company container
      const textContainer = document.createElement('div');
      textContainer.style.cssText = `
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      `;

      // Job title
      const titleText = document.createElement('div');
      titleText.style.cssText = `
        color: rgb(55, 53, 47);
        font-size: 14px;
        font-weight: 500;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      titleText.textContent = job.title;

      // Company name
      const companyText = document.createElement('div');
      companyText.style.cssText = `
        color: rgba(55, 53, 47, 0.6);
        font-size: 13px;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      companyText.textContent = `at ${job.company}`;

      textContainer.appendChild(titleText);
      textContainer.appendChild(companyText);

      leftSide.appendChild(bullet);
      leftSide.appendChild(textContainer);

      // Right side: Status badge
      const statusStyle = this.getStatusStyle(job.status);
      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = `
        display: inline-flex;
        align-items: center;
        height: 24px;
        padding: 0 10px;
        border-radius: 4px;
        font-size: 12px;
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
        'withdrawn': 'Withdrawn',
        'saved': 'Saved'
      };
      statusBadge.textContent = statusLabels[job.status] || job.status;

      listItem.appendChild(leftSide);
      listItem.appendChild(statusBadge);

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

  async showShareToGroupModal(job) {
    console.log('[Dashboard] Opening share to group modal for job:', job.id);

    const modal = document.getElementById('share-to-group-modal');
    const closeBtn = document.getElementById('close-share-to-group-modal');
    const jobInfoDiv = document.getElementById('share-job-info');
    const groupsListDiv = document.getElementById('share-groups-list');

    if (!modal) {
      console.error('[Dashboard] Share to group modal not found');
      return;
    }

    // Store current job for sharing
    this.currentJobToShare = job;

    // Populate job info
    jobInfoDiv.innerHTML = `
      <div class="share-job-title">${this.escapeHtml(job.title)}</div>
      <div class="share-job-company">${this.escapeHtml(job.company)}</div>
      <div class="share-job-meta">
        ${job.location ? `<span>📍 ${this.escapeHtml(job.location)}</span>` : ''}
        ${job.workType ? `<span>💼 ${this.escapeHtml(job.workType)}</span>` : ''}
      </div>
    `;

    // Show modal
    modal.style.display = 'flex';

    // Load groups
    await this.loadGroupsForSharing(groupsListDiv);

    // Close button handler
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      this.currentJobToShare = null;
    };

    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        this.currentJobToShare = null;
      }
    };
  }

  async loadGroupsForSharing(container) {
    try {
      container.innerHTML = '<div class="loading-state">Loading groups...</div>';

      // Check if groupAPI is available
      if (typeof groupAPI === 'undefined') {
        console.error('[Dashboard] groupAPI not available');
        container.innerHTML = '<div class="empty-state">Group API not available. Please refresh the page.</div>';
        return;
      }

      const groups = await groupAPI.getMyGroups();

      if (!groups || groups.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>You haven't joined any groups yet.</p>
            <p style="margin-top: 8px; font-size: 13px;">Join or create a group to share jobs with others.</p>
          </div>
        `;
        return;
      }

      // Render groups - simple calendar day jobs style
      container.innerHTML = groups.map(group => {
        const memberCount = group.memberCount || 0;

        return `
          <div class="share-group-item" data-group-id="${group._id}">
            <div class="share-group-info">
              <div class="share-group-details">
                <div class="share-group-name">${this.escapeHtml(group.name)}</div>
                <div class="share-group-meta">${memberCount} member${memberCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <button class="share-group-btn" data-group-id="${group._id}">Share</button>
          </div>
        `;
      }).join('');

      // Attach click handlers to share buttons
      container.querySelectorAll('.share-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const groupId = btn.dataset.groupId;
          await this.shareJobToGroup(groupId, btn);
        });
      });

    } catch (error) {
      console.error('[Dashboard] Error loading groups:', error);
      container.innerHTML = `
        <div class="empty-state">
          <p>Failed to load groups</p>
          <p style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">${error.message}</p>
        </div>
      `;
    }
  }

  async shareJobToGroup(groupId, button) {
    if (!this.currentJobToShare) {
      console.error('[Dashboard] No job selected for sharing');
      return;
    }

    try {
      console.log('[Dashboard] Sharing job to group:', groupId);

      // Disable button
      button.disabled = true;
      button.textContent = 'Sharing...';

      const job = this.currentJobToShare;

      const jobData = {
        company: job.company,
        title: job.title,
        position: job.title,
        description: job.description || '',
        descriptionHtml: job.descriptionHtml || '',
        location: job.location || '',
        salary: job.salary || '',
        workType: job.workType || '',
        link: job.linkedinUrl || job.jobUrl || '',
        linkedinUrl: job.linkedinUrl || '',
        jobUrl: job.jobUrl || '',
        linkedinJobId: job.linkedinJobId || '',
        jobPostedHoursAgo: job.jobPostedHoursAgo || null,
        applicantsAtApplyTime: job.applicantsAtApplyTime || null,
        applicantsText: job.applicantsText || null,
        timeToApplyBucket: job.timeToApplyBucket || null,
        competitionBucket: job.competitionBucket || null,
        source: job.source || 'Manual'
      };

      // STEP 1: Create SharedJob record so it appears in Jobs section
      if (window.sharedJobsAPI) {
        console.log('[Dashboard] Creating SharedJob record via API...');
        await window.sharedJobsAPI.shareJob(groupId, jobData);
        console.log('[Dashboard] SharedJob record created successfully');
      } else {
        console.warn('[Dashboard] sharedJobsAPI not available, job will only appear in chat');
      }

      // STEP 2: Send job as inline message in chat via Socket.io
      if (window.socketClient && window.socketClient.isConnected) {
        console.log('[Dashboard] Sending job as inline chat message');

        window.socketClient.sendMessage(groupId, {
          content: `Shared a job: ${job.title} at ${job.company}`,
          messageType: 'job_share',
          jobData: jobData
        });
      } else {
        console.warn('[Dashboard] Socket not connected, job saved but chat message not sent');
      }

      // Update button
      button.textContent = '✓ Shared';
      button.classList.add('shared');

      // Show success notification
      this.showNotification('Job shared to group!', 'success');

      // Close modal after a short delay
      setTimeout(() => {
        const modal = document.getElementById('share-to-group-modal');
        if (modal) {
          modal.style.display = 'none';
        }
        this.currentJobToShare = null;
      }, 1000);

    } catch (error) {
      console.error('[Dashboard] Error sharing job:', error);
      this.showNotification(error.message || 'Failed to share job', 'error');

      // Reset button
      button.disabled = false;
      button.textContent = 'Share';
    }
  }

  showNotification(message, type = 'info') {
    // Use global Notion-style toast if available
    if (window.globalNotifications && window.globalNotifications.showNotionToast) {
      window.globalNotifications.showNotionToast(message, type);
      return;
    }

    // Fallback to simple toast
    const toast = document.createElement('div');
    toast.className = 'status-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize dashboard
const dashboard = new DashboardUI();

