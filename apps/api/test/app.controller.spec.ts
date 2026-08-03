import { describe, expect, it } from 'vitest';

import { AppController } from '../src/app.controller.js';

describe('AppController', () => {
  it('returns a stable liveness response', () => {
    const controller = new AppController();

    expect(controller.getLiveness()).toMatchObject({
      service: 'cinewrapped-api',
      status: 'ok',
    });
  });
});
