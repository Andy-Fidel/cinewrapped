import { Ionicons } from '@expo/vector-icons';
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? 'home' : 'home-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          headerShown: false,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? 'compass' : 'compass-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          headerShown: false,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? 'people' : 'people-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerShown: false,
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? 'bookmark' : 'bookmark-outline'} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons color={color} name={focused ? 'settings' : 'settings-outline'} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
