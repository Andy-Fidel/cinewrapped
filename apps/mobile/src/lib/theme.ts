import type { ThemePreference } from '@cinewrapped/shared-types';
import type { tokens } from '@cinewrapped/ui-tokens';
import type { ColorSchemeName } from 'react-native';

export type ResolvedTheme = 'light' | 'dark';
export type ThemePalette = keyof typeof tokens.color.semantic;
export type ThemeColors = { readonly [Key in keyof typeof tokens.color.semantic.dark]: string };

const paletteByPreference: Record<Exclude<ThemePreference, 'SYSTEM'>, ThemePalette> = {
  LIGHT: 'light',
  DARK: 'dark',
  OCEAN: 'ocean',
  FOREST: 'forest',
  AMETHYST: 'amethyst',
  ROSE: 'rose',
  SUNSET: 'sunset',
};

export function resolveThemePalette(
  preference: ThemePreference,
  systemColorScheme: ColorSchemeName | null | undefined,
): ThemePalette {
  if (preference === 'SYSTEM') return systemColorScheme === 'light' ? 'light' : 'dark';
  return paletteByPreference[preference];
}

export function resolveTheme(
  preference: ThemePreference,
  systemColorScheme: ColorSchemeName | null | undefined,
): ResolvedTheme {
  const palette = resolveThemePalette(preference, systemColorScheme);
  // Logos, poster overlays and the native status bar still need a light/dark mode.
  return palette === 'light' || palette === 'rose' || palette === 'sunset' ? 'light' : 'dark';
}
