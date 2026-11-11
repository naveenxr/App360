const app = require('./app');
const config = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { seedRoles } = require('./utils/seedRoles');
const { seedUsers } = require('./utils/seedUsers');
const { seedTopology } = require('./utils/seedTopology');
const correlationService = require('./services/correlationService');
const { startIngestionJob, stopIngestionJob } = require('./jobs/ingestion.job');

let server;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Idempotently seed default system roles (ADMIN, ENGINEER, VIEWER)
    await seedRoles();

    // 3. Seed system users (Admin, Engineer, Viewer)
    await seedUsers();

    // 4. Seed network topology sites and devices
    await seedTopology();

    // 5. Correlate any unlinked historical alarms
    const unlinkedResult = await correlationService.processUnlinkedAlarms();
    if (unlinkedResult.processedCount > 0) {
      console.log(`🔗 Correlated ${unlinkedResult.processedCount} unlinked alarms on startup (${unlinkedResult.createdCount} events created, ${unlinkedResult.updatedCount} updated).`);
    }

    // 6. Start periodic background ingestion scheduler
    startIngestionJob();

    // 7. Start HTTP listener
    server = app.listen(config.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 App360 Backend running in [${config.NODE_ENV}] mode`);
      console.log(`📡 Server listening on: http://localhost:${config.PORT}`);
      console.log(`🏥 Health check endpoint: http://localhost:${config.PORT}/api/health`);
      console.log(`🔐 Auth API base: http://localhost:${config.PORT}/api/auth`);
      console.log(`📥 Ingestion API base: http://localhost:${config.PORT}/api/ingestion`);
      console.log(`🚨 Alarms API base: http://localhost:${config.PORT}/api/alarms`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('💥 Fatal error during server startup:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully shutting down App360 HTTP server...`);
  stopIngestionJob();

  if (server) {
    server.close(async () => {
      console.log('✅ App360 HTTP server closed successfully.');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force close if graceful shutdown takes longer than 10 seconds
    setTimeout(() => {
      console.error('⚠️ Could not close connections in time, forcefully terminating.');
      process.exit(1);
    }, 10000);
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
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

startServer();

module.exports = { app, startServer };
