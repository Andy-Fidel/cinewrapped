import 'reflect-metadata';

import { parseApiEnvironment } from '@cinewrapped/config';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { AppModule } from './app.module.js';

const rootEnvironmentFile = [
  resolve(import.meta.dirname, '../../../.env'),
  resolve(import.meta.dirname, '../../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
].find((candidate) => existsSync(candidate));

if (rootEnvironmentFile !== undefined) process.loadEnvFile(rootEnvironmentFile);

async function bootstrap(): Promise<void> {
  const environment = parseApiEnvironment(process.env);
  const adapter = new FastifyAdapter({ logger: false, trustProxy: environment.TRUST_PROXY });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  // Strict CORS Configuration
  await app.register(cors, {
    credentials: false,
    origin: environment.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Requested-With',
      'Accept',
    ],
    maxAge: 86400,
  });

  // Enterprise Security Headers Suite (HTTPS, HSTS, X-Frame-Options, No-Sniff, Referrer Policy)
  await app.register(helmet, {
    contentSecurityPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 Year Strict-Transport-Security
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: {
      action: 'deny',
    },
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    crossOriginResourcePolicy: {
      policy: 'same-site',
    },
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },
  });

  // Global DDoS and Brute-Force Rate Limiting Shield
  await app.register(rateLimit, {
    max: 180,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'],
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      retryAfterSeconds: Math.ceil(context.ttl / 1000),
    }),
  });

  const docsEnabled = environment.API_DOCS_ENABLED ?? environment.NODE_ENV !== 'production';
  if (docsEnabled) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('CineWrapped API')
      .setDescription('Runtime API documentation for the CineWrapped modular monolith.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });
  }

  await app.listen(environment.API_PORT, environment.API_HOST);
  logger.log(`API listening at ${environment.API_PUBLIC_URL}`);
}

void bootstrap();
