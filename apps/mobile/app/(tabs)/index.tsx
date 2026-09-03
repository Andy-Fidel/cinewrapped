import type {
  ActivityHeatmapSummary,
  CalendarEventSummary,
  LibraryItem,
  RecommendationFeedbackType,
  RecommendationSummary,
  StatisticsSummary,
  TasteProfile,
  WatchlistDetails,
  WatchlistSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '../../src/components/brand-logo';
import {
  HomeBentoRecommendations,
  HomeBentoRecommendationsSkeleton,
} from '../../src/components/home-bento-recommendations';
import {
  NetflixHeroBillboard,
  NetflixHeroBillboardSkeleton,
} from '../../src/components/netflix-hero-billboard';
import {
  NetflixTop10Shelf,
  NetflixTop10ShelfSkeleton,
} from '../../src/components/netflix-top10-shelf';
import { HomeWidgetsHub } from '../../src/components/widgets/home-widgets-hub';
import { NotificationBellButton } from '../../src/components/notification-bell-button';
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
  const statisticsRange = useMemo(() => {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);
    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };
  }, []);
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
  const continueWatching = useQuery({
    queryKey: ['library', 'home-continue-watching'],
    queryFn: () => api.request<LibraryItem[]>('library?status=WATCHING&limit=1'),
    enabled: session !== null,
    staleTime: 60 * 1000,
  });
  const defaultWatchlist = useQuery({
    queryKey: ['watchlists', 'home-default'],
    queryFn: async () => {
      const lists = await api.request<WatchlistSummary[]>('watchlists');
      const defaultList = lists.find((list) => list.isDefault);
      return defaultList === undefined
        ? undefined
        : api.request<WatchlistDetails>(`watchlists/${encodeURIComponent(defaultList.id)}`);
    },
    enabled: session !== null,
    staleTime: 60 * 1000,
  });
  const weeklyStatistics = useQuery({
    queryKey: ['statistics', 'home-weekly', statisticsRange],
    queryFn: () => {
      const query = new URLSearchParams(statisticsRange);
      return api.request<StatisticsSummary>(`statistics/summary?${query.toString()}`);
    },
    enabled: session !== null,
    staleTime: 60 * 1000,
  });
  const activityHeatmap = useQuery({
    queryKey: ['statistics', 'home-heatmap', new Date().getFullYear(), statisticsRange.timezone],
    queryFn: () =>
      api.request<ActivityHeatmapSummary>(
        `statistics/heatmap?year=${new Date().getFullYear()}&timezone=${encodeURIComponent(statisticsRange.timezone)}`,
      ),
    enabled: session !== null,
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
  const watchlistMutation = useMutation({
    mutationFn: (mediaId: string) =>
      api.request('watchlist/items', { method: 'POST', body: { mediaId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
  const finishWatching = useMutation({
    mutationFn: (mediaId: string) =>
      api.request(`library/media/${encodeURIComponent(mediaId)}/status`, {
        method: 'PUT',
        body: { status: 'COMPLETED', progressPercent: 100 },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });
  const upcomingEvent = upcomingEvents.data?.at(0);
  const featuredRecommendation = recommendations.data?.[0];

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
            {/* Netflix Cinematic Hero Billboard */}
            {recommendations.isPending ? (
              <NetflixHeroBillboardSkeleton />
            ) : featuredRecommendation ? (
              <NetflixHeroBillboard
                featured={featuredRecommendation}
                onAddToWatchlist={() => {
                  watchlistMutation.mutate(featuredRecommendation.media.id);
                }}
              />
            ) : null}

            {/* Netflix-Style Top 10 Shelf with Giant Outlined Numbers */}
            {recommendations.isPending ? (
              <NetflixTop10ShelfSkeleton />
            ) : recommendations.data && recommendations.data.length > 0 ? (
              <NetflixTop10Shelf items={recommendations.data} title="Top 10 in CineWrapped Today" />
            ) : null}

            {/* Prestige Cinephile Header: 'Picks for You' */}
            <View
              style={[
                styles.greetingCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.greetingHeaderTop}>
                {/* Eyebrow with CineWrapped Brand Logo & Status Tag */}
                <View style={styles.eyebrowPillRow}>
                  <BrandLogo size="sm" variant="full" />
                  <View style={[styles.algoTag, { backgroundColor: colors.surfaceRaised }]}>
                    <Ionicons name="sparkles" size={11} color="#F59E0B" />
                    <Text style={[styles.algoTagText, { color: colors.textSecondary }]}>
                      Daily Refreshed
                    </Text>
                  </View>
                </View>

                {/* Action Icons: Notification Bell & Prestige Avatar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <NotificationBellButton />

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/insights')}
                    style={({ pressed }) => [
                      styles.avatarRing,
                      { borderColor: colors.brand, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    {user?.avatarUrl ? (
                      <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
                    ) : (
                      <View
                        style={[
                          styles.userAvatarFallback,
                          { backgroundColor: colors.surfaceRaised },
                        ]}
                      >
                        <Ionicons name="person" size={18} color={colors.brand} />
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Dynamic Title with Highlighted User Name */}
              <View style={styles.titleWrap}>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.textPrimary }]}
                >
                  Picks for{' '}
                  <Text style={[styles.titleNameHighlight, { color: colors.brand }]}>
                    {user?.displayName ?? 'You'}
                  </Text>
                </Text>
              </View>

              {/* Editorial Subtitle with Spec Dot */}
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Bespoke selections engineered from your watch logs, favorites, and ratings.
              </Text>
            </View>

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

            {/* Home-Screen Widgets Hub (Continue Watching, Daily Pick, Watchlist, Stats, Countdown) */}
            <HomeWidgetsHub
              recommendations={recommendations.data}
              upcomingEvents={upcomingEvents.data}
              continueWatching={continueWatching.data?.[0]}
              defaultWatchlist={defaultWatchlist.data}
              weeklyStatistics={weeklyStatistics.data}
              weeklyActivity={activityHeatmap.data?.days.filter(
                (day) =>
                  day.date >= statisticsRange.periodStart.slice(0, 10) &&
                  day.date <= statisticsRange.periodEnd.slice(0, 10),
              )}
              onAddToWatchlist={(mediaId) => watchlistMutation.mutate(mediaId)}
              onFinishWatching={(mediaId) => finishWatching.mutate(mediaId)}
            />

            {/* Weekly Cinema Trivia Banner */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/trivia')}
              style={({ pressed }) => [
                styles.triviaBanner,
                {
                  backgroundColor: colors.surface,
                  borderColor: '#F59E0B',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.triviaIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="trophy" size={24} color="#F59E0B" />
              </View>
              <View style={styles.triviaCopy}>
                <View style={styles.triviaEyebrowRow}>
                  <Text style={[styles.triviaEyebrow, { color: '#F59E0B' }]}>WEEKLY TRIVIA</Text>
                  <View
                    style={[styles.triviaPointsPill, { backgroundColor: colors.surfaceRaised }]}
                  >
                    <Text style={{ color: colors.brand, fontSize: 10, fontWeight: '800' }}>
                      +150 PTS
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={[styles.triviaTitle, { color: colors.textPrimary }]}>
                  Christopher Nolan Masterclass
                </Text>
                <Text style={[styles.triviaSub, { color: colors.textSecondary }]}>
                  3 questions · Unlock the Golden Projector 3D Trophy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
            </Pressable>

            {/* Personalized Bento Grid Recommendations Matrix */}
            {recommendations.isPending ? (
              <HomeBentoRecommendationsSkeleton />
            ) : recommendations.data && recommendations.data.length > 0 ? (
              <HomeBentoRecommendations
                items={recommendations.data}
                tasteProfile={taste.data}
                onAddToWatchlist={(mediaId) => watchlistMutation.mutate(mediaId)}
                onFeedback={(recId, type) =>
                  feedback.mutate({ recommendationId: recId, feedbackType: type })
                }
              />
            ) : null}

            {refresh.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                Recommendations could not be refreshed yet.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          recommendations.data && recommendations.data.length > 0 ? null : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {recommendations.isPending
                  ? 'Building your recommendations…'
                  : 'More signals needed'}
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
          )
        }
        renderItem={() => null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { padding: 16 },
  header: { gap: 14, marginBottom: 18 },
  greetingCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
    padding: 16,
  },
  greetingHeaderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  eyebrowPillRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  algoTag: {
    alignItems: 'center',
    borderRadius: 999,
    flexShrink: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  algoTagText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  avatarRing: {
    borderRadius: 22,
    borderWidth: 2,
    padding: 2,
  },
  userAvatar: { borderRadius: 18, height: 36, width: 36 },
  userAvatarFallback: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  titleWrap: {
    marginTop: 2,
  },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32 },
  titleNameHighlight: { fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  taste: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 },
  tasteHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  tasteHeaderTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  tasteTitle: { flexShrink: 1, fontSize: 17, fontWeight: '700' },
  confidenceBadge: {
    borderRadius: 8,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { borderRadius: 999, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 6 },
  statsSummaryRow: { marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  gridItemText: { flexShrink: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
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
  triviaBanner: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  triviaIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  triviaCopy: { flex: 1, gap: 2 },
  triviaEyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  triviaEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  triviaPointsPill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  triviaTitle: { fontSize: 15, fontWeight: '800' },
  triviaSub: { fontSize: 12, lineHeight: 16 },
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
