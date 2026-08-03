import { Redirect, Stack } from 'expo-router';

import { BrandHeader, Button, ErrorText, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/providers/auth-provider';

export default function OnboardingLayout() {
  const { session, user, loading, error, retry, signOut } = useAuth();
  if (loading) {
    return (
      <Screen scroll={false}>
        <BrandHeader title="Loading your profile" body="This should only take a moment." />
      </Screen>
    );
  }
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (user === null) {
    return (
      <Screen scroll={false}>
        <BrandHeader
          title="We couldn't load your profile"
          body="Your sign-in succeeded, but CineWrapped could not prepare your app profile."
        />
        <ErrorText>
          {error ?? 'Check your connection to the CineWrapped development server.'}
        </ErrorText>
        <Button label="Try again" onPress={() => void retry()} />
        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </Screen>
    );
  }
  if (user.onboardingCompleted) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
