/**
 * Group API Client
 * Handles all group-related API calls
 */

// Get API base URL from config
const getAPIBaseURL = () => {
  if (typeof window !== 'undefined' && window.API_CONFIG) {
    return window.API_CONFIG.API_URL;
  }
  return 'https://job-tracker-api-j7ef.onrender.com/api'; // Fallback
};

// Get auth token from Chrome storage or localStorage
const getAuthToken = async () => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['authToken']);
      return result.authToken || null;
    } else {
      return localStorage.getItem('authToken');
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

const groupAPI = {
  /**
   * Create a new group
   * @param {Object} groupData - { name, description, type, settings }
   * @returns {Promise<Object>} Created group with invite code
   */
  async createGroup(groupData) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create group');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Create group error:', error);
      throw error;
    }
  },

  /**
   * Get user's groups
   * @returns {Promise<Array>} List of groups user is a member of
   */
  async getMyGroups() {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch groups');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get my groups error:', error);
      throw error;
    }
  },

  /**
   * Get public groups (for discovery)
   * @param {string} search - Optional search query
   * @returns {Promise<Array>} List of public groups
   */
  async getPublicGroups(search = '') {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const url = new URL(`${getAPIBaseURL()}/groups`);
      if (search) url.searchParams.append('search', search);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch public groups');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get public groups error:', error);
      throw error;
    }
  },

  /**
   * Get group details
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Group details
   */
  async getGroupDetails(groupId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch group details');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get group details error:', error);
      throw error;
    }
  },

  /**
   * Join a group
   * @param {string} groupId - Group ID
   * @param {string} inviteCode - Invite code (required for private groups)
   * @returns {Promise<Object>} Updated group
   */
  async joinGroup(groupId, inviteCode = null) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const body = {};
      if (inviteCode) body.inviteCode = inviteCode;

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join group');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Join group error:', error);
      throw error;
    }
  },

  /**
   * Leave a group
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Success message
   */
  async leaveGroup(groupId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to leave group');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Leave group error:', error);
      throw error;
    }
  },

  /**
   * Update group (admin only)
   * @param {string} groupId - Group ID
   * @param {Object} updates - { name, description, settings }
   * @returns {Promise<Object>} Updated group
   */
  async updateGroup(groupId, updates) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update group');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Update group error:', error);
      throw error;
    }
  },

  /**
   * Delete group (admin only)
   * @param {string} groupId - Group ID
   * @returns {Promise<Object>} Success message
   */
  async deleteGroup(groupId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete group');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Delete group error:', error);
      throw error;
    }
  },

  /**
   * Get group members
   * @param {string} groupId - Group ID
   * @returns {Promise<Array>} List of members
   */
  async getMembers(groupId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch members');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Get members error:', error);
      throw error;
    }
  },

  /**
   * Update member role (admin only)
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @param {string} role - New role (admin, moderator, member)
   * @returns {Promise<Object>} Updated member
   */
  async updateMemberRole(groupId, userId, role) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update member role');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Update member role error:', error);
      throw error;
    }
  },

  /**
   * Remove member (admin/moderator only)
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success message
   */
  async removeMember(groupId, userId) {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${getAPIBaseURL()}/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Remove member error:', error);
      throw error;
    }
  }
};

// Expose to window for global access
if (typeof window !== 'undefined') {
  window.groupAPI = groupAPI;
  console.log('[Group API] ✅ Exposed to window.groupAPI');
}

// Note: sharedJobsAPI is now defined in shared/shared-jobs-api.js
// which should be loaded after this file

