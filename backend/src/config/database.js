const mongoose = require('mongoose');
const config = require('./env');

let listenersAttached = false;

/**
 * Redacts credentials from MongoDB URI for safe logging
 * @param {string} uri
 * @returns {string} Redacted URI
 */
const getMaskedUri = (uri) => {
  try {
    return uri.replace(/\/\/(.*?)@/, '//***:***@');
  } catch {
    return '***';
  }
};

/**
 * Attaches Mongoose connection lifecycle listeners once (prevents listener duplication).
 */
const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected successfully.');
  });
};

/**
 * Connects to MongoDB Atlas / local MongoDB using Mongoose.
 * Reads connection string from process.env.MONGODB_URI (via config.MONGODB_URI).
 * Avoids creating duplicate connections.
 */
const connectDatabase = async () => {
  // If already connected (1), reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If currently connecting (2), await existing handshake instead of duplicating
  if (mongoose.connection.readyState === 2) {
    console.log('⏳ MongoDB connection already in progress, awaiting...');
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  const targetUri = process.env.MONGODB_URI?.trim() || config.MONGODB_URI;
  if (!targetUri) {
    throw new Error('MONGODB_URI is not configured');
  }

  try {
    mongoose.set('strictQuery', true);
    attachConnectionListeners();

    const conn = await mongoose.connect(targetUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 2
    });

    const host = conn.connection.host || 'atlas-cluster';
    const dbName = conn.connection.name || 'app360';

    console.log(`🍃 Connected to MongoDB: [${host}/${dbName}] (${getMaskedUri(targetUri)})`);

    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
  }
};

/**
 * Independently verifies live MongoDB connectivity via readyState and admin ping.
 * Ensures health checks never falsely report database connectivity when disconnected.
 * @returns {Promise<{ connected: boolean, readyState: number }>}
 */
const checkDatabaseHealth = async () => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1 || !mongoose.connection.db) {
    return { connected: false, readyState };
  }

  try {
    await mongoose.connection.db.admin().ping();
    return { connected: true, readyState };
  } catch {
    return { connected: false, readyState };
  }
};

/**
 * Disconnects from MongoDB gracefully during application shutdown
 */
const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      console.log('🍃 MongoDB connection closed gracefully.');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error.message);
    }
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth
};
