const config = require('./env');

const PRODUCTION_FRONTEND_ORIGIN = 'https://app360.onslate.in';

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return '';
  return origin.trim().replace(/\/+$/, '');
};

const getAllowedOrigins = () => {
  const configured = [config.FRONTEND_URL, config.CLIENT_URL, config.CORS_ORIGINS]
    .filter(Boolean)
    .flatMap((entry) => entry.split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(
    new Set([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      PRODUCTION_FRONTEND_ORIGIN,
      ...configured
    ])
  );
};

const isOriginAllowed = (origin) => {
  // Allow requests with no origin (server-to-server, curl, Catalyst health probes)
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  // Allow local development loopbacks only in development/test
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
      return true;
    }
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204
};

module.exports = corsOptions;
module.exports.corsOptions = corsOptions;
module.exports.getAllowedOrigins = getAllowedOrigins;
module.exports.isOriginAllowed = isOriginAllowed;
