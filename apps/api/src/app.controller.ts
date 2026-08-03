import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { Public } from './auth/public.decorator.js';

export interface HealthResponse {
  service: 'cinewrapped-api';
  status: 'ok';
  version: string;
}

@ApiTags('System')
@Public()
@Controller('health')
export class AppController {
  @Get('live')
  @ApiOkResponse({ description: 'The API process is alive.' })
  public getLiveness(): HealthResponse {
    return this.createHealthResponse();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'The API is ready to receive traffic.' })
  @ApiServiceUnavailableResponse({ description: 'A required dependency is unavailable.' })
  public getReadiness(): HealthResponse {
    return this.createHealthResponse();
  }

  private createHealthResponse(): HealthResponse {
    return {
      service: 'cinewrapped-api',
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
