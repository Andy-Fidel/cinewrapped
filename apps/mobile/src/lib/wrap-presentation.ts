import type { StoryPresentation, WrapDetail } from '@cinewrapped/shared-types';
import { localYear, wrapPeriodLabel } from './period';

export function wrapPresentation(
  wrap: WrapDetail,
  author: StoryPresentation['author'],
): StoryPresentation | null {
  if (wrap.status !== 'COMPLETED') return null;
  const periodLabel = wrapPeriodLabel(wrap.periodStart, wrap.periodEnd, wrap.timezone);
  const type = {
    YEARLY: 'ANNUAL_WRAP',
    MONTHLY: 'MONTHLY_RECAP',
    WEEKLY: 'WEEKLY_WRAP',
    CUSTOM: 'CUSTOM_WRAP',
  } as const;
  return {
    id: wrap.id,
    type: type[wrap.wrapType],
    title: `${wrap.wrapType.toLowerCase()} Cinema Wrapped`,
    subtitle: `${author.displayName} · ${periodLabel}`,
    periodLabel,
    periodStart: wrap.periodStart,
    periodEnd: wrap.periodEnd,
    timezone: wrap.timezone,
    revision: wrap.revision,
    year: localYear(new Date(wrap.periodStart), wrap.timezone),
    author,
    defaultTheme: 'MIDNIGHT_GOLD',
    createdAt: wrap.generatedAt ?? wrap.periodStart,
    slides: (wrap.storySlides ?? []).map((slide) => ({
      id: slide.id,
      layout: slide.media?.posterUrl ? 'CINEMATIC_POSTER' : 'HERO_STATS',
      theme:
        slide.accent === 'CORAL'
          ? 'CRIMSON_NOIR'
          : slide.accent === 'GOLD'
            ? 'MIDNIGHT_GOLD'
            : slide.accent === 'TEAL'
              ? 'EMERALD_VAULT'
              : 'AMETHYST_DREAM',
      eyebrow: slide.eyebrow,
      headline: slide.title,
      description: slide.body,
      footer: {
        branding: 'CineWrapped',
        handle: `@${author.username}`,
        badgeText: `Revision ${wrap.revision} · ${periodLabel}`,
      },
      ...(slide.media
        ? { media: { title: slide.media.title, posterUrl: slide.media.posterUrl ?? null } }
        : {}),
      ...(slide.statValue != null
        ? { metric: { value: slide.statValue, label: slide.statLabel ?? 'Statistic' } }
        : {}),
    })),
  };
}
