import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/providers/auth-provider';
import { FeatureFlagsProvider } from '../src/providers/feature-flags-provider';
import { ThemeProvider, useTheme } from '../src/providers/theme-provider';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <FeatureFlagsProvider>
              <ThemedNavigation />
            </FeatureFlagsProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigation() {
  const { colors, resolvedTheme } = useTheme();
  return (
    <>
      <StatusBar
        backgroundColor={colors.background}
        style={resolvedTheme === 'light' ? 'dark' : 'light'}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
