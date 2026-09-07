import type { ThemePreference } from '@cinewrapped/shared-types';
import type { ColorSchemeName } from 'react-native';

export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(
  preference: ThemePreference,
  systemColorScheme: ColorSchemeName | null | undefined,
): ResolvedTheme {
  if (preference === 'LIGHT') return 'light';
  if (preference === 'DARK') return 'dark';
  return systemColorScheme === 'light' ? 'light' : 'dark';
}
