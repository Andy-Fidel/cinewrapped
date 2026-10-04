import type { ActivityHeatmapSummary } from '@cinewrapped/shared-types';
import { wrapCardText, xmlEscape } from './share-card-model';

export type HeatmapSharePalette = 'EMERALD' | 'AMBER' | 'VIOLET' | 'CRIMSON' | 'CYAN';
const accents = {
  EMERALD: '#10B981',
  AMBER: '#F59E0B',
  VIOLET: '#8B5CF6',
  CRIMSON: '#EF4444',
  CYAN: '#06B6D4',
};
export function heatmapShareColors(palette: HeatmapSharePalette): string[] {
  const accent = accents[palette];
  const blend = (opacity: number) =>
    '#' +
    [0, 1, 2]
      .map((index) => {
        const value = parseInt(accent.slice(1 + index * 2, 3 + index * 2), 16);
        const base = [18, 23, 34][index]!;
        return Math.round(value * opacity + base * (1 - opacity))
          .toString(16)
          .padStart(2, '0');
      })
      .join('');
  return ['#263041', blend(0.35), blend(0.6), blend(0.85), accent];
}

export function renderHeatmapShare(
  data: ActivityHeatmapSummary,
  author: string,
  handle: string,
  palette: HeatmapSharePalette,
): string {
  if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 9999)
    throw new Error('Invalid heatmap year.');
  const colors = heatmapShareColors(palette);
  const days = new Map(data.days.map((day) => [day.date, day]));
  const text = (value: string, x: number, y: number, size = 28, color = '#FFFFFF') =>
    `<text x="${x}" y="${y}" fill="${color}" font-size="${size}">${xmlEscape(value)}</text>`;
  const months = Array.from({ length: 12 }, (_, month) => {
    const x = 80 + (month % 4) * 238;
    const y = 420 + Math.floor(month / 4) * 300;
    const offset = (new Date(Date.UTC(data.year, month, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(data.year, month + 1, 0)).getUTCDate();
    const squares = Array.from({ length: count }, (_, day) => {
      const date = `${data.year}-${String(month + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
      const intensity = days.get(date)?.intensity ?? 0;
      const position = offset + day;
      return `<rect data-date="${date}" x="${x + (position % 7) * 28}" y="${y + 52 + Math.floor(position / 7) * 28}" width="24" height="24" rx="4" fill="${colors[intensity] ?? colors[0]}"/>`;
    }).join('');
    return (
      text(
        [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ][month]!,
        x,
        y,
        28,
      ) +
      ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        .map((day, index) => text(day, x + index * 28 + 5, y + 32, 16, '#BDC7D9'))
        .join('') +
      squares
    );
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="#121722"/><rect x="32" y="32" width="1016" height="1856" rx="44" fill="none" stroke="${accents[palette]}" stroke-width="3"/><g font-family="sans-serif">${text('CINEWRAPPED', 80, 135, 40, '#FFFFFF')}${text(`${data.year} · Year in Pixels`, 80, 255, 52)}${text(`${data.totalViewings} viewings · ${data.activeDaysCount} active days`, 80, 325, 32, '#BDC7D9')}${months}${text('Daily viewing activity · Monday first', 80, 1350, 28, '#BDC7D9')}${colors.map((color, index) => `<rect x="${80 + index * 72}" y="1390" width="40" height="40" rx="6" fill="${color}"/>${text(index === 4 ? '4' : String(index), 80 + index * 72, 1465, 24)}`).join('')}${text('Intensity: none → most active', 80, 1520, 28, '#BDC7D9')}${text(`Longest streak: ${data.longestStreakDays} days`, 80, 1600, 36)}${text(wrapCardText(author, 38, 1)[0] ?? '', 80, 1740, 36)}${text(wrapCardText(`@${handle}`, 48, 1)[0] ?? '', 80, 1800, 28, '#BDC7D9')}</g></svg>`;
}
