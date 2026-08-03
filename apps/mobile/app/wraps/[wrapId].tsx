import type { WrapDetail, WrapShareCard, WrapStorySlide } from '@cinewrapped/shared-types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

function accentColor(
  accent: WrapStorySlide['accent'],
  colors: ReturnType<typeof useColors>,
): string {
  if (accent === 'CORAL') return colors.danger;
  if (accent === 'GOLD') return colors.warning;
  if (accent === 'TEAL') return colors.success;
  return colors.brand;
}

export default function WrapStoryScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { wrapId } = useLocalSearchParams<{ wrapId: string }>();
  const [slideIndex, setSlideIndex] = useState(0);
  const wrap = useQuery({
    queryKey: ['wrap', wrapId],
    queryFn: () => api.request<WrapDetail>(`wraps/${encodeURIComponent(wrapId)}`),
    enabled: session !== null && typeof wrapId === 'string',
  });
  const share = useMutation({
    mutationFn: () =>
      api.request<WrapShareCard>(`wraps/${encodeURIComponent(wrapId)}/share-link`, {
        method: 'POST',
        body: { expiresInMinutes: 1_440, slideIndex, privacyAcknowledged: true },
      }),
    onSuccess: async (card) => {
      await Share.share({
        title: card.title,
        message: `${card.title}\n${card.subtitle}\n${card.statValue} ${card.statLabel}\n${card.webUrl}`,
        url: card.deepLink,
      });
    },
  });
  if (session === null) return <Redirect href="/(auth)/login" />;
  const slides = wrap.data?.storySlides ?? [];
  const slide = slides[slideIndex];
  const previous = () => setSlideIndex((index) => Math.max(0, index - 1));
  const next = () => setSlideIndex((index) => Math.min(slides.length - 1, index + 1));
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {slide === undefined ? (
        <View style={styles.center}>
          <Text style={{ color: wrap.isError ? colors.danger : colors.textSecondary }}>
            {wrap.isError ? errorMessage(wrap.error) : 'Loading your wrap…'}
          </Text>
          {wrap.isError ? <Button label="Try again" onPress={() => void wrap.refetch()} /> : null}
        </View>
      ) : (
        <View style={styles.story}>
          <View
            style={styles.progress}
            accessibilityLabel={`Slide ${slideIndex + 1} of ${slides.length}`}
          >
            {slides.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.progressItem,
                  {
                    backgroundColor:
                      index <= slideIndex ? colors.textPrimary : colors.surfaceRaised,
                  },
                ]}
              />
            ))}
          </View>
          <View style={[styles.slide, { backgroundColor: accentColor(slide.accent, colors) }]}>
            <Text style={[styles.eyebrow, { color: colors.onBrand }]}>{slide.eyebrow}</Text>
            {slide.media?.posterUrl === null || slide.media?.posterUrl === undefined ? null : (
              <Image
                source={{ uri: slide.media.posterUrl }}
                resizeMode="cover"
                style={styles.poster}
              />
            )}
            {slide.statValue === null ? null : (
              <Text style={[styles.stat, { color: colors.onBrand }]}>{slide.statValue}</Text>
            )}
            {slide.statLabel === null ? null : (
              <Text style={[styles.statLabel, { color: colors.onBrand }]}>{slide.statLabel}</Text>
            )}
            <Text accessibilityRole="header" style={[styles.title, { color: colors.onBrand }]}>
              {slide.title}
            </Text>
            <Text style={[styles.body, { color: colors.onBrand }]}>{slide.body}</Text>
          </View>
          <View style={styles.controls}>
            <View style={styles.grow}>
              <Button
                disabled={slideIndex === 0}
                label="Previous"
                onPress={previous}
                variant="secondary"
              />
            </View>
            <View style={styles.grow}>
              <Button
                disabled={slideIndex === slides.length - 1}
                label="Next"
                onPress={next}
                variant="secondary"
              />
            </View>
          </View>
          <Button
            label="Share this card"
            loading={share.isPending}
            onPress={() => share.mutate()}
          />
          {share.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(share.error)}
            </Text>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  story: { flex: 1, gap: 14, padding: 18 },
  progress: { flexDirection: 'row', gap: 5 },
  progressItem: { borderRadius: 2, flex: 1, height: 4 },
  slide: {
    alignItems: 'center',
    borderRadius: 24,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 28,
  },
  eyebrow: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, opacity: 0.9 },
  poster: { aspectRatio: 2 / 3, borderRadius: 14, maxHeight: 245, width: 160 },
  stat: { fontSize: 68, fontWeight: '900', letterSpacing: -2 },
  statLabel: { fontSize: 16, fontWeight: '800', opacity: 0.9 },
  title: { fontSize: 30, fontWeight: '900', lineHeight: 35, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23, opacity: 0.9, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
