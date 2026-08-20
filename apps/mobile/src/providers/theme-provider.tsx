import type { ThemePreference, UserPreferences } from '@cinewrapped/shared-types';
import { tokens } from '@cinewrapped/ui-tokens';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { api } from '../lib/api';
import { resolveTheme, type ResolvedTheme } from '../lib/theme';
import { useAuth } from './auth-provider';

type ThemeColors = (typeof tokens.color.semantic)['light'] | (typeof tokens.color.semantic)['dark'];

interface ThemeContextValue {
  colors: ThemeColors;
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preferencesQueryKey = useMemo(
    () => ['preferences', user?.id ?? 'anonymous'] as const,
    [user?.id],
  );
  const preferences = useQuery({
    queryKey: preferencesQueryKey,
    queryFn: () => api.request<UserPreferences>('users/me/preferences'),
    enabled: user !== null,
  });
  const preference = preferences.data?.theme ?? 'SYSTEM';
  const resolvedTheme = resolveTheme(preference, systemColorScheme);
  const colors = tokens.color.semantic[resolvedTheme];

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      preference,
      resolvedTheme,
      setPreference: async (nextPreference) => {
        const updated = await api.request<UserPreferences>('users/me/preferences', {
          method: 'PATCH',
          body: { theme: nextPreference },
        });
        queryClient.setQueryData(preferencesQueryKey, updated);
      },
    }),
    [colors, preference, preferencesQueryKey, queryClient, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeOverride({
  theme,
  children,
}: {
  theme: ResolvedTheme;
  children: React.ReactNode;
}) {
  const colors = tokens.color.semantic[theme];
  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      preference: theme === 'light' ? 'LIGHT' : 'DARK',
      resolvedTheme: theme,
      setPreference: async () => {},
    }),
    [colors, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) throw new Error('useTheme must be used inside ThemeProvider.');
  return value;
}
