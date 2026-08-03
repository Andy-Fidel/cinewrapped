import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class WorkerService implements OnApplicationBootstrap {
  readonly #logger = new Logger(WorkerService.name);

  public onApplicationBootstrap(): void {
    this.#logger.log('Worker application context is ready.');
  }

  public getStatus(): 'ready' {
    return 'ready';
  }
}
