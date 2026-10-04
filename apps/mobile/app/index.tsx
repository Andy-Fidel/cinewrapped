import { useEffect, useState } from 'react';
import { clearShareDestination, getShareDestination } from '../src/lib/share-destination';
import { Redirect } from 'expo-router';

import { useAuth } from '../src/providers/auth-provider';

export default function Index() {
  const [sharedPath] = useState(getShareDestination);
  const { session, user, loading } = useAuth();

  useEffect(() => {
    if (session !== null && user?.onboardingCompleted === true && sharedPath)
      clearShareDestination();
  }, [session, user?.onboardingCompleted, sharedPath]);
  if (loading) return null;
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted !== true) return <Redirect href="/(onboarding)" />;
  if (sharedPath) return <Redirect href={sharedPath as `/media/${string}` | '/trivia'} />;
  return <Redirect href="/(tabs)" />;
}
