import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useColors } from '../src/components/ui';
import { useAuth } from '../src/providers/auth-provider';

export default function Index() {
  const { session, user, loading } = useAuth();
  const colors = useColors();
  if (loading)
    return (
      <View style={{ backgroundColor: colors.background, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (user?.onboardingCompleted !== true) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)" />;
}
