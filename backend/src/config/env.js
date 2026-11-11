const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z
    .string()
    .optional()
    .transform((val) => val || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/app360'),
  JWT_SECRET: z.string().default('super_secret_app360_jwt_token_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  BCRYPT_SALT_ROUNDS: z.string().default('12').transform((val) => parseInt(val, 10)),
  CLIENT_URL: z.string().default('http://localhost:3000'),
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

module.exports = parsedEnv.data;
