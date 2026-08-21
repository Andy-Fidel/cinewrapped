import { describe, expect, it } from 'vitest';
import { generateAnnualWrapPresentation } from './story-generator';
import { getStoryTheme, STORY_THEMES } from './story-theme';

describe('Story Presentation System', () => {
  it('generates structured JSON slides for in-app and social story exports', () => {
    const presentation = generateAnnualWrapPresentation({
      user: {
        userId: 'usr_123',
        displayName: 'Sarah Connor',
        username: 'sarah_films',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      year: 2026,
      totalFilms: 154,
      totalHours: 320,
      longestStreakDays: 31,
      cinemaPersonality: 'Visionary Auteur',
      topDirector: 'Denis Villeneuve',
    });

    expect(presentation.id).toContain('presentation-wrap-2026-usr_123');
    expect(presentation.type).toBe('ANNUAL_WRAP');
    expect(presentation.slides.length).toBeGreaterThanOrEqual(6);

    // Verify slide layouts
    const layouts = presentation.slides.map((s) => s.layout);
    expect(layouts).toContain('HERO_STATS');
    expect(layouts).toContain('TOP_FIVE_GRID');
    expect(layouts).toContain('CINEMATIC_POSTER');
    expect(layouts).toContain('RADAR_RADIAL');
    expect(layouts).toContain('QUOTE_SPOTLIGHT');
    expect(layouts).toContain('SUMMARY_CARD');

    // Verify slide 1 data structure
    const slide1 = presentation.slides[0]!;
    expect(slide1.eyebrow).toBe('2026 CINEMA WRAPPED');
    expect(slide1.metric?.value).toBe(154);
    expect(slide1.footer?.handle).toBe('@sarah_films');

    // Verify top 5 ranking slide structure
    const slide2 = presentation.slides[1]!;
    expect(slide2.rankingItems).toBeDefined();
    expect(slide2.rankingItems!.length).toBe(5);
    expect(slide2.rankingItems![0]!.rank).toBe(1);
  });

  it('provides all 5 premium theme presets', () => {
    expect(STORY_THEMES.MIDNIGHT_GOLD.accent).toBe('#F59E0B');
    expect(STORY_THEMES.NEON_CYBER.accent).toBe('#38BDF8');
    expect(STORY_THEMES.CRIMSON_NOIR.accent).toBe('#EF4444');
    expect(STORY_THEMES.EMERALD_VAULT.accent).toBe('#10B981');
    expect(STORY_THEMES.AMETHYST_DREAM.accent).toBe('#A855F7');

    const defaultTheme = getStoryTheme();
    expect(defaultTheme.accent).toBe('#F59E0B');
  });
});
