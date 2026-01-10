// Autofill Content Script - Runs on job application pages

class AutofillUI {
  constructor() {
    this.isVisible = false;
    this.resumeUploaded = false;
    this.init();
  }

  async init() {
    console.log('[Autofill UI] 🚀 Initializing on', window.location.hostname);
    
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  async setup() {
    // Check if we're on a job application page
    if (!this.isJobApplicationPage()) {
      console.log('[Autofill UI] ℹ️ Not a job application page, skipping...');
      return;
    }

    console.log('[Autofill UI] ✅ Job application page detected!');
    
    // Create floating autofill button
    this.createFloatingButton();
    
    // Create autofill panel
    this.createAutofillPanel();
    
    // Load resume data if available
    await this.loadResumeData();
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'toggleAutofill') {
        this.togglePanel();
      } else if (message.action === 'autofillNow') {
        this.performAutofill();
      }
    });
  }

  isJobApplicationPage() {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    // Check for common ATS platforms
    const atsPatterns = [
      'myworkdayjobs.com',
      'greenhouse.io',
      'lever.co',
      'taleo.net',
      'icims.com',
      'smartrecruiters.com',
      'jobvite.com',
      'breezy.hr',
      'workable.com'
    ];
    
    if (atsPatterns.some(pattern => hostname.includes(pattern))) {
      return true;
    }
    
    // Check URL patterns
    const urlPatterns = [
      '/apply',
      '/application',
      '/careers',
      '/jobs/',
      '/jobs/apply',
      '/job-application'
    ];
    
    if (urlPatterns.some(pattern => url.includes(pattern))) {
      return true;
    }
    
    // Check for form elements that suggest it's an application page
    const hasApplicationForm = document.querySelector('form[action*="apply"]') ||
                               document.querySelector('form[action*="application"]') ||
                               document.querySelector('[class*="application"]') ||
                               document.querySelector('[id*="application"]');
    
    return !!hasApplicationForm;
  }

  createFloatingButton() {
    // Remove existing button if any
    const existing = document.getElementById('autofill-floating-btn');
    if (existing) existing.remove();

    const button = document.createElement('button');
    button.id = 'autofill-floating-btn';
    button.innerHTML = '📝 Autofill';
    button.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #000;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 14px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
    });

    button.addEventListener('click', () => {
      this.togglePanel();
    });

    document.body.appendChild(button);
  }

  createAutofillPanel() {
    // Remove existing panel if any
    const existing = document.getElementById('autofill-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'autofill-panel';
    panel.innerHTML = `
      <div class="autofill-panel-header">
        <div class="autofill-panel-title">
          <span>📝</span>
          <span>Autofill Application</span>
        </div>
        <button class="autofill-close-btn" id="autofill-close">×</button>
      </div>
      <div class="autofill-panel-body">
        <div class="autofill-platform-info" id="platform-info">
          <div class="platform-badge">🎯 <span id="platform-name">Detecting...</span></div>
        </div>
        
        <div class="autofill-resume-section">
          <div class="autofill-section-title">Your Profile</div>
          <div id="resume-status" class="resume-status">
            <div class="resume-placeholder">
              <span>👤</span>
              <p>No profile set up</p>
            </div>
          </div>
          <button class="autofill-btn autofill-btn-secondary" id="setup-profile-btn">
            ⚙️ Set Up Profile
          </button>
          <button class="autofill-btn autofill-btn-secondary" id="edit-profile-btn" style="margin-top: 8px; display: none;">
            ✏️ Edit Profile
          </button>
        </div>

        <div class="autofill-actions">
          <button class="autofill-btn autofill-btn-primary" id="autofill-btn" disabled>
            ✨ Autofill Form
          </button>
          <button class="autofill-btn autofill-btn-outline" id="clear-resume-btn" style="display: none;">
            🗑️ Clear Resume
          </button>
        </div>

        <div class="autofill-info">
          <p>💡 Set up your profile once, autofill everywhere</p>
          <p>✓ Works on Workday, Greenhouse, Lever, and more</p>
        </div>
      </div>
    `;

    this.addPanelStyles();
    document.body.appendChild(panel);

    // Setup event listeners
    this.setupPanelListeners();

    // Detect platform
    this.detectAndDisplayPlatform();
  }

  addPanelStyles() {
    if (document.getElementById('autofill-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'autofill-panel-styles';
    style.textContent = `
      #autofill-panel {
        position: fixed;
        top: 50%;
        right: -400px;
        transform: translateY(-50%);
        width: 380px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid #e5e5e5;
      }

      #autofill-panel.visible {
        right: 20px;
      }

      .autofill-panel-header {
        background: #000;
        color: white;
        padding: 16px 20px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .autofill-panel-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 600;
      }

      .autofill-close-btn {
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 24px;
        line-height: 1;
        transition: background 0.2s;
      }

      .autofill-close-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .autofill-panel-body {
        padding: 20px;
        max-height: 600px;
        overflow-y: auto;
      }

      .autofill-platform-info {
        margin-bottom: 20px;
      }

      .platform-badge {
        background: #f5f5f5;
        border: 1px solid #e5e5e5;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        color: #111;
      }

      .autofill-resume-section {
        margin-bottom: 20px;
      }

      .autofill-section-title {
        font-size: 13px;
        font-weight: 600;
        color: #111;
        margin-bottom: 12px;
      }

      .resume-status {
        margin-bottom: 12px;
      }

      .resume-placeholder {
        background: #f5f5f5;
        border: 2px dashed #d4d4d4;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        color: #6b6b6b;
      }

      .resume-placeholder span {
        font-size: 32px;
        display: block;
        margin-bottom: 8px;
      }

      .resume-placeholder p {
        margin: 0;
        font-size: 13px;
      }

      .resume-uploaded {
        background: #000;
        color: white;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .resume-uploaded span {
        font-size: 24px;
      }

      .resume-info {
        flex: 1;
      }

      .resume-name {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .resume-details {
        font-size: 12px;
        opacity: 0.8;
      }

      .autofill-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
      }

      .autofill-btn {
        width: 100%;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        font-family: inherit;
      }

      .autofill-btn-primary {
        background: #000;
        color: white;
      }

      .autofill-btn-primary:hover:not(:disabled) {
        background: #111;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .autofill-btn-primary:disabled {
        background: #d4d4d4;
        color: #9b9b9b;
        cursor: not-allowed;
      }

      .autofill-btn-secondary {
        background: white;
        color: #111;
        border: 1px solid #d4d4d4;
      }

      .autofill-btn-secondary:hover {
        background: #f5f5f5;
        border-color: #000;
      }

      .autofill-btn-outline {
        background: transparent;
        color: #e74c3c;
        border: 1px solid #e74c3c;
      }

      .autofill-btn-outline:hover {
        background: #e74c3c;
        color: white;
      }

      .autofill-info {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 14px;
        font-size: 12px;
        color: #6b6b6b;
        line-height: 1.6;
      }

      .autofill-info p {
        margin: 0 0 6px 0;
      }

      .autofill-info p:last-child {
        margin-bottom: 0;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOutRight {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  setupPanelListeners() {
    // Close button
    document.getElementById('autofill-close').addEventListener('click', () => {
      this.togglePanel();
    });

    // Setup profile button
    document.getElementById('setup-profile-btn').addEventListener('click', () => {
      this.openProfileSetup();
    });

    // Edit profile button
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
      this.openProfileSetup();
    });

    // Autofill button
    document.getElementById('autofill-btn').addEventListener('click', () => {
      this.performAutofill();
    });

    // Clear resume button
    document.getElementById('clear-resume-btn').addEventListener('click', () => {
      this.clearProfile();
    });
  }

  detectAndDisplayPlatform() {
    if (window.autofillEngine) {
      const platformName = window.autofillEngine.platformDetector.getPlatformName();
      document.getElementById('platform-name').textContent = platformName;
    }
  }

  async loadResumeData() {
    const result = await chrome.storage.local.get(['userProfile']);
    if (result.userProfile) {
      this.displayProfileInfo(result.userProfile);
      this.resumeUploaded = true;
    }
  }

  openProfileSetup() {
    // Open profile setup page in new tab
    chrome.runtime.sendMessage({ action: 'openProfileSetup' });
  }



  displayProfileInfo(profile) {
    const statusDiv = document.getElementById('resume-status');
    const details = [];

    if (profile.email) details.push(profile.email);
    if (profile.phone) details.push(profile.phone);
    if (profile.city && profile.state) details.push(`${profile.city}, ${profile.state}`);

    statusDiv.innerHTML = `
      <div class="resume-uploaded">
        <span>✅</span>
        <div class="resume-info">
          <div class="resume-name">${profile.fullName || profile.firstName + ' ' + profile.lastName}</div>
          <div class="resume-details">${details.join(' • ') || 'Profile ready'}</div>
        </div>
      </div>
    `;

    // Enable autofill button
    document.getElementById('autofill-btn').disabled = false;

    // Show edit button instead of setup
    document.getElementById('setup-profile-btn').style.display = 'none';
    document.getElementById('edit-profile-btn').style.display = 'block';

    // Show clear button
    document.getElementById('clear-resume-btn').style.display = 'block';
  }

  async performAutofill() {
    if (!this.resumeUploaded) {
      alert('Please set up your profile first');
      return;
    }

    console.log('[Autofill UI] 🚀 Starting autofill...');

    const result = await chrome.storage.local.get(['userProfile']);

    if (result.userProfile && window.autofillEngine) {
      await window.autofillEngine.autofillForm(result.userProfile);

      // Start monitoring for page changes (for multi-page forms)
      window.autofillEngine.startPageMonitoring();
    } else {
      this.showNotification('❌ Profile data not found', 'error');
    }
  }

  clearProfile() {
    if (confirm('Are you sure you want to clear your profile data?')) {
      chrome.storage.local.remove(['userProfile']);

      const statusDiv = document.getElementById('resume-status');
      statusDiv.innerHTML = `
        <div class="resume-placeholder">
          <span>👤</span>
          <p>No profile set up</p>
        </div>
      `;

      document.getElementById('autofill-btn').disabled = true;
      document.getElementById('clear-resume-btn').style.display = 'none';
      document.getElementById('setup-profile-btn').style.display = 'block';
      document.getElementById('edit-profile-btn').style.display = 'none';
      this.resumeUploaded = false;

      this.showNotification('🗑️ Profile cleared', 'info');
    }
  }

  togglePanel() {
    const panel = document.getElementById('autofill-panel');
    this.isVisible = !this.isVisible;

    if (this.isVisible) {
      panel.classList.add('visible');
    } else {
      panel.classList.remove('visible');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `autofill-notification autofill-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#000' : type === 'error' ? '#e74c3c' : '#3498db'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999999;
      animation: slideInRight 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AutofillUI();
  });
} else {
  new AutofillUI();
}


