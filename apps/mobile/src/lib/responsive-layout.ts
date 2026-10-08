/** The app shell caps readable layouts; grids size from their available space. */
export const APP_MAX_WIDTH = 1440;
export function gridColumns(width: number, fontScale = 1): number {
  const available = Math.max(0, Math.min(APP_MAX_WIDTH, width) - 20);
  const minimumCardWidth = 140 * Math.max(1, fontScale);
  return Math.max(1, Math.min(6, Math.floor((available + 12) / (minimumCardWidth + 12))));
}
export function metricFontSize(value: string | number, availableWidth: number): number {
  return Math.min(
    64,
    Math.max(
      18,
      Math.floor(Math.max(0, availableWidth - 48) / (Math.max(1, String(value).length) * 0.7)),
    ),
  );
}
