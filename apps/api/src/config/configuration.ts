import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  SHADOW_DATABASE_URL: z.string().url().optional(),
  AUTH_JWKS_URI: z.string().url().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  AUTH_ISSUER: z.string().optional(),
  AUTH_JWT_SECRET: z.string().min(32).optional(),
  HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HTTP_CORS_ORIGIN: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).optional()
});

export type AppConfig = z.infer<typeof envSchema>;

export default () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Configuration validation error: ${parsed.error.message}`);
  }

  const env = parsed.data;

  return {
    nodeEnv: env.NODE_ENV,
    http: {
      port: env.HTTP_PORT,
      corsOrigin: env.HTTP_CORS_ORIGIN ?? '*'
    },
    auth: {
      jwksUri: env.AUTH_JWKS_URI,
      audience: env.AUTH_AUDIENCE,
      issuer: env.AUTH_ISSUER,
      jwtSecret: env.AUTH_JWT_SECRET
    },
    database: {
      url: env.DATABASE_URL,
      shadowUrl: env.SHADOW_DATABASE_URL
    },
    redis: {
      host: env.REDIS_HOST ?? 'localhost',
      port: env.REDIS_PORT ?? 6379
    }
  };
};
