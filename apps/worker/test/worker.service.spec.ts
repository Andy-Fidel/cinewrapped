import { describe, expect, it } from 'vitest';

import { WorkerService } from '../src/worker.service.js';

describe('WorkerService', () => {
  it('reports readiness', () => {
    expect(new WorkerService().getStatus()).toBe('ready');
  });
});
