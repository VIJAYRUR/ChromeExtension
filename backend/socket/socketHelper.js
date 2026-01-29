/**
 * Socket.io Helper
 * Provides access to Socket.io instance from controllers
 */

let ioInstance = null;

/**
 * Set the Socket.io instance
 * Called from server.js after initialization
 */
function setSocketIO(io) {
  ioInstance = io;
}

/**
 * Get the Socket.io instance
 * Used in controllers to emit events
 */
function getSocketIO() {
  return ioInstance;
}

/**
 * Emit event to a specific group room
 */
function emitToGroup(groupId, eventName, data) {
  if (ioInstance) {
    ioInstance.to(`group:${groupId}`).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  }
}

/**
 * Emit event to a specific user
 */
function emitToUser(userId, eventName, data) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  }
}

/**
 * Emit event to all connected clients
 */
function emitToAll(eventName, data) {
  if (ioInstance) {
    ioInstance.emit(eventName, {
      ...data,
      timestamp: new Date()
    });
  }
}

/**
 * Check if Socket.io is initialized
 */
function isSocketIOReady() {
  return ioInstance !== null;
}

module.exports = {
  setSocketIO,
  getSocketIO,
  emitToGroup,
  emitToUser,
  emitToAll,
  isSocketIOReady
};

