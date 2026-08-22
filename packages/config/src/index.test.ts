import { describe, expect, it } from 'vitest';

import { parseApiEnvironment, parseMobilePublicEnvironment } from './index.js';

describe('environment validation', () => {
  it('normalizes API ports and CORS origins', () => {
    const environment = parseApiEnvironment({
      NODE_ENV: 'test',
      LOG_LEVEL: 'warn',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/cinewrapped',
      REDIS_URL: 'redis://localhost:6379',
      API_HOST: '127.0.0.1',
      API_PORT: '4100',
      API_PUBLIC_URL: 'http://localhost:4100',
      CORS_ORIGINS: 'http://localhost:3000, http://localhost:8081',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_JWT_ISSUER: 'https://example.supabase.co/auth/v1',
      SUPABASE_JWT_AUDIENCE: 'authenticated',
      SUPABASE_JWKS_URL: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
      TMDB_API_TOKEN: 'test-token-at-least-sixteen-characters',
      OPENAI_API_KEY: 'test-openai-key-at-least-sixteen-characters',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'cinewrapped-test',
      S3_ACCESS_KEY: 'test-key',
      S3_SECRET_KEY: 'test-secret-at-least-sixteen-characters',
    });

    expect(environment.API_PORT).toBe(4100);
    expect(environment.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:8081']);
  });

  it('uses Render platform values for the API port and public URL', () => {
    const environment = parseApiEnvironment({
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/cinewrapped',
      REDIS_URL: 'redis://localhost:6379',
      PORT: '10000',
      RENDER_EXTERNAL_URL: 'https://cinewrapped-api.onrender.com',
      TRUST_PROXY: 'true',
      API_DOCS_ENABLED: 'false',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_JWT_ISSUER: 'https://example.supabase.co/auth/v1',
      SUPABASE_JWT_AUDIENCE: 'authenticated',
      SUPABASE_JWKS_URL: 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
      TMDB_API_TOKEN: 'test-token-at-least-sixteen-characters',
      OPENAI_API_KEY: 'test-openai-key-at-least-sixteen-characters',
      S3_ENDPOINT: 'https://example.storage.supabase.co/storage/v1/s3',
      S3_REGION: 'eu-west-1',
      S3_BUCKET: 'cinewrapped-test',
      S3_ACCESS_KEY: 'test-key',
      S3_SECRET_KEY: 'test-secret-at-least-sixteen-characters',
    });

    expect(environment.API_PORT).toBe(10_000);
    expect(environment.API_PUBLIC_URL).toBe('https://cinewrapped-api.onrender.com');
    expect(environment.CORS_ORIGINS).toEqual(['https://cinewrapped-api.onrender.com']);
    expect(environment.TRUST_PROXY).toBe(true);
    expect(environment.API_DOCS_ENABLED).toBe(false);
  });

  it('rejects a mobile configuration with a secret-like missing public key', () => {
    expect(() =>
      parseMobilePublicEnvironment({
        EXPO_PUBLIC_API_BASE_URL: 'http://localhost:4000/api/v1',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'short',
      }),
    ).toThrow();
  });
});
