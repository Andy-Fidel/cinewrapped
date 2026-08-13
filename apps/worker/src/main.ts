import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  const logger = new Logger('WorkerBootstrap');
  app.useLogger(logger);
  app.enableShutdownHooks();
  logger.log('Worker ready.');
}

void bootstrap();
