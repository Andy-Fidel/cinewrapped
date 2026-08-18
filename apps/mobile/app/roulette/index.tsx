import type {
  CalendarEventSummary,
  FriendshipSummary,
  GenreSummary,
  MediaSummary,
  RecommendationSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PosterImage, Screen, StarRating, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';

type EngineMode = 'ROULETTE' | 'MATCH';
type RuntimeFilter = 'ANY' | 'UNDER_90' | 'STANDARD_120' | 'EPIC_LONG';

interface VibeOption {
  id: string;
  label: string;
  emoji: string;
  queryGenre?: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  { id: 'all', label: 'Surprise Me (Any)', emoji: '✨' },
  { id: 'action', label: 'High Octane Action', emoji: '🔥', queryGenre: 'Action' },
  { id: 'scifi', label: 'Mind-Bending Sci-Fi', emoji: '🚀', queryGenre: 'Science Fiction' },
  { id: 'comedy', label: 'Laugh Out Loud', emoji: '😂', queryGenre: 'Comedy' },
  { id: 'thriller', label: 'Edge of Seat Thriller', emoji: '🔪', queryGenre: 'Thriller' },
  { id: 'drama', label: 'Emotional & Deep', emoji: '🎭', queryGenre: 'Drama' },
  { id: 'romance', label: 'Romance & Feel Good', emoji: '❤️', queryGenre: 'Romance' },
  { id: 'animation', label: 'Animated Masterpiece', emoji: '🎨', queryGenre: 'Animation' },
];

export default function FilmNightRouletteScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();

  const [mode, setMode] = useState<EngineMode>('ROULETTE');
  const [selectedVibe, setSelectedVibe] = useState('all');
  const [runtime, setRuntime] = useState<RuntimeFilter>('ANY');
  const [minRating, setMinRating] = useState<number | null>(7.0);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Animation States
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningFilm, setWinningFilm] = useState<MediaSummary | null>(null);
  const [shufflingIndex, setShufflingIndex] = useState(0);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fetch candidate titles
  const recommendations = useQuery({
    queryKey: ['roulette-recommendations'],
    queryFn: () => api.request<RecommendationSummary[]>('recommendations?limit=50'),
    enabled: session !== null,
  });

  const friends = useQuery({
    queryKey: ['friendships', 'ACCEPTED'],
    queryFn: () => api.request<FriendshipSummary[]>('friendships?status=ACCEPTED'),
    enabled: session !== null,
  });

  // Calendar mutation to schedule movie night
  const scheduleEvent = useMutation({
    mutationFn: (film: MediaSummary) => {
      const startsAt = new Date();
      startsAt.setHours(20, 0, 0, 0); // Tonight 8:00 PM

      return api.request<CalendarEventSummary>('calendar', {
        method: 'POST',
        body: {
          eventType: 'WATCH_PLAN',
          mediaId: film.id,
          title: `Movie Night: ${film.title}`,
          notes: `Selected via CineWrapped Film Night Roulette.`,
          startsAt: startsAt.toISOString(),
          timezone: user?.timezone ?? 'UTC',
          durationMinutes: film.runtimeMinutes ?? 120,
          reminderMinutes: [60],
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
      router.push('/calendar');
    },
  });

  // Filter pool candidates based on settings
  const candidatePool = useMemo(() => {
    const list = (recommendations.data ?? []).map((r) => r.media);
    return list.filter((film) => {
      if (minRating !== null && film.averageProviderRating !== null) {
        if (film.averageProviderRating < minRating) return false;
      }
      if (runtime === 'UNDER_90' && film.runtimeMinutes && film.runtimeMinutes > 95) return false;
      if (runtime === 'STANDARD_120' && film.runtimeMinutes && (film.runtimeMinutes < 90 || film.runtimeMinutes > 135))
        return false;
      if (runtime === 'EPIC_LONG' && film.runtimeMinutes && film.runtimeMinutes < 130) return false;
      return true;
    });
  }, [recommendations.data, minRating, runtime]);

  // Shuffling ticker during spin
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSpinning && candidatePool.length > 0) {
      interval = setInterval(() => {
        haptics.spinTick();
        setShufflingIndex((prev) => (prev + 1) % candidatePool.length);
      }, 90);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpinning, candidatePool.length]);

  const spinTheWheel = () => {
    if (candidatePool.length === 0 || isSpinning) return;

    haptics.clapperSnap();
    setIsSpinning(true);
    setWinningFilm(null);

    // Pick random winner from pool
    const winnerIndex = Math.floor(Math.random() * candidatePool.length);
    const winner = candidatePool[winnerIndex] ?? candidatePool[0];

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 2600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setWinningFilm(winner ?? null);
      haptics.celebration();

      // Trigger victory pulse
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 180, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  if (session === null) return <Redirect href="/(auth)/login" />;

  const activeCandidates = candidatePool.length;
  const currentPreview = candidatePool[shufflingIndex] ?? candidatePool[0];

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Film Night Roulette',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      {/* Hero Header */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.brand }]}>CINEMA DECISION ENGINE</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          Film Night Roulette
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Stop scrolling, start watching. Spin the cinematic wheel or match tastes with friends for tonight’s screening.
        </Text>
      </View>

      {/* Mode Switcher (Roulette vs Match) */}
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => {
            setMode('ROULETTE');
            setWinningFilm(null);
          }}
          style={[
            styles.modeBtn,
            {
              backgroundColor: mode === 'ROULETTE' ? colors.brand : colors.surfaceRaised,
              borderColor: mode === 'ROULETTE' ? colors.brand : colors.border,
            },
          ]}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={mode === 'ROULETTE' ? colors.onBrand : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeBtnText,
              { color: mode === 'ROULETTE' ? colors.onBrand : colors.textSecondary },
            ]}
          >
            Solo / Group Roulette
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setMode('MATCH');
            setWinningFilm(null);
          }}
          style={[
            styles.modeBtn,
            {
              backgroundColor: mode === 'MATCH' ? colors.brand : colors.surfaceRaised,
              borderColor: mode === 'MATCH' ? colors.brand : colors.border,
            },
          ]}
        >
          <Ionicons
            name="people"
            size={16}
            color={mode === 'MATCH' ? colors.onBrand : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeBtnText,
              { color: mode === 'MATCH' ? colors.onBrand : colors.textSecondary },
            ]}
          >
            Friend Taste Match
          </Text>
        </Pressable>
      </View>

      {/* Mode 1: Roulette Mode */}
      {mode === 'ROULETTE' && (
        <View style={styles.engineSection}>
          {/* Spin Wheel Stage */}
          <View
            style={[
              styles.stageCard,
              { backgroundColor: colors.surface, borderColor: isSpinning ? colors.brand : colors.border },
            ]}
          >
            {/* Spinning Visual Ticker */}
            {isSpinning && currentPreview ? (
              <View style={styles.spinningContainer}>
                <PosterImage uri={currentPreview.posterUrl} size="md" rounded={12} />
                <View style={styles.spinningCopy}>
                  <Text numberOfLines={1} style={[styles.spinningTitle, { color: colors.textPrimary }]}>
                    {currentPreview.title}
                  </Text>
                  <Text style={[styles.spinningSub, { color: colors.brand }]}>
                    Shuffling candidate titles…
                  </Text>
                </View>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : winningFilm ? (
              /* Winner Card */
              <Animated.View style={[styles.winnerContainer, { transform: [{ scale: pulseAnim }] }]}>
                <View style={[styles.winnerBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#F59E0B' }]}>
                  <Ionicons name="trophy" size={14} color="#F59E0B" />
                  <Text style={styles.winnerBadgeText}>TONIGHT'S WINNING PICK</Text>
                </View>

                <View style={styles.winnerRow}>
                  <PosterImage uri={winningFilm.posterUrl} size="lg" rounded={14} />

                  <View style={styles.winnerDetails}>
                    <Text style={[styles.winnerTitle, { color: colors.textPrimary }]}>
                      {winningFilm.title}
                    </Text>

                    <Text style={[styles.winnerMeta, { color: colors.textSecondary }]}>
                      {winningFilm.releaseYear ?? 'TBA'} ·{' '}
                      {winningFilm.runtimeMinutes ? `${winningFilm.runtimeMinutes} min` : 'Feature Film'}
                    </Text>

                    {winningFilm.averageProviderRating !== null && (
                      <View style={styles.ratingRow}>
                        <StarRating rating={winningFilm.averageProviderRating} size="md" />
                      </View>
                    )}

                    {winningFilm.overview ? (
                      <Text numberOfLines={3} style={[styles.winnerOverview, { color: colors.textSecondary }]}>
                        {winningFilm.overview}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Winner Action Buttons */}
                <View style={styles.winnerActionRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={scheduleEvent.isPending}
                    onPress={() => scheduleEvent.mutate(winningFilm)}
                    style={({ pressed }) => [
                      styles.scheduleBtn,
                      { backgroundColor: colors.brand, opacity: pressed || scheduleEvent.isPending ? 0.8 : 1 },
                    ]}
                  >
                    {scheduleEvent.isPending ? (
                      <ActivityIndicator color={colors.onBrand} size="small" />
                    ) : (
                      <>
                        <Ionicons name="calendar-outline" size={16} color={colors.onBrand} />
                        <Text style={[styles.scheduleBtnText, { color: colors.onBrand }]}>
                          Plan for Tonight (8 PM)
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/media/${winningFilm.id}`)}
                    style={({ pressed }) => [
                      styles.detailsBtn,
                      { backgroundColor: colors.surfaceRaised, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Ionicons name="information-circle-outline" size={16} color={colors.textPrimary} />
                    <Text style={[styles.detailsBtnText, { color: colors.textPrimary }]}>Details</Text>
                  </Pressable>
                </View>
              </Animated.View>
            ) : (
              /* Idle Ready State */
              <View style={styles.idleContainer}>
                <View style={[styles.idleIconCircle, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                  <Ionicons name="film-outline" size={36} color={colors.brand} />
                </View>
                <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>
                  Ready to Spin for Tonight
                </Text>
                <Text style={[styles.idleSubtitle, { color: colors.textSecondary }]}>
                  {activeCandidates} candidate films match your vibe and runtime preferences.
                </Text>
              </View>
            )}

            {/* Spin / Re-spin Button */}
            <Pressable
              accessibilityRole="button"
              disabled={isSpinning || activeCandidates === 0}
              onPress={spinTheWheel}
              style={({ pressed }) => [
                styles.spinButton,
                {
                  backgroundColor: isSpinning ? colors.surfaceRaised : colors.brand,
                  opacity: isSpinning || activeCandidates === 0 || pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons
                name={winningFilm ? 'refresh' : 'sparkles'}
                size={20}
                color={isSpinning ? colors.textPrimary : colors.onBrand}
              />
              <Text
                style={[
                  styles.spinButtonText,
                  { color: isSpinning ? colors.textPrimary : colors.onBrand },
                ]}
              >
                {isSpinning ? 'Selecting Film…' : winningFilm ? 'Spin Again' : 'Spin Cinema Wheel'}
              </Text>
            </Pressable>
          </View>

          {/* Vibe & Mood Horizon */}
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>TONIGHT’S VIBE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vibeScroll}
          >
            {VIBE_OPTIONS.map((vibe) => {
              const isSelected = selectedVibe === vibe.id;
              return (
                <Pressable
                  key={vibe.id}
                  onPress={() => setSelectedVibe(vibe.id)}
                  style={[
                    styles.vibeChip,
                    {
                      backgroundColor: isSelected ? colors.surfaceRaised : colors.surface,
                      borderColor: isSelected ? colors.brand : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                  <Text
                    style={[
                      styles.vibeText,
                      { color: isSelected ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    {vibe.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Runtime Presets */}
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>LENGTH & RUNTIME</Text>
          <View style={styles.filterRow}>
            {[
              { id: 'ANY' as const, label: 'Any Length' },
              { id: 'UNDER_90' as const, label: '⚡ Under 90m' },
              { id: 'STANDARD_120' as const, label: '⏱️ 90–120m' },
              { id: 'EPIC_LONG' as const, label: '🍿 2h+ Epic' },
            ].map((item) => {
              const isSelected = runtime === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setRuntime(item.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.brand : colors.surface,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? colors.onBrand : colors.textPrimary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Minimum Rating Threshold */}
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>QUALITY THRESHOLD</Text>
          <View style={styles.filterRow}>
            {[
              { val: null, label: 'Any Rating' },
              { val: 6.5, label: '★ 6.5+' },
              { val: 7.5, label: '★ 7.5+ High Score' },
              { val: 8.0, label: '★ 8.0+ Masterpiece' },
            ].map((r) => {
              const isSelected = minRating === r.val;
              return (
                <Pressable
                  key={r.label}
                  onPress={() => setMinRating(r.val)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.brand : colors.surface,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? colors.onBrand : colors.textPrimary },
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Mode 2: Friend Taste Match Mode */}
      {mode === 'MATCH' && (
        <View style={styles.engineSection}>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            SELECT FRIEND TO MATCH WITH
          </Text>

          {/* Friends List */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendsScroller}
          >
            {(friends.data ?? []).map((f) => {
              const isSelected = selectedFriendId === f.otherUser.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setSelectedFriendId(f.otherUser.id)}
                  style={[
                    styles.friendCard,
                    {
                      backgroundColor: isSelected ? colors.surfaceRaised : colors.surface,
                      borderColor: isSelected ? colors.brand : colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                    },
                  ]}
                >
                  {f.otherUser.avatarUrl ? (
                    <Image source={{ uri: f.otherUser.avatarUrl }} style={styles.friendAvatar} />
                  ) : (
                    <View style={[styles.friendAvatar, styles.avatarFallback, { backgroundColor: colors.surfaceRaised }]}>
                      <Text style={[styles.avatarText, { color: colors.brand }]}>
                        {f.otherUser.displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={[styles.friendName, { color: colors.textPrimary }]}>
                    {f.otherUser.displayName}
                  </Text>
                  <View style={[styles.tastePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={styles.tastePillText}>94% Match</Text>
                  </View>
                </Pressable>
              );
            })}

            {(friends.data?.length ?? 0) === 0 && (
              <View style={[styles.emptyFriendsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={24} color={colors.textDisabled} />
                <Text style={[styles.emptyFriendsText, { color: colors.textSecondary }]}>
                  Connect with friends on the Social tab to find overlap picks!
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Match Generator Card */}
          <View
            style={[
              styles.stageCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.matchHeroInfo}>
              <View style={[styles.matchScoreCircle, { borderColor: colors.brand }]}>
                <Text style={[styles.matchScoreNum, { color: colors.brand }]}>94%</Text>
                <Text style={[styles.matchScoreLabel, { color: colors.textSecondary }]}>OVERLAP</Text>
              </View>

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.matchTitle, { color: colors.textPrimary }]}>
                  Shared Cinema DNA
                </Text>
                <Text style={[styles.matchSubtitle, { color: colors.textSecondary }]}>
                  Both of you love Sci-Fi, Psychological Thrillers, and 90s Classics.
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={spinTheWheel}
              style={({ pressed }) => [
                styles.spinButton,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="dice" size={20} color={colors.onBrand} />
              <Text style={[styles.spinButtonText, { color: colors.onBrand }]}>
                Find Mutual Movie Pick
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginTop: 12 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 19 },

  // Mode Switcher
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modeBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeBtnText: { fontSize: 13, fontWeight: '700' },

  // Engine Section
  engineSection: { gap: 14, marginTop: 12 },
  stageCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 14,
    padding: 16,
  },

  // Idle Stage
  idleContainer: { alignItems: 'center', gap: 8, paddingVertical: 20, textAlign: 'center' },
  idleIconCircle: {
    alignItems: 'center',
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    marginBottom: 4,
    width: 72,
  },
  idleTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  idleSubtitle: { fontSize: 13, lineHeight: 18, maxWidth: 280, textAlign: 'center' },

  // Spinning Stage
  spinningContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 12,
  },
  spinningCopy: { flex: 1, gap: 4 },
  spinningTitle: { fontSize: 16, fontWeight: '800' },
  spinningSub: { fontSize: 12, fontWeight: '700' },

  // Winner Stage
  winnerContainer: { gap: 12 },
  winnerBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  winnerBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  winnerRow: { flexDirection: 'row', gap: 14 },
  winnerDetails: { flex: 1, gap: 4 },
  winnerTitle: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
  winnerMeta: { fontSize: 12, fontWeight: '500' },
  ratingRow: { marginTop: 2 },
  winnerOverview: { fontSize: 12, lineHeight: 16, marginTop: 4 },

  winnerActionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  scheduleBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  scheduleBtnText: { fontSize: 13, fontWeight: '800' },
  detailsBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  detailsBtnText: { fontSize: 13, fontWeight: '700' },

  // Spin CTA Button
  spinButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
  },
  spinButtonText: { fontSize: 15, fontWeight: '800' },

  // Vibe & Filter Sections
  sectionSubtitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  vibeScroll: { gap: 8, paddingVertical: 2 },
  vibeChip: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  vibeEmoji: { fontSize: 16 },
  vibeText: { fontSize: 13, fontWeight: '700' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' },

  // Friends Match Mode
  friendsScroller: { gap: 10, paddingVertical: 4 },
  friendCard: {
    alignItems: 'center',
    borderRadius: 14,
    gap: 6,
    minWidth: 90,
    padding: 10,
  },
  friendAvatar: { borderRadius: 20, height: 40, width: 40 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  friendName: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  tastePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tastePillText: { color: '#10B981', fontSize: 9, fontWeight: '800' },

  emptyFriendsBox: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  emptyFriendsText: { fontSize: 12, maxWidth: 240 },

  matchHeroInfo: { alignItems: 'center', flexDirection: 'row', gap: 14, paddingVertical: 10 },
  matchScoreCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  matchScoreNum: { fontSize: 16, fontWeight: '800' },
  matchScoreLabel: { fontSize: 8, fontWeight: '800' },
  matchTitle: { fontSize: 16, fontWeight: '800' },
  matchSubtitle: { fontSize: 12, lineHeight: 16 },
});
