import { describe, expect, it } from 'vitest';
import { APP_MAX_WIDTH, gridColumns, metricFontSize } from './responsive-layout';

describe('responsive content sizing', () => {
  it('keeps poster cards readable as the viewport and text scale change', () => {
    for (const width of [280, 320, 390, 568, 768, 1024, 1440, 2560]) {
      for (const scale of [1, 1.5, 2]) {
        const columns = gridColumns(width, scale);
        const cellWidth = (Math.min(width, APP_MAX_WIDTH) - 20 - (columns - 1) * 12) / columns;
        expect(columns).toBeGreaterThanOrEqual(1);
        expect(columns).toBeLessThanOrEqual(6);
        if (columns > 1) expect(cellWidth).toBeGreaterThanOrEqual(140 * scale);
      }
    }
    expect(gridColumns(320)).toBe(2);
    expect(gridColumns(320, 2)).toBe(1);
    expect(gridColumns(1440)).toBeGreaterThan(gridColumns(320));
  });
  it('does not enlarge grids without bound on ultrawide screens', () => {
    expect(gridColumns(2560)).toBe(gridColumns(APP_MAX_WIDTH));
  });
  it('fits large numeric facts into small story cards without losing digits', () => {
    for (const width of [236, 276, 346, 724]) {
      for (const value of ['0', '10000', '25000000', '100.0%']) {
        const size = metricFontSize(value, width);
        expect(size).toBeGreaterThanOrEqual(18);
        expect(size).toBeLessThanOrEqual(64);
        expect(size * value.length * 0.7).toBeLessThanOrEqual(width - 48);
      }
    }
  });
});
