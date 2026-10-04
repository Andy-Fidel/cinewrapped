import { describe, expect, it } from 'vitest';

import { tokens } from './index.js';

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => a - b);
  return (values[1]! + 0.05) / (values[0]! + 0.05);
}

describe('design tokens', () => {
  it('publishes the documented token version and accessible theme keys', () => {
    expect(tokens.meta.version).toBe('0.1.0');
    expect(tokens.color.semantic.dark.textPrimary).toMatch(/^#[A-F0-9]{6}$/u);
    expect(tokens.color.semantic.light.textPrimary).toMatch(/^#[A-F0-9]{6}$/u);
  });
  it.each(['ocean', 'forest', 'amethyst', 'rose', 'sunset'] as const)(
    'provides a complete %s palette with readable normal text and controls',
    (theme) => {
      const colors = tokens.color.semantic[theme];
      expect(Object.keys(colors).sort()).toEqual(Object.keys(tokens.color.semantic.dark).sort());
      for (const background of [
        colors.background,
        colors.surface,
        colors.surfaceRaised,
        colors.surfaceOverlay,
      ]) {
        expect(contrast(colors.textPrimary, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(colors.textSecondary, background)).toBeGreaterThanOrEqual(4.5);
      }
      for (const [foreground, background] of [
        [colors.onBrand, colors.brand],
        [colors.onBrand, colors.brandPressed],
        [colors.onAccent, colors.accent],
        [colors.onSuccess, colors.success],
        [colors.onWarning, colors.warning],
        [colors.onDanger, colors.danger],
      ])
        expect(contrast(foreground!, background!)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
