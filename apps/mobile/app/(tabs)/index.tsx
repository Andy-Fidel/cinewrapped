import type {
  CalendarEventSummary,
  RecommendationFeedbackType,
  RecommendationSummary,
  TasteProfile,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaCard } from '../../src/components/media-card';
import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';
import { useFeatureFlags } from '../../src/providers/feature-flags-provider';

export default function HomeScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const calendarEnabled = isEnabled('CALENDAR_INTEGRATION');
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
  const upcomingEvents = useQuery({
    queryKey: ['calendar', 'home-preview'],
    queryFn: () => {
      const from = new Date();
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      return api.request<CalendarEventSummary[]>(
        `calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      );
    },
    enabled: session !== null && calendarEnabled,
    staleTime: 60 * 1000,
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
  const upcomingEvent = upcomingEvents.data?.at(0);

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
            {/* Header Title with User Greeting & Avatar */}
            <View style={styles.greetingRow}>
              <View style={styles.greetingTextWrap}>
                <Text style={[styles.eyebrow, { color: colors.brand }]}>FOR YOU</Text>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.textPrimary }]}
                >
                  Picks for {user?.displayName ?? 'you'}
                </Text>
              </View>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
              ) : (
                <View
                  style={[styles.userAvatarFallback, { backgroundColor: colors.surfaceRaised }]}
                >
                  <Ionicons name="person" size={20} color={colors.brand} />
                </View>
              )}
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Deterministic recommendations built from your choices and activity—not generated
              opinions.
            </Text>

            {/* Taste Profile Card */}
            {taste.data === undefined ? null : (
              <View
                style={[
                  styles.taste,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.tasteHeader}>
                  <View style={styles.tasteHeaderTitleRow}>
                    <Ionicons name="sparkles" size={18} color={colors.brand} />
                    <Text style={[styles.tasteTitle, { color: colors.textPrimary }]}>
                      Your Taste Profile
                    </Text>
                  </View>
                  <View style={[styles.confidenceBadge, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={[styles.confidenceText, { color: colors.brand }]}>
                      🎯 {taste.data.confidence}
                    </Text>
                  </View>
                </View>

                <View style={styles.genres}>
                  {taste.data.topGenres.slice(0, 5).map((genre) => (
                    <View
                      key={genre.genreId}
                      style={[styles.genre, { backgroundColor: colors.surfaceRaised }]}
                    >
                      <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                        {genre.name}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.statsSummaryRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    ⭐ {taste.data.signalCounts.favorites} favorites · 💬{' '}
                    {taste.data.signalCounts.ratings} ratings · 🍿{' '}
                    {taste.data.signalCounts.completedTitles} completed
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Action Grid */}
            <View style={styles.quickGrid}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/ai')}
                style={({ pressed }) => [
                  styles.gridItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="sparkles-outline" size={20} color={colors.brand} />
                <Text style={[styles.gridItemText, { color: colors.textPrimary }]}>
                  AI Assistant
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/insights')}
                style={({ pressed }) => [
                  styles.gridItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="analytics-outline" size={20} color={colors.brand} />
                <Text style={[styles.gridItemText, { color: colors.textPrimary }]}>
                  Stats & Wraps
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/gamification')}
                style={({ pressed }) => [
                  styles.gridItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="ribbon-outline" size={20} color={colors.brand} />
                <Text style={[styles.gridItemText, { color: colors.textPrimary }]}>Passport</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={refresh.isPending}
                onPress={() => refresh.mutate()}
                style={({ pressed }) => [
                  styles.gridItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed || refresh.isPending ? 0.8 : 1,
                  },
                ]}
              >
                {refresh.isPending ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color={colors.brand} />
                )}
                <Text style={[styles.gridItemText, { color: colors.textPrimary }]}>
                  Refresh Picks
                </Text>
              </Pressable>

              {calendarEnabled ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/calendar')}
                  style={({ pressed }) => [
                    styles.gridItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.brand} />
                  <Text style={[styles.gridItemText, { color: colors.textPrimary }]}>Calendar</Text>
                </Pressable>
              ) : null}
            </View>

            {calendarEnabled ? (
              <Pressable
                accessibilityHint={
                  upcomingEvents.isError
                    ? 'Retries loading your viewing calendar'
                    : 'Opens your complete viewing calendar'
                }
                accessibilityRole="button"
                onPress={() =>
                  upcomingEvents.isError ? void upcomingEvents.refetch() : router.push('/calendar')
                }
                style={({ pressed }) => [
                  styles.calendarPreview,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.calendarIcon, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="calendar" size={22} color={colors.brand} />
                </View>
                <View style={styles.calendarCopy}>
                  <Text style={[styles.calendarLabel, { color: colors.brand }]}>UP NEXT</Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.calendarTitle, { color: colors.textPrimary }]}
                  >
                    {upcomingEvents.isError
                      ? 'Calendar unavailable'
                      : upcomingEvents.isPending
                        ? 'Loading your viewing calendar…'
                        : (upcomingEvent?.title ?? 'Plan your next movie night')}
                  </Text>
                  <Text style={[styles.calendarDate, { color: colors.textSecondary }]}>
                    {upcomingEvents.isError
                      ? 'Tap to retry'
                      : upcomingEvent === undefined
                        ? 'No plans in the next 30 days'
                        : new Date(upcomingEvent.startsAt).toLocaleString()}
                  </Text>
                </View>
                <Ionicons
                  name={upcomingEvents.isError ? 'refresh' : 'chevron-forward'}
                  size={20}
                  color={upcomingEvents.isError ? colors.danger : colors.textDisabled}
                />
              </Pressable>
            ) : null}

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
              <View style={styles.kindRow}>
                <View
                  style={[
                    styles.matchBadge,
                    {
                      backgroundColor:
                        item.recommendationType === 'HIDDEN_GEM'
                          ? 'rgba(255, 215, 0, 0.15)'
                          : colors.surfaceRaised,
                    },
                  ]}
                >
                  <Text style={[styles.kind, { color: colors.brand }]}>
                    {item.recommendationType === 'HIDDEN_GEM' ? '💎 HIDDEN GEM' : '🎯 MATCH'} ·{' '}
                    {Math.round(item.score * 100)}%
                  </Text>
                </View>
              </View>

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
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: colors.brand,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="bookmark-outline" size={16} color={colors.onBrand} />
                  <Text style={{ color: colors.onBrand, fontWeight: '700' }}>Save</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={feedback.isPending}
                  onPress={() =>
                    feedback.mutate({ recommendationId: item.id, feedbackType: 'DISMISSED' })
                  }
                  style={({ pressed }) => [
                    styles.action,
                    {
                      backgroundColor: colors.surfaceRaised,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.textPrimary} />
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
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greetingTextWrap: { flex: 1, gap: 4 },
  userAvatar: { borderRadius: 22, height: 44, width: 44 },
  userAvatarFallback: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  taste: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 },
  tasteHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  tasteHeaderTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  tasteTitle: { fontSize: 17, fontWeight: '700' },
  confidenceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  statsSummaryRow: { marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    width: '48%',
  },
  gridItemText: { fontSize: 13, fontWeight: '700' },
  calendarPreview: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  calendarIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  calendarCopy: { flex: 1, gap: 2 },
  calendarLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  calendarTitle: { fontSize: 15, fontWeight: '800' },
  calendarDate: { fontSize: 12 },
  card: { borderRadius: 18, borderWidth: 1, marginBottom: 18, overflow: 'hidden', padding: 12 },
  cardCopy: { gap: 10, paddingHorizontal: 6, paddingBottom: 4 },
  kindRow: { flexDirection: 'row' },
  matchBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  kind: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  explanation: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', gap: 9, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
});
