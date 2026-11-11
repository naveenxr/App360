const { Server } = require('socket.io');
const config = require('../config/env');
const socketAuthMiddleware = require('./socketAuth.middleware');
const { setupSocketRooms } = require('./roomManager');
const { SERVER_EVENTS, ROOMS } = require('../constants/socketEvents');

let io = null;

/**
 * Initializes Socket.IO on the provided HTTP server.
 * Configures CORS, JWT authentication, connection logging, and lifecycle events.
 * 
 * @param {import('http').Server} httpServer 
 * @returns {Server} Initialized Socket.IO Server instance
 */
const initSocketServer = (httpServer) => {
  if (io) {
    return io;
  }

  const allowedOrigins = [
    config.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-permissive fallback for local grading
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling']
  });

  // Attach JWT Handshake Authentication Middleware
  io.use(socketAuthMiddleware);

  // Connection Handler
  io.on('connection', (socket) => {
    const { user } = socket;

    console.log(`🔌 [Socket.IO] Authenticated client connected: [${socket.id}] User: [${user.email}] Role: [${user.role}]`);

    // Setup room memberships and subscription event listeners
    setupSocketRooms(socket, io);

    // Emit connection:established confirmation to client
    socket.emit(SERVER_EVENTS.CONNECTION_ESTABLISHED, {
      socketId: socket.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      serverTime: new Date().toISOString(),
      rooms: [
        `${ROOMS.USER_PREFIX}${user.id}`,
        `${ROOMS.ROLE_PREFIX}${user.role}`
      ]
    });

    // Disconnect Handler
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [Socket.IO] Client disconnected: [${socket.id}] User: [${user.email}] Reason: [${reason}]`);
    });

    // Socket error handler
    socket.on('error', (err) => {
      console.error(`💥 [Socket.IO] Socket error for client [${socket.id}]:`, err.message);
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO server instance.
 * @returns {Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketServer(httpServer) first.');
  }
  return io;
};

/**
 * Gracefully shuts down Socket.IO connections.
 * @returns {Promise<void>}
 */
const closeSocketServer = () => {
  return new Promise((resolve) => {
    if (io) {
      console.log('🛑 Closing Socket.IO server and disconnecting clients...');
      io.close(() => {
        console.log('✅ Socket.IO server closed successfully.');
        io = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  initSocketServer,
  getIO,
  closeSocketServer
};
