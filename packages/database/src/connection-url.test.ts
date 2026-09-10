import { describe, expect, it } from 'vitest';

import { withPrismaConnectionLimit } from './connection-url.js';

describe('withPrismaConnectionLimit', () => {
  it('adds a pool cap without dropping existing connection parameters', () => {
    const result = withPrismaConnectionLimit(
      'postgresql://user:password@pooler.example.com:5432/app?sslmode=require',
      5,
    );

    const url = new URL(result);
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('connection_limit')).toBe('5');
  });

  it('preserves an explicitly configured connection limit', () => {
    const result = withPrismaConnectionLimit(
      'postgresql://user:password@pooler.example.com:5432/app?connection_limit=2',
      5,
    );

    expect(new URL(result).searchParams.get('connection_limit')).toBe('2');
  });
});
