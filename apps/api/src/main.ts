import 'reflect-metadata';

import { parseApiEnvironment } from '@cinewrapped/config';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
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
  const adapter = new FastifyAdapter({ logger: false, trustProxy: true });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });
  const logger = new Logger('Bootstrap');

  app.useLogger(logger);
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.register(cors, {
    credentials: false,
    origin: environment.CORS_ORIGINS,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  const openApiConfig = new DocumentBuilder()
    .setTitle('CineWrapped API')
    .setDescription('Runtime API documentation for the CineWrapped modular monolith.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });

  await app.listen(environment.API_PORT, environment.API_HOST);
  logger.log(`API listening at ${environment.API_PUBLIC_URL}`);
}

void bootstrap();
