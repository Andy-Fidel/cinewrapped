import { Redirect, Tabs } from 'expo-router';

import { useColors } from '../../src/components/ui';
import { useAuth } from '../../src/providers/auth-provider';

export default function TabsLayout() {
  const colors = useColors();
  const { session, user, loading } = useAuth();
  if (!loading && session === null) return <Redirect href="/(auth)/login" />;
  if (!loading && user?.onboardingCompleted !== true) return <Redirect href="/(onboarding)" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', headerShown: false }} />
      <Tabs.Screen name="social" options={{ title: 'Social', headerShown: false }} />
      <Tabs.Screen name="library" options={{ title: 'Library', headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
