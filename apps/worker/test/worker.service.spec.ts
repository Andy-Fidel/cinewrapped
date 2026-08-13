import type { WorkerEnvironment } from '@cinewrapped/config';
import { describe, expect, it } from 'vitest';

import { WorkerService } from '../src/worker.service.js';

describe('WorkerService', () => {
  it('reports readiness', () => {
    expect(new WorkerService({} as WorkerEnvironment).getStatus()).toBe('ready');
  });
});
