const mongoose = require('mongoose');

// Main connection for production data (users, jobs, etc.)
let mainConnection = null;

// Separate connection for groups/chat (local MongoDB, later migrated to cloud)
let chatConnection = null;

// Validate that required environment variables are set
const validateDbConfig = () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is required');
    return false;
  }
  return true;
};

// Only create a separate chat connection if MONGODB_CHAT_URI is set AND different from MONGODB_URI
// If not set or same as MONGODB_URI, all data goes to production MongoDB
const shouldUseSeparateChatDB = process.env.MONGODB_CHAT_URI &&
  process.env.MONGODB_CHAT_URI !== process.env.MONGODB_URI;

if (shouldUseSeparateChatDB) {
  chatConnection = mongoose.createConnection(process.env.MONGODB_CHAT_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  chatConnection.on('connected', () => {
    console.log(`✅ MongoDB (Separate Chat DB) Connected: ${chatConnection.host}`);
  });

  chatConnection.on('error', (err) => {
    console.error('MongoDB (Chat DB) connection error:', err.message);
  });

  chatConnection.on('disconnected', () => {
    console.log('MongoDB (Chat DB) disconnected');
  });
}

const connectDB = async () => {
  // Validate environment configuration
  if (!validateDbConfig()) {
    console.error('❌ Database configuration validation failed');
    process.exit(1);
  }

  try {
    // Connect to PRODUCTION MongoDB (Atlas) for main data
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    mainConnection = conn.connection;
    console.log(`✅ MongoDB (Production) Connected: ${conn.connection.host}`);

    // Handle connection events for main connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB (Production) connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB (Production) disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB (Production) reconnected');
    });

    // Log chat connection status
    if (chatConnection && chatConnection.readyState === 1) {
      console.log(`✅ MongoDB (Separate Chat DB) Ready for group features`);
    } else {
      console.log(`✅ Using production MongoDB for all data (groups, chat, jobs)`);
    }

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      if (chatConnection) {
        await chatConnection.close();
      }
      console.log('MongoDB connections closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Get the chat connection (falls back to main connection if local not available)
const getChatConnection = () => {
  return chatConnection || mongoose.connection;
};

// Get the main connection
const getMainConnection = () => {
  return mainConnection || mongoose.connection;
};

module.exports = { connectDB, getChatConnection, getMainConnection, validateDbConfig };
