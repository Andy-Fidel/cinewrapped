import type {
  GamificationDashboard,
  LeaderboardMetric,
  LeaderboardSummary,
} from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack } from 'expo-router';
import { type PropsWithChildren, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

const leaderboardMetrics: LeaderboardMetric[] = ['POINTS', 'VIEWINGS', 'STREAK'];

export default function GamificationScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [leaderboardMetric, setLeaderboardMetric] = useState<LeaderboardMetric>('POINTS');
  const dashboard = useQuery({
    queryKey: ['gamification'],
    queryFn: () => api.request<GamificationDashboard>('gamification'),
    enabled: session !== null,
  });
  const leaderboard = useQuery({
    queryKey: ['leaderboard', leaderboardMetric],
    queryFn: () =>
      api.request<LeaderboardSummary>(`leaderboards?metric=${leaderboardMetric}&limit=25`),
    enabled: session !== null,
  });
  const join = useMutation({
    mutationFn: (challengeId: string) =>
      api.request(`challenges/${challengeId}/join`, {
        method: 'POST',
        idempotencyKey: `join-challenge-${challengeId}`,
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['gamification'] }),
  });

  if (session === null) return <Redirect href="/(auth)/login" />;
  const refresh = () => void Promise.all([dashboard.refetch(), leaderboard.refetch()]);
  const isRefreshing = dashboard.isRefetching || leaderboard.isRefetching;
  const data = dashboard.data;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Achievements',
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
            <Text style={[styles.eyebrow, { color: colors.brand }]}>YOUR MOVIE JOURNEY</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Every watch leaves a mark
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Progress comes only from activity you log. Ranking and passport visibility remain in
              your control.
            </Text>
          </View>

          {data === undefined ? null : (
            <>
              <View style={styles.metrics}>
                <Metric label="points" value={data.totalPoints} />
                <Metric label="unlocked" value={`${data.unlockedCount}/${data.achievementCount}`} />
                <Metric label="current streak" value={`${data.streak.currentDays}d`} />
              </View>

              <Section title="Achievements">
                {data.achievements.map((achievement) => (
                  <View
                    key={achievement.id}
                    style={[styles.item, { backgroundColor: colors.surface }]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                        {achievement.unlockedAt === null ? '○' : '✓'} {achievement.name}
                      </Text>
                      <Text style={{ color: colors.brand, fontWeight: '800' }}>
                        +{achievement.points}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }}>{achievement.description}</Text>
                    <Progress current={achievement.progress} target={achievement.target} />
                  </View>
                ))}
              </Section>

              <Section title="Challenges">
                {data.challenges.map((challenge) => (
                  <View
                    key={challenge.id}
                    style={[styles.item, { backgroundColor: colors.surface }]}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                        {challenge.name}
                      </Text>
                      <Text style={{ color: colors.brand, fontWeight: '800' }}>
                        +{challenge.points}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }}>{challenge.description}</Text>
                    <Progress current={challenge.progress} target={challenge.target} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Ends {new Date(challenge.endsAt).toLocaleDateString()}
                    </Text>
                    {challenge.joined ? (
                      <Text style={{ color: colors.brand, fontWeight: '700' }}>
                        {challenge.completedAt === null ? 'Joined' : 'Completed'}
                      </Text>
                    ) : (
                      <Button
                        disabled={join.isPending}
                        label="Join challenge"
                        onPress={() => join.mutate(challenge.id)}
                        variant="secondary"
                      />
                    )}
                  </View>
                ))}
                {data.challenges.length === 0 ? (
                  <Text style={{ color: colors.textSecondary }}>
                    No active challenges right now.
                  </Text>
                ) : null}
              </Section>

              <Section title="Movie passport">
                <View style={styles.metrics}>
                  <Metric label="countries" value={data.passport.countriesVisited} />
                  <Metric label="languages" value={data.passport.languagesExplored} />
                  <Metric label="decades" value={data.passport.decadesExplored} />
                </View>
                <View style={styles.chips}>
                  {data.passport.stamps.map((stamp) => (
                    <View
                      key={stamp.countryCode}
                      style={[styles.chip, { backgroundColor: colors.surface }]}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                        {stamp.countryCode}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>
                        {stamp.uniqueTitles} titles
                      </Text>
                    </View>
                  ))}
                </View>
              </Section>
            </>
          )}

          <Section title="Leaderboard">
            <View style={styles.metricTabs}>
              {leaderboardMetrics.map((metric) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: leaderboardMetric === metric }}
                  key={metric}
                  onPress={() => setLeaderboardMetric(metric)}
                  style={[
                    styles.metricTab,
                    {
                      backgroundColor:
                        leaderboardMetric === metric ? colors.brand : colors.surfaceRaised,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: leaderboardMetric === metric ? colors.onBrand : colors.textPrimary,
                      fontWeight: '700',
                    }}
                  >
                    {metric === 'STREAK'
                      ? 'Streak'
                      : metric.slice(0, 1) + metric.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            {leaderboard.data?.entries.map((entry) => (
              <View key={entry.user.id} style={styles.rankRow}>
                <Text style={[styles.rank, { color: colors.brand }]}>#{entry.rank}</Text>
                <Text style={[styles.rankName, { color: colors.textPrimary }]}>
                  {entry.user.displayName} {entry.isViewer ? '(you)' : ''}
                </Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{entry.score}</Text>
              </View>
            ))}
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {leaderboard.data?.visibilityNote ?? 'Loading privacy-safe rankings…'}
            </Text>
          </Section>

          {dashboard.isError || leaderboard.isError || join.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(dashboard.error ?? leaderboard.error ?? join.error)}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surface }]}>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

function Section({ children, title }: PropsWithChildren<{ title: string }>) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Progress({ current, target }: { current: number; target: number }) {
  const colors = useColors();
  return (
    <View accessibilityLabel={`${current} of ${target}`} style={styles.progressRow}>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceRaised }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.brand, width: `${Math.min(100, (current / target) * 100)}%` },
          ]}
        />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
        {current}/{target}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', gap: 28, maxWidth: 720, padding: 20, width: '100%' },
  header: { gap: 10 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 22, fontWeight: '800' },
  section: { gap: 12 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: { alignItems: 'center', borderRadius: 14, flex: 1, gap: 4, padding: 14 },
  metricValue: { fontSize: 21, fontWeight: '800' },
  item: { borderRadius: 16, gap: 9, padding: 16 },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  itemTitle: { flex: 1, fontSize: 17, fontWeight: '800' },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  progressTrack: { borderRadius: 999, flex: 1, height: 8, overflow: 'hidden' },
  progressFill: { borderRadius: 999, height: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  chip: { borderRadius: 12, gap: 2, minWidth: 90, padding: 12 },
  metricTabs: { flexDirection: 'row', gap: 8 },
  metricTab: { alignItems: 'center', borderRadius: 999, flex: 1, padding: 10 },
  rankRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 7 },
  rank: { fontSize: 16, fontWeight: '900', width: 42 },
  rankName: { flex: 1, fontWeight: '700' },
});
