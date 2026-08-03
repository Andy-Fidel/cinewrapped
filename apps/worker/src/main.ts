import 'reflect-metadata';

import { parseWorkerEnvironment } from '@cinewrapped/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module.js';

async function bootstrap(): Promise<void> {
  const environment = parseWorkerEnvironment(process.env);
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  const logger = new Logger('WorkerBootstrap');
  app.useLogger(logger);
  app.enableShutdownHooks();
  logger.log(`Worker ready with concurrency ${environment.WORKER_CONCURRENCY}.`);
}

void bootstrap();
