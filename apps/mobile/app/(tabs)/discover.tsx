import type {
  IntelligentDiscoveryResult,
  MediaSummary,
  UserPreferences,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarouselCard } from '../../src/components/carousel-card';
import { MediaCard } from '../../src/components/media-card';
import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

type MediaFilter = 'ALL' | 'MOVIE' | 'TV';

const QUICK_PROMPTS = [
  '⚡ Funny movies',
  '🍿 Sci-Fi under 100m',
  '🏆 Award winners',
  '💎 Hidden gems',
];

const CARD_STEP_WIDTH = 274; // 260 width + 14 margin

export default function DiscoverScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('ALL');

  const carouselRef = useRef<ScrollView>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [autoAdvancePaused, setAutoAdvancePaused] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const isUserInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const mediaType = filter === 'ALL' ? '' : `&mediaType=${filter}`;

  const search = useQuery({
    queryKey: ['media-search', debouncedQuery, filter, user?.preferredLanguage, user?.countryCode],
    queryFn: () =>
      api.request<IntelligentDiscoveryResult>('ai/discovery', {
        method: 'POST',
        body: {
          query: `${debouncedQuery}${filter === 'ALL' ? '' : ` ${filter === 'MOVIE' ? 'movies' : 'TV shows'}`}`,
          language: user?.preferredLanguage ?? 'en-US',
          countryCode: user?.countryCode ?? 'US',
        },
      }),
    enabled: debouncedQuery.length >= 3,
    staleTime: 5 * 60 * 1000,
  });

  const featured = useQuery({
    queryKey: ['media-featured', filter, user?.preferredLanguage],
    queryFn: () =>
      api.request<MediaSummary[]>(
        `media/trending?window=DAY&language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}${mediaType}`,
      ),
    staleTime: 10 * 60 * 1000,
  });

  const preferences = useQuery({
    queryKey: ['preferences', user?.id ?? 'anonymous'],
    queryFn: () => api.request<UserPreferences>('users/me/preferences'),
    enabled: user !== null,
    staleTime: 5 * 60 * 1000,
  });

  const trending = useQuery({
    queryKey: ['media-trending', filter, user?.preferredLanguage],
    queryFn: () =>
      api.request<MediaSummary[]>(
        `media/trending?window=WEEK&language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}${mediaType}`,
      ),
    staleTime: 10 * 60 * 1000,
  });

  const featuredList = featured.data ?? [];
  const featuredSignature = useMemo(
    () => featuredList.map(({ id }) => id).join(':'),
    [featuredList],
  );
  const reduceMotion =
    preferences.isPending || preferences.data?.reduceMotion === true || systemReduceMotion;
  const autoAdvanceEnabled =
    !autoAdvancePaused &&
    !reduceMotion &&
    isScreenFocused &&
    appState === 'active' &&
    featuredList.length > 1;

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', setAppState);
    void AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion);
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );
    return () => {
      appStateSubscription.remove();
      motionSubscription.remove();
    };
  }, []);

  const clearInteractionTimeout = useCallback(() => {
    if (interactionTimeoutRef.current !== null) {
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }
  }, []);

  const beginInteraction = useCallback(() => {
    clearInteractionTimeout();
    isUserInteractingRef.current = true;
  }, [clearInteractionTimeout]);

  const scheduleInteractionResume = useCallback(() => {
    clearInteractionTimeout();
    interactionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      interactionTimeoutRef.current = null;
    }, 4000);
  }, [clearInteractionTimeout]);

  useEffect(() => clearInteractionTimeout, [clearInteractionTimeout]);

  useEffect(() => {
    setActiveCarouselIndex(0);
    carouselRef.current?.scrollTo({ x: 0, animated: false });
  }, [featuredSignature]);

  // Auto Slider effect for Spotlight Carousel
  useEffect(() => {
    if (!autoAdvanceEnabled) return;

    const timer = setInterval(() => {
      if (isUserInteractingRef.current) return;
      const nextIndex = (activeCarouselIndex + 1) % featuredList.length;
      carouselRef.current?.scrollTo({
        x: nextIndex * CARD_STEP_WIDTH,
        animated: true,
      });
      setActiveCarouselIndex(nextIndex);
    }, 3800);

    return () => clearInterval(timer);
  }, [activeCarouselIndex, autoAdvanceEnabled, featuredList.length]);

  const handleCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / CARD_STEP_WIDTH);
    if (newIndex >= 0 && newIndex < featuredList.length) {
      setActiveCarouselIndex(newIndex);
    }
    scheduleInteractionResume();
  };

  const selectCarouselIndex = (index: number) => {
    beginInteraction();
    setActiveCarouselIndex(index);
    carouselRef.current?.scrollTo({ x: index * CARD_STEP_WIDTH, animated: !reduceMotion });
    scheduleInteractionResume();
  };

  const searching = debouncedQuery.length >= 3;
  const activeData = searching ? search.data?.results : trending.data;
  const heading = searching ? `Results for “${debouncedQuery}”` : 'Trending this week';

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.eyebrow, { color: colors.brand }]}>DISCOVER</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        Find your next story
      </Text>

      {/* Enhanced Search Input */}
      <View
        style={[
          styles.searchWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.textDisabled}
          style={styles.searchIcon}
        />
        <TextInput
          accessibilityLabel="Search movies and television shows"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Try “funny movies under 100 minutes”"
          placeholderTextColor={colors.textDisabled}
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={query}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
          </Pressable>
        ) : null}
      </View>

      {/* Quick AI Prompts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promptsContainer}
      >
        {QUICK_PROMPTS.map((promptText) => (
          <Pressable
            key={promptText}
            onPress={() => setQuery(promptText.replace(/^[^\s]+\s*/, ''))}
            style={({ pressed }) => [
              styles.promptChip,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.promptText, { color: colors.textSecondary }]}>{promptText}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Media Filters */}
      <View style={styles.filters}>
        {(['ALL', 'MOVIE', 'TV'] as const).map((value) => {
          const selected = value === filter;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={value}
              onPress={() => setFilter(value)}
              style={({ pressed }) => [
                styles.filter,
                {
                  backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? colors.onBrand : colors.textPrimary,
                  fontWeight: '600',
                }}
              >
                {value === 'ALL' ? 'All' : value === 'MOVIE' ? 'Movies' : 'TV'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Auto-sliding Spotlight Carousel */}
      {!searching && featuredList.length > 0 ? (
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeaderRow}>
            <Text style={[styles.carouselTitle, { color: colors.textPrimary }]}>
              Featured Today
            </Text>
            <Pressable
              accessibilityLabel={
                autoAdvancePaused ? 'Resume automatic sliding' : 'Pause automatic sliding'
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: reduceMotion }}
              disabled={reduceMotion}
              onPress={() => setAutoAdvancePaused((paused) => !paused)}
              style={({ pressed }) => [
                styles.autoSliderPill,
                {
                  backgroundColor: colors.surfaceRaised,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                color={colors.brand}
                name={reduceMotion || autoAdvancePaused ? 'play-outline' : 'pause-outline'}
                size={13}
              />
              <Text style={[styles.autoSliderLabel, { color: colors.brand }]}>
                {reduceMotion ? 'MOTION OFF' : autoAdvancePaused ? 'PAUSED' : 'AUTO'}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            decelerationRate="fast"
            snapToInterval={CARD_STEP_WIDTH}
            snapToAlignment="start"
            onScrollBeginDrag={beginInteraction}
            onScrollEndDrag={scheduleInteractionResume}
            onMomentumScrollEnd={handleCarouselScroll}
            contentContainerStyle={styles.carouselContent}
          >
            {featuredList.map((item) => (
              <CarouselCard key={item.id} media={item} />
            ))}
          </ScrollView>

          {/* Carousel Pagination Dots */}
          <ScrollView
            accessibilityLabel="Featured title pages"
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dotsRow}
          >
            {featuredList.map((_, i) => (
              <Pressable
                accessibilityLabel={`Show featured title ${i + 1} of ${featuredList.length}`}
                accessibilityRole="button"
                accessibilityState={{ selected: i === activeCarouselIndex }}
                key={i}
                onPress={() => selectCarouselIndex(i)}
                style={styles.dotButton}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === activeCarouselIndex ? colors.brand : colors.surfaceRaised,
                      width: i === activeCarouselIndex ? 18 : 6,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{heading}</Text>

      {searching && search.data !== undefined ? (
        <View
          style={[
            styles.interpretation,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.brand,
            },
          ]}
        >
          <View style={styles.interpretationHeader}>
            <Ionicons name="sparkles" size={16} color={colors.brand} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700', flex: 1 }}>
              {search.data.interpretation.explanation}
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17 }}>
            {search.data.notice}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {(searching ? search : trending).isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (searching ? search : trending).isError ? (
        <View style={styles.center}>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            Discovery is unavailable. Pull down or try again shortly.
          </Text>
        </View>
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={activeData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          onRefresh={() =>
            void Promise.all([
              searching ? search.refetch() : trending.refetch(),
              featured.refetch(),
            ])
          }
          refreshing={(searching ? search : trending).isRefetching || featured.isRefetching}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => <MediaCard media={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.textSecondary }}>No titles matched this search.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { gap: 14, paddingHorizontal: 18, paddingTop: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.4 },
  searchWrapper: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  clearButton: { padding: 4 },
  promptsContainer: { gap: 8, paddingVertical: 2 },
  promptChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  promptText: { fontSize: 12, fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { borderRadius: 999, justifyContent: 'center', minHeight: 44, paddingHorizontal: 18 },
  carouselSection: { gap: 10, marginTop: 4 },
  carouselHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carouselTitle: { fontSize: 20, fontWeight: '700' },
  autoSliderPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  autoSliderLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  carouselContent: { paddingRight: 18, paddingVertical: 4 },
  dotsRow: { alignItems: 'center', paddingHorizontal: 4 },
  dotButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  dot: { borderRadius: 3, height: 6 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  interpretation: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  interpretationHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: 12, paddingTop: 16 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
});
