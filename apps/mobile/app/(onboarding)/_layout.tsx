import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../src/providers/auth-provider';

export default function OnboardingLayout() {
  const { session, user, loading } = useAuth();
  if (!loading && session === null) return <Redirect href="/(auth)/login" />;
  if (!loading && user?.onboardingCompleted === true) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
