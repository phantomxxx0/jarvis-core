import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum([
      'development',
      'production',
      'test',
    ])
    .default('development'),

  PORT: z.coerce
    .number()
    .default(4000),

  APP_NAME: z
    .string()
    .default('Jarvis Core'),

  APP_VERSION: z
    .string()
    .default('0.1.0'),

  // ==========================
  // Access Token
  // ==========================

  JWT_ACCESS_SECRET: z
    .string()
    .min(
      32,
      'JWT_ACCESS_SECRET must be at least 32 characters',
    ),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .default('15m'),

  // ==========================
  // Refresh Token
  // ==========================

  JWT_REFRESH_SECRET: z
    .string()
    .min(
      32,
      'JWT_REFRESH_SECRET must be at least 32 characters',
    ),

  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .default('30d'),
});

export type Env = z.infer<typeof envSchema>;

export function validate(
  config: Record<string, unknown>,
) {
  return envSchema.parse(config);
}
