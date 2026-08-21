import type { StoryPresentation, StorySlideData, WrapDetail } from '@cinewrapped/shared-types';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoryViewer } from '../../src/components/story-presentation';
import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

export default function WrapStoryScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const { wrapId } = useLocalSearchParams<{ wrapId: string }>();

  const wrap = useQuery({
    queryKey: ['wrap', wrapId],
    queryFn: () => api.request<WrapDetail>(`wraps/${encodeURIComponent(wrapId)}`),
    enabled: session !== null && typeof wrapId === 'string',
  });

  const presentation: StoryPresentation | null = useMemo(() => {
    if (!wrap.data) return null;

    const wrapYear = new Date(wrap.data.periodStart).getFullYear() || 2026;
    const rawSlides = wrap.data.storySlides ?? [];
    const formattedSlides: StorySlideData[] = rawSlides.map((s, idx) => {
      // Map accent to theme preset
      const themePreset =
        s.accent === 'CORAL'
          ? 'CRIMSON_NOIR'
          : s.accent === 'GOLD'
            ? 'MIDNIGHT_GOLD'
            : s.accent === 'TEAL'
              ? 'EMERALD_VAULT'
              : 'AMETHYST_DREAM';

      const slideObj: StorySlideData = {
        id: s.id ?? `slide-${idx}`,
        layout: s.media?.posterUrl ? 'CINEMATIC_POSTER' : 'HERO_STATS',
        theme: themePreset,
        eyebrow: s.eyebrow ?? 'CINEMA WRAPPED',
        headline: s.title,
        description: s.body,
        footer: {
          branding: 'CineWrapped Annual Intelligence',
          handle: user ? `@${user.username}` : '@cinewrapped',
          badgeText: `${wrapYear} Verified Wrap`,
        },
      };

      if (s.media) {
        slideObj.media = {
          title: s.media.title,
          posterUrl: s.media.posterUrl ?? null,
        };
      }

      if (s.statValue) {
        slideObj.metric = {
          value: s.statValue,
          label: s.statLabel ?? 'KEY STATISTIC',
        };
      }

      return slideObj;
    });

    return {
      id: wrap.data.id,
      type: 'ANNUAL_WRAP',
      title: `${wrapYear} Cinema Wrapped`,
      subtitle: `${user?.displayName ?? 'Your'} Year in Review`,
      year: wrapYear,
      author: {
        userId: user?.id ?? 'user-id',
        displayName: user?.displayName ?? 'Cinema Enthusiast',
        username: user?.username ?? 'cinephile',
        avatarUrl: user?.avatarUrl ?? null,
      },
      slides: formattedSlides.length > 0 ? formattedSlides : [],
      defaultTheme: 'MIDNIGHT_GOLD',
      createdAt: wrap.data.generatedAt ?? new Date().toISOString(),
    };
  }, [wrap.data, user]);

  if (session === null) return <Redirect href="/(auth)/login" />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0A0912' }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {wrap.isPending ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Preparing your Cinema Story…</Text>
        </View>
      ) : wrap.isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.danger }}>{errorMessage(wrap.error)}</Text>
          <Button label="Try again" onPress={() => void wrap.refetch()} />
        </View>
      ) : presentation && presentation.slides.length > 0 ? (
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
      ) : (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>No wrap slides found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
});
