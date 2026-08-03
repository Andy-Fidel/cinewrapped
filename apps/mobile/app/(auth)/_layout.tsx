import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '../../src/providers/auth-provider';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const recovering = segments.some((segment) => segment === 'update-password');
  if (!loading && session !== null && !recovering) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
