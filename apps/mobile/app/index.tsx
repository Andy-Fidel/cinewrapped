import { Redirect } from 'expo-router';

import { useAuth } from '../src/providers/auth-provider';

export default function Index() {
  const { session, user, loading } = useAuth();

  if (loading) return null;
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted !== true) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)" />;
}
