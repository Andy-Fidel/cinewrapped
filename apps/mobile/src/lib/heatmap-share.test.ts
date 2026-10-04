import { expect, it } from 'vitest';
import type { ActivityHeatmapSummary } from '@cinewrapped/shared-types';
import { renderHeatmapShare, heatmapShareColors } from './heatmap-share';
import { renderGraphicCard } from './share-card-model';
const summary = (year: number) =>
  ({
    year,
    totalViewings: 12,
    activeDaysCount: 10,
    longestStreakDays: 3,
    days: [{ date: `${year}-01-01`, intensity: 4 }],
  }) as ActivityHeatmapSummary;
it.each([
  [2024, 366],
  [2026, 365],
])('renders every calendar day of %s with real activity and a legend', (year, count) => {
  const svg = renderHeatmapShare(summary(year), 'Viewer', 'viewer', 'EMERALD');
  expect(svg.match(/data-date=/gu)).toHaveLength(count);
  expect(svg).toContain(`data-date="${year}-01-01"`);
  expect(svg).toContain('fill="#10B981"');
  expect(svg).toContain('Intensity: none → most active');
  expect(svg.includes(`${year}-02-29`)).toBe(year === 2024);
});
it('keeps chosen palette and escapes author content', () => {
  const svg = renderHeatmapShare(summary(2026), '<script>', 'a&b', 'CYAN');
  expect(svg).toContain('fill="#06B6D4"');
  expect(svg).not.toContain('<script>');
  expect(svg).toContain('&lt;script&gt;');
  expect(heatmapShareColors('CYAN')).toHaveLength(5);
});
it('omits unrelated ratings on story cards, preserves review Unrated, and applies the selected story colors safely', () => {
  const card = {
    title: 'Story',
    body: 'Narrative',
    author: 'Viewer',
    theme: 'MIDNIGHT' as const,
    palette: { background: '#0A0912', accent: '#A78BFA' },
  };
  expect(renderGraphicCard(card)).not.toContain('Unrated');
  expect(renderGraphicCard(card)).toContain('fill="#A78BFA"');
  expect(renderGraphicCard({ ...card, ratingValue: null })).toContain('Unrated');
  expect(
    renderGraphicCard({ ...card, palette: { background: '"/><script>', accent: '#A78BFA' } }),
  ).not.toContain('<script>');
});
