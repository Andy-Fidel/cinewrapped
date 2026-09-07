import { describe, expect, it, vi } from 'vitest';

import { AppController } from '../src/app.controller.js';
import type { PrismaService } from '../src/database/prisma.service.js';

function setup() {
  const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
  return { query, controller: new AppController({ $queryRaw: query } as unknown as PrismaService) };
}

describe('AppController', () => {
  it('keeps liveness independent of the database', () => {
    const { controller, query } = setup();
    expect(controller.getLiveness()).toMatchObject({ service: 'cinewrapped-api', status: 'ok' });
    expect(query).not.toHaveBeenCalled();
  });
  it('reports ready only after a database query succeeds', async () => {
    const { controller, query } = setup();
    await expect(controller.getReadiness()).resolves.toMatchObject({ status: 'ok' });
    expect(query).toHaveBeenCalledOnce();
  });
  it('returns 503 without exposing connection details when the database fails', async () => {
    const { controller, query } = setup();
    query.mockRejectedValue(new Error('private database connection details'));
    await expect(controller.getReadiness()).rejects.toMatchObject({
      status: 503,
      message: 'The database is unavailable.',
    });
  });
});
