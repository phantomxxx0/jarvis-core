import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce.number().default(4000),

  APP_NAME: z.string().default('Jarvis Core'),

  APP_VERSION: z.string().default('0.1.0'),

  // ==========================
  // Access Token
  // ==========================
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),

  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),

  // ==========================
  // Refresh Token
  // ==========================
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // ==========================
  // Rate Limiting
  // ==========================
  THROTTLE_TTL: z.coerce.number().default(60000),

  THROTTLE_LIMIT: z.coerce.number().default(5),

  // ==========================
  // Security / Auth Lockout
  // ==========================
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().default(5),

  AUTH_LOCKOUT_DURATION_MINS: z.coerce.number().default(15),

  // ==========================
  // API Gateway
  // ==========================
  JARVIS_API_KEY: z.string().min(8).optional(),

  // ==========================
  // Ollama
  // ==========================
  OLLAMA_BASE_URL: z.string().url(),

  OLLAMA_CHAT_MODEL: z.string().min(1),

  OLLAMA_EMBED_MODEL: z.string().min(1),

  OLLAMA_REASON_MODEL: z.string().min(1),

  OLLAMA_TIMEOUT_MS: z.coerce.number().default(60000),

  // ==========================
  // Qdrant
  // ==========================
  QDRANT_URL: z.string().url(),

  QDRANT_API_KEY: z.string().min(1),

  QDRANT_COLLECTION: z.string().min(1),

  QDRANT_VECTOR_SIZE: z.coerce.number().default(768),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
