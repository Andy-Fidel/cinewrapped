import { describe, expect, it } from 'vitest';

import { tokens } from './index.js';

describe('design tokens', () => {
  it('publishes the documented token version and accessible theme keys', () => {
    expect(tokens.meta.version).toBe('0.1.0');
    expect(tokens.color.semantic.dark.textPrimary).toMatch(/^#[A-F0-9]{6}$/u);
    expect(tokens.color.semantic.light.textPrimary).toMatch(/^#[A-F0-9]{6}$/u);
  });
});
