const mongoose = require('mongoose');
const config = require('./env');

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
 * Connects to MongoDB Atlas / local MongoDB using Mongoose.
 * Avoids creating duplicate connections.
 */
const connectDatabase = async () => {
  // If already connected (1) or connecting (2), return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    console.log('⏳ MongoDB connection already in progress, awaiting...');
    return mongoose.connection;
  }

  try {
    mongoose.set('strictQuery', true);

    const targetUri = config.MONGO_URI;

    const conn = await mongoose.connect(targetUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });

    const host = conn.connection.host || 'localhost';
    const dbName = conn.connection.name || 'app360';

    console.log(`🍃 Connected to MongoDB: [${host}/${dbName}] (${getMaskedUri(targetUri)})`);

    // Attach runtime event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully.');
    });

    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    throw error;
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
  disconnectDatabase
};
