import type { StoryPresentation, WrapDetail } from '@cinewrapped/shared-types';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { invalidateInsights } from './insights-query';
import { localYear, wrapPeriodLabel } from './period';
import { wrapPresentation } from './wrap-presentation';
const author: StoryPresentation['author'] = {
  userId: 'owner',
  username: 'viewer',
  displayName: 'Viewer',
};
const wrap: WrapDetail = {
  id: 'snapshot',
  inputVersion: 1,
  canRetry: false,
  headline: null,
  statistics: null,
  highlights: null,
  failureCode: null,
  wrapType: 'MONTHLY',
  status: 'COMPLETED',
  revision: 2,
  periodStart: '2026-07-01T04:00:00Z',
  periodEnd: '2026-08-01T04:00:00Z',
  timezone: 'America/New_York',
  generatedAt: '2026-07-08T12:00:00Z',
  storySlides: [
    {
      id: 'intro',
      statValue: null,
      statLabel: null,
      media: null,
      kind: 'INTRO',
      accent: 'GOLD',
      title: 'Your month',
      eyebrow: 'MONTHLY WRAP',
      body: 'Saved activity',
    },
    {
      id: 'zero',
      media: null,
      kind: 'TOTALS',
      eyebrow: 'TOTALS',
      body: 'Activity',
      accent: 'TEAL',
      title: 'Totals',
      statValue: '0',
      statLabel: 'viewings',
    },
  ],
};
describe('saved wrap presentation', () => {
  it.each([
    ['YEARLY', 'ANNUAL_WRAP'],
    ['MONTHLY', 'MONTHLY_RECAP'],
    ['WEEKLY', 'WEEKLY_WRAP'],
    ['CUSTOM', 'CUSTOM_WRAP'],
  ] as const)('preserves %s scope', (wrapType, type) => {
    expect(wrapPresentation({ ...wrap, wrapType }, author)?.type).toBe(type);
  });
  it('omits absent metrics, retains zero and labels the inclusive end in the saved zone', () => {
    const result = wrapPresentation(wrap, author)!;
    expect(result.slides[0]?.metric).toBeUndefined();
    expect(result.slides[1]?.metric?.value).toBe('0');
    expect(result.periodLabel).toBe('Jul 1, 2026 – Jul 31, 2026');
    expect(result).toMatchObject({
      timezone: wrap.timezone,
      periodStart: wrap.periodStart,
      periodEnd: wrap.periodEnd,
      revision: 2,
    });
    expect(result.slides[0]?.footer?.badgeText).toContain('Revision 2');
    expect(JSON.stringify(result)).not.toContain('Verified');
  });
  it('never renders incomplete snapshots', () => {
    expect(wrapPresentation({ ...wrap, status: 'FAILED' }, author)).toBeNull();
    expect(wrapPresentation({ ...wrap, status: 'GENERATING' }, author)).toBeNull();
  });
  it('handles a UTC new year in a westward member time zone', () => {
    expect(localYear(new Date('2026-01-01T02:00:00Z'), 'America/New_York')).toBe(2025);
    expect(
      wrapPeriodLabel('2025-01-01T05:00:00Z', '2026-01-01T05:00:00Z', 'America/New_York'),
    ).toBe('Jan 1, 2025 – Dec 31, 2025');
  });
  it('invalidates every live statistics family without altering saved snapshots', async () => {
    const client = new QueryClient();
    const keys = [
      ['statistics', 'summary'],
      ['statistics', 'home-weekly'],
      ['statistics', 'heatmap'],
      ['movie-dna'],
      ['taste-profile'],
      ['wrap-archive'],
      ['wrap', 'snapshot'],
    ];
    keys.forEach((key) => client.setQueryData(key, 'cached'));
    await invalidateInsights(client);
    keys.slice(0, -1).forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
    expect(client.getQueryState(keys.at(-1)!)?.isInvalidated).toBe(false);
    client.clear();
  });
});
