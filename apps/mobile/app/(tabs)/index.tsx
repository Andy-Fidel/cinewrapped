import type {
  RecommendationFeedbackType,
  RecommendationSummary,
  TasteProfile,
} from '@cinewrapped/shared-types';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaCard } from '../../src/components/media-card';
import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

export default function HomeScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const taste = useQuery({
    queryKey: ['taste-profile'],
    queryFn: () => api.request<TasteProfile>('recommendations/taste-profile'),
    staleTime: 5 * 60 * 1000,
  });
  const recommendations = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => api.request<RecommendationSummary[]>('recommendations?limit=30'),
    staleTime: 5 * 60 * 1000,
  });
  const refresh = useMutation({
    mutationFn: () => api.request('recommendations/refresh', { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
        queryClient.invalidateQueries({ queryKey: ['taste-profile'] }),
      ]);
    },
  });
  const feedback = useMutation({
    mutationFn: ({
      recommendationId,
      feedbackType,
    }: {
      recommendationId: string;
      feedbackType: RecommendationFeedbackType;
    }) =>
      api.request(`recommendations/${recommendationId}/feedback`, {
        method: 'POST',
        body: { feedbackType },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
        queryClient.invalidateQueries({ queryKey: ['taste-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
      ]);
    },
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlashList
        data={recommendations.data ?? []}
        keyExtractor={(item) => item.id}
        onRefresh={() => void recommendations.refetch()}
        refreshing={recommendations.isRefetching}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.brand }]}>FOR YOU</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Picks for {user?.displayName ?? 'you'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Deterministic recommendations built from your choices and activity—not generated
              opinions.
            </Text>
            {taste.data === undefined ? null : (
              <View
                style={[
                  styles.taste,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.tasteHeader}>
                  <Text style={[styles.tasteTitle, { color: colors.textPrimary }]}>
                    Your taste profile
                  </Text>
                  <Text style={{ color: colors.brand, fontWeight: '700' }}>
                    {taste.data.confidence}
                  </Text>
                </View>
                <View style={styles.genres}>
                  {taste.data.topGenres.slice(0, 5).map((genre) => (
                    <View
                      key={genre.genreId}
                      style={[styles.genre, { backgroundColor: colors.surfaceRaised }]}
                    >
                      <Text style={{ color: colors.textPrimary }}>{genre.name}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {taste.data.signalCounts.favorites} favorites · {taste.data.signalCounts.ratings}{' '}
                  ratings · {taste.data.signalCounts.completedTitles} completed
                </Text>
              </View>
            )}
            <Button
              label="Refresh recommendations"
              variant="secondary"
              loading={refresh.isPending}
              onPress={() => refresh.mutate()}
            />
            <Button
              label="Ask the discovery assistant"
              onPress={() => router.push('/ai')}
              variant="secondary"
            />
            <Button
              label="View statistics & wraps"
              onPress={() => router.push('/insights')}
              variant="secondary"
            />
            <Button
              label="Achievements & movie passport"
              onPress={() => router.push('/gamification')}
              variant="secondary"
            />
            {refresh.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                Recommendations could not be refreshed yet.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {recommendations.isPending ? 'Building your recommendations…' : 'More signals needed'}
            </Text>
            <Text
              style={{
                color: recommendations.isError ? colors.danger : colors.textSecondary,
                textAlign: 'center',
              }}
            >
              {recommendations.isError
                ? 'Your recommendations could not be loaded. Check that recommendations are enabled in Settings.'
                : 'Discover, rate, or complete more titles to improve your recommendations.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <MediaCard media={item.media} />
            <View style={styles.cardCopy}>
              <Text style={[styles.kind, { color: colors.brand }]}>
                {item.recommendationType === 'HIDDEN_GEM' ? 'HIDDEN GEM' : 'MATCH FOR YOU'} ·{' '}
                {Math.round(item.score * 100)}%
              </Text>
              <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                {item.explanation}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={feedback.isPending}
                  onPress={() =>
                    feedback.mutate({ recommendationId: item.id, feedbackType: 'SAVED' })
                  }
                  style={[styles.action, { backgroundColor: colors.brand }]}
                >
                  <Text style={{ color: colors.onBrand, fontWeight: '700' }}>Save</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={feedback.isPending}
                  onPress={() =>
                    feedback.mutate({ recommendationId: item.id, feedbackType: 'DISMISSED' })
                  }
                  style={[styles.action, { backgroundColor: colors.surfaceRaised }]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Not for me</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { padding: 16 },
  header: { gap: 14, marginBottom: 18 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { fontSize: 16, lineHeight: 23 },
  taste: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 },
  tasteHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tasteTitle: { fontSize: 18, fontWeight: '700' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  card: { borderRadius: 18, borderWidth: 1, marginBottom: 18, overflow: 'hidden', padding: 12 },
  cardCopy: { gap: 10, paddingHorizontal: 6, paddingBottom: 4 },
  kind: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  explanation: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { alignItems: 'center', borderRadius: 10, flex: 1, padding: 12 },
  empty: { alignItems: 'center', gap: 9, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
});
