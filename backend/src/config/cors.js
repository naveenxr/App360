const config = require('./env');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      config.CLIENT_URL,
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    if (allowedOrigins.includes(origin) || config.NODE_ENV === 'development') {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = corsOptions;
