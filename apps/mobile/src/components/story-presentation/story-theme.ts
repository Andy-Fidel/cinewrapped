import type { StoryThemePreset } from '@cinewrapped/shared-types';

export interface StoryThemeColors {
  bgGradient: [string, string, string];
  cardBg: string;
  cardBorder: string;
  accent: string;
  accentGlow: string;
  textPrimary: string;
  textSecondary: string;
  pillBg: string;
  pillText: string;
  badgeBorder: string;
}

export const STORY_THEMES: Record<StoryThemePreset, StoryThemeColors> = {
  MIDNIGHT_GOLD: {
    bgGradient: ['#0A0912', '#141226', '#08070F'],
    cardBg: 'rgba(255, 255, 255, 0.06)',
    cardBorder: 'rgba(245, 158, 11, 0.35)',
    accent: '#F59E0B',
    accentGlow: 'rgba(245, 158, 11, 0.25)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.72)',
    pillBg: 'rgba(245, 158, 11, 0.18)',
    pillText: '#F59E0B',
    badgeBorder: '#F59E0B',
  },
  NEON_CYBER: {
    bgGradient: ['#050814', '#0D1936', '#040712'],
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(56, 189, 248, 0.35)',
    accent: '#38BDF8',
    accentGlow: 'rgba(56, 189, 248, 0.25)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    pillBg: 'rgba(56, 189, 248, 0.18)',
    pillText: '#38BDF8',
    badgeBorder: '#38BDF8',
  },
  CRIMSON_NOIR: {
    bgGradient: ['#120608', '#240C10', '#0A0304'],
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(239, 68, 68, 0.35)',
    accent: '#EF4444',
    accentGlow: 'rgba(239, 68, 68, 0.25)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.72)',
    pillBg: 'rgba(239, 68, 68, 0.18)',
    pillText: '#EF4444',
    badgeBorder: '#EF4444',
  },
  EMERALD_VAULT: {
    bgGradient: ['#04120D', '#0A261B', '#030D09'],
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(16, 185, 129, 0.35)',
    accent: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.25)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    pillBg: 'rgba(16, 185, 129, 0.18)',
    pillText: '#10B981',
    badgeBorder: '#10B981',
  },
  AMETHYST_DREAM: {
    bgGradient: ['#0F081C', '#1F1138', '#0A0514'],
    cardBg: 'rgba(255, 255, 255, 0.06)',
    cardBorder: 'rgba(168, 85, 247, 0.35)',
    accent: '#A855F7',
    accentGlow: 'rgba(168, 85, 247, 0.25)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.72)',
    pillBg: 'rgba(168, 85, 247, 0.18)',
    pillText: '#A855F7',
    badgeBorder: '#A855F7',
  },
};

export function getStoryTheme(preset?: StoryThemePreset): StoryThemeColors {
  return STORY_THEMES[preset ?? 'MIDNIGHT_GOLD'] ?? STORY_THEMES.MIDNIGHT_GOLD;
}
