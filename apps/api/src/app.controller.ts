import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { Public } from './auth/public.decorator.js';
import { PrismaService } from './database/prisma.service.js';

export interface HealthResponse {
  service: 'cinewrapped-api';
  status: 'ok';
  version: string;
}

@ApiTags('System')
@Public()
@Controller('health')
export class AppController {
  public constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOkResponse({ description: 'The API process is alive.' })
  public getLiveness(): HealthResponse {
    return this.createHealthResponse();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'The API is ready to receive traffic.' })
  @ApiServiceUnavailableResponse({ description: 'A required dependency is unavailable.' })
  public async getReadiness(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.createHealthResponse();
    } catch {
      throw new ServiceUnavailableException('The database is unavailable.');
    }
  }

  private createHealthResponse(): HealthResponse {
    return {
      service: 'cinewrapped-api',
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
