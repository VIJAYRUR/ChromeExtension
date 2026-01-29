/**
 * Shared Jobs API Client
 * Handles all job sharing API calls
 */

// Note: getAPIBaseURL() and getAuthToken() are defined in group-api.js
// which is loaded before this file in group-detail.html

const sharedJobsAPI = {
  /**
   * Share a job to a group
   * @param {string} groupId - Group ID
   * @param {Object} jobData - Job data to share
   * @returns {Promise<Object>} Shared job
   */
  async shareJob(groupId, jobData) {
    try {
      console.log('[Shared Jobs API] Sharing job to group:', groupId);
      console.log('[Shared Jobs API] Job data:', jobData);

      const token = await getAuthToken();
      console.log('[Shared Jobs API] Token obtained:', !!token);
      if (!token) throw new Error('Not authenticated');

      const baseUrl = getAPIBaseURL();
      const url = `${baseUrl}/groups/${groupId}/jobs`;
      console.log('[Shared Jobs API] Posting to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(jobData)
      });

      console.log('[Shared Jobs API] Share response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[Shared Jobs API] Share error response:', error);
        throw new Error(error.message || 'Failed to share job');
      }

      const result = await response.json();
      console.log('[Shared Jobs API] Share result:', result);
      return result.data || result;
    } catch (error) {
      console.error('[Shared Jobs API] Share job error:', error);
      throw error;
    }
  },

  /**
   * Get shared jobs in a group
   * @param {string} groupId - Group ID
   * @param {Object} filters - { page, limit, company, workType, sortBy }
   * @returns {Promise<Object>} { jobs, total, page, pages }
   */
  async getSharedJobs(groupId, filters = {}) {
    try {
      console.log('[Shared Jobs API] Getting shared jobs for group:', groupId);

      const token = await getAuthToken();
      console.log('[Shared Jobs API] Token obtained:', !!token);
      if (!token) throw new Error('Not authenticated');

      const baseUrl = getAPIBaseURL();
      console.log('[Shared Jobs API] Base URL:', baseUrl);

      const url = new URL(`${baseUrl}/groups/${groupId}/jobs`);
      Object.keys(filters).forEach(key => {
        if (filters[key]) url.searchParams.append(key, filters[key]);
      });

      console.log('[Shared Jobs API] Fetching from:', url.toString());

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[Shared Jobs API] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[Shared Jobs API] Error response:', error);
        throw new Error(error.message || 'Failed to fetch shared jobs');
      }

      const result = await response.json();
      console.log('[Shared Jobs API] Result:', result);
      console.log('[Shared Jobs API] Jobs count:', (result.data || result).length);
      return result.data || result;
    } catch (error) {
      console.error('[Shared Jobs API] Get shared jobs error:', error);
      throw error;
    }
  },

  /**
   * Get shared job details
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Shared job details
   */
  async getSharedJobDetails(groupId, jobId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch job details');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get shared job details error:', error);
      throw error;
    }
  },

  /**
   * Save shared job to personal tracker
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Saved job
   */
  async saveToMyJobs(groupId, jobId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save job');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Save to my jobs error:', error);
      throw error;
    }
  },

  /**
   * Mark shared job as applied
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Updated job
   */
  async markAsApplied(groupId, jobId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark as applied');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Mark as applied error:', error);
      throw error;
    }
  },

  /**
   * Add reaction to shared job
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @param {string} reactionType - Reaction type (upvote, downvote, fire, heart)
   * @returns {Promise<Object>} Updated job
   */
  async addReaction(groupId, jobId, reactionType) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reactionType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add reaction');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Add reaction error:', error);
      throw error;
    }
  },

  /**
   * Add comment to shared job
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @param {string} content - Comment content
   * @param {string} replyTo - Optional comment ID to reply to
   * @returns {Promise<Object>} Created comment
   */
  async addComment(groupId, jobId, content, replyTo = null) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const body = { content };
      if (replyTo) body.replyTo = replyTo;

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add comment');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Add comment error:', error);
      throw error;
    }
  },

  /**
   * Edit comment
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @param {string} commentId - Comment ID
   * @param {string} content - New content
   * @returns {Promise<Object>} Updated comment
   */
  async editComment(groupId, jobId, commentId, content) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to edit comment');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Edit comment error:', error);
      throw error;
    }
  },

  /**
   * Delete comment
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object>} Success message
   */
  async deleteComment(groupId, jobId, commentId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete comment');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  /**
   * Delete shared job
   * @param {string} groupId - Group ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Success message
   */
  async deleteSharedJob(groupId, jobId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete shared job');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Delete shared job error:', error);
      throw error;
    }
  }
};

// Expose to window for global access
if (typeof window !== 'undefined') {
  window.sharedJobsAPI = sharedJobsAPI;
  console.log('[Shared Jobs API] ✅ Exposed to window.sharedJobsAPI');
}
