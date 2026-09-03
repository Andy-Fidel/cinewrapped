import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Text, TextInput, type TextInputProps, type TextProps } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/providers/auth-provider';
import { FeatureFlagsProvider } from '../src/providers/feature-flags-provider';
import { DialogProvider } from '../src/providers/dialog-provider';
import { ThemeProvider, useTheme } from '../src/providers/theme-provider';

type ComponentWithDefaults<TComponent, TProps> = TComponent & {
  defaultProps?: Partial<TProps>;
};

// Android devices can apply a substantially wider system font scale than iOS. Keep
// labels accessible while preventing fixed navigation and control rows from cropping.
if (Platform.OS === 'android') {
  const androidText = Text as ComponentWithDefaults<typeof Text, TextProps>;
  const androidTextInput = TextInput as ComponentWithDefaults<typeof TextInput, TextInputProps>;
  androidText.defaultProps = {
    ...androidText.defaultProps,
    maxFontSizeMultiplier: 1.15,
  };
  androidTextInput.defaultProps = {
    ...androidTextInput.defaultProps,
    maxFontSizeMultiplier: 1.15,
  };
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes fresh data
            gcTime: 1000 * 60 * 60 * 24, // 24 hours persistent cache retention
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <DialogProvider>
              <FeatureFlagsProvider>
                <ThemedNavigation />
              </FeatureFlagsProvider>
            </DialogProvider>
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
