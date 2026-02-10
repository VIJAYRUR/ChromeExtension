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

    // Pagination for table view (local pagination)
    this.currentPage = 1;
    this.itemsPerPage = 20; // Default increased from 10 to 20 for better scan efficiency

    // Lazy loading state (database-first approach)
    this.lazyLoadEnabled = true; // Toggle between lazy loading and offline-first
    this.apiPage = 1; // Current page from API
    this.apiPageSize = 50; // Jobs per API request
    this.hasMoreJobs = true; // Whether more jobs exist on server
    this.isLoadingJobs = false; // Prevent concurrent loads
    this.allJobs = []; // Jobs loaded so far (replaces window.jobTracker.jobs for lazy loading)
    this.totalJobsCount = 0; // Total jobs on server

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
    await this.loadItemsPerPage();
    await this.setupUserMenu();

    // Load jobs using lazy loading (database-first) if authenticated
    if (this.lazyLoadEnabled && window.apiClient?.isAuthenticated()) {
      console.log('[Dashboard] 📥 Loading jobs with lazy loading (database-first)...');
      await this.loadJobsFromAPI(1, false);
    } else {
      // Fallback to offline-first mode
      console.log('[Dashboard] 📦 Loading jobs from cache (offline-first)...');
      console.log('[Dashboard] ✅ JobTracker loaded with', window.jobTracker.jobs.length, 'jobs');
      this.allJobs = window.jobTracker.jobs;
      this.lazyLoadEnabled = false; // Disable lazy loading
    }

    // Ensure loading state is visible for at least MIN_LOADING_TIME
    const loadingElapsed = Date.now() - loadingStartTime;
    if (loadingElapsed < MIN_LOADING_TIME) {
      await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - loadingElapsed));
    }

    this.setupEventListeners();
    this.setupSocketListeners();
    this.setupGlobalNotifications();
    this.setupJobTrackerListener();

    // Render is called by loadJobsFromAPI, so only call if offline mode
    if (!this.lazyLoadEnabled) {
      this.render();
    }

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

  async loadItemsPerPage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['itemsPerPage']);
        if (result.itemsPerPage) {
          this.itemsPerPage = result.itemsPerPage;
          console.log('[Dashboard] 📄 Loaded saved items per page:', this.itemsPerPage);
        }
      } else {
        // Fallback to localStorage for non-extension environment
        const saved = localStorage.getItem('itemsPerPage');
        if (saved) {
          this.itemsPerPage = parseInt(saved, 10);
        }
      }

      // Update the select element if it exists
      const rowsPerPageSelect = document.getElementById('rows-per-page-select');
      if (rowsPerPageSelect) {
        rowsPerPageSelect.value = this.itemsPerPage.toString();
      }
    } catch (error) {
      console.log('[Dashboard] Could not load items per page preference');
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

  // ==================== Lazy Loading Methods ====================

  /**
   * Load jobs from API with pagination (database-first approach)
   * @param {number} page - Page number to load (default: 1)
   * @param {boolean} append - Whether to append to existing jobs or replace (default: false)
   */
  async loadJobsFromAPI(page = 1, append = false) {
    if (this.isLoadingJobs) {
      console.log('[Dashboard] Already loading jobs, skipping...');
      return;
    }

    this.isLoadingJobs = true;
    console.log(`[Dashboard] 📥 Loading jobs from API (page ${page}, append: ${append})...`);

    // Show loading indicator
    if (append) {
      this.showLoadingMoreIndicator();
    } else {
      this.showLoadingState();
    }

    try {
      // Build API params from current filters
      const params = {
        page,
        limit: this.apiPageSize,
        sortBy: this.getSortField(),
        sortOrder: this.getSortOrder()
      };

      // Add filters
      if (this.currentFilters.status && this.currentFilters.status !== 'all') {
        params.status = this.currentFilters.status;
      }
      if (this.currentFilters.workType && this.currentFilters.workType !== 'all') {
        params.workType = this.currentFilters.workType;
      }
      if (this.currentFilters.query) {
        params.search = this.currentFilters.query;
      }

      // Fetch from backend API
      const response = await window.apiClient.getJobs(params);

      if (response.success) {
        const { jobs, pagination } = response.data;

        console.log(`[Dashboard] ✅ Loaded ${jobs.length} jobs (page ${pagination.page}/${pagination.pages}, total: ${pagination.total})`);

        // Update state
        if (append) {
          this.allJobs = [...this.allJobs, ...jobs];
        } else {
          this.allJobs = jobs;
        }

        this.apiPage = pagination.page;
        this.hasMoreJobs = page < pagination.pages;
        this.totalJobsCount = pagination.total;

        // Cache for offline access
        await this.cacheJobsLocally(this.allJobs);

        // Render
        this.render();
      } else {
        console.error('[Dashboard] Failed to load jobs from API');
        // Fallback to cache
        await this.loadJobsFromCache();
      }
    } catch (error) {
      console.error('[Dashboard] Error loading jobs from API:', error);

      // Fallback to local cache (offline mode)
      if (!append) {
        console.log('[Dashboard] Falling back to cached jobs (offline mode)');
        await this.loadJobsFromCache();
      }
    } finally {
      this.isLoadingJobs = false;
      this.hideLoadingMoreIndicator();
    }
  }

  /**
   * Load jobs from local cache (offline fallback)
   */
  async loadJobsFromCache() {
    console.log('[Dashboard] 📦 Loading jobs from cache...');

    const storageKey = window.jobTracker.getStorageKey();

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([storageKey]);
        this.allJobs = result[storageKey] || [];
      } else {
        const stored = localStorage.getItem(storageKey);
        this.allJobs = stored ? JSON.parse(stored) : [];
      }

      console.log(`[Dashboard] ✅ Loaded ${this.allJobs.length} jobs from cache`);
      this.totalJobsCount = this.allJobs.length;
      this.hasMoreJobs = false; // No pagination in offline mode

      this.render();
    } catch (error) {
      console.error('[Dashboard] Error loading from cache:', error);
      this.allJobs = [];
      this.render();
    }
  }

  /**
   * Cache jobs locally for offline access
   */
  async cacheJobsLocally(jobs) {
    const storageKey = window.jobTracker.getStorageKey();

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = {};
        data[storageKey] = jobs;
        await chrome.storage.local.set(data);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(jobs));
      }

      console.log(`[Dashboard] 💾 Cached ${jobs.length} jobs locally`);
    } catch (error) {
      console.error('[Dashboard] Error caching jobs:', error);
    }
  }

  /**
   * Show "Loading more..." indicator at bottom of kanban/table
   */
  showLoadingMoreIndicator() {
    // For kanban view - add to each column
    if (this.currentView === 'kanban') {
      const columns = ['saved', 'applied', 'interview', 'offer', 'rejected'];
      columns.forEach(status => {
        const column = document.getElementById(`column-${status}`);
        if (column) {
          // Remove existing indicator if any
          const existing = column.querySelector('.loading-more-indicator');
          if (existing) existing.remove();

          // Add new indicator
          const indicator = document.createElement('div');
          indicator.className = 'loading-more-indicator';
          indicator.innerHTML = `
            <div class="loading-spinner-small"></div>
            <span>Loading more...</span>
          `;
          column.appendChild(indicator);
        }
      });
    }

    // For table view - add row at bottom
    if (this.currentView === 'table') {
      const tbody = document.getElementById('table-body');
      if (tbody) {
        const existing = tbody.querySelector('.loading-more-row');
        if (existing) existing.remove();

        const row = document.createElement('tr');
        row.className = 'loading-more-row';
        row.innerHTML = `
          <td colspan="7" style="text-align: center; padding: 20px;">
            <div class="loading-spinner-small" style="display: inline-block; margin-right: 8px;"></div>
            <span>Loading more jobs...</span>
          </td>
        `;
        tbody.appendChild(row);
      }
    }
  }

  /**
   * Hide "Loading more..." indicator
   */
  hideLoadingMoreIndicator() {
    // Remove from kanban columns
    document.querySelectorAll('.loading-more-indicator').forEach(el => el.remove());

    // Remove from table
    const loadingRow = document.querySelector('.loading-more-row');
    if (loadingRow) loadingRow.remove();
  }

  /**
   * Get sort field from current filter
   */
  getSortField() {
    const sortMap = {
      'date-desc': 'dateApplied',
      'date-asc': 'dateApplied',
      'company-asc': 'company',
      'company-desc': 'company'
    };
    return sortMap[this.currentFilters.sort] || 'dateApplied';
  }

  /**
   * Get sort order from current filter
   */
  getSortOrder() {
    return this.currentFilters.sort.includes('asc') ? 'asc' : 'desc';
  }

  /**
   * Reload jobs when filters change (for lazy loading mode)
   */
  async reloadJobsWithFilters() {
    if (this.lazyLoadEnabled && window.apiClient?.isAuthenticated()) {
      // Reset pagination and reload from API
      this.apiPage = 1;
      this.allJobs = [];
      await this.loadJobsFromAPI(1, false);
    } else {
      // Offline mode - just re-render with local filtering
      this.render();
    }
  }

  setupEventListeners() {
    // Inline search (always visible)
    const inlineSearchInput = document.getElementById('inline-search-input');
    const clearInlineSearchBtn = document.getElementById('clear-inline-search');

    // Inline search input (debounced for API calls)
    let searchTimeout;
    inlineSearchInput.addEventListener('input', (e) => {
      this.currentFilters.query = e.target.value;
      this.currentPage = 1; // Reset to first page

      // Show/hide clear button
      clearInlineSearchBtn.style.display = e.target.value ? 'flex' : 'none';

      // Debounce search for lazy loading (wait 300ms after user stops typing)
      if (this.lazyLoadEnabled) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.reloadJobsWithFilters();
        }, 300);
      } else {
        this.render();
      }
    });

    // Clear inline search
    clearInlineSearchBtn.addEventListener('click', () => {
      inlineSearchInput.value = '';
      clearInlineSearchBtn.style.display = 'none';
      this.currentFilters.query = '';
      this.currentPage = 1;
      this.reloadJobsWithFilters();
    });

    // Close search on Escape key
    inlineSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        inlineSearchInput.value = '';
        clearInlineSearchBtn.style.display = 'none';
        this.currentFilters.query = '';
        this.currentPage = 1;
        this.reloadJobsWithFilters();
      }
    });

    // Filter button - toggle filter panel
    const filterBtn = document.getElementById('filter-btn');
    const filterPanel = document.getElementById('filter-panel');
    const sortPanel = document.getElementById('sort-panel');

    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = filterPanel.style.display === 'block';
      filterPanel.style.display = isVisible ? 'none' : 'block';
      sortPanel.style.display = 'none'; // Close sort panel
    });

    // Sort button - toggle sort panel
    const sortBtn = document.getElementById('sort-btn');

    sortBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = sortPanel.style.display === 'block';
      sortPanel.style.display = isVisible ? 'none' : 'block';
      filterPanel.style.display = 'none'; // Close filter panel
    });

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
      if (!filterBtn.contains(e.target) && !filterPanel.contains(e.target)) {
        filterPanel.style.display = 'none';
      }
      if (!sortBtn.contains(e.target) && !sortPanel.contains(e.target)) {
        sortPanel.style.display = 'none';
      }
    });

    // Filter panel - status filter
    const filterStatusPanel = document.getElementById('filter-status-panel');
    filterStatusPanel.addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.currentPage = 1;

      // Update filter badge
      this.updateFilterBadge();

      // Auto-close panel on selection
      filterPanel.style.display = 'none';

      this.reloadJobsWithFilters();
    });

    // Filter panel - work type filter
    const filterWorktypePanel = document.getElementById('filter-worktype-panel');
    filterWorktypePanel.addEventListener('change', (e) => {
      this.currentFilters.workType = e.target.value;
      this.currentPage = 1;

      // Update filter badge
      this.updateFilterBadge();

      // Auto-close panel on selection
      filterPanel.style.display = 'none';

      this.reloadJobsWithFilters();
    });

    // Clear filters button
    const filterClearBtn = document.getElementById('filter-clear-btn');
    if (filterClearBtn) {
      filterClearBtn.addEventListener('click', () => {
        // Reset filters to default
        this.currentFilters.status = 'all';
        this.currentFilters.workType = 'all';
        this.currentPage = 1;

        // Update UI
        filterStatusPanel.value = 'all';
        filterWorktypePanel.value = 'all';

        // Update filter badge
        this.updateFilterBadge();

        // Close panel
        filterPanel.style.display = 'none';

        this.reloadJobsWithFilters();
      });
    }

    // Initialize filter badge
    this.updateFilterBadge();

    // Keyboard navigation for filter panel
    filterStatusPanel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        filterPanel.style.display = 'none';
        filterBtn.focus();
      }
    });

    filterWorktypePanel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        filterPanel.style.display = 'none';
        filterBtn.focus();
      }
    });

    // Sort panel - sort options
    const sortOptions = document.querySelectorAll('.sort-option');
    const sortBtnLabel = document.getElementById('sort-btn-label');

    sortOptions.forEach(option => {
      option.addEventListener('click', () => {
        const sortValue = option.dataset.sort;
        const sortLabel = option.dataset.label;
        this.currentFilters.sort = sortValue;
        this.currentPage = 1;

        // Update active state
        sortOptions.forEach(opt => {
          opt.classList.remove('active');
          const checkmark = opt.querySelector('.sort-option-check');
          if (checkmark) checkmark.style.display = 'none';
        });
        option.classList.add('active');
        const activeCheckmark = option.querySelector('.sort-option-check');
        if (activeCheckmark) activeCheckmark.style.display = 'block';

        // Update button label
        if (sortBtnLabel && sortLabel) {
          sortBtnLabel.textContent = sortLabel;
        }

        // Close panel and reload
        sortPanel.style.display = 'none';
        this.reloadJobsWithFilters();
      });
    });

    // Set initial active sort option
    const defaultSort = document.querySelector('.sort-option[data-sort="date-desc"]');
    if (defaultSort) {
      defaultSort.classList.add('active');
      const defaultCheckmark = defaultSort.querySelector('.sort-option-check');
      if (defaultCheckmark) defaultCheckmark.style.display = 'block';

      // Set initial button label
      const defaultLabel = defaultSort.dataset.label;
      if (sortBtnLabel && defaultLabel) {
        sortBtnLabel.textContent = defaultLabel;
      }
    }

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

    // Rows per page selector
    const rowsPerPageSelect = document.getElementById('rows-per-page-select');
    if (rowsPerPageSelect) {
      rowsPerPageSelect.addEventListener('change', async (e) => {
        const newItemsPerPage = parseInt(e.target.value, 10);
        this.itemsPerPage = newItemsPerPage;
        this.currentPage = 1; // Reset to first page

        // Persist preference
        await chrome.storage.local.set({ itemsPerPage: newItemsPerPage });

        // Re-render table
        this.renderTable(this.currentJobs);
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
      nextPageBtn.addEventListener('click', async () => {
        if (this.lazyLoadEnabled) {
          // Lazy loading mode - check if we need to load more from API
          const currentlyLoadedPages = Math.ceil(this.allJobs.length / this.itemsPerPage);
          const nextPage = this.currentPage + 1;

          // If next page exceeds currently loaded data, fetch more from API
          if (nextPage > currentlyLoadedPages && this.hasMoreJobs) {
            console.log(`[Dashboard] 📄 Loading more jobs for page ${nextPage}...`);
            await this.loadJobsFromAPI(this.apiPage + 1, true);
          }

          // Now increment page if we have data
          const totalPages = Math.ceil(this.allJobs.length / this.itemsPerPage);
          if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable(this.currentJobs);
          }
        } else {
          // Offline mode - just paginate through local data
          const totalPages = Math.ceil(this.currentJobs.length / this.itemsPerPage);
          if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable(this.currentJobs);
          }
        }
      });
    }

    // Listen for page visibility changes to refresh jobs when user returns
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        console.log('[Dashboard] 👁️ Page became visible, refreshing jobs...');

        // Reload jobs from API if authenticated and lazy loading is enabled
        if (this.lazyLoadEnabled && window.apiClient?.isAuthenticated()) {
          await this.loadJobsFromAPI(1, false);
        } else {
          // Reload from local storage
          if (window.jobTracker) {
            await window.jobTracker.loadJobs();
            this.allJobs = window.jobTracker.jobs;
          }
          this.render();
        }
      }
    });
  }

  async toggleCompactMode() {
    this.compactMode = !this.compactMode;
    document.body.classList.toggle('compact-mode', this.compactMode);
    await chrome.storage.local.set({ compactMode: this.compactMode });
  }

  /**
   * Update filter button badge to show active filters
   */
  updateFilterBadge() {
    const filterBtnBadge = document.getElementById('filter-btn-badge');
    const filterClearContainer = document.getElementById('filter-clear-container');

    if (!filterBtnBadge) return;

    // Count active filters (non-default values)
    const activeFilters = [];

    if (this.currentFilters.status !== 'all') {
      // Capitalize first letter for display
      const statusLabel = this.currentFilters.status.charAt(0).toUpperCase() +
                         this.currentFilters.status.slice(1);
      activeFilters.push(statusLabel);
    }

    if (this.currentFilters.workType !== 'all') {
      // Capitalize first letter for display
      const workTypeLabel = this.currentFilters.workType.charAt(0).toUpperCase() +
                           this.currentFilters.workType.slice(1);
      activeFilters.push(workTypeLabel);
    }

    // Update badge
    if (activeFilters.length > 0) {
      if (activeFilters.length === 1) {
        // Show the filter value
        filterBtnBadge.textContent = activeFilters[0];
      } else {
        // Show count
        filterBtnBadge.textContent = `${activeFilters.length} filters`;
      }
      filterBtnBadge.style.display = 'inline-block';

      // Show clear button
      if (filterClearContainer) {
        filterClearContainer.style.display = 'block';
      }
    } else {
      // Hide badge and clear button
      filterBtnBadge.style.display = 'none';
      if (filterClearContainer) {
        filterClearContainer.style.display = 'none';
      }
    }
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

    // Add/remove calendar-view-active class to body for full-screen layout
    if (view === 'calendar') {
      document.body.classList.add('calendar-view-active');
    } else {
      document.body.classList.remove('calendar-view-active');
    }

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
    // When lazy loading is enabled, filtering/sorting happens on server
    // So we just return the jobs we've loaded so far
    if (this.lazyLoadEnabled && this.allJobs.length > 0) {
      return this.allJobs;
    }

    // Fallback to offline-first mode (use JobTracker's local search)
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
    // When lazy loading, use server total count if available
    // Note: active/interviews counts are based on loaded jobs only
    const total = this.lazyLoadEnabled && this.totalJobsCount > 0
      ? this.totalJobsCount
      : jobs.length;
    const active = jobs.filter(j => j.status === 'applied' || j.status === 'interview').length;
    const interviews = jobs.filter(j => j.status === 'interview').length;

    // Update stats if elements exist
    const statTotal = document.getElementById('stat-total');
    const statActive = document.getElementById('stat-active');
    const statInterviews = document.getElementById('stat-interviews');

    if (statTotal) {
      statTotal.textContent = this.lazyLoadEnabled && this.hasMoreJobs
        ? `${total}+`
        : total;
    }
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
        transition: all 150ms ease;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        height: 36px;
        padding: 8px 12px;
        border-radius: 6px;
        white-space: nowrap;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.2;
        color: ${statusColors[status] || 'var(--text-secondary)'};
        background: rgba(55, 53, 47, 0.04);
        border: 1px solid rgba(55, 53, 47, 0.08);
        min-height: 36px;
      `;

      addButton.innerHTML = `
        <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" style="width: 14px; height: 14px; display: block; fill: inherit; flex-shrink: 0; color: inherit;">
          <path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74"></path>
        </svg>New page
      `;

      addButton.addEventListener('click', () => {
        this.showAddJobModal(status);
      });

      column.appendChild(addButton);

      this.setupDropZone(column, status);
    });

    // Setup infinite scroll for lazy loading
    if (this.lazyLoadEnabled) {
      this.setupKanbanInfiniteScroll();
    }
  }

  /**
   * Setup infinite scroll for Kanban columns
   */
  setupKanbanInfiniteScroll() {
    const statuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];

    statuses.forEach(status => {
      const column = document.getElementById(`column-${status}`);
      if (!column) return;

      // Remove existing listener if any
      if (column.scrollHandler) {
        column.removeEventListener('scroll', column.scrollHandler);
      }

      // Create scroll handler
      column.scrollHandler = () => {
        const scrollTop = column.scrollTop;
        const scrollHeight = column.scrollHeight;
        const clientHeight = column.clientHeight;

        // Load more when 200px from bottom
        if (scrollTop + clientHeight >= scrollHeight - 200) {
          if (this.hasMoreJobs && !this.isLoadingJobs) {
            console.log(`[Dashboard] 📜 Scroll detected in ${status} column, loading more jobs...`);
            this.loadJobsFromAPI(this.apiPage + 1, true);
          }
        }
      };

      // Add scroll listener
      column.addEventListener('scroll', column.scrollHandler);
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
      // Update in allJobs array if lazy loading is enabled
      if (this.lazyLoadEnabled && this.allJobs.length > 0) {
        const job = this.allJobs.find(j => j._id === jobId);
        if (job) {
          job.status = newStatus;
          console.log(`[Dashboard] ✅ Updated job ${jobId} in allJobs array`);
        }
      }

      // Use updateJobStatus instead of updateJob to avoid duplicate timeline entries
      console.log(`[Dashboard] 📞 Calling jobTracker.updateJobStatus for job ${jobId}`);
      const result = await window.jobTracker.updateJobStatus(jobId, newStatus, 'Moved via Kanban board');
      console.log(`[Dashboard] ✅ jobTracker.updateJobStatus returned:`, result);

      this.render();

      this.showStatusUpdateFeedback(newStatus);
    } catch (error) {
      console.error(`[Dashboard] ❌ Error updating job status:`, error);
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
    // Use _id for MongoDB jobs, fallback to id for local jobs
    e.dataTransfer.setData('jobId', job._id || job.id);

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

    // When lazy loading, use server total count if available
    const displayTotal = this.lazyLoadEnabled && this.totalJobsCount > 0
      ? this.totalJobsCount
      : total;

    // Show/hide pagination based on total items
    if (displayTotal <= this.itemsPerPage && !this.hasMoreJobs) {
      paginationContainer.style.display = 'none';
      return;
    } else {
      paginationContainer.style.display = 'flex';
    }

    // Update info text
    if (paginationInfo) {
      if (this.lazyLoadEnabled && this.hasMoreJobs) {
        // Show "X-Y of Z+" when more jobs available on server
        paginationInfo.textContent = `${start}-${end} of ${displayTotal}${this.hasMoreJobs ? '+' : ''}`;
      } else {
        paginationInfo.textContent = `${start}-${end} of ${displayTotal}`;
      }
    }

    // Update button states
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 1;
    }

    if (nextBtn) {
      if (this.lazyLoadEnabled) {
        // In lazy loading mode, enable next button if we have more jobs on server
        // or if we have more pages in currently loaded data
        const currentlyLoadedPages = Math.ceil(this.allJobs.length / this.itemsPerPage);
        nextBtn.disabled = this.currentPage >= currentlyLoadedPages && !this.hasMoreJobs;
      } else {
        // Offline mode - disable when we reach end of local data
        const totalPages = Math.ceil(total / this.itemsPerPage);
        nextBtn.disabled = this.currentPage >= totalPages;
      }
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
    this.calendarViewMode = 'month'; // Default to month view
    this.renderCalendar();

    // Event listeners for calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
      if (this.calendarViewMode === 'week') {
        // Navigate by week
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      } else {
        // Navigate by month
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      }
      this.renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
      if (this.calendarViewMode === 'week') {
        // Navigate by week
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      } else {
        // Navigate by month
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      }
      this.renderCalendar();
    });

    document.getElementById('today-btn').addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });

    // Event listeners for view toggle
    const viewToggleBtns = document.querySelectorAll('.calendar-view-toggle-btn');
    viewToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.setCalendarViewMode(view);
      });
    });
  }

  setCalendarViewMode(mode) {
    this.calendarViewMode = mode;

    // Update button states
    const viewToggleBtns = document.querySelectorAll('.calendar-view-toggle-btn');
    viewToggleBtns.forEach(btn => {
      if (btn.getAttribute('data-view') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update body class for CSS targeting
    document.body.classList.remove('calendar-week-view', 'calendar-month-view');
    document.body.classList.add(`calendar-${mode}-view`);

    // Re-render calendar
    this.renderCalendar();
  }

  renderCalendar() {
    // Ensure view mode class is set
    if (!document.body.classList.contains('calendar-week-view') && !document.body.classList.contains('calendar-month-view')) {
      document.body.classList.add(`calendar-${this.calendarViewMode || 'month'}-view`);
    }

    // Render based on view mode
    if (this.calendarViewMode === 'week') {
      this.renderWeekView();
    } else {
      this.renderMonthView();
    }
  }

  renderWeekView() {
    // Get the current week (Sunday to Saturday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the start of the week (Sunday)
    const currentDay = this.currentDate.getDay();
    const weekStart = new Date(this.currentDate);
    weekStart.setDate(this.currentDate.getDate() - currentDay);
    weekStart.setHours(0, 0, 0, 0);

    // Update month label to show week range
    const monthLabel = document.getElementById('calendar-month-label');
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    monthLabel.textContent = `${startMonth} - ${endMonth}`;

    // Generate calendar days
    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';

    // Group jobs by date
    const jobsByDate = this.groupJobsByDate(this.currentJobs);

    // Render 7 days (Sunday to Saturday)
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);

      const isToday = currentDate.getTime() === today.getTime();
      const dateKey = this.getDateKey(currentDate);
      const dayJobs = jobsByDate[dateKey] || [];

      const dayElement = this.createCalendarDay(currentDate.getDate(), false, isToday, dayJobs, currentDate);
      calendarDays.appendChild(dayElement);
    }
  }

  renderMonthView() {
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

        // Status indicator bar (left-aligned, 3px width)
        const statusBar = document.createElement('div');
        statusBar.className = 'calendar-event-status-bar';
        eventCard.appendChild(statusBar);

        // Content wrapper (inline layout)
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'calendar-event-content';

        // Title (bold, primary)
        const titleElement = document.createElement('div');
        titleElement.className = 'calendar-event-title';
        titleElement.textContent = job.title;
        contentWrapper.appendChild(titleElement);

        // Separator (·)
        const separator = document.createElement('span');
        separator.className = 'calendar-event-separator';
        separator.textContent = '·';
        contentWrapper.appendChild(separator);

        // Company (inline, muted, secondary)
        const companyElement = document.createElement('div');
        companyElement.className = 'calendar-event-company';
        companyElement.textContent = job.company;
        contentWrapper.appendChild(companyElement);

        eventCard.appendChild(contentWrapper);

        eventCard.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showJobDetail(job);
        });

        eventsContainer.appendChild(eventCard);
      });

      // Show enhanced "more" indicator if there are more jobs
      if (jobs.length > maxVisible) {
        const remainingJobs = jobs.length - maxVisible;
        const moreElement = document.createElement('div');
        moreElement.className = 'calendar-more-events';

        // Count remaining jobs by status
        const remainingByStatus = {};
        jobs.slice(maxVisible).forEach(job => {
          remainingByStatus[job.status] = (remainingByStatus[job.status] || 0) + 1;
        });

        // Create status indicators
        const statusIndicators = document.createElement('div');
        statusIndicators.className = 'calendar-more-status-indicators';

        const statusOrder = ['interview', 'offer', 'applied', 'rejected'];
        statusOrder.forEach(status => {
          if (remainingByStatus[status]) {
            const indicator = document.createElement('div');
            indicator.className = `calendar-more-status-dot status-${status}`;
            indicator.setAttribute('data-tooltip', `${remainingByStatus[status]} ${status}`);
            statusIndicators.appendChild(indicator);
          }
        });

        moreElement.appendChild(statusIndicators);

        // Add text
        const moreText = document.createElement('span');
        moreText.className = 'calendar-more-text';
        moreText.textContent = `${remainingJobs} more application${remainingJobs > 1 ? 's' : ''}`;
        moreElement.appendChild(moreText);

        moreElement.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showDayJobsList(jobs, dayNumber, this.currentDate.getMonth(), this.currentDate.getFullYear(), e.currentTarget);
        });
        eventsContainer.appendChild(moreElement);
      }

      dayElement.appendChild(eventsContainer);
    }

    // Add empty state affordance for days without jobs
    if ((!jobs || jobs.length === 0) && !isOtherMonth) {
      const emptyAffordance = document.createElement('div');
      emptyAffordance.className = 'calendar-empty-affordance';

      const plusIcon = document.createElement('div');
      plusIcon.className = 'calendar-empty-icon';
      plusIcon.innerHTML = `
        <svg aria-hidden="true" role="graphics-symbol" viewBox="0 0 16 16" style="width: 14px; height: 14px; display: block; fill: currentColor; flex-shrink: 0;">
          <path d="M8 2.74a.66.66 0 0 1 .66.66v3.94h3.94a.66.66 0 0 1 0 1.32H8.66v3.94a.66.66 0 0 1-1.32 0V8.66H3.4a.66.66 0 0 1 0-1.32h3.94V3.4A.66.66 0 0 1 8 2.74"></path>
        </svg>
      `;

      const affordanceText = document.createElement('span');
      affordanceText.className = 'calendar-empty-text';
      affordanceText.textContent = 'Add application';

      emptyAffordance.appendChild(plusIcon);
      emptyAffordance.appendChild(affordanceText);

      dayElement.appendChild(emptyAffordance);

      // Make empty day clickable to add application
      dayElement.style.cursor = 'pointer';
      dayElement.addEventListener('click', () => {
        this.showManualAddJobModal();
      });
    }

    // Add click handler to day element to show all jobs for that day
    if (jobs && jobs.length > 0 && !isOtherMonth) {
      dayElement.style.cursor = 'pointer';
      dayElement.addEventListener('click', (e) => {
        this.showDayJobsList(jobs, dayNumber, this.currentDate.getMonth(), this.currentDate.getFullYear(), e.currentTarget);
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

  showDayJobsList(jobs, day, month, year, triggerElement = null) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const dateTitle = `${monthNames[month]} ${day}, ${year}`;

    // Create backdrop (transparent, click to close)
    const backdrop = document.createElement('div');
    backdrop.className = 'calendar-popover-backdrop';
    backdrop.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      document.body.removeChild(popover);
    });
    document.body.appendChild(backdrop);

    // Create popover
    const popover = document.createElement('div');
    popover.className = 'calendar-day-popover';

    // Popover header
    const header = document.createElement('div');
    header.className = 'calendar-day-popover-header';

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    const headerTitle = document.createElement('div');
    headerTitle.className = 'calendar-day-popover-title';
    headerTitle.textContent = dateTitle;

    const headerCount = document.createElement('div');
    headerCount.className = 'calendar-day-popover-count';
    headerCount.textContent = `${jobs.length} application${jobs.length > 1 ? 's' : ''}`;

    headerLeft.appendChild(headerTitle);
    headerLeft.appendChild(headerCount);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'calendar-day-popover-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(backdrop);
      document.body.removeChild(popover);
    });

    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    // Popover content (scrollable event list)
    const content = document.createElement('div');
    content.className = 'calendar-day-popover-content';

    // Create event cards using same structure as calendar grid
    jobs.forEach(job => {
      const eventCard = document.createElement('div');
      eventCard.className = `calendar-event-card status-${job.status}`;

      // Status indicator bar
      const statusBar = document.createElement('div');
      statusBar.className = 'calendar-event-status-bar';
      eventCard.appendChild(statusBar);

      // Content wrapper (inline layout)
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'calendar-event-content';

      // Title (bold, primary)
      const titleElement = document.createElement('div');
      titleElement.className = 'calendar-event-title';
      titleElement.textContent = job.title;
      contentWrapper.appendChild(titleElement);

      // Separator (·)
      const separator = document.createElement('span');
      separator.className = 'calendar-event-separator';
      separator.textContent = '·';
      contentWrapper.appendChild(separator);

      // Company (inline, muted, secondary)
      const companyElement = document.createElement('div');
      companyElement.className = 'calendar-event-company';
      companyElement.textContent = job.company;
      contentWrapper.appendChild(companyElement);

      eventCard.appendChild(contentWrapper);

      eventCard.addEventListener('click', () => {
        document.body.removeChild(backdrop);
        document.body.removeChild(popover);
        this.showJobDetail(job);
      });

      content.appendChild(eventCard);
    });

    popover.appendChild(header);
    popover.appendChild(content);

    // Position popover near trigger element (if provided)
    document.body.appendChild(popover);

    // Calculate position
    if (triggerElement) {
      const triggerRect = triggerElement.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      // Try to position below and to the right of trigger
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;

      // Adjust if popover would go off-screen
      if (left + popoverRect.width > window.innerWidth - 16) {
        left = window.innerWidth - popoverRect.width - 16;
      }
      if (top + popoverRect.height > window.innerHeight - 16) {
        top = triggerRect.top - popoverRect.height - 8;
      }

      // Ensure minimum margins
      top = Math.max(16, Math.min(top, window.innerHeight - popoverRect.height - 16));
      left = Math.max(16, Math.min(left, window.innerWidth - popoverRect.width - 16));

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    } else {
      // Center if no trigger element
      const popoverRect = popover.getBoundingClientRect();
      popover.style.top = `${(window.innerHeight - popoverRect.height) / 2}px`;
      popover.style.left = `${(window.innerWidth - popoverRect.width) / 2}px`;
    }
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

// ==================== CSV Export Manager ====================
class CSVExportManager {
  constructor() {
    this.modal = document.getElementById('csv-export-modal');
    this.selectAllCheckbox = document.getElementById('csv-select-all');
    this.fieldCheckboxes = document.querySelectorAll('.csv-field');
    this.init();
  }

  init() {
    // Open modal button
    document.getElementById('export-csv-btn')?.addEventListener('click', () => {
      this.openModal();
    });

    // Close modal
    document.getElementById('close-csv-export-modal')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancel-csv-export')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Close on overlay click
    this.modal?.querySelector('.modal-overlay')?.addEventListener('click', () => {
      this.closeModal();
    });

    // Select all / deselect all
    this.selectAllCheckbox?.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      this.fieldCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
      });
    });

    // Update select all checkbox when individual checkboxes change
    this.fieldCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectAllCheckbox();
      });
    });

    // Export button
    document.getElementById('confirm-csv-export')?.addEventListener('click', () => {
      this.exportToCSV();
    });
  }

  openModal() {
    this.modal.style.display = 'flex';
    // Reset to default selections
    this.selectAllCheckbox.checked = true;
    this.fieldCheckboxes.forEach(checkbox => {
      const field = checkbox.dataset.field;
      // Check core fields by default
      const coreFields = ['company', 'title', 'status', 'location', 'workType', 'salary', 'dateApplied'];
      checkbox.checked = coreFields.includes(field);
    });
    this.updateSelectAllCheckbox();
  }

  closeModal() {
    this.modal.style.display = 'none';
  }

  updateSelectAllCheckbox() {
    const allChecked = Array.from(this.fieldCheckboxes).every(cb => cb.checked);
    const noneChecked = Array.from(this.fieldCheckboxes).every(cb => !cb.checked);

    this.selectAllCheckbox.checked = allChecked;
    this.selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
  }

  getSelectedFields() {
    const selectedFields = [];
    this.fieldCheckboxes.forEach(checkbox => {
      if (checkbox.checked) {
        selectedFields.push(checkbox.dataset.field);
      }
    });
    return selectedFields;
  }

  exportToCSV() {
    const selectedFields = this.getSelectedFields();

    if (selectedFields.length === 0) {
      alert('Please select at least one field to export.');
      return;
    }

    // Get all jobs from the dashboard
    const jobs = window.jobTracker?.jobs || [];

    if (jobs.length === 0) {
      alert('No jobs to export.');
      return;
    }

    // Field display names
    const fieldNames = {
      company: 'Company',
      title: 'Job Title',
      status: 'Status',
      location: 'Location',
      workType: 'Work Type',
      salary: 'Salary',
      dateApplied: 'Date Applied',
      deadline: 'Deadline',
      followUpDate: 'Follow-up Date',
      linkedinUrl: 'LinkedIn URL',
      contactPerson: 'Contact Person',
      contactEmail: 'Contact Email',
      notes: 'Notes',
      tags: 'Tags',
      priority: 'Priority',
      source: 'Source',
      resumeFileName: 'Resume File'
    };

    // Create CSV header
    const headers = selectedFields.map(field => fieldNames[field] || field);

    // Create CSV rows
    const rows = jobs.map(job => {
      return selectedFields.map(field => {
        let value = job[field] || '';

        // Format specific fields
        if (field === 'dateApplied' || field === 'deadline' || field === 'followUpDate') {
          if (value) {
            const date = new Date(value);
            value = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          }
        } else if (field === 'tags') {
          if (Array.isArray(value)) {
            value = value.join(', ');
          }
        } else if (field === 'status') {
          // Capitalize status
          value = value.charAt(0).toUpperCase() + value.slice(1);
        }

        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`;
        }

        return value;
      });
    });

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `track376_jobs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Close modal and show success message
    this.closeModal();
    this.showToast(`✅ Exported ${jobs.length} jobs to CSV`);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgb(35, 131, 226);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize dashboard
const dashboard = new DashboardUI();

// Initialize CSV Export Manager
const csvExportManager = new CSVExportManager();

