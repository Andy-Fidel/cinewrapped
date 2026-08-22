import type {
  GamificationDashboard,
  LeaderboardMetric,
  LeaderboardSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { type PropsWithChildren, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PassportGlobe3D } from '../../src/components/passport-globe-3d';
import { TrophyCabinet3D } from '../../src/components/trophy-cabinet-3d';
import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

const leaderboardMetrics: Array<{
  id: LeaderboardMetric;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: 'POINTS', label: 'Points', icon: 'star-outline' },
  { id: 'VIEWINGS', label: 'Viewings', icon: 'film-outline' },
  { id: 'STREAK', label: 'Streak', icon: 'flame-outline' },
];

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
          title: 'Achievements & Passport',
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
          {/* Header Banner */}
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.brand }]}>YOUR MOVIE JOURNEY</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Every watch leaves a mark
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
              Progress comes only from activity you log. Ranking and passport visibility remain in
              your control.
            </Text>
          </View>

          {data === undefined ? null : (
            <>
              {/* Journey Metrics */}
              <View style={styles.metrics}>
                <Metric icon="star-outline" label="points" value={data.totalPoints} />
                <Metric
                  icon="trophy-outline"
                  label="unlocked"
                  value={`${data.unlockedCount}/${data.achievementCount}`}
                />
                <Metric
                  icon="flame-outline"
                  label="current streak"
                  value={`${data.streak.currentDays}d`}
                />
              </View>

              {/* Achievements Section */}
              <Section title="Achievements">
                <TrophyCabinet3D achievements={data.achievements} />

                <View style={styles.itemsList}>
                  {data.achievements.map((achievement) => {
                    const isUnlocked = achievement.unlockedAt !== null;
                    return (
                      <View
                        key={achievement.id}
                        style={[
                          styles.item,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.itemHeader}>
                          <Ionicons
                            name={isUnlocked ? 'checkmark-circle' : 'ellipse-outline'}
                            size={20}
                            color={isUnlocked ? colors.brand : colors.textDisabled}
                          />
                          <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                            {achievement.name}
                          </Text>
                          <View
                            style={[styles.pointsBadge, { backgroundColor: colors.surfaceRaised }]}
                          >
                            <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 12 }}>
                              +{achievement.points} pts
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                          {achievement.description}
                        </Text>
                        <Progress current={achievement.progress} target={achievement.target} />
                      </View>
                    );
                  })}
                </View>
              </Section>

              {/* Challenges Section */}
              <Section title="Active Challenges & Trivia">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/trivia')}
                  style={({ pressed }) => [
                    styles.triviaHighlightCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: '#F59E0B',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View
                    style={[styles.triviaIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
                  >
                    <Ionicons name="sparkles" size={22} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          color: '#F59E0B',
                          fontSize: 10,
                          fontWeight: '800',
                          letterSpacing: 0.8,
                        }}
                      >
                        FEATURED QUIZ
                      </Text>
                      <View style={[styles.pointsBadge, { backgroundColor: colors.surfaceRaised }]}>
                        <Text style={{ color: colors.brand, fontSize: 10, fontWeight: '800' }}>
                          +150 PTS
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800' }}>
                      Christopher Nolan Retrospective
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      3 questions · Unlock Golden Projector Trophy
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                </Pressable>

                <View style={styles.itemsList}>
                  {data.challenges.map((challenge) => {
                    const isJoining = join.isPending && join.variables === challenge.id;
                    return (
                      <View
                        key={challenge.id}
                        style={[
                          styles.item,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.itemHeader}>
                          <Ionicons name="flag-outline" size={20} color={colors.brand} />
                          <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                            {challenge.name}
                          </Text>
                          <View
                            style={[styles.pointsBadge, { backgroundColor: colors.surfaceRaised }]}
                          >
                            <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 12 }}>
                              +{challenge.points} pts
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                          {challenge.description}
                        </Text>
                        <Progress current={challenge.progress} target={challenge.target} />
                        <View style={styles.challengeFooterRow}>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            Ends {new Date(challenge.endsAt).toLocaleDateString()}
                          </Text>
                          {challenge.joined ? (
                            <View
                              style={[
                                styles.joinedBadge,
                                { backgroundColor: colors.surfaceRaised },
                              ]}
                            >
                              <Text
                                style={{ color: colors.brand, fontWeight: '700', fontSize: 12 }}
                              >
                                {challenge.completedAt === null ? '✓ Joined' : '🏆 Completed'}
                              </Text>
                            </View>
                          ) : (
                            <Pressable
                              accessibilityRole="button"
                              disabled={join.isPending}
                              onPress={() => join.mutate(challenge.id)}
                              style={({ pressed }) => [
                                styles.joinButton,
                                {
                                  backgroundColor: colors.brand,
                                  opacity: pressed || join.isPending ? 0.8 : 1,
                                },
                              ]}
                            >
                              {isJoining ? (
                                <ActivityIndicator size="small" color={colors.onBrand} />
                              ) : (
                                <Text
                                  style={{ color: colors.onBrand, fontWeight: '700', fontSize: 12 }}
                                >
                                  Join Challenge
                                </Text>
                              )}
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {data.challenges.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                      No active challenges right now.
                    </Text>
                  ) : null}
                </View>
              </Section>

              {/* Movie Passport Section */}
              <Section title="Movie Passport">
                <PassportGlobe3D stamps={data.passport.stamps} />

                <View style={styles.metrics}>
                  <Metric
                    icon="globe-outline"
                    label="countries"
                    value={data.passport.countriesVisited}
                  />
                  <Metric
                    icon="language-outline"
                    label="languages"
                    value={data.passport.languagesExplored}
                  />
                  <Metric
                    icon="calendar-outline"
                    label="decades"
                    value={data.passport.decadesExplored}
                  />
                </View>

                <View style={styles.chips}>
                  {data.passport.stamps.map((stamp) => (
                    <View
                      key={stamp.countryCode}
                      style={[
                        styles.stampChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <View
                        style={[styles.stampCodeBox, { backgroundColor: colors.surfaceRaised }]}
                      >
                        <Text style={{ color: colors.brand, fontWeight: '900', fontSize: 14 }}>
                          {stamp.countryCode}
                        </Text>
                      </View>
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}
                      >
                        {stamp.uniqueTitles} {stamp.uniqueTitles === 1 ? 'title' : 'titles'}
                      </Text>
                    </View>
                  ))}
                </View>
              </Section>
            </>
          )}

          {/* Leaderboard Section */}
          <Section title="Leaderboard Rankings">
            <View style={styles.metricTabs}>
              {leaderboardMetrics.map((metric) => {
                const selected = leaderboardMetric === metric.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={metric.id}
                    onPress={() => setLeaderboardMetric(metric.id)}
                    style={({ pressed }) => [
                      styles.metricTab,
                      {
                        backgroundColor: selected ? colors.brand : colors.surface,
                        borderColor: selected ? colors.brand : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={metric.icon}
                      size={15}
                      color={selected ? colors.onBrand : colors.textPrimary}
                    />
                    <Text
                      style={{
                        color: selected ? colors.onBrand : colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {metric.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.rankingsList}>
              {leaderboard.data?.entries.map((entry) => {
                const isTop3 = entry.rank <= 3;
                const medalIcon =
                  entry.rank === 1
                    ? '🥇'
                    : entry.rank === 2
                      ? '🥈'
                      : entry.rank === 3
                        ? '🥉'
                        : `#${entry.rank}`;
                return (
                  <View
                    key={entry.user.id}
                    style={[
                      styles.rankRow,
                      {
                        backgroundColor: entry.isViewer ? colors.surfaceRaised : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.rank, { color: isTop3 ? colors.brand : colors.textSecondary }]}
                    >
                      {medalIcon}
                    </Text>
                    <Text style={[styles.rankName, { color: colors.textPrimary }]}>
                      {entry.user.displayName} {entry.isViewer ? '(you)' : ''}
                    </Text>
                    <View style={[styles.scoreBadge, { backgroundColor: colors.surfaceRaised }]}>
                      <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 13 }}>
                        {entry.score}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

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
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text
        style={{
          color: colors.textSecondary,
          textAlign: 'center',
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
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
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
        {current}/{target}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', gap: 24, maxWidth: 720, padding: 20, width: '100%' },
  header: { gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '800' },
  section: { gap: 12 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: { alignItems: 'center', borderRadius: 14, borderWidth: 1, flex: 1, gap: 5, padding: 14 },
  metricIconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  metricValue: { fontSize: 20, fontWeight: '900' },
  triviaHighlightCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  triviaIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  itemsList: { gap: 12 },
  item: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 16 },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  pointsBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  progressRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  progressTrack: { borderRadius: 999, flex: 1, height: 6, overflow: 'hidden' },
  progressFill: { borderRadius: 999, height: '100%' },
  challengeFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  joinedBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  joinButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  stampChip: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stampCodeBox: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metricTabs: { flexDirection: 'row', gap: 8 },
  metricTab: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 9,
  },
  rankingsList: { gap: 8 },
  rankRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rank: { fontSize: 16, fontWeight: '900', width: 36 },
  rankName: { flex: 1, fontSize: 15, fontWeight: '700' },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});
