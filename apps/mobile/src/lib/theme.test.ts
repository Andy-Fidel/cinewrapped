import { describe, expect, it } from 'vitest';

import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('honors an explicit light or dark preference', () => {
    expect(resolveTheme('LIGHT', 'dark')).toBe('light');
    expect(resolveTheme('DARK', 'light')).toBe('dark');
  });

  it('follows the system scheme only for the system preference', () => {
    expect(resolveTheme('SYSTEM', 'light')).toBe('light');
    expect(resolveTheme('SYSTEM', 'dark')).toBe('dark');
    expect(resolveTheme('SYSTEM', null)).toBe('dark');
  });
});
