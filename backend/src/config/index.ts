import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().default('postgres://mika_api:postgres@localhost:5432/mika'),
  SESSION_SECRET: z.string().min(16).default('mika_secure_session_secret_change_me_in_production_key_12345'),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_MAX_AGE_MS: z.coerce.number().int().positive().default(8 * 60 * 60 * 1000),
  ALLOW_PLAYER_TRANSFERS: z.enum(['true', 'false']).default('false'),

  // SoftSwiss Game Aggregator v2 config
  SOFTSWISS_CASINO_ID: z.string().default(''),
  SOFTSWISS_AUTH_TOKEN: z.string().default(''),
  SOFTSWISS_SECRET_SIGN_KEY: z.string().default(''),
  SOFTSWISS_ENVIRONMENT: z.string().default('stage'),
  SOFTSWISS_STAGE_GATEWAY_URL: z.string().default('https://stage.game-aggregator.com/api/v2'),
  SOFTSWISS_PROD_GATEWAY_URL: z.string().default('https://api.game-aggregator.com/api/v2')
});

export const config = schema.parse(process.env);
export const isProduction = config.NODE_ENV === 'production';
