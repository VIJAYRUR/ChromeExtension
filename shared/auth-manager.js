// Auth Manager - Extension-wide Authentication State Management
// This file should be included in all pages that require authentication

class AuthManager {
  constructor() {
    // Get API URL from config
    this.API_BASE_URL = (typeof window !== 'undefined' && window.API_CONFIG)
      ? window.API_CONFIG.API_URL
      : 'https://job-tracker-api-j7ef.onrender.com/api';
    this.isAuthenticated = false;
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    this.initialized = false;
    this.initPromise = null;
  }

  // Initialize auth state - call this on page load
  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  async _doInit() {
    try {
      await this.loadAuthState();

      if (this.token) {
        // Verify token is still valid
        const isValid = await this.verifyToken();
        if (!isValid) {
          // Try to refresh
          const refreshed = await this.refreshAuthToken();
          if (!refreshed) {
            await this.clearAuth();
          }
        }
      }

      this.initialized = true;
      console.log('[AuthManager] Initialized', { isAuthenticated: this.isAuthenticated });

      return this.isAuthenticated;
    } catch (error) {
      console.error('[AuthManager] Init error:', error);
      this.initialized = true;
      return false;
    }
  }

  // Load auth state from storage
  async loadAuthState() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([
          'authToken',
          'refreshToken',
          'currentUser',
          'isAuthenticated'
        ]);

        this.token = result.authToken || null;
        this.refreshToken = result.refreshToken || null;
        this.currentUser = result.currentUser || null;
        this.isAuthenticated = !!result.authToken;
      } else {
        this.token = localStorage.getItem('authToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('currentUser');
        this.currentUser = userStr ? JSON.parse(userStr) : null;
        this.isAuthenticated = !!this.token;
      }
    } catch (error) {
      console.error('[AuthManager] Error loading auth state:', error);
    }
  }

  // Save auth state to storage
  async saveAuthState() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          authToken: this.token,
          refreshToken: this.refreshToken,
          currentUser: this.currentUser,
          isAuthenticated: this.isAuthenticated
        });
      } else {
        if (this.token) {
          localStorage.setItem('authToken', this.token);
          localStorage.setItem('refreshToken', this.refreshToken);
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('isAuthenticated');
        }
      }
    } catch (error) {
      console.error('[AuthManager] Error saving auth state:', error);
    }
  }

  // Verify current token
  async verifyToken() {
    if (!this.token) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.data;
        this.isAuthenticated = true;
        await this.saveAuthState();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AuthManager] Token verification failed:', error);
      return false;
    }
  }

  // Refresh auth token
  async refreshAuthToken() {
    if (!this.refreshToken) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.token = data.data.token;
        this.refreshToken = data.data.refreshToken;
        this.isAuthenticated = true;
        await this.saveAuthState();
        console.log('[AuthManager] Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AuthManager] Token refresh failed:', error);
      return false;
    }
  }

  // Clear auth state
  async clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.currentUser = null;
    this.isAuthenticated = false;
    await this.saveAuthState();
    console.log('[AuthManager] Auth cleared');
  }

  // Login
  async login(email, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      this.token = data.data.token;
      this.refreshToken = data.data.refreshToken;
      this.currentUser = data.data.user;
      this.isAuthenticated = true;

      await this.saveAuthState();

      // Reload user-specific data in other managers
      this.reloadUserData();

      console.log('[AuthManager] Login successful');
      return { success: true, user: this.currentUser };

    } catch (error) {
      console.error('[AuthManager] Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Register
  async register(email, password, firstName, lastName) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      this.token = data.data.token;
      this.refreshToken = data.data.refreshToken;
      this.currentUser = data.data.user;
      this.isAuthenticated = true;

      await this.saveAuthState();

      // Reload user-specific data in other managers
      this.reloadUserData();

      console.log('[AuthManager] Registration successful');
      return { success: true, user: this.currentUser };

    } catch (error) {
      console.error('[AuthManager] Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  // Reload user-specific data in other managers after login/register
  reloadUserData() {
    try {
      // Reload job tracker data for the new user
      if (window.jobTracker?.reloadForUser) {
        window.jobTracker.reloadForUser();
      }
      // Reload sync manager state
      if (window.syncManager) {
        window.syncManager.currentUserId = null;
        window.syncManager.loadLastSyncTime();
        window.syncManager.loadQueue();
      }
      // Reload notifications for the new user
      if (window.globalNotifications?.reloadForUser) {
        window.globalNotifications.reloadForUser();
      }
    } catch (error) {
      console.error('[AuthManager] Error reloading user data:', error);
    }
  }

  // Logout
  async logout() {
    try {
      if (this.token) {
        await fetch(`${this.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (error) {
      console.error('[AuthManager] Logout error:', error);
    }

    // Clear user-specific cached data from other managers
    // This prevents data leakage between users
    try {
      if (window.jobTracker?.clearUserData) {
        await window.jobTracker.clearUserData();
      }
      if (window.syncManager?.resetUserState) {
        window.syncManager.resetUserState();
      }
      if (window.globalNotifications?.clearUserData) {
        window.globalNotifications.clearUserData();
      }
    } catch (error) {
      console.error('[AuthManager] Error clearing user data:', error);
    }

    await this.clearAuth();
  }

  // Get current token
  getToken() {
    return this.token;
  }

  // Get current user
  getUser() {
    return this.currentUser;
  }

  // Get auth header for API requests
  getAuthHeader() {
    if (!this.token) return {};
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }

  // Make authenticated API request
  async apiRequest(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers
      }
    };

    try {
      let response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);

      // Handle token expiry
      if (response.status === 401) {
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
          response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
        } else {
          await this.clearAuth();
          this.redirectToLogin();
          throw new Error('Session expired');
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;

    } catch (error) {
      console.error('[AuthManager] API request error:', error);
      throw error;
    }
  }

  // Redirect to login page
  redirectToLogin(returnUrl = null) {
    const currentUrl = returnUrl || window.location.href;
    const loginUrl = chrome?.runtime?.getURL
      ? chrome.runtime.getURL('auth/login.html')
      : '../auth/login.html';

    window.location.href = `${loginUrl}?returnUrl=${encodeURIComponent(currentUrl)}`;
  }

  // Require authentication - call this at top of page
  async requireAuth() {
    await this.init();

    if (!this.isAuthenticated) {
      this.redirectToLogin();
      return false;
    }

    return true;
  }

  // Get current user
  getUser() {
    return this.currentUser;
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.currentUser) return 'User';
    return this.currentUser.fullName ||
           `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() ||
           this.currentUser.email?.split('@')[0] ||
           'User';
  }

  // Get user initials
  getUserInitials() {
    const name = this.getUserDisplayName();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Export
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
  window.authManager = authManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager };
}
