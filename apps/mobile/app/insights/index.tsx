import type {
  MonthlyWatchCount,
  StatisticsSummary,
  TasteStatistics,
  WrapDetail,
  WrapSummary,
  WrapType,
} from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { yearPeriod } from '../../src/lib/period';
import { useAuth } from '../../src/providers/auth-provider';

function Metric({ label, value }: { label: string; value: string | number }) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surface }]}>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function Trend({ months }: { months: MonthlyWatchCount[] }) {
  const colors = useColors();
  const maximum = Math.max(1, ...months.map((month) => month.viewingCount));
  return (
    <View style={styles.trend} accessibilityLabel="Monthly viewing trend">
      {months.map((month) => (
        <View key={month.month} style={styles.trendItem}>
          <Text style={{ color: colors.textPrimary, fontSize: 11 }}>{month.viewingCount}</Text>
          <View style={[styles.barTrack, { backgroundColor: colors.surfaceRaised }]}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: colors.brand,
                  height: `${(month.viewingCount / maximum) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{month.label}</Text>
        </View>
      ))}
    </View>
  );
}

function WrapCard({ wrap }: { wrap: WrapSummary }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={wrap.status !== 'COMPLETED'}
      onPress={() => router.push(`/wraps/${wrap.id}`)}
      style={[styles.wrapCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <View style={styles.grow}>
        <Text style={{ color: colors.brand, fontSize: 12, fontWeight: '800' }}>
          {wrap.wrapType} WRAP
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '800' }}>
          {wrap.headline ?? 'Generating your wrap…'}
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          {new Date(wrap.periodStart).toLocaleDateString()} –{' '}
          {new Date(wrap.periodEnd).toLocaleDateString()}
        </Text>
      </View>
      <Text style={{ color: wrap.status === 'COMPLETED' ? colors.brand : colors.textSecondary }}>
        {wrap.status === 'COMPLETED' ? 'View' : wrap.status.toLowerCase()}
      </Text>
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
  const isRefreshing = summary.isRefetching || monthly.isRefetching || taste.isRefetching;
  const refresh = () =>
    void Promise.all([summary.refetch(), monthly.refetch(), taste.refetch(), wraps.refetch()]);
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
            <Text style={{ color: colors.textSecondary }}>
              Calculated from your logged activity in {timezone}.
            </Text>
          </View>
          {summary.data === undefined ? null : (
            <>
              <View style={styles.metrics}>
                <Metric label="viewings" value={summary.data.viewingCount} />
                <Metric label="unique titles" value={summary.data.uniqueTitles} />
                <Metric label="hours watched" value={summary.data.totalHours} />
                <Metric label="day streak" value={summary.data.longestStreakDays} />
              </View>
              <View style={[styles.panel, { borderColor: colors.border }]}>
                <Text style={[styles.heading, { color: colors.textPrimary }]}>Monthly trend</Text>
                <Trend months={monthly.data ?? []} />
                <Text style={{ color: colors.textSecondary }}>
                  Text summary: {summary.data.viewingCount} viewings across{' '}
                  {summary.data.activeDays} active days, including {summary.data.movieViewings}{' '}
                  movie and {summary.data.tvViewings} TV viewings.
                </Text>
              </View>
              <View style={[styles.panel, { borderColor: colors.border }]}>
                <Text style={[styles.heading, { color: colors.textPrimary }]}>Taste details</Text>
                <Text style={{ color: colors.textSecondary }}>
                  Sample: {taste.data?.sampleSize ?? 0} logged viewings
                </Text>
                <View style={styles.chips}>
                  {(taste.data?.genres ?? []).slice(0, 6).map((genre) => (
                    <View
                      key={genre.id}
                      style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}
                    >
                      <Text style={{ color: colors.textPrimary }}>
                        {genre.label} · {genre.count}
                      </Text>
                    </View>
                  ))}
                </View>
                {(taste.data?.runtimeBuckets ?? []).map((bucket) => (
                  <Text key={bucket.id} style={{ color: colors.textPrimary }}>
                    {bucket.label}: {bucket.count}
                  </Text>
                ))}
              </View>
            </>
          )}
          {summary.isError || monthly.isError || taste.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(summary.error ?? monthly.error ?? taste.error)}
            </Text>
          ) : null}
          <View style={[styles.panel, { borderColor: colors.border }]}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Create a wrap</Text>
            <Text style={{ color: colors.textSecondary }}>
              Generate a factual story from the current calendar period.
            </Text>
            <View style={styles.generateActions}>
              {(['WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((type) => (
                <View key={type} style={styles.grow}>
                  <Button
                    disabled={generate.isPending}
                    label={type.slice(0, 1) + type.slice(1).toLowerCase()}
                    onPress={() => generate.mutate(type)}
                    variant="secondary"
                  />
                </View>
              ))}
            </View>
            {generate.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                {errorMessage(generate.error)}
              </Text>
            ) : null}
          </View>
          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Wrap archive</Text>
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
  content: { alignSelf: 'center', gap: 22, maxWidth: 720, padding: 20, width: '100%' },
  header: { gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, lineHeight: 38 },
  heading: { fontSize: 20, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    alignItems: 'center',
    borderRadius: 14,
    flexBasis: '46%',
    flexGrow: 1,
    gap: 4,
    padding: 16,
  },
  metricValue: { fontSize: 27, fontWeight: '900' },
  panel: { borderRadius: 16, borderWidth: 1, gap: 13, padding: 16 },
  trend: { alignItems: 'flex-end', flexDirection: 'row', gap: 5, height: 150 },
  trendItem: { alignItems: 'center', flex: 1, gap: 4, height: '100%', justifyContent: 'flex-end' },
  barTrack: {
    borderRadius: 4,
    height: 105,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '70%',
  },
  bar: { borderRadius: 4, minHeight: 2, width: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  generateActions: { flexDirection: 'row', gap: 8 },
  section: { gap: 12 },
  wrapCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 15,
  },
  grow: { flex: 1 },
});
