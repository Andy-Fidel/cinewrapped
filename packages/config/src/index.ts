import { z } from 'zod';

const nodeEnvironmentSchema = z.enum(['development', 'test', 'staging', 'production']);
const logLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
const secretSchema = z.string().min(16);

const sharedServerSchema = z.object({
  NODE_ENV: nodeEnvironmentSchema.default('development'),
  LOG_LEVEL: logLevelSchema.default('info'),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
});

const apiEnvironmentSchema = sharedServerSchema.extend({
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  API_PUBLIC_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
  SUPABASE_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_JWT_ISSUER: z.url({ protocol: /^https$/ }),
  SUPABASE_JWT_AUDIENCE: z.string().min(1),
  SUPABASE_JWKS_URL: z.url({ protocol: /^https$/ }),
  TMDB_API_TOKEN: secretSchema,
  OPENAI_API_KEY: secretSchema,
  OPENAI_VISION_MODEL: z.string().min(1).max(80).default('gpt-5.4-mini'),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY: z.string().min(3),
  S3_SECRET_KEY: secretSchema,
  SENTRY_DSN: z.union([z.url(), z.literal('')]).optional(),
  POSTHOG_API_KEY: z.string().optional(),
});

const workerEnvironmentSchema = sharedServerSchema.extend({
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(4),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().min(250).max(60_000).default(2_000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(10),
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY: z.string().min(3),
  S3_SECRET_KEY: secretSchema,
  TMDB_API_TOKEN: secretSchema,
});

const adminPublicEnvironmentSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
});

const mobilePublicEnvironmentSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(16),
});

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;
export type AdminPublicEnvironment = z.infer<typeof adminPublicEnvironmentSchema>;
export type MobilePublicEnvironment = z.infer<typeof mobilePublicEnvironmentSchema>;

export function parseApiEnvironment(
  environment: Record<string, string | undefined>,
): ApiEnvironment {
  return apiEnvironmentSchema.parse(environment);
}

export function parseWorkerEnvironment(
  environment: Record<string, string | undefined>,
): WorkerEnvironment {
  return workerEnvironmentSchema.parse(environment);
}

export function parseAdminPublicEnvironment(
  environment: Record<string, string | undefined>,
): AdminPublicEnvironment {
  return adminPublicEnvironmentSchema.parse(environment);
}

export function parseMobilePublicEnvironment(
  environment: Record<string, string | undefined>,
): MobilePublicEnvironment {
  return mobilePublicEnvironmentSchema.parse(environment);
}
