// LinkedIn Jobs Filter - Floating Panel Version

class LinkedInJobsFilter {
  constructor() {
    this.settings = {
      hoursRange: 0,  // Changed default to 0 (show all)
      hideReposted: false,
      hidePromoted: false,  // NEW: Hide promoted jobs
      earlyApplicants: false,  // NEW: Filter for early applicants
      blacklistedCompanies: []
    };
    this.pendingSettings = null;  // Track pending changes
    this.observer = null;
    this.detailPanelObserver = null;  // NEW: Observer for job detail panel
    this.panel = null;
    this.stats = { total: 0, visible: 0, hidden: 0 };
    this.hasScannedJobs = false;  // Track if we've scanned jobs for reposted status
    this.init();
  }

  async init() {
    console.log('[LinkedIn Jobs Filter] 🚀 Starting...');

    // Load settings from storage
    await this.loadSettings();

    // Create floating panel
    this.createFloatingPanel();

    // Start observing for job cards
    this.startObserver();

    // Initial filter
    this.filterAllJobs();

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.settings) {
        console.log('[LinkedIn Jobs Filter] ⚡ Settings changed:', changes.settings.newValue);
        this.settings = changes.settings.newValue;

        // Reset scan flag if hideReposted setting changed
        if (changes.settings.oldValue?.hideReposted !== changes.settings.newValue?.hideReposted) {
          this.hasScannedJobs = false;
        }

        this.updatePanelUI();
        this.filterAllJobs();
      }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'togglePanel') {
        this.togglePanel();
      }
    });

    // Listen for URL changes (pagination, navigation)
    this.setupURLChangeListener();

    // Periodic check to ensure filters are applied (fallback)
    setInterval(() => {
      // Only re-filter if there are jobs that might need filtering
      const jobCards = document.querySelectorAll('li.jobs-search-results__list-item');
      if (jobCards.length > 0) {
        const visibleJobs = Array.from(jobCards).filter(card =>
          card.style.display !== 'none'
        );

        // If all jobs are visible but we have filters enabled, re-apply
        if (visibleJobs.length === jobCards.length &&
            (this.settings.blacklistedCompanies.length > 0 ||
             this.settings.hideReposted ||
             this.settings.hidePromoted)) {
          console.log('[LinkedIn Jobs Filter] 🔄 Periodic check: re-applying filters...');
          this.filterAllJobs();
        }
      }
    }, 2000); // Check every 2 seconds

    console.log('[LinkedIn Jobs Filter] ✅ Ready!');
  }

  setupURLChangeListener() {
    // Store the current URL
    let lastUrl = location.href;

    // Check for URL changes periodically
    setInterval(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        console.log('[LinkedIn Jobs Filter] 🔄 URL changed, re-filtering...');
        lastUrl = currentUrl;

        // Wait a bit for LinkedIn to load new content
        setTimeout(() => {
          this.filterAllJobs();
        }, 500);
      }
    }, 500);

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      console.log('[LinkedIn Jobs Filter] ⬅️ Navigation detected, re-filtering...');
      setTimeout(() => {
        this.filterAllJobs();
      }, 500);
    });

    // Listen for pushState/replaceState (LinkedIn's SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      console.log('[LinkedIn Jobs Filter] ➡️ Page navigation detected, re-filtering...');
      setTimeout(() => {
        window.linkedInJobsFilter?.filterAllJobs();
      }, 500);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      console.log('[LinkedIn Jobs Filter] 🔄 Page state changed, re-filtering...');
      setTimeout(() => {
        window.linkedInJobsFilter?.filterAllJobs();
      }, 500);
    };
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
          this.settings = result.settings;
          console.log('[LinkedIn Jobs Filter] Loaded settings from storage:', this.settings);
        } else {
          console.log('[LinkedIn Jobs Filter] No settings found, using defaults:', this.settings);
        }
        resolve();
      });
    });
  }

  createFloatingPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('linkedin-filter-panel');
    if (existing) existing.remove();

    // Create panel HTML
    const panel = document.createElement('div');
    panel.id = 'linkedin-filter-panel';
    panel.className = 'visible';
    panel.innerHTML = `
      <div class="panel-header" id="panel-header">
        <div class="panel-title">
          <span>🎯</span>
          <span>Jobs Filter</span>
        </div>
        <div class="panel-controls">
          <button class="panel-btn" id="minimize-btn" title="Minimize">−</button>
          <button class="panel-btn" id="close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="panel-body">
        <!-- Hide Reposted Toggle -->
        <div class="filter-section">
          <div class="toggle-row">
            <label class="filter-label">Hide Reposted Jobs</label>
            <label class="toggle-switch">
              <input type="checkbox" id="hide-reposted-toggle">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Hide Promoted Toggle -->
        <div class="filter-section">
          <div class="toggle-row">
            <label class="filter-label">Hide Promoted Jobs</label>
            <label class="toggle-switch">
              <input type="checkbox" id="hide-promoted-toggle">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Early Applicants Toggle -->
        <div class="filter-section">
          <div class="toggle-row">
            <label class="filter-label">Early Applicants Only (&lt;10)</label>
            <label class="toggle-switch">
              <input type="checkbox" id="early-applicants-toggle">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Time Range -->
        <div class="filter-section">
          <label class="filter-label">Time Range</label>
          <div class="input-row">
            <input type="number" id="hours-input" min="0" placeholder="24">
            <span class="unit">hours</span>
          </div>
          <div class="hint">Enter 0 to show all jobs</div>
        </div>

        <!-- Company Blacklist -->
        <div class="filter-section">
          <div class="filter-label">Blacklisted Companies</div>
          <input type="text" class="company-input" id="company-input" placeholder="Type company name and press Enter">
          <div class="company-tags" id="company-tags"></div>
        </div>

        <!-- Apply Button -->
        <div class="filter-section">
          <button class="apply-btn" id="apply-btn">Apply Filters</button>
        </div>

        <!-- Stats -->
        <div class="filter-section">
          <div class="stats">
            <div>Filter Results</div>
            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-value" id="stat-total">0</div>
                <div class="stat-label">Total</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" id="stat-visible">0</div>
                <div class="stat-label">Visible</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" id="stat-hidden">0</div>
                <div class="stat-label">Hidden</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;

    // Make panel draggable
    this.makeDraggable(panel);

    // Setup event listeners
    this.setupPanelListeners();

    // Update UI with current settings
    this.updatePanelUI();
  }

  makeDraggable(panel) {
    const header = panel.querySelector('#panel-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        panel.style.left = currentX + 'px';
        panel.style.top = currentY + 'px';
        panel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  setupPanelListeners() {
    // Close button
    document.getElementById('close-btn').addEventListener('click', () => {
      this.panel.classList.remove('visible');
    });

    // Minimize button
    document.getElementById('minimize-btn').addEventListener('click', () => {
      this.panel.classList.toggle('minimized');
    });

    // Apply button - THIS APPLIES THE FILTERS
    document.getElementById('apply-btn').addEventListener('click', () => {
      console.log('[LinkedIn Jobs Filter] 🎯 Apply button clicked!');
      this.applyPendingSettings();
    });

    // Hide reposted toggle - just update pending settings
    document.getElementById('hide-reposted-toggle').addEventListener('change', (e) => {
      this.updatePendingSettings({ hideReposted: e.target.checked });
    });

    // Hide promoted toggle - just update pending settings
    document.getElementById('hide-promoted-toggle').addEventListener('change', (e) => {
      this.updatePendingSettings({ hidePromoted: e.target.checked });
    });

    // Early applicants toggle - just update pending settings
    document.getElementById('early-applicants-toggle').addEventListener('change', (e) => {
      this.updatePendingSettings({ earlyApplicants: e.target.checked });
    });

    // Hours input - just update pending settings
    document.getElementById('hours-input').addEventListener('input', (e) => {
      const value = parseInt(e.target.value) || 0;
      this.updatePendingSettings({ hoursRange: value });
    });

    // Company input
    document.getElementById('company-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const company = e.target.value.trim();
        if (company) {
          this.addCompany(company);
          e.target.value = '';
        }
      }
    });
  }



  startObserver() {
    // Debounce to avoid too many filter calls
    let filterTimeout;
    const debouncedFilter = () => {
      clearTimeout(filterTimeout);
      filterTimeout = setTimeout(() => {
        console.log('[LinkedIn Jobs Filter] Observer triggered, filtering...');
        this.filterAllJobs();
      }, 100);
    };

    // Watch for new job cards being added
    this.observer = new MutationObserver((mutations) => {
      // Check if job cards were added/changed OR if the list was modified
      const hasJobChanges = mutations.some(mutation => {
        // Check added nodes
        const hasAddedJobs = Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType !== 1) return false;
          return node.matches?.('li.jobs-search-results__list-item') ||
                 node.matches?.('li[data-occludable-job-id]') ||
                 node.querySelector?.('li.jobs-search-results__list-item');
        });

        // Check if the target is a job list container
        const isJobListChange = mutation.target.matches?.('.jobs-search-results-list') ||
                               mutation.target.matches?.('.scaffold-layout__list') ||
                               mutation.target.querySelector?.('.jobs-search-results__list-item');

        return hasAddedJobs || isJobListChange;
      });

      if (hasJobChanges) {
        debouncedFilter();
        // Re-add click listeners to new job cards
        setTimeout(() => this.addJobCardClickListeners(), 500);
      }

      // Check if job detail panel was updated (for Track button on right side)
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // Check if this is the job details panel or contains it
            if (node.matches?.('.jobs-details, .jobs-search__job-details')) {
              setTimeout(() => this.addTrackButtonToDetailPanel(), 100);
            } else if (node.querySelector) {
              const detailPanel = node.querySelector('.jobs-details, .jobs-search__job-details');
              if (detailPanel) {
                setTimeout(() => this.addTrackButtonToDetailPanel(), 100);
              }
            }
          }
        });
      });
    });

    // Find job list container
    const container = document.querySelector('.jobs-search-results-list') ||
                     document.querySelector('.scaffold-layout__list') ||
                     document.body;

    this.observer.observe(container, {
      childList: true,
      subtree: true
    });

    // Start observing the job detail panel for changes
    this.startDetailPanelObserver();

    // Also add track button to detail panel if it already exists
    setTimeout(() => this.addTrackButtonToDetailPanel(), 1000);
  }

  startDetailPanelObserver() {
    console.log('[Job Tracker] 🔍 Starting detail panel observer...');

    // Create observer for job detail panel changes
    this.detailPanelObserver = new MutationObserver((mutations) => {
      // Check if the job details content changed
      const hasDetailChanges = mutations.some(mutation => {
        // Check if job title, company, or other key elements changed
        return mutation.target.matches?.(
          '.jobs-unified-top-card__job-title, ' +
          '.jobs-unified-top-card__company-name, ' +
          '.jobs-details__main-content, ' +
          '.jobs-unified-top-card'
        ) || mutation.target.closest?.('.jobs-details, .jobs-search__job-details');
      });

      if (hasDetailChanges) {
        console.log('[Job Tracker] 🔄 Job details changed, re-adding Track button...');
        // Small delay to ensure DOM is fully updated
        setTimeout(() => this.addTrackButtonToDetailPanel(), 200);
      }
    });

    // Find and observe the detail panel container
    const detailPanel = document.querySelector('.jobs-details, .jobs-search__job-details');
    if (detailPanel) {
      this.detailPanelObserver.observe(detailPanel, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log('[Job Tracker] ✅ Detail panel observer started');
    } else {
      console.log('[Job Tracker] ⚠️ Detail panel not found, will retry...');
      // Retry after a delay
      setTimeout(() => this.startDetailPanelObserver(), 2000);
    }

    // Also add click listeners to job cards
    this.addJobCardClickListeners();
  }

  addJobCardClickListeners() {
    console.log('[Job Tracker] 🖱️ Adding click listeners to job cards...');

    const jobCards = document.querySelectorAll('li.jobs-search-results__list-item, li[data-occludable-job-id]');

    jobCards.forEach(card => {
      // Check if listener already added
      if (card.dataset.trackListenerAdded) return;

      card.addEventListener('click', () => {
        console.log('[Job Tracker] 🖱️ Job card clicked, checking detail panel...');

        // Wait for LinkedIn to update the detail panel
        setTimeout(() => {
          // Add Track button
          this.addTrackButtonToDetailPanel();

          // CRITICAL: Check if the job is reposted in the detail panel
          this.checkDetailPanelAndMarkJob(card);
        }, 500);
      });

      card.dataset.trackListenerAdded = 'true';
    });

    console.log(`[Job Tracker] ✅ Added click listeners to ${jobCards.length} job cards`);
  }

  checkDetailPanelAndMarkJob(card) {
    const detailPanel = document.querySelector('.jobs-details, .jobs-search__job-details, .jobs-details__main-content');

    if (!detailPanel) {
      console.log('[LinkedIn Jobs Filter] ⚠️ Detail panel not found');
      return;
    }

    const detailText = (detailPanel.textContent || '').toLowerCase();

    // Check for "Reposted" text
    if (detailText.includes('reposted')) {
      console.log('[LinkedIn Jobs Filter] 🔁 FOUND REPOSTED in detail panel - marking card');

      // Mark this card as reposted
      card.setAttribute('data-is-reposted', 'true');

      // If hideReposted is enabled, hide this job immediately
      if (this.settings.hideReposted) {
        console.log('[LinkedIn Jobs Filter] 🔁 HIDING REPOSTED job NOW');

        card.style.setProperty('display', 'none', 'important');
        card.style.setProperty('visibility', 'hidden', 'important');
        card.style.setProperty('height', '0', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');
        card.style.setProperty('opacity', '0', 'important');
        card.style.setProperty('max-height', '0', 'important');
        card.setAttribute('data-filtered-out', 'true');
        card.setAttribute('aria-hidden', 'true');

        // Update stats
        this.stats.hidden++;
        this.stats.visible--;
        this.updateStats();

        // Close the detail panel and move to next job
        const nextCard = card.nextElementSibling;
        if (nextCard && nextCard.matches('li.jobs-search-results__list-item')) {
          console.log('[LinkedIn Jobs Filter] ⏭️ Moving to next job...');
          nextCard.click();
        }
      }
    }

    // Check for "Promoted" text
    if (detailText.includes('promoted')) {
      console.log('[LinkedIn Jobs Filter] 📢 FOUND PROMOTED in detail panel - marking card');

      // Mark this card as promoted
      card.setAttribute('data-is-promoted', 'true');

      // If hidePromoted is enabled, hide this job immediately
      if (this.settings.hidePromoted) {
        console.log('[LinkedIn Jobs Filter] 📢 HIDING PROMOTED job NOW');

        card.style.setProperty('display', 'none', 'important');
        card.style.setProperty('visibility', 'hidden', 'important');
        card.style.setProperty('height', '0', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');
        card.style.setProperty('opacity', '0', 'important');
        card.style.setProperty('max-height', '0', 'important');
        card.setAttribute('data-filtered-out', 'true');
        card.setAttribute('aria-hidden', 'true');

        // Update stats
        this.stats.hidden++;
        this.stats.visible--;
        this.updateStats();

        // Move to next job
        const nextCard = card.nextElementSibling;
        if (nextCard && nextCard.matches('li.jobs-search-results__list-item')) {
          console.log('[LinkedIn Jobs Filter] ⏭️ Moving to next job...');
          nextCard.click();
        }
      }
    }
  }

  addTrackButtonToDetailPanel() {
    console.log('[Job Tracker] 🔍 Looking for detail panel...');

    // Find the job detail panel on the right side
    const detailPanel = document.querySelector('.jobs-details, .jobs-search__job-details, .jobs-details__main-content');
    if (!detailPanel) {
      console.log('[Job Tracker] ❌ Detail panel not found');
      return;
    }

    console.log('[Job Tracker] ✅ Detail panel found:', detailPanel.className);

    // Try multiple selectors to find the Save button
    let saveButton = detailPanel.querySelector('button[aria-label*="Save"]');
    if (!saveButton) {
      saveButton = detailPanel.querySelector('button[data-control-name*="save"]');
    }
    if (!saveButton) {
      saveButton = document.querySelector('button[aria-label*="Save"]');
    }

    if (!saveButton) {
      console.log('[Job Tracker] ❌ Save button not found');
      // Try to find Apply button instead
      const applyButton = detailPanel.querySelector('button[aria-label*="Apply"]') ||
                         detailPanel.querySelector('.jobs-apply-button');
      if (applyButton) {
        console.log('[Job Tracker] ✅ Found Apply button, will insert Track button there');

        // Check if button already exists near Apply button
        const existingBtn = applyButton.parentElement?.querySelector('.job-tracker-detail-btn');
        if (existingBtn) {
          console.log('[Job Tracker] ✅ Track button already exists near Apply');
          return;
        }

        this.insertTrackButtonNearApply(applyButton, detailPanel);
      }
      return;
    }

    console.log('[Job Tracker] ✅ Found Save button, adding Track button');

    // Check if button already exists near Save button
    const existingBtn = saveButton.parentElement?.querySelector('.job-tracker-detail-btn');
    if (existingBtn) {
      console.log('[Job Tracker] ✅ Track button already exists near Save');
      return;
    }

    this.insertTrackButtonInDetailPanel(saveButton, detailPanel);
  }

  insertTrackButtonNearApply(applyButton, detailPanel) {
    console.log('[Job Tracker] 📍 Inserting Track button near Apply button');

    const trackBtn = this.createTrackButton(detailPanel);

    // Insert after Apply button
    const buttonContainer = applyButton.parentElement;
    if (applyButton.nextSibling) {
      buttonContainer.insertBefore(trackBtn, applyButton.nextSibling);
    } else {
      buttonContainer.appendChild(trackBtn);
    }

    console.log('[Job Tracker] ✅ Track button inserted near Apply button');
  }

  createTrackButton(detailPanel) {
    // Create track button
    const trackBtn = document.createElement('button');
    trackBtn.className = 'job-tracker-detail-btn';
    trackBtn.innerHTML = 'Track';
    trackBtn.title = 'Track this job application';
    trackBtn.setAttribute('aria-label', 'Track this job application');
    trackBtn.type = 'button';

    // Check if this job is already tracked
    this.checkIfJobTracked(detailPanel, trackBtn);

    // Add sleek styles - make it very visible
    trackBtn.style.cssText = `
      background: #000000 !important;
      color: white !important;
      border: 2px solid #000000 !important;
      border-radius: 16px !important;
      padding: 8px 16px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      margin-left: 8px !important;
      transition: all 0.2s ease !important;
      height: 32px !important;
      min-width: 80px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
      position: relative !important;
      z-index: 1 !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;

    // Hover effect
    trackBtn.addEventListener('mouseenter', () => {
      trackBtn.style.background = '#1a1a1a !important';
      trackBtn.style.transform = 'translateY(-1px)';
      trackBtn.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3) !important';
    });

    trackBtn.addEventListener('mouseleave', () => {
      trackBtn.style.background = '#000000 !important';
      trackBtn.style.transform = 'translateY(0)';
      trackBtn.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2) !important';
    });

    // Click handler
    trackBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Check if already tracked
      if (trackBtn.dataset.alreadyTracked === 'true') {
        this.showNotification('This job is already in your dashboard!');
        return;
      }

      console.log('[Job Tracker] 🎯 Track button clicked!');

      // Extract job data from detail panel
      const jobData = this.extractJobDataFromDetailPanel(detailPanel);

      if (jobData) {
        console.log('[Job Tracker] 📝 Tracking job from detail panel:', jobData);

        // Save to storage
        chrome.runtime.sendMessage({
          action: 'trackJob',
          jobData: jobData
        }, (response) => {
          if (response && response.success) {
            // Update button state
            trackBtn.innerHTML = '✓ Tracked';
            trackBtn.style.background = '#10B981 !important';
            trackBtn.style.borderColor = '#10B981 !important';
            trackBtn.disabled = true;

            // Show notification
            this.showNotification('Job tracked! View in dashboard.');

            setTimeout(() => {
              trackBtn.innerHTML = 'Track';
              trackBtn.style.background = '#000000 !important';
              trackBtn.style.borderColor = '#000000 !important';
              trackBtn.disabled = false;
            }, 2000);
          } else if (response && response.duplicate) {
            // Job already tracked
            trackBtn.innerHTML = '✓ Already Tracked';
            trackBtn.style.background = '#F59E0B !important';
            trackBtn.style.borderColor = '#F59E0B !important';

            // Show notification
            this.showNotification('⚠️ This job is already in your dashboard!');

            setTimeout(() => {
              trackBtn.innerHTML = 'Track';
              trackBtn.style.background = '#000000 !important';
              trackBtn.style.borderColor = '#000000 !important';
            }, 3000);
          }
        });
      }
    });

    return trackBtn;
  }

  insertTrackButtonInDetailPanel(saveButton, detailPanel) {
    console.log('[Job Tracker] 📍 Inserting Track button after Save button');

    const trackBtn = this.createTrackButton(detailPanel);

    // Insert button right after Save button in the same container
    const buttonContainer = saveButton.parentElement;
    console.log('[Job Tracker] Button container:', buttonContainer.className);

    // Insert after Save button
    if (saveButton.nextSibling) {
      buttonContainer.insertBefore(trackBtn, saveButton.nextSibling);
    } else {
      buttonContainer.appendChild(trackBtn);
    }

    console.log('[Job Tracker] ✅ Track button inserted successfully');
  }

  extractJobDataFromDetailPanel(detailPanel) {
    try {
      // Extract job title
      const titleElement = detailPanel.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1');
      const title = titleElement?.textContent?.trim() || 'Unknown Position';

      // Extract company name
      const companyElement = detailPanel.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a');
      const company = companyElement?.textContent?.trim() || 'Unknown Company';

      // Extract location - using tvm__text--low-emphasis in tertiary description
      let location = '';

      // Primary: Check tertiary description container for location
      const tertiaryDesc = detailPanel.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container');
      if (tertiaryDesc) {
        const tvmTexts = tertiaryDesc.querySelectorAll('.tvm__text--low-emphasis');
        if (tvmTexts.length > 0) {
          // First tvm text is usually the location
          location = tvmTexts[0].textContent?.trim() || '';
        }
      }

      // Fallback: Old selectors
      if (!location) {
        const locationElement = detailPanel.querySelector('.jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__bullet');
        if (locationElement) {
          location = locationElement.textContent?.trim() || '';
        }
      }

      console.log('[Job Tracker] 📍 Location extracted:', location);

      // Extract work type and salary from job-details-fit-level-preferences buttons
      let workType = 'Not specified';
      let salary = '';

      // Check fit level preferences buttons for both work type and salary
      const fitButtons = detailPanel.querySelectorAll('.job-details-fit-level-preferences button');
      for (const button of fitButtons) {
        const text = button.textContent?.trim() || '';
        const textLower = text.toLowerCase();

        // Extract work type
        if (textLower.includes('on-site') || textLower.includes('onsite')) {
          workType = 'On-site';
        } else if (textLower.includes('remote')) {
          workType = 'Remote';
        } else if (textLower.includes('hybrid')) {
          workType = 'Hybrid';
        }

        // Extract salary
        if (text.match(/\$|\/yr|\/year|salary|compensation/i)) {
          const match = text.match(/\$[\d,]+(?:K)?(?:\/yr)?(?:\s*-\s*\$[\d,]+(?:K)?(?:\/yr)?)?/i);
          if (match) {
            salary = match[0];
          }
        }
      }

      // Fallback: Old selector for work type
      if (workType === 'Not specified') {
        const workTypeElement = detailPanel.querySelector('.jobs-unified-top-card__workplace-type');
        workType = workTypeElement?.textContent?.trim() || 'Not specified';
      }

      console.log('[Job Tracker] 💼 Work Type extracted:', workType);

      // Extract LinkedIn URL
      const linkedinUrl = window.location.href;

      // Extract FULL job description with ALL sections (About, Qualifications, Responsibilities, etc.)
      const descriptionElement = detailPanel.querySelector('.jobs-description-content__text, .jobs-description__content, .jobs-box__html-content');

      let fullDescription = '';
      let descriptionHtml = '';

      if (descriptionElement) {
        // Get the full text content (plain text version)
        fullDescription = descriptionElement.textContent?.trim() || '';

        // Also save the HTML version to preserve formatting
        descriptionHtml = descriptionElement.innerHTML || '';

        console.log('[Job Tracker] 📄 Extracted description length:', fullDescription.length, 'characters');
      }

      // Extract additional details
      const jobInsights = this.extractJobInsights(detailPanel);

      // Fallback: Old selectors for salary
      if (!salary) {
        const salarySelectors = [
          '.jobs-unified-top-card__job-insight--highlight',
          '.job-details-jobs-unified-top-card__job-insight--highlight',
          '.jobs-unified-top-card__job-insight',
          '.salary-main-rail__salary-info'
        ];

        for (const selector of salarySelectors) {
          const salaryElement = detailPanel.querySelector(selector);
          if (salaryElement) {
            const text = salaryElement.textContent?.trim() || '';
            if (text.match(/\$|USD|EUR|salary|compensation/i)) {
              salary = text;
              break;
            }
          }
        }
      }

      // Also check in job insights
      if (!salary && jobInsights.salary) {
        salary = jobInsights.salary;
      }

      console.log('[Job Tracker] 💰 Salary extracted:', salary);

      // Extract seniority level
      const seniorityElement = detailPanel.querySelector('.jobs-unified-top-card__job-insight-view-model-secondary');
      const seniority = seniorityElement?.textContent?.trim() || '';

      // NEW: Calculate time-to-apply and competition buckets
      const timingData = this.calculateTimingBuckets(jobInsights);

      console.log('[Job Tracker] ⏱️ Timing data:', {
        postedHoursAgo: jobInsights.postedHoursAgo,
        applicantsCount: jobInsights.applicantsCount,
        timeToApplyBucket: timingData.timeToApplyBucket,
        competitionBucket: timingData.competitionBucket
      });

      return {
        title,
        company,
        location,
        workType,
        linkedinUrl,
        description: fullDescription,  // Full plain text description
        descriptionHtml: descriptionHtml,  // HTML version with formatting
        salary,
        seniority,
        jobInsights,
        dateApplied: new Date().toISOString(),
        dateTracked: new Date().toISOString(),
        status: 'applied',  // Default status when tracking
        // NEW: Timing and competition data
        jobPostedHoursAgo: jobInsights.postedHoursAgo || null,
        applicantsAtApplyTime: jobInsights.applicantsCount || null,
        applicantsText: jobInsights.applicants || null,
        timeToApplyBucket: timingData.timeToApplyBucket,
        competitionBucket: timingData.competitionBucket
      };
    } catch (error) {
      console.error('[Job Tracker] Error extracting job data from detail panel:', error);
      return null;
    }
  }

  extractJobInsights(detailPanel) {
    // Extract job insights like number of applicants, posted time, etc.
    const insights = {};

    try {
      // NEW: Extract from tertiary description container (more accurate)
      const tertiaryContainer = detailPanel.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container');
      console.log('[Job Tracker] 🔍 Tertiary container found:', !!tertiaryContainer);

      if (tertiaryContainer) {
        const fullText = tertiaryContainer.textContent || '';
        console.log('[Job Tracker] 🔍 Tertiary container text:', fullText);

        // Extract posted time - multiple patterns
        // "3 minutes ago", "9 hours ago", "2 days ago", "Reposted 3 hours ago"
        let postedMatch = fullText.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i);
        if (postedMatch) {
          const number = parseInt(postedMatch[1]);
          const unit = postedMatch[2].toLowerCase();

          // Convert to hours for bucketing
          let hoursAgo = 0;
          if (unit.includes('minute')) {
            hoursAgo = number / 60; // Convert minutes to hours
          } else if (unit.includes('hour')) {
            hoursAgo = number;
          } else if (unit.includes('day')) {
            hoursAgo = number * 24;
          } else if (unit.includes('week')) {
            hoursAgo = number * 24 * 7;
          } else if (unit.includes('month')) {
            hoursAgo = number * 24 * 30;
          }

          insights.postedTime = `${number} ${unit}${number > 1 ? 's' : ''} ago`;
          insights.postedHoursAgo = hoursAgo;
          console.log('[Job Tracker] ✅ Posted time found:', insights.postedTime, `(${hoursAgo} hours)`);
        }

        // Extract number of applicants
        // NEW patterns: "0 people clicked apply", "23 people clicked apply"
        // OLD patterns: "23 applicants", "Over 100 applicants", "100+ applicants"
        let applicantsMatch = fullText.match(/(\d+)\s+people\s+clicked\s+apply/i);
        if (applicantsMatch) {
          const count = parseInt(applicantsMatch[1]);
          insights.applicants = count === 0 ? 'Be first to apply' : `${count}`;
          insights.applicantsCount = count;
          console.log('[Job Tracker] ✅ Applicants found (clicked apply):', insights.applicants);
        } else {
          // Try old patterns
          applicantsMatch = fullText.match(/Over\s+(\d+)\s+applicants?/i);
          if (applicantsMatch) {
            insights.applicants = `Over ${applicantsMatch[1]}`;
            insights.applicantsCount = parseInt(applicantsMatch[1]) + 50; // Approximate for "Over X"
            console.log('[Job Tracker] ✅ Applicants found (over):', insights.applicants);
          } else {
            applicantsMatch = fullText.match(/(\d+)\+?\s+applicants?/i);
            if (applicantsMatch) {
              insights.applicants = applicantsMatch[1];
              insights.applicantsCount = parseInt(applicantsMatch[1]);
              console.log('[Job Tracker] ✅ Applicants found:', insights.applicants);
            }
          }
        }
      }

      // FALLBACK: Old selectors
      if (!insights.postedTime || !insights.applicants) {
        const applicantsElement = detailPanel.querySelector('.jobs-unified-top-card__subtitle-secondary-grouping');
        if (applicantsElement) {
          const text = applicantsElement.textContent?.trim() || '';

          // Extract "X applicants"
          if (!insights.applicants) {
            const applicantsMatch = text.match(/(\d+)\s+applicants?/i);
            if (applicantsMatch) {
              insights.applicants = applicantsMatch[1];
              insights.applicantsCount = parseInt(applicantsMatch[1]);
            }
          }

          // Extract posted time
          if (!insights.postedTime) {
            const postedMatch = text.match(/(\d+)\s+(hour|day|week|month)s?\s+ago/i);
            if (postedMatch) {
              const number = parseInt(postedMatch[1]);
              const unit = postedMatch[2].toLowerCase();

              let hoursAgo = 0;
              if (unit.includes('hour')) {
                hoursAgo = number;
              } else if (unit.includes('day')) {
                hoursAgo = number * 24;
              } else if (unit.includes('week')) {
                hoursAgo = number * 24 * 7;
              } else if (unit.includes('month')) {
                hoursAgo = number * 24 * 30;
              }

              insights.postedTime = `${number} ${unit}s ago`;
              insights.postedHoursAgo = hoursAgo;
            }
          }
        }
      }

      // Job type (Full-time, Part-time, Contract, etc.)
      const jobTypeElement = detailPanel.querySelector('.jobs-unified-top-card__job-insight-view-model-secondary');
      if (jobTypeElement) {
        insights.jobType = jobTypeElement.textContent?.trim() || '';
      }

      // Try to extract salary from insights
      const insightElements = detailPanel.querySelectorAll('.jobs-unified-top-card__job-insight');
      insightElements.forEach(element => {
        const text = element.textContent?.trim() || '';
        if (text.match(/\$|USD|EUR|salary|compensation/i)) {
          insights.salary = text;
        }
      });

    } catch (error) {
      console.error('[Job Tracker] Error extracting job insights:', error);
    }

    return insights;
  }

  calculateTimingBuckets(jobInsights) {
    const result = {
      timeToApplyBucket: null,
      competitionBucket: null
    };

    // Time-to-Apply Buckets
    if (jobInsights.postedHoursAgo !== undefined && jobInsights.postedHoursAgo !== null) {
      const hours = jobInsights.postedHoursAgo;

      if (hours <= 3) {
        result.timeToApplyBucket = '0-3h';
      } else if (hours <= 12) {
        result.timeToApplyBucket = '4-12h';
      } else if (hours <= 24) {
        result.timeToApplyBucket = '13-24h';
      } else if (hours <= 72) {
        result.timeToApplyBucket = '1-3d';
      } else if (hours <= 168) {
        result.timeToApplyBucket = '3-7d';
      } else {
        result.timeToApplyBucket = '7d+';
      }
    }

    // Competition Buckets
    if (jobInsights.applicantsCount !== undefined && jobInsights.applicantsCount !== null) {
      const count = jobInsights.applicantsCount;

      if (count <= 10) {
        result.competitionBucket = '0-10';
      } else if (count <= 25) {
        result.competitionBucket = '11-25';
      } else if (count <= 50) {
        result.competitionBucket = '26-50';
      } else if (count <= 100) {
        result.competitionBucket = '51-100';
      } else {
        result.competitionBucket = '100+';
      }
    }

    return result;
  }

  async checkIfJobTracked(detailPanel, trackBtn) {
    try {
      // Extract job data to check
      const jobData = this.extractJobDataFromDetailPanel(detailPanel);
      if (!jobData) return;

      // Get tracked jobs from storage
      chrome.storage.local.get(['trackedJobs'], (result) => {
        const jobs = result.trackedJobs || [];

        // Check if this job is already tracked
        const isTracked = jobs.some(existingJob => {
          // Check by LinkedIn URL
          if (jobData.linkedinUrl && existingJob.linkedinUrl) {
            const newJobId = jobData.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];
            const existingJobId = existingJob.linkedinUrl.match(/\/jobs\/view\/(\d+)/)?.[1];

            if (newJobId && existingJobId && newJobId === existingJobId) {
              return true;
            }
          }

          // Fallback: Check by company + title
          const sameCompany = existingJob.company.toLowerCase().trim() ===
                             jobData.company.toLowerCase().trim();
          const sameTitle = existingJob.title.toLowerCase().trim() ===
                           jobData.title.toLowerCase().trim();

          return sameCompany && sameTitle;
        });

        if (isTracked) {
          // Update button to show it's already tracked
          trackBtn.innerHTML = '✓ Already Tracked';
          trackBtn.style.background = '#6B7280 !important';
          trackBtn.style.borderColor = '#6B7280 !important';
          trackBtn.style.cursor = 'default !important';
          trackBtn.dataset.alreadyTracked = 'true';
        }
      });
    } catch (error) {
      console.error('[Job Tracker] Error checking if job is tracked:', error);
    }
  }

  filterAllJobs() {
    // Find all job cards - try multiple selectors
    let jobCards = document.querySelectorAll('li.jobs-search-results__list-item');

    // Fallback selectors if the main one doesn't work
    if (jobCards.length === 0) {
      jobCards = document.querySelectorAll('li[data-occludable-job-id]');
    }
    if (jobCards.length === 0) {
      jobCards = document.querySelectorAll('.job-card-container');
    }



    let visibleCount = 0;
    let hiddenCount = 0;

    jobCards.forEach((card, index) => {
      const shouldHide = this.shouldHideJob(card);

      if (shouldHide) {
        // AGGRESSIVELY hide the job - use multiple methods
        card.style.setProperty('display', 'none', 'important');
        card.style.setProperty('visibility', 'hidden', 'important');
        card.style.setProperty('height', '0', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');
        card.style.setProperty('opacity', '0', 'important');
        card.style.setProperty('max-height', '0', 'important');
        card.style.setProperty('margin', '0', 'important');
        card.style.setProperty('padding', '0', 'important');

        // Also add a data attribute to mark as hidden
        card.setAttribute('data-filtered-out', 'true');
        card.setAttribute('aria-hidden', 'true');

        hiddenCount++;
      } else {
        // Show the job - remove all hiding styles
        card.style.removeProperty('display');
        card.style.removeProperty('visibility');
        card.style.removeProperty('height');
        card.style.removeProperty('overflow');
        card.style.removeProperty('opacity');
        card.style.removeProperty('max-height');
        card.style.removeProperty('margin');
        card.style.removeProperty('padding');

        // Remove hidden markers
        card.removeAttribute('data-filtered-out');
        card.removeAttribute('aria-hidden');

        visibleCount++;
      }
    });

    // Update stats
    this.stats = {
      total: jobCards.length,
      visible: visibleCount,
      hidden: hiddenCount
    };
    this.updateStats();

    // Force a second pass after a short delay to catch any that slipped through
    setTimeout(() => {
      this.forceRecheck();
    }, 500);
  }

  async backgroundScanForReposted() {
    // Get all visible job cards (not already filtered out)
    const allCards = Array.from(document.querySelectorAll('li.jobs-search-results__list-item, li[data-occludable-job-id]'));
    const visibleCards = allCards.filter(card => !card.getAttribute('data-filtered-out'));

    console.log(`[LinkedIn Jobs Filter] 🤖 Scanning ${visibleCards.length} jobs for reposted...`);

    if (visibleCards.length === 0) {
      return;
    }

    // Store the currently selected job to restore later
    const currentlySelected = document.querySelector('li.jobs-search-results__list-item--active, li[aria-current="true"]');
    const currentJobId = currentlySelected?.getAttribute('data-occludable-job-id');

    let scannedCount = 0;
    let repostedCount = 0;

    for (let i = 0; i < visibleCards.length; i++) {
      const card = visibleCards[i];

      // Skip if already checked
      if (card.getAttribute('data-detail-checked') === 'true') {
        continue;
      }

      // Click the job to load detail panel
      card.click();
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Wait for detail panel to load
      await new Promise(resolve => setTimeout(resolve, 600));

      // Check detail panel for reposted
      const detailPanel = document.querySelector('.jobs-search__job-details--container') ||
                         document.querySelector('.job-details-jobs-unified-top-card') ||
                         document.querySelector('[class*="job-details"]');

      if (detailPanel) {
        const detailText = detailPanel.textContent || '';

        // PRECISE REPOSTED DETECTION
        const repostedPatterns = [
          /Reposted\s+\d+\s+(day|hour|week|month)s?\s+ago/i,
          /Reposted\s+[a-z]+\s+(day|hour|week|month)s?\s+ago/i,
        ];

        let isReposted = false;

        // Check patterns
        for (const pattern of repostedPatterns) {
          if (pattern.test(detailText)) {
            isReposted = true;
            break;
          }
        }

        // Also check for standalone "Reposted" in elements
        if (!isReposted) {
          const elements = detailPanel.querySelectorAll('span, div, li, p');
          for (const el of elements) {
            const text = (el.textContent || '').trim();
            if (text.match(/^Reposted/i) && text.length < 100) {
              isReposted = true;
              break;
            }
          }
        }

        if (isReposted) {
          card.setAttribute('data-is-reposted', 'true');
          repostedCount++;
        }
      }

      card.setAttribute('data-detail-checked', 'true');
      scannedCount++;
    }

    console.log(`[LinkedIn Jobs Filter] ✅ Scan complete! Found ${repostedCount} reposted jobs out of ${scannedCount} scanned`);

    // Re-filter to hide newly detected reposted jobs
    this.filterAllJobs();

    // Restore the originally selected job
    if (currentJobId) {
      const originalCard = document.querySelector(`li[data-occludable-job-id="${currentJobId}"]`);
      if (originalCard && !originalCard.getAttribute('data-filtered-out')) {
        setTimeout(() => {
          originalCard.click();
          originalCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }

  forceRecheck() {
    // Second pass to catch any jobs that might have slipped through
    const allCards = document.querySelectorAll('li.jobs-search-results__list-item, li[data-occludable-job-id]');
    let recheckHidden = 0;

    allCards.forEach(card => {
      // Skip if already marked as filtered
      if (card.getAttribute('data-filtered-out') === 'true') {
        return;
      }

      // Re-check if this should be hidden
      const shouldHide = this.shouldHideJob(card);

      if (shouldHide) {
        console.log('[LinkedIn Jobs Filter] 🔄 RECHECK: Hiding job that slipped through');

        // Aggressively hide
        card.style.setProperty('display', 'none', 'important');
        card.style.setProperty('visibility', 'hidden', 'important');
        card.style.setProperty('height', '0', 'important');
        card.style.setProperty('overflow', 'hidden', 'important');
        card.style.setProperty('opacity', '0', 'important');
        card.setAttribute('data-filtered-out', 'true');
        card.setAttribute('aria-hidden', 'true');

        recheckHidden++;
      }
    });

    if (recheckHidden > 0) {
      console.log(`[LinkedIn Jobs Filter] 🔄 RECHECK: Hid ${recheckHidden} additional jobs`);
      // Update stats
      this.stats.hidden += recheckHidden;
      this.stats.visible -= recheckHidden;
      this.updateStats();
    }
  }

  shouldHideJob(card) {
    // Extract job data
    const jobData = this.extractJobData(card);

    // Filter 1: Hide reposted jobs (CHECK FIRST - most important)
    if (this.settings.hideReposted && jobData.isReposted) {
      console.log(`[LinkedIn Jobs Filter] 🔁 HIDING REPOSTED: "${jobData.company || 'Unknown'}"`);
      return true; // Hide - reposted
    }

    // Filter 2: Hide promoted jobs
    if (this.settings.hidePromoted && jobData.isPromoted) {
      console.log(`[LinkedIn Jobs Filter] 📢 HIDING PROMOTED: "${jobData.company || 'Unknown'}"`);
      return true; // Hide - promoted
    }

    // Filter 3: Blacklisted companies - ULTRA ROBUST MATCHING
    if (this.settings.blacklistedCompanies.length > 0 && jobData.company) {
      const isBlacklisted = this.isCompanyBlacklisted(jobData.company);

      if (isBlacklisted) {
        console.log(`[LinkedIn Jobs Filter] 🚫 HIDING BLACKLISTED: "${jobData.company}"`);
        return true; // Hide - blacklisted company
      }
    }

    // Filter 4: Time range (hours)
    if (this.settings.hoursRange > 0) {
      const hoursAgo = this.getJobAgeInHours(jobData.timeText);
      if (hoursAgo > this.settings.hoursRange) {
        console.log(`[LinkedIn Jobs Filter] ⏰ HIDING OLD: "${jobData.company || 'Unknown'}" (${hoursAgo}h old)`);
        return true; // Hide - too old
      }
    }

    return false; // Show job
  }

  isCompanyBlacklisted(company) {
    if (!company) return false;

    // Normalize the company name for comparison
    const normalizeCompany = (name) => {
      return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')           // Normalize spaces
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')  // Remove punctuation
        .replace(/\binc\b|\bllc\b|\bltd\b|\bcorp\b|\bco\b/gi, '');  // Remove company suffixes
    };

    const normalizedCompany = normalizeCompany(company);

    // Check against each blacklisted company
    for (const blocked of this.settings.blacklistedCompanies) {
      const normalizedBlocked = normalizeCompany(blocked);

      // Method 1: Exact match (after normalization)
      if (normalizedCompany === normalizedBlocked) {
        console.log(`[LinkedIn Jobs Filter] ✓ Exact match: "${company}" === "${blocked}"`);
        return true;
      }

      // Method 2: Contains match (bidirectional)
      if (normalizedCompany.includes(normalizedBlocked)) {
        console.log(`[LinkedIn Jobs Filter] ✓ Contains match: "${company}" contains "${blocked}"`);
        return true;
      }

      if (normalizedBlocked.includes(normalizedCompany)) {
        console.log(`[LinkedIn Jobs Filter] ✓ Reverse contains: "${blocked}" contains "${company}"`);
        return true;
      }

      // Method 3: Word-by-word matching (for "Jobs via X" cases)
      const companyWords = normalizedCompany.split(' ').filter(w => w.length > 2);
      const blockedWords = normalizedBlocked.split(' ').filter(w => w.length > 2);

      // Check if all significant words from blocked company appear in company name
      if (blockedWords.length > 0) {
        const allWordsMatch = blockedWords.every(word =>
          companyWords.some(cw => cw.includes(word) || word.includes(cw))
        );

        if (allWordsMatch) {
          console.log(`[LinkedIn Jobs Filter] ✓ Word match: "${company}" matches "${blocked}"`);
          return true;
        }
      }

      // Method 4: Fuzzy matching for common variations
      // Handle "Jobs via X" vs "X" matching
      if (normalizedCompany.includes('jobs via')) {
        const afterVia = normalizedCompany.split('jobs via')[1]?.trim();
        if (afterVia && (
            afterVia === normalizedBlocked ||
            afterVia.includes(normalizedBlocked) ||
            normalizedBlocked.includes(afterVia)
        )) {
          console.log(`[LinkedIn Jobs Filter] ✓ "Jobs via" match: "${company}" matches "${blocked}"`);
          return true;
        }
      }

      // Reverse: if blocked is "Jobs via X" and company is "X"
      if (normalizedBlocked.includes('jobs via')) {
        const afterVia = normalizedBlocked.split('jobs via')[1]?.trim();
        if (afterVia && (
            normalizedCompany === afterVia ||
            normalizedCompany.includes(afterVia) ||
            afterVia.includes(normalizedCompany)
        )) {
          console.log(`[LinkedIn Jobs Filter] ✓ Reverse "Jobs via" match: "${company}" matches "${blocked}"`);
          return true;
        }
      }
    }

    return false;
  }

  extractJobData(card) {
    // Extract company name - ULTRA ROBUST with multiple fallbacks
    let company = '';

    // Method 1: Try ALL possible selectors
    const companySelectors = [
      '.job-card-container__primary-description',
      '.artdeco-entity-lockup__subtitle',
      '.job-card-container__company-name',
      '[data-anonymize="company-name"]',
      '.base-search-card__subtitle',
      '.job-card-container__metadata-item',
      '.job-card-list__company-name',
      '.job-card-container__company',
      '.artdeco-entity-lockup__subtitle span',
      '.job-card-container__metadata-wrapper span',
      'span[class*="company"]',
      'div[class*="company"]'
    ];

    for (const selector of companySelectors) {
      const el = card.querySelector(selector);
      if (el && el.textContent.trim()) {
        const text = el.textContent.trim();
        // Skip if it's just a number or time text
        if (text && !text.match(/^\d+$/) && !text.includes('ago')) {
          company = text;
          break;
        }
      }
    }

    // Method 2: Look for "Jobs via X" pattern in ALL text content
    if (!company) {
      const allText = card.textContent || '';
      const lines = allText.split('\n').map(l => l.trim()).filter(l => l);

      // Try to find "Jobs via X" pattern
      for (const line of lines) {
        const viaMatch = line.match(/Jobs via (.+)/i);
        if (viaMatch) {
          company = 'Jobs via ' + viaMatch[1].trim();
          break;
        }
      }
    }

    // Method 3: Try aria-label
    if (!company) {
      const ariaLabel = card.getAttribute('aria-label') || '';
      const companyMatch = ariaLabel.match(/at ([^,\n]+)/i);
      if (companyMatch) {
        company = companyMatch[1].trim();
      }
    }

    // Method 4: Look for company in structured data
    if (!company) {
      const allElements = card.querySelectorAll('span, div, a');
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        // Look for company-like text (not too short, not a number, not time)
        if (text.length > 2 &&
            text.length < 100 &&
            !text.match(/^\d+$/) &&
            !text.includes('ago') &&
            !text.includes('applicant') &&
            !text.includes('Easy Apply') &&
            !text.includes('Save')) {
          // Check if this might be a company name
          const parent = el.parentElement;
          if (parent && (
              parent.className.includes('company') ||
              parent.className.includes('subtitle') ||
              parent.className.includes('metadata')
          )) {
            company = text;
            break;
          }
        }
      }
    }

    // Clean up company name aggressively
    if (company) {
      company = company
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/\n/g, ' ')   // Remove newlines
        .trim();

      // Remove common suffixes that might be appended
      company = company.split('·')[0].trim();  // Remove anything after ·
      company = company.split('•')[0].trim();  // Remove anything after •
      company = company.split('|')[0].trim();  // Remove anything after |
    }

    // Extract time posted - COMPREHENSIVE
    let timeText = '';

    // Method 1: <time> element
    const timeEl = card.querySelector('time');
    if (timeEl) {
      timeText = timeEl.getAttribute('datetime') || timeEl.textContent?.trim() || '';
    }

    // Method 2: Specific time classes
    if (!timeText) {
      const timeSelectors = [
        '.job-card-container__listed-time',
        '.job-card-list__date',
        'time',
        '[class*="time"]',
        '[class*="date"]'
      ];

      for (const selector of timeSelectors) {
        const el = card.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || '';
          if (text.includes('ago') || text.match(/\d+\s+(minute|hour|day|week|month)/i)) {
            timeText = text;
            break;
          }
        }
      }
    }

    // Method 3: Pattern matching in all text
    if (!timeText) {
      const cardText = card.textContent || '';
      const timeMatch = cardText.match(/(\d+\s+(minute|hour|day|week|month)s?\s+ago)/i);
      if (timeMatch) {
        timeText = timeMatch[1];
      }
    }

    // ULTRA ROBUST REPOSTED DETECTION
    const isReposted = this.detectReposted(card);

    // ULTRA ROBUST PROMOTED DETECTION
    const isPromoted = this.detectPromoted(card);

    return { company, timeText, isReposted, isPromoted };
  }

  detectReposted(card) {
    // PRIORITY: Check if we previously marked this as reposted (from detail panel)
    if (card.getAttribute('data-is-reposted') === 'true') {
      console.log('[LinkedIn Jobs Filter] 🔁 REPOSTED detected via previous marking');
      return true;
    }

    // Method 1: Check all text content (case-insensitive)
    const allText = (card.textContent || '').toLowerCase();
    if (allText.includes('reposted')) {
      console.log('[LinkedIn Jobs Filter] 🔁 REPOSTED detected via text in card');
      return true;
    }

    // Method 2: Check for repost-related classes
    const repostClasses = [
      '[class*="repost"]',
      '[class*="re-post"]',
      '[class*="reposted"]',
      '[data-reposted]',
      '[aria-label*="repost" i]'
    ];

    for (const selector of repostClasses) {
      if (card.querySelector(selector)) {
        console.log('[LinkedIn Jobs Filter] 🔁 REPOSTED detected via class:', selector);
        return true;
      }
    }

    // Method 3: Check all child elements for repost text
    const allElements = card.querySelectorAll('*');
    for (const el of allElements) {
      const text = (el.textContent || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      if (text.includes('reposted') || ariaLabel.includes('repost') || title.includes('repost')) {
        console.log('[LinkedIn Jobs Filter] 🔁 REPOSTED detected in element');
        return true;
      }
    }

    // Method 4: Check for visual indicators (badges, icons)
    const badges = card.querySelectorAll('span, div, li');
    for (const badge of badges) {
      const badgeText = (badge.textContent || '').trim().toLowerCase();
      if (badgeText === 'reposted' || badgeText === 'repost') {
        console.log('[LinkedIn Jobs Filter] 🔁 REPOSTED detected via badge');
        return true;
      }
    }

    return false;
  }

  detectPromoted(card) {
    // PRIORITY: Check if we previously marked this as promoted (from detail panel)
    if (card.getAttribute('data-is-promoted') === 'true') {
      console.log('[LinkedIn Jobs Filter] 📢 PROMOTED detected via previous marking');
      return true;
    }

    // Method 1: Check all text content (case-insensitive)
    const allText = (card.textContent || '').toLowerCase();
    if (allText.includes('promoted')) {
      console.log('[LinkedIn Jobs Filter] 📢 PROMOTED detected via text');
      return true;
    }

    // Method 2: Check for promoted-related classes
    const promotedClasses = [
      '[class*="promoted"]',
      '[class*="sponsor"]',
      '[data-promoted]',
      '[aria-label*="promoted" i]',
      '[aria-label*="sponsor" i]'
    ];

    for (const selector of promotedClasses) {
      if (card.querySelector(selector)) {
        console.log('[LinkedIn Jobs Filter] 📢 PROMOTED detected via class:', selector);
        return true;
      }
    }

    // Method 3: Check all child elements
    const allElements = card.querySelectorAll('*');
    for (const el of allElements) {
      const text = (el.textContent || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();

      if (text.includes('promoted') ||
          text.includes('sponsored') ||
          ariaLabel.includes('promoted') ||
          ariaLabel.includes('sponsor') ||
          title.includes('promoted') ||
          title.includes('sponsor')) {
        console.log('[LinkedIn Jobs Filter] 📢 PROMOTED detected in element');
        return true;
      }
    }

    // Method 4: Check for visual indicators
    const badges = card.querySelectorAll('span, div, li');
    for (const badge of badges) {
      const badgeText = (badge.textContent || '').trim().toLowerCase();
      if (badgeText === 'promoted' || badgeText === 'sponsored') {
        console.log('[LinkedIn Jobs Filter] 📢 PROMOTED detected via badge');
        return true;
      }
    }

    return false;
  }

  extractFullJobData(card) {
    // Get basic data
    const basicData = this.extractJobData(card);

    // Extract job title
    let title = '';
    const titleSelectors = [
      '.job-card-list__title',
      '.artdeco-entity-lockup__title',
      '.job-card-container__link',
      'a.job-card-list__title'
    ];

    for (const selector of titleSelectors) {
      const el = card.querySelector(selector);
      if (el && el.textContent.trim()) {
        title = el.textContent.trim();
        break;
      }
    }

    // Extract location
    let location = '';
    const locationSelectors = [
      '.job-card-container__metadata-item',
      '.artdeco-entity-lockup__caption',
      '.job-card-container__location'
    ];

    for (const selector of locationSelectors) {
      const el = card.querySelector(selector);
      if (el && el.textContent.trim() && !el.textContent.includes('ago')) {
        location = el.textContent.trim();
        break;
      }
    }

    // Extract salary (if available)
    let salary = '';
    const salaryEl = card.querySelector('[class*="salary"]');
    if (salaryEl) {
      salary = salaryEl.textContent.trim();
    }

    // Determine work type from location or description
    let workType = 'Not specified';
    const locationLower = location.toLowerCase();
    if (locationLower.includes('remote')) {
      workType = 'Remote';
    } else if (locationLower.includes('hybrid')) {
      workType = 'Hybrid';
    } else if (location && !locationLower.includes('remote') && !locationLower.includes('hybrid')) {
      workType = 'Onsite';
    }

    // Get LinkedIn URL
    const linkEl = card.querySelector('a[href*="/jobs/view/"]');
    const linkedinUrl = linkEl ? linkEl.href : window.location.href;

    // Get job description from the detail panel (if visible)
    let description = '';
    const descPanel = document.querySelector('.jobs-description');
    if (descPanel) {
      description = descPanel.textContent.trim().substring(0, 500); // First 500 chars
    }

    return {
      company: basicData.company,
      title,
      location,
      salary,
      workType,
      linkedinUrl,
      description
    };
  }

  addTrackButton(card) {
    // Check if button already exists
    if (card.querySelector('.job-tracker-btn')) {
      return;
    }

    // Find the action buttons container
    const actionsContainer = card.querySelector('.job-card-container__actions') ||
                            card.querySelector('.job-card-list__footer-wrapper') ||
                            card.querySelector('.artdeco-entity-lockup__action-container');

    if (!actionsContainer) {
      return; // Can't find where to add the button
    }

    // Create track button
    const trackBtn = document.createElement('button');
    trackBtn.className = 'job-tracker-btn';
    trackBtn.innerHTML = 'Track';
    trackBtn.title = 'Track this application';

    // Add styles - sleek black & white design
    trackBtn.style.cssText = `
      background: #000000;
      color: white;
      border: 1px solid #000000;
      border-radius: 16px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 8px;
      transition: all 0.15s;
    `;

    // Hover effect
    trackBtn.addEventListener('mouseenter', () => {
      trackBtn.style.background = '#111111';
    });

    trackBtn.addEventListener('mouseleave', () => {
      trackBtn.style.background = '#000000';
    });

    // Click handler
    trackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.trackJob(card, trackBtn);
    });

    actionsContainer.appendChild(trackBtn);
  }

  async trackJob(card, button) {
    // Extract job data
    const jobData = this.extractFullJobData(card);

    console.log('[Job Tracker] 📝 Tracking job:', jobData);

    // Change button to "tracked" state
    button.innerHTML = '✓ Tracked';
    button.style.background = '#6B7280';
    button.style.borderColor = '#6B7280';
    button.disabled = true;

    // Send message to background script to save job
    chrome.runtime.sendMessage({
      action: 'trackJob',
      jobData: jobData
    }, (response) => {
      if (response && response.success) {
        console.log('[Job Tracker] ✅ Job tracked successfully!');

        // Show notification
        this.showNotification('Job tracked! View in dashboard.');
      } else if (response && response.duplicate) {
        console.log('[Job Tracker] ⚠️ Job already tracked');

        // Show duplicate state
        button.innerHTML = '✓ Already Tracked';
        button.style.background = '#F59E0B';
        button.style.borderColor = '#F59E0B';

        // Show notification
        this.showNotification('⚠️ This job is already in your dashboard!');

        // Reset button after delay
        setTimeout(() => {
          button.innerHTML = 'Track';
          button.style.background = '#000000';
          button.style.borderColor = '#000000';
          button.disabled = false;
        }, 3000);
      } else {
        console.error('[Job Tracker] ❌ Failed to track job');
        button.innerHTML = 'Track';
        button.style.background = '#000000';
        button.style.borderColor = '#000000';
        button.disabled = false;
      }
    });
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 24px;
      background: rgba(0, 0, 0, 0.92);
      color: white;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    `;
    notification.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  getJobAgeInHours(timeText) {
    if (!timeText) {
      return 0; // No time = treat as new (show it)
    }

    const text = timeText.toLowerCase();

    // Extract number from text
    const numberMatch = text.match(/(\d+)/);
    const number = numberMatch ? parseInt(numberMatch[1]) : 1;

    let hours = 0;

    // Parse time text
    if (text.includes('minute') || text.includes('min')) {
      hours = number / 60;
    } else if (text.includes('hour')) {
      hours = number;
    } else if (text.includes('day')) {
      hours = number * 24;
    } else if (text.includes('week')) {
      hours = number * 24 * 7;
    } else if (text.includes('month')) {
      hours = number * 24 * 30;
    } else {
      // Try to parse ISO datetime (e.g., "2025-01-10T12:00:00Z")
      try {
        const date = new Date(timeText);
        if (!isNaN(date.getTime())) {
          const now = new Date();
          const diffMs = now - date;
          hours = diffMs / (1000 * 60 * 60);
        }
      } catch (e) {
        // Could not parse, treat as new
        hours = 0;
      }
    }

    return hours;
  }

  // Panel helper methods
  togglePanel() {
    if (this.panel) {
      this.panel.classList.toggle('visible');
    }
  }

  updatePanelUI() {
    if (!this.panel) return;

    // Update hide reposted toggle
    const hideRepostedToggle = document.getElementById('hide-reposted-toggle');
    if (hideRepostedToggle) hideRepostedToggle.checked = this.settings.hideReposted;

    // Update hide promoted toggle
    const hidePromotedToggle = document.getElementById('hide-promoted-toggle');
    if (hidePromotedToggle) hidePromotedToggle.checked = this.settings.hidePromoted;

    // Update early applicants toggle
    const earlyApplicantsToggle = document.getElementById('early-applicants-toggle');
    if (earlyApplicantsToggle) earlyApplicantsToggle.checked = this.settings.earlyApplicants;

    // Update hours input
    const hoursInput = document.getElementById('hours-input');
    if (hoursInput) hoursInput.value = this.settings.hoursRange;

    // Update company tags
    this.renderCompanyTags();
  }

  updateStats() {
    if (!this.panel) return;

    const totalEl = document.getElementById('stat-total');
    const visibleEl = document.getElementById('stat-visible');
    const hiddenEl = document.getElementById('stat-hidden');

    if (totalEl) totalEl.textContent = this.stats.total;
    if (visibleEl) visibleEl.textContent = this.stats.visible;
    if (hiddenEl) hiddenEl.textContent = this.stats.hidden;
  }

  renderCompanyTags() {
    const container = document.getElementById('company-tags');
    if (!container) return;

    container.innerHTML = '';

    this.settings.blacklistedCompanies.forEach(company => {
      const tag = document.createElement('div');
      tag.className = 'company-tag';

      const span = document.createElement('span');
      span.textContent = company;

      const button = document.createElement('button');
      button.textContent = '×';
      button.addEventListener('click', () => this.removeCompany(company));

      tag.appendChild(span);
      tag.appendChild(button);
      container.appendChild(tag);
    });
  }

  updatePendingSettings(updates) {
    // Initialize pending settings if not set
    if (!this.pendingSettings) {
      this.pendingSettings = { ...this.settings };
    }

    // Update pending settings
    this.pendingSettings = { ...this.pendingSettings, ...updates };

    console.log('[LinkedIn Jobs Filter] 📝 Pending settings updated:', this.pendingSettings);
    console.log('[LinkedIn Jobs Filter] 💡 Click "Apply Filters" to apply changes');
  }

  applyPendingSettings() {
    if (!this.pendingSettings) {
      console.log('[LinkedIn Jobs Filter] ℹ️ No pending changes to apply');
      return;
    }

    console.log('[LinkedIn Jobs Filter] ⚡ Applying pending settings:', this.pendingSettings);

    // Save to storage and update current settings
    this.saveSettings(this.pendingSettings);

    // Modify URL with new parameters (for time range and early applicants)
    this.updateURLParameters(this.pendingSettings);

    // Apply client-side filters immediately (for blacklist and reposted)
    // Wait a bit for LinkedIn to reload, then apply client-side filters
    setTimeout(() => {
      this.filterAllJobs();

      // CRITICAL: If hideReposted is enabled, start background scan
      if (this.settings.hideReposted) {
        setTimeout(() => {
          this.backgroundScanForReposted();
        }, 500);
      }
    }, 1000);

    // Clear pending settings
    this.pendingSettings = null;

    // Update UI to remove pending indicators
    this.renderCompanyTags();
  }

  updateURLParameters(settings) {
    const url = new URL(window.location.href);

    // Update time range parameter (f_TPR)
    if (settings.hoursRange > 0) {
      const seconds = settings.hoursRange * 3600; // Convert hours to seconds
      url.searchParams.set('f_TPR', `r${seconds}`);
      console.log(`[LinkedIn Jobs Filter] 🕐 Setting time range: ${settings.hoursRange}h (${seconds}s)`);
    } else {
      // Remove time filter if 0
      url.searchParams.delete('f_TPR');
      console.log('[LinkedIn Jobs Filter] 🕐 Removing time range filter');
    }

    // Update early applicants parameter (f_EA)
    if (settings.earlyApplicants) {
      url.searchParams.set('f_EA', 'true');
      console.log('[LinkedIn Jobs Filter] 👥 Enabling early applicants filter');
    } else {
      url.searchParams.delete('f_EA');
      console.log('[LinkedIn Jobs Filter] 👥 Disabling early applicants filter');
    }

    // Update URL without reloading the page
    const newURL = url.toString();
    if (newURL !== window.location.href) {
      console.log('[LinkedIn Jobs Filter] 🔗 Updating URL:', newURL);
      window.history.pushState({}, '', newURL);

      // Trigger LinkedIn to reload jobs with new filters
      // LinkedIn listens to popstate events
      window.dispatchEvent(new PopStateEvent('popstate'));

      console.log('[LinkedIn Jobs Filter] ✅ URL updated! LinkedIn should reload jobs now.');
    }
  }

  addCompany(company) {
    // Get current blacklist (from pending settings if exists, otherwise from settings)
    const currentBlacklist = this.pendingSettings?.blacklistedCompanies || [...this.settings.blacklistedCompanies];

    if (!currentBlacklist.includes(company)) {
      currentBlacklist.push(company);

      // Update pending settings (don't save yet)
      this.updatePendingSettings({ blacklistedCompanies: currentBlacklist });

      // Update UI to show the new company tag (show pending state)
      this.renderPendingCompanyTags();

      console.log('[LinkedIn Jobs Filter] ➕ Added to blacklist (pending):', company);
      console.log('[LinkedIn Jobs Filter] 💡 Click "Apply Filters" to apply changes');
    }
  }

  removeCompany(company) {
    // Get current blacklist (from pending settings if exists, otherwise from settings)
    const currentBlacklist = this.pendingSettings?.blacklistedCompanies || [...this.settings.blacklistedCompanies];

    const newBlacklist = currentBlacklist.filter(c => c !== company);

    // Update pending settings (don't save yet)
    this.updatePendingSettings({ blacklistedCompanies: newBlacklist });

    // Update UI to remove the company tag (show pending state)
    this.renderPendingCompanyTags();

    console.log('[LinkedIn Jobs Filter] ➖ Removed from blacklist (pending):', company);
    console.log('[LinkedIn Jobs Filter] 💡 Click "Apply Filters" to apply changes');
  }

  renderPendingCompanyTags() {
    const container = document.getElementById('company-tags');
    if (!container) return;

    container.innerHTML = '';

    // Show pending companies if they exist, otherwise show saved companies
    const companiesToShow = this.pendingSettings?.blacklistedCompanies || this.settings.blacklistedCompanies;

    companiesToShow.forEach(company => {
      const tag = document.createElement('div');
      tag.className = 'company-tag';

      // Add pending indicator if this is a pending change
      if (this.pendingSettings) {
        tag.style.opacity = '0.7';
        tag.style.border = '2px dashed #0a66c2';
        tag.title = 'Pending - Click "Apply Filters" to save';
      }

      const span = document.createElement('span');
      span.textContent = company;

      const button = document.createElement('button');
      button.textContent = '×';
      button.addEventListener('click', () => this.removeCompany(company));

      tag.appendChild(span);
      tag.appendChild(button);
      container.appendChild(tag);
    });
  }

  saveSettings(updates) {
    const newSettings = { ...this.settings, ...updates };

    chrome.storage.local.set({ settings: newSettings }, () => {
      console.log('[LinkedIn Jobs Filter] 💾 Settings saved:', newSettings);
    });
  }
}

// Start the filter when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.linkedInJobsFilter = new LinkedInJobsFilter();
  });
} else {
  window.linkedInJobsFilter = new LinkedInJobsFilter();
}

