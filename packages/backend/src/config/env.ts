import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  REDIS_URL: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().optional(),
  QR_EXPIRATION_MINUTES: z.coerce.number().default(5),
  /** Optional: if set, entry screen requires this username before demo login */
  GATE_USERNAME: z.string().optional(),
  /** Optional: if set with GATE_USERNAME, entry screen requires this password */
  GATE_PASSWORD: z.string().optional(),
  /** Optional: if set, all API requests (except /health) require x-api-key header */
  API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten());
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}
