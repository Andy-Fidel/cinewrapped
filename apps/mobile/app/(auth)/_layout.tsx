import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeOverride } from '../../src/providers/theme-provider';
import { useAuth } from '../../src/providers/auth-provider';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const recovering = segments.some((segment) => segment === 'update-password');
  if (!loading && session !== null && !recovering) return <Redirect href="/" />;
  return (
    <ThemeOverride theme="light">
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F7F5F0' },
        }}
      />
    </ThemeOverride>
  );
}
