import type { StoryPresentation } from '@cinewrapped/shared-types';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { StoryViewer, generateAnnualWrapPresentation } from '../../src/components/story-presentation';
import { useAuth } from '../../src/providers/auth-provider';

export default function StoryPresentationScreen() {
  const { session, user } = useAuth();
  const { presentationId, year } = useLocalSearchParams<{
    presentationId?: string;
    year?: string;
  }>();

  const presentation: StoryPresentation = useMemo(() => {
    return generateAnnualWrapPresentation({
      user: {
        userId: user?.id ?? 'guest-user',
        displayName: user?.displayName ?? 'Cinema Enthusiast',
        username: user?.username ?? 'cinephile',
        avatarUrl: user?.avatarUrl ?? null,
      },
      year: year ? parseInt(year, 10) : 2026,
    });
  }, [user, year]);

  if (session === null) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StoryViewer
        presentation={presentation}
        onClose={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0912',
  },
});
