import { describe, expect, it } from 'vitest';

import { resolveTheme, resolveThemePalette } from './theme';

describe('resolveTheme', () => {
  it('honors an explicit light or dark preference', () => {
    expect(resolveTheme('LIGHT', 'dark')).toBe('light');
    expect(resolveTheme('DARK', 'light')).toBe('dark');
  });

  it('follows the system scheme only for the system preference', () => {
    expect(resolveTheme('SYSTEM', 'light')).toBe('light');
    expect(resolveTheme('SYSTEM', 'dark')).toBe('dark');
    expect(resolveTheme('SYSTEM', null)).toBe('dark');
    expect(resolveTheme('SYSTEM', undefined)).toBe('dark');
    expect(resolveTheme('SYSTEM', 'unspecified')).toBe('dark');
  });

  it.each([
    ['OCEAN', 'ocean', 'dark'],
    ['FOREST', 'forest', 'dark'],
    ['AMETHYST', 'amethyst', 'dark'],
    ['ROSE', 'rose', 'light'],
    ['SUNSET', 'sunset', 'light'],
  ] as const)(
    'keeps %s distinct and selects the correct logo/status-bar mode',
    (preference, palette, mode) => {
      for (const system of ['light', 'dark'] as const) {
        expect(resolveThemePalette(preference, system)).toBe(palette);
        expect(resolveTheme(preference, system)).toBe(mode);
      }
    },
  );
});
