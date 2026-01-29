const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Group = require('../models/Group');

// Store active connections: { userId: [socketId1, socketId2, ...] }
const activeConnections = new Map();

// Store user's current group rooms: { userId: [groupId1, groupId2, ...] }
const userGroupRooms = new Map();

/**
 * Initialize Socket.io server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
function initializeSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow Chrome extensions
        if (!origin || origin.startsWith('chrome-extension://')) {
          return callback(null, true);
        }
        
        // Allow configured origins
        const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
        if (allowedOrigins.some(allowed => origin.includes(allowed.trim()))) {
          return callback(null, true);
        }
        
        // Development mode
        if (process.env.NODE_ENV === 'development') {
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
          }
        }
        
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.userEmail = user.email;
      socket.userName = `${user.firstName} ${user.lastName}`;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    
    console.log(`✅ User connected: ${socket.userName} (${userId})`);
    
    // Track active connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, []);
    }
    activeConnections.get(userId).push(socket.id);
    
    // Initialize user's group rooms
    if (!userGroupRooms.has(userId)) {
      userGroupRooms.set(userId, []);
    }

    // Join user's personal room (for direct notifications)
    socket.join(`user:${userId}`);
    
    // Emit connection success
    socket.emit('connected', {
      message: 'Connected to chat server',
      userId,
      userName: socket.userName
    });

    // Handle joining a group room
    socket.on('join-group', async (data) => {
      try {
        const { groupId } = data;
        
        // Verify user is member of the group
        const group = await Group.findById(groupId);
        
        if (!group) {
          socket.emit('error', { message: 'Group not found' });
          return;
        }
        
        if (!group.isMember(userId)) {
          socket.emit('error', { message: 'You are not a member of this group' });
          return;
        }
        
        // Join the group room
        socket.join(`group:${groupId}`);
        
        // Track user's group rooms
        const userRooms = userGroupRooms.get(userId);
        if (!userRooms.includes(groupId)) {
          userRooms.push(groupId);
        }
        
        console.log(`📥 ${socket.userName} joined group: ${group.name}`);
        
        // Notify user
        socket.emit('joined-group', {
          groupId,
          groupName: group.name,
          message: `Joined group: ${group.name}`
        });
        
        // Notify other members in the group
        socket.to(`group:${groupId}`).emit('user-joined', {
          userId,
          userName: socket.userName,
          groupId
        });
        
      } catch (error) {
        console.error('Join group error:', error);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    // Handle leaving a group room
    socket.on('leave-group', (data) => {
      const { groupId } = data;
      
      socket.leave(`group:${groupId}`);
      
      // Remove from user's group rooms
      const userRooms = userGroupRooms.get(userId);
      const index = userRooms.indexOf(groupId);
      if (index > -1) {
        userRooms.splice(index, 1);
      }
      
      console.log(`📤 ${socket.userName} left group: ${groupId}`);
      
      // Notify user
      socket.emit('left-group', { groupId });
      
      // Notify other members
      socket.to(`group:${groupId}`).emit('user-left', {
        userId,
        userName: socket.userName,
        groupId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userName} (${userId})`);
      
      // Remove from active connections
      const connections = activeConnections.get(userId);
      if (connections) {
        const index = connections.indexOf(socket.id);
        if (index > -1) {
          connections.splice(index, 1);
        }
        
        // If no more connections, remove user entirely
        if (connections.length === 0) {
          activeConnections.delete(userId);
          userGroupRooms.delete(userId);
        }
      }
    });
  });

  // Attach helper functions to io instance
  io.activeConnections = activeConnections;
  io.userGroupRooms = userGroupRooms;

  return io;
}

module.exports = { initializeSocketServer };

