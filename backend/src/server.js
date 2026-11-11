const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 App360 Backend running in [${config.NODE_ENV}] mode`);
  console.log(`📡 Server listening on: http://localhost:${config.PORT}`);
  console.log(`🏥 Health check endpoint: http://localhost:${config.PORT}/api/health`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down App360 HTTP server...`);
  server.close(() => {
    console.log('✅ App360 HTTP server closed successfully.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes longer than 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully terminating.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception thrown:', error);
  process.exit(1);
});

module.exports = server;
