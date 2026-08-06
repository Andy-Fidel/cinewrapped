import type {
  MonthlyWatchCount,
  MovieDnaProfile,
  StatisticsSummary,
  TasteStatistics,
  WrapDetail,
  WrapSummary,
  WrapType,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovieDna3D } from '../../src/components/movie-dna-3d';
import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { yearPeriod } from '../../src/lib/period';
import { useAuth } from '../../src/providers/auth-provider';

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Trend({ months }: { months: MonthlyWatchCount[] }) {
  const colors = useColors();
  const maximum = Math.max(1, ...months.map((month) => month.viewingCount));
  return (
    <View style={styles.trend} accessibilityLabel="Monthly viewing trend">
      {months.map((month) => {
        const heightPercent = Math.max(8, (month.viewingCount / maximum) * 100);
        return (
          <View key={month.month} style={styles.trendItem}>
            <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }}>
              {month.viewingCount}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceRaised }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: month.viewingCount > 0 ? colors.brand : colors.border,
                    height: `${heightPercent}%`,
                  },
                ]}
              />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '600' }}>
              {month.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function WrapCard({ wrap }: { wrap: WrapSummary }) {
  const colors = useColors();
  const isCompleted = wrap.status === 'COMPLETED';
  const isGenerating = wrap.status === 'PENDING' || wrap.status === 'GENERATING';
  const statusLabel =
    wrap.status === 'FAILED'
      ? 'Generation failed'
      : isGenerating
        ? 'Generating your wrap…'
        : wrap.headline;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!isCompleted}
      onPress={() => router.push(`/wraps/${wrap.id}`)}
      style={({ pressed }) => [
        styles.wrapCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed || !isCompleted ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.wrapIconBox, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons
          name={wrap.wrapType === 'YEARLY' ? 'sparkles' : 'calendar'}
          size={20}
          color={colors.brand}
        />
      </View>

      <View style={styles.grow}>
        <View style={styles.wrapBadgeRow}>
          <Text style={[styles.wrapTypePill, { color: colors.brand }]}>
            {wrap.wrapType} WRAP
          </Text>
        </View>
        <Text style={[styles.wrapHeadline, { color: colors.textPrimary }]}>
          {wrap.headline ?? statusLabel}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {new Date(wrap.periodStart).toLocaleDateString()} –{' '}
          {new Date(wrap.periodEnd).toLocaleDateString()}
        </Text>
      </View>

      {isCompleted ? (
        <Ionicons name="chevron-forward-outline" size={20} color={colors.brand} />
      ) : isGenerating ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : (
        <Ionicons
          accessibilityLabel="Wrap generation failed"
          name="alert-circle-outline"
          size={22}
          color={colors.danger}
        />
      )}
    </Pressable>
  );
}

export default function InsightsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const year = new Date().getFullYear();
  const timezone = user?.timezone ?? 'UTC';
  const period = yearPeriod(year, timezone);
  const periodQuery = `periodStart=${encodeURIComponent(period.periodStart)}&periodEnd=${encodeURIComponent(period.periodEnd)}&timezone=${encodeURIComponent(timezone)}`;

  const summary = useQuery({
    queryKey: ['statistics-summary', year, timezone],
    queryFn: () => api.request<StatisticsSummary>(`statistics/summary?${periodQuery}`),
    enabled: session !== null,
  });

  const monthly = useQuery({
    queryKey: ['statistics-monthly', year, timezone],
    queryFn: () =>
      api.request<MonthlyWatchCount[]>(
        `statistics/monthly?year=${year}&timezone=${encodeURIComponent(timezone)}`,
      ),
    enabled: session !== null,
  });

  const taste = useQuery({
    queryKey: ['statistics-taste', year, timezone],
    queryFn: () => api.request<TasteStatistics>(`statistics/taste?${periodQuery}`),
    enabled: session !== null,
  });

  const wraps = useQuery({
    queryKey: ['wrap-archive'],
    queryFn: () => api.request<WrapSummary[]>('wraps?limit=30'),
    enabled: session !== null,
  });

  const movieDna = useQuery({
    queryKey: ['movie-dna'],
    queryFn: () => api.request<MovieDnaProfile>('ai/movie-dna'),
    enabled: session !== null,
  });

  const generate = useMutation({
    mutationFn: (type: Exclude<WrapType, 'CUSTOM'>) =>
      api.request<WrapDetail>('wraps', {
        method: 'POST',
        body: { type, timezone, inputVersion: 1 },
      }),
    onSuccess: async (wrap) => {
      await queryClient.invalidateQueries({ queryKey: ['wrap-archive'] });
      router.push(`/wraps/${wrap.id}`);
    },
  });

  if (session === null) return <Redirect href="/(auth)/login" />;
  const isRefreshing =
    summary.isRefetching ||
    monthly.isRefetching ||
    taste.isRefetching ||
    movieDna.isRefetching ||
    wraps.isRefetching;

  const refresh = () =>
    void Promise.all([
      summary.refetch(),
      monthly.refetch(),
      taste.refetch(),
      movieDna.refetch(),
      wraps.refetch(),
    ]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Statistics & Wraps',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.brand} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.brand }]}>YOUR {year}</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Your viewing story, by the numbers
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
              Calculated from your logged activity in {timezone}.
            </Text>
          </View>

          {summary.data === undefined ? null : (
            <>
              {/* Key Metrics Grid */}
              <View style={styles.metrics}>
                <Metric icon="film-outline" label="viewings" value={summary.data.viewingCount} />
                <Metric icon="library-outline" label="unique titles" value={summary.data.uniqueTitles} />
                <Metric icon="time-outline" label="hours watched" value={summary.data.totalHours} />
                <Metric icon="flame-outline" label="day streak" value={summary.data.longestStreakDays} />
              </View>

              {/* Monthly Trend Panel */}
              <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.panelHeaderRow}>
                  <Ionicons name="bar-chart-outline" size={20} color={colors.brand} />
                  <Text style={[styles.heading, { color: colors.textPrimary }]}>Monthly Trend</Text>
                </View>
                <Trend months={monthly.data ?? []} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                  Text summary: {summary.data.viewingCount} viewings across{' '}
                  {summary.data.activeDays} active days, including {summary.data.movieViewings}{' '}
                  movie and {summary.data.tvViewings} TV viewings.
                </Text>
              </View>

              {/* Taste Details Panel */}
              <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.panelHeaderRow}>
                  <Ionicons name="pie-chart-outline" size={20} color={colors.brand} />
                  <Text style={[styles.heading, { color: colors.textPrimary }]}>Taste Details</Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Sample: {taste.data?.sampleSize ?? 0} logged viewings
                </Text>
                <View style={styles.chips}>
                  {(taste.data?.genres ?? []).slice(0, 6).map((genre) => (
                    <View
                      key={genre.id}
                      style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>
                        {genre.label} · {genre.count}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.bucketList}>
                  {(taste.data?.runtimeBuckets ?? []).map((bucket) => (
                    <View key={bucket.id} style={[styles.bucketRow, { backgroundColor: colors.surfaceRaised }]}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                        {bucket.label}
                      </Text>
                      <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 13 }}>
                        {bucket.count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {summary.isError || monthly.isError || taste.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(summary.error ?? monthly.error ?? taste.error)}
            </Text>
          ) : null}

          {/* Movie DNA Section */}
          {movieDna.data === undefined ? null : (
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.dnaHeader}>
                <View style={styles.grow}>
                  <Text style={[styles.eyebrow, { color: colors.brand }]}>MOVIE DNA</Text>
                  <Text style={[styles.heading, { color: colors.textPrimary }]}>
                    {movieDna.data.label}
                  </Text>
                </View>
                <View style={[styles.confidenceBadge, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 12 }}>
                    🎯 {movieDna.data.confidence}
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {movieDna.data.sampleSize} completed-title signals · {movieDna.data.notice}
              </Text>
              <MovieDna3D traits={movieDna.data.traits} label={movieDna.data.label} />
              {movieDna.data.traits.map((item) => (
                <View key={item.key} style={[styles.dnaTrait, { borderColor: colors.border }]}>
                  <View style={styles.grow}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '800' }}>
                      {item.value}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
                      {item.explanation}
                    </Text>
                  </View>
                  <View style={[styles.evidenceBadge, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 12 }}>
                      {item.evidenceCount} signals
                    </Text>
                  </View>
                </View>
              ))}
              {movieDna.data.traits.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  Complete and rate more titles to reveal grounded traits.
                </Text>
              ) : null}
            </View>
          )}

          {movieDna.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(movieDna.error)}
            </Text>
          ) : null}

          {/* Create a Wrap Section */}
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.panelHeaderRow}>
              <Ionicons name="sparkles-outline" size={20} color={colors.brand} />
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Create a Wrap</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              Generate a factual story from the current calendar period.
            </Text>
            <View style={styles.generateActions}>
              {[
                { type: 'WEEKLY', label: 'Weekly', icon: 'flash-outline' },
                { type: 'MONTHLY', label: 'Monthly', icon: 'calendar-outline' },
                { type: 'YEARLY', label: 'Yearly', icon: 'sparkles-outline' },
              ].map((item) => (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  disabled={generate.isPending}
                  onPress={() => generate.mutate(item.type as Exclude<WrapType, 'CUSTOM'>)}
                  style={({ pressed }) => [
                    styles.generateButton,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: colors.border,
                      opacity: pressed || generate.isPending ? 0.75 : 1,
                    },
                  ]}
                >
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={16} color={colors.brand} />
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {generate.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                {errorMessage(generate.error)}
              </Text>
            ) : null}
          </View>

          {/* Wrap Archive */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Wrap Archive</Text>
            {(wraps.data ?? []).map((wrap) => (
              <WrapCard key={wrap.id} wrap={wrap} />
            ))}
            {wraps.data?.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                Your generated wraps will appear here.
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', gap: 20, maxWidth: 720, padding: 20, width: '100%' },
  header: { gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, lineHeight: 38 },
  heading: { fontSize: 19, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '46%',
    flexGrow: 1,
    gap: 6,
    padding: 16,
  },
  metricIconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  metricValue: { fontSize: 26, fontWeight: '900' },
  metricLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  panel: { borderRadius: 16, borderWidth: 1, gap: 14, padding: 18 },
  panelHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  trend: { alignItems: 'flex-end', flexDirection: 'row', gap: 6, height: 150 },
  trendItem: { alignItems: 'center', flex: 1, gap: 4, height: '100%', justifyContent: 'flex-end' },
  barTrack: {
    borderRadius: 6,
    height: 105,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '75%',
  },
  bar: { borderRadius: 6, minHeight: 4, width: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  bucketList: { gap: 8 },
  bucketRow: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  generateActions: { flexDirection: 'row', gap: 8 },
  generateButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
  },
  section: { gap: 12 },
  wrapCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  wrapIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  wrapBadgeRow: { flexDirection: 'row' },
  wrapTypePill: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  wrapHeadline: { fontSize: 16, fontWeight: '800', marginVertical: 2 },
  grow: { flex: 1 },
  dnaHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  confidenceBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  evidenceBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dnaTrait: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
});
