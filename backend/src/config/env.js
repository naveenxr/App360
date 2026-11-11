const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

// Load environment variables from .env file in development / when present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_DEV_JWT_SECRET = 'super_secret_app360_jwt_token_key_change_in_production';

const envSchema = z.object({
  X_ZOHO_CATALYST_LISTEN_PORT: z.string().optional(),
  PORT: z.string().optional(),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  MONGO_URI: z.string().optional(),
  JWT_SECRET: z.string().default(DEFAULT_DEV_JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('1d'),
  BCRYPT_SALT_ROUNDS: z.string().default('12').transform((val) => parseInt(val, 10)),
  FRONTEND_URL: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional().default(''),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().default('1000').transform((val) => parseInt(val, 10)),
  ADMIN_EMAIL: z.string().default('admin@app360.internal'),
  ADMIN_PASSWORD: z.string().default('Admin@360!'),
  ADMIN_NAME: z.string().default('System Administrator'),
  INGESTION_CRON: z.string().default('*/1 * * * *'),
  INGESTION_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment configuration validation failed:', parsedEnv.error.format());
  process.exit(1);
}

const resolvedPortRaw =
  parsedEnv.data.X_ZOHO_CATALYST_LISTEN_PORT ||
  parsedEnv.data.PORT ||
  '9000';

const resolvedPort = parseInt(resolvedPortRaw, 10);
if (Number.isNaN(resolvedPort) || resolvedPort <= 0 || resolvedPort > 65535) {
  console.error(`❌ Invalid server port configuration: "${resolvedPortRaw}"`);
  process.exit(1);
}

const isProduction = parsedEnv.data.NODE_ENV === 'production';

// Read database URI exclusively from process.env.MONGODB_URI in production (fallback only in local dev/test)
const resolvedMongoUri =
  parsedEnv.data.MONGODB_URI?.trim() ||
  (!isProduction ? parsedEnv.data.MONGO_URI?.trim() || 'mongodb://127.0.0.1:27017/app360' : '');

if (isProduction && !resolvedMongoUri) {
  console.error('❌ MONGODB_URI environment variable is required in production. Configure your MongoDB Atlas URI in Catalyst AppSail.');
  process.exit(1);
}

const config = {
  ...parsedEnv.data,
  PORT: resolvedPort,
  MONGODB_URI: resolvedMongoUri,
  MONGO_URI: resolvedMongoUri,
  FRONTEND_URL: parsedEnv.data.FRONTEND_URL || parsedEnv.data.CLIENT_URL
};

if (isProduction) {
  if (config.JWT_SECRET === DEFAULT_DEV_JWT_SECRET || config.JWT_SECRET.length < 32) {
    console.warn('⚠️ [Security] JWT_SECRET is using a weak or default value in production. Set a strong 32+ char JWT_SECRET in AppSail environment variables.');
  }
  if (/127\.0\.0\.1|localhost/.test(config.MONGODB_URI)) {
    console.warn('⚠️ [Database] MONGODB_URI points to localhost in production. Configure MongoDB Atlas URI via MONGODB_URI environment variable.');
  }
}

module.exports = config;
