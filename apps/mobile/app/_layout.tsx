import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '../src/components/app-loading-screen';
import { AuthProvider, useAuth } from '../src/providers/auth-provider';
import { FeatureFlagsProvider } from '../src/providers/feature-flags-provider';
import { DialogProvider } from '../src/providers/dialog-provider';
import { ThemeProvider, useTheme } from '../src/providers/theme-provider';

type ComponentWithDefaults<TComponent, TProps> = TComponent & {
  defaultProps?: Partial<TProps>;
};

// Keep Android typography aligned with the dimensions the cross-platform controls
// were designed for. OEM font substitutions and display scaling otherwise cause
// Yoga's measured labels to be cropped even when the visible control has room.
if (Platform.OS === 'android') {
  const androidText = Text as ComponentWithDefaults<typeof Text, TextProps>;
  const androidTextInput = TextInput as ComponentWithDefaults<typeof TextInput, TextInputProps>;
  androidText.defaultProps = {
    ...androidText.defaultProps,
    maxFontSizeMultiplier: 1,
    style: [{ fontFamily: 'sans-serif' }, androidText.defaultProps?.style],
  };
  androidTextInput.defaultProps = {
    ...androidTextInput.defaultProps,
    maxFontSizeMultiplier: 1,
    style: [{ fontFamily: 'sans-serif' }, androidTextInput.defaultProps?.style],
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
  const { loading } = useAuth();
  const [launchComplete, setLaunchComplete] = useState(false);
  const finishLaunch = useCallback(() => setLaunchComplete(true), []);
  return (
    <View style={styles.navigationRoot}>
      <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      {launchComplete ? null : (
        <View style={styles.launchOverlay}>
          <AppLoadingScreen ready={!loading} onFinished={finishLaunch} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navigationRoot: { flex: 1 },
  launchOverlay: { ...StyleSheet.absoluteFill, elevation: 100, zIndex: 100 },
});
