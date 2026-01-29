/**
 * Socket.io Client Wrapper
 * Handles real-time WebSocket communication with the backend
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventHandlers = new Map();
    
    // Get WebSocket URL from config
    this.getSocketURL();
  }

  /**
   * Get Socket.io server URL from config
   */
  getSocketURL() {
    const apiUrl = (typeof window !== 'undefined' && window.API_CONFIG)
      ? window.API_CONFIG.API_URL
      : 'https://job-tracker-api-j7ef.onrender.com/api';
    
    // Remove /api suffix and get base URL
    this.socketURL = apiUrl.replace('/api', '');
    console.log('[Socket Client] Socket URL:', this.socketURL);
  }

  /**
   * Connect to Socket.io server
   * @param {string} token - JWT authentication token
   */
  async connect(token) {
    if (this.isConnected) {
      console.log('[Socket Client] Already connected');
      return;
    }

    if (!token) {
      console.error('[Socket Client] No authentication token provided');
      return;
    }

    try {
      console.log('[Socket Client] Connecting to:', this.socketURL);

      // Initialize Socket.io connection
      this.socket = io(this.socketURL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      // Connection event handlers
      this.socket.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('[Socket Client] ✅ Connected to chat server');
        this.emit('socket-connected');
      });

      this.socket.on('connected', (data) => {
        console.log('[Socket Client] Server confirmed connection:', data.message);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        console.log('[Socket Client] ❌ Disconnected:', reason);
        this.emit('socket-disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket Client] Connection error:', error.message);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[Socket Client] Max reconnection attempts reached');
          this.emit('socket-error', { error: 'Failed to connect after multiple attempts' });
        }
      });

      this.socket.on('error', (error) => {
        console.error('[Socket Client] Socket error:', error);
        this.emit('socket-error', { error });
      });

      // Register default event listeners
      this.registerDefaultListeners();

    } catch (error) {
      console.error('[Socket Client] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Register default event listeners for common events
   */
  registerDefaultListeners() {
    // Chat events
    this.socket.on('new-message', (data) => {
      console.log('[Socket Client] New message received:', data);
      this.emit('new-message', data);
    });

    this.socket.on('message-edited', (data) => {
      console.log('[Socket Client] Message edited:', data);
      this.emit('message-edited', data);
    });

    this.socket.on('message-deleted', (data) => {
      console.log('[Socket Client] Message deleted:', data);
      this.emit('message-deleted', data);
    });

    this.socket.on('message-reaction-added', (data) => {
      console.log('[Socket Client] Reaction added:', data);
      this.emit('message-reaction-added', data);
    });

    this.socket.on('message-reaction-removed', (data) => {
      console.log('[Socket Client] Reaction removed:', data);
      this.emit('message-reaction-removed', data);
    });

    this.socket.on('user-typing', (data) => {
      this.emit('user-typing', data);
    });

    this.socket.on('user-stopped-typing', (data) => {
      this.emit('user-stopped-typing', data);
    });

    // Group events
    this.socket.on('job-shared', (data) => {
      console.log('[Socket Client] Job shared:', data);
      this.emit('job-shared', data);
    });

    this.socket.on('job-saved', (data) => {
      console.log('[Socket Client] Job saved:', data);
      this.emit('job-saved', data);
    });

    this.socket.on('job-application', (data) => {
      console.log('[Socket Client] Job application:', data);
      this.emit('job-application', data);
    });

    this.socket.on('comment-added', (data) => {
      console.log('[Socket Client] Comment added:', data);
      this.emit('comment-added', data);
    });

    this.socket.on('reaction-added', (data) => {
      console.log('[Socket Client] Reaction added to job:', data);
      this.emit('reaction-added', data);
    });

    this.socket.on('member-joined', (data) => {
      console.log('[Socket Client] Member joined:', data);
      this.emit('member-joined', data);
    });

    this.socket.on('member-left', (data) => {
      console.log('[Socket Client] Member left:', data);
      this.emit('member-left', data);
    });

    this.socket.on('group-updated', (data) => {
      console.log('[Socket Client] Group updated:', data);
      this.emit('group-updated', data);
    });

    this.socket.on('mention-notification', (data) => {
      console.log('[Socket Client] Mentioned in message:', data);
      this.emit('mention-notification', data);
    });

    // Error events from backend
    this.socket.on('error', (data) => {
      console.error('[Socket Client] Backend error:', data);
      this.emit('socket-error', data);
    });
  }

  /**
   * Join a group room
   * @param {string} groupId - Group ID to join
   */
  joinGroup(groupId) {
    if (!this.isConnected || !this.socket) {
      console.error('[Socket Client] Not connected');
      return;
    }

    console.log('[Socket Client] Joining group:', groupId);
    this.socket.emit('join-group', { groupId });

    // Listen for join confirmation
    this.socket.once('joined-group', (data) => {
      console.log('[Socket Client] ✅ Joined group:', data.groupName);
      this.emit('joined-group', data);
    });
  }

  /**
   * Leave a group room
   * @param {string} groupId - Group ID to leave
   */
  leaveGroup(groupId) {
    if (!this.isConnected || !this.socket) {
      console.error('[Socket Client] Not connected');
      return;
    }

    console.log('[Socket Client] Leaving group:', groupId);
    this.socket.emit('leave-group', { groupId });
  }

  /**
   * Send a chat message
   * @param {string} groupId - Group ID
   * @param {object} messageData - Message data (content, messageType, mentions, etc.)
   */
  sendMessage(groupId, messageData) {
    if (!this.isConnected || !this.socket) {
      console.error('[Socket Client] Not connected');
      return;
    }

    console.log('[Socket Client] Sending message to group:', groupId);
    this.socket.emit('send-message', {
      groupId,
      ...messageData
    });
  }

  /**
   * Emit typing indicator
   * @param {string} groupId - Group ID
   */
  startTyping(groupId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('typing-start', { groupId });
  }

  /**
   * Stop typing indicator
   * @param {string} groupId - Group ID
   */
  stopTyping(groupId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('typing-stop', { groupId });
  }

  /**
   * Add reaction to message
   * @param {string} messageId - Message ID
   * @param {string} reactionType - Reaction type (thumbsUp, heart, fire, laugh)
   * @param {string} groupId - Group ID
   */
  addReaction(messageId, reactionType, groupId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('add-reaction', { messageId, reactionType, groupId });
  }

  /**
   * Remove reaction from message
   * @param {string} messageId - Message ID
   * @param {string} reactionType - Reaction type
   * @param {string} groupId - Group ID
   */
  removeReaction(messageId, reactionType, groupId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('remove-reaction', { messageId, reactionType, groupId });
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  /**
   * Unregister event handler
   * @param {string} event - Event name
   * @param {function} handler - Event handler function
   */
  off(event, handler) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Emit event to registered handlers
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[Socket Client] Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log('[Socket Client] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  connected() {
    return this.isConnected && this.socket && this.socket.connected;
  }
}

// Create singleton instance
const socketClient = new SocketClient();

// Make it available globally
if (typeof window !== 'undefined') {
  window.socketClient = socketClient;
}

