// API Client for Job Tracker Backend
// Handles all communication with the MongoDB-backed API server

class APIClient {
  constructor() {
    // Get API URL from config
    this.baseUrl = (typeof window !== 'undefined' && window.API_CONFIG)
      ? window.API_CONFIG.API_URL
      : 'https://job-tracker-api-j7ef.onrender.com/api';
    this.token = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];

    // Load tokens from storage on init
    this.loadTokens();
  }

  // ==================== Token Management ====================

  async loadTokens() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['authToken', 'refreshToken']);
        this.token = result.authToken || null;
        this.refreshToken = result.refreshToken || null;
      } else {
        this.token = localStorage.getItem('authToken');
        this.refreshToken = localStorage.getItem('refreshToken');
      }
    } catch (error) {
      console.error('[API Client] Error loading tokens:', error);
    }
  }

  async saveTokens(token, refreshToken) {
    this.token = token;
    this.refreshToken = refreshToken;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ authToken: token, refreshToken });
      } else {
        localStorage.setItem('authToken', token);
        localStorage.setItem('refreshToken', refreshToken);
      }
    } catch (error) {
      console.error('[API Client] Error saving tokens:', error);
    }
  }

  async clearTokens() {
    this.token = null;
    this.refreshToken = null;

    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['authToken', 'refreshToken']);
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('[API Client] Error clearing tokens:', error);
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  async getToken() {
    // Ensure tokens are loaded
    if (!this.token) {
      await this.loadTokens();
    }
    return this.token;
  }

  // ==================== HTTP Methods ====================

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth token if available
    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);

      // Handle token expiry
      if (response.status === 401 && this.refreshToken) {
        const newToken = await this.handleTokenRefresh();
        if (newToken) {
          config.headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, config).then(res => this.handleResponse(res));
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('[API Client] Request error:', error);
      throw new Error(error.message || 'Network error');
    }
  }

  async handleResponse(response) {
    const data = await response.json();

    if (!response.ok) {
      // Log full error details for debugging
      console.error('[API Client] Response error:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      });
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  async handleTokenRefresh() {
    if (this.isRefreshing) {
      // Wait for the refresh to complete
      return new Promise(resolve => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await this.saveTokens(data.data.token, data.data.refreshToken);

        // Notify all subscribers
        this.refreshSubscribers.forEach(callback => callback(data.data.token));
        this.refreshSubscribers = [];

        return data.data.token;
      } else {
        // Refresh failed, clear tokens
        await this.clearTokens();
        return null;
      }
    } catch (error) {
      await this.clearTokens();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  // ==================== Auth Endpoints ====================

  async register(email, password, firstName = '', lastName = '') {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName })
    });

    if (response.success) {
      await this.saveTokens(response.data.token, response.data.refreshToken);
    }

    return response;
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success) {
      await this.saveTokens(response.data.token, response.data.refreshToken);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors, still clear tokens
    }
    await this.clearTokens();
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // ==================== Profile Endpoints ====================

  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async syncProfile(profileData) {
    return this.request('/users/profile/sync', {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
  }

  async updateSettings(settings) {
    return this.request('/users/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Experience
  async addExperience(experience) {
    return this.request('/users/profile/experience', {
      method: 'POST',
      body: JSON.stringify(experience)
    });
  }

  async updateExperience(expId, experience) {
    return this.request(`/users/profile/experience/${expId}`, {
      method: 'PUT',
      body: JSON.stringify(experience)
    });
  }

  async deleteExperience(expId) {
    return this.request(`/users/profile/experience/${expId}`, {
      method: 'DELETE'
    });
  }

  // Education
  async addEducation(education) {
    return this.request('/users/profile/education', {
      method: 'POST',
      body: JSON.stringify(education)
    });
  }

  async updateEducation(eduId, education) {
    return this.request(`/users/profile/education/${eduId}`, {
      method: 'PUT',
      body: JSON.stringify(education)
    });
  }

  async deleteEducation(eduId) {
    return this.request(`/users/profile/education/${eduId}`, {
      method: 'DELETE'
    });
  }

  // ==================== Job Endpoints ====================

  async getJobs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';
    return this.request(endpoint);
  }

  async getJob(id) {
    return this.request(`/jobs/${id}`);
  }

  async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }

  async updateJob(id, jobData) {
    return this.request(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
  }

  async updateJobStatus(id, status, note = '') {
    return this.request(`/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note })
    });
  }

  async deleteJob(id) {
    return this.request(`/jobs/${id}`, {
      method: 'DELETE'
    });
  }

  async bulkDeleteJobs(jobIds) {
    return this.request('/jobs/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ jobIds })
    });
  }

  async bulkUpdateStatus(jobIds, status) {
    return this.request('/jobs/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ jobIds, status })
    });
  }

  async addNote(jobId, note) {
    return this.request(`/jobs/${jobId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  async addInterview(jobId, interview) {
    return this.request(`/jobs/${jobId}/interviews`, {
      method: 'POST',
      body: JSON.stringify(interview)
    });
  }

  async updateInterview(jobId, interviewId, interview) {
    return this.request(`/jobs/${jobId}/interviews/${interviewId}`, {
      method: 'PUT',
      body: JSON.stringify(interview)
    });
  }

  async getStats() {
    return this.request('/jobs/stats');
  }

  async syncJobs(jobs) {
    return this.request('/jobs/sync', {
      method: 'POST',
      body: JSON.stringify({ jobs })
    });
  }

  async findDuplicates() {
    return this.request('/jobs/duplicates');
  }

  // ==================== Health Check ====================

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
if (typeof window !== 'undefined') {
  window.APIClient = APIClient;
  window.apiClient = new APIClient();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}
