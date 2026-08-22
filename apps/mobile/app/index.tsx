import { Redirect } from 'expo-router';
import { useCallback, useState } from 'react';

import { AppLoadingScreen } from '../src/components/app-loading-screen';
import { useAuth } from '../src/providers/auth-provider';

export default function Index() {
  const { session, user, loading } = useAuth();
  const [launchComplete, setLaunchComplete] = useState(false);
  const finishLaunch = useCallback(() => setLaunchComplete(true), []);

  if (!launchComplete) return <AppLoadingScreen ready={!loading} onFinished={finishLaunch} />;
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted !== true) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)" />;
}
