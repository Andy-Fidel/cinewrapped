import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useColors } from './ui';

const CARD_WIDTH = 142;
const CARD_GAP = 12;
const CARD_STEP = CARD_WIDTH + CARD_GAP;

export function Carousel3D({
  items,
  reduceMotionPreference = false,
}: {
  items: MediaSummary[];
  reduceMotionPreference?: boolean;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const reduceMotion = reduceMotionPreference || systemReduceMotion;

  const sidePadding = Math.max(16, (width - CARD_WIDTH - 32) / 2);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (items.length <= 1 || paused || reduceMotion) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % items.length;
        scrollRef.current?.scrollTo({ x: next * CARD_STEP, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length, paused, reduceMotion]);

  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) setActiveIndex(items.length - 1);
  }, [activeIndex, items.length]);

  useEffect(
    () => () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  const pauseForInteraction = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setPaused(true);
  };

  const resumeAfterInteraction = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 3500);
  };

  const activeMedia = items[activeIndex];

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="film-outline" size={18} color={colors.brand} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Featured Today</Text>
        </View>
        <Pressable
          accessibilityLabel={paused ? 'Resume automatic sliding' : 'Pause automatic sliding'}
          accessibilityRole="button"
          accessibilityState={{ disabled: reduceMotion }}
          disabled={reduceMotion}
          onPress={() => setPaused((value) => !value)}
          style={({ pressed }) => [
            styles.autoPill,
            { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons
            name={reduceMotion || paused ? 'play-outline' : 'pause-outline'}
            size={13}
            color={colors.brand}
          />
          <Text style={[styles.autoText, { color: colors.brand }]}>
            {reduceMotion ? 'MOTION OFF' : paused ? 'PAUSED' : 'AUTO'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        accessibilityLabel="Featured titles"
        horizontal
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => {
          const next = Math.max(
            0,
            Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / CARD_STEP)),
          );
          setActiveIndex(next);
          resumeAfterInteraction();
        }}
        onScrollBeginDrag={pauseForInteraction}
        onScrollEndDrag={resumeAfterInteraction}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={CARD_STEP}
        contentContainerStyle={{ paddingHorizontal: sidePadding, paddingVertical: 12 }}
      >
        {items.map((item, index) => {
          const selected = index === activeIndex;
          const poster = item.posterUrl ?? item.backdropUrl;
          return (
            <Pressable
              accessibilityLabel={`${item.title}, featured title ${index + 1} of ${items.length}`}
              accessibilityRole="button"
              key={item.id}
              onPress={() => {
                if (selected) {
                  router.push(`/media/${item.id}`);
                } else {
                  setActiveIndex(index);
                  scrollRef.current?.scrollTo({ x: index * CARD_STEP, animated: true });
                }
              }}
              style={[
                styles.posterCard,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: selected ? colors.brand : colors.border,
                  marginRight: index === items.length - 1 ? 0 : CARD_GAP,
                  opacity: selected ? 1 : 0.72,
                  transform: [
                    { perspective: 700 },
                    { rotateY: selected ? '0deg' : index < activeIndex ? '12deg' : '-12deg' },
                    { scale: selected ? 1 : 0.88 },
                  ],
                },
              ]}
            >
              {poster ? (
                <Image
                  accessibilityIgnoresInvertColors
                  source={{ uri: poster }}
                  style={styles.poster}
                />
              ) : (
                <View style={[styles.poster, styles.posterFallback]}>
                  <Ionicons name="film-outline" size={34} color={colors.textDisabled} />
                </View>
              )}
              <View style={styles.posterShade} />
              <View style={[styles.typeBadge, { backgroundColor: colors.brand }]}>
                <Text style={[styles.typeText, { color: colors.onBrand }]}>
                  {item.mediaType === 'MOVIE' ? 'MOVIE' : 'TV'}
                </Text>
              </View>
              <Text numberOfLines={2} style={styles.posterTitle}>
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View accessibilityLabel="Featured title pages" style={styles.dotsRow}>
        {items.map((item, index) => (
          <Pressable
            accessibilityLabel={`Show featured title ${index + 1} of ${items.length}`}
            accessibilityRole="button"
            accessibilityState={{ selected: index === activeIndex }}
            hitSlop={8}
            key={item.id}
            onPress={() => {
              setActiveIndex(index);
              scrollRef.current?.scrollTo({ x: index * CARD_STEP, animated: true });
            }}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? colors.brand : colors.border,
                  width: index === activeIndex ? 18 : 6,
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      {activeMedia ? (
        <View
          style={[
            styles.footerRow,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          <View style={styles.footerTextWrap}>
            <Text numberOfLines={1} style={[styles.activeTitle, { color: colors.textPrimary }]}>
              {activeMedia.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {[
                activeMedia.releaseYear,
                activeMedia.runtimeMinutes ? `${activeMedia.runtimeMinutes}m` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/media/${activeMedia.id}`)}
            style={({ pressed }) => [
              styles.viewButton,
              { backgroundColor: colors.brand, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={{ color: colors.onBrand, fontSize: 12, fontWeight: '700' }}>
              View Details
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.onBrand} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  activeTitle: { fontSize: 15, fontWeight: '800' },
  autoPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  autoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  container: { borderRadius: 16, borderWidth: 1, marginTop: 6, overflow: 'hidden', paddingTop: 14 },
  dot: { borderRadius: 4, height: 6 },
  dotsRow: { flexDirection: 'row', gap: 7, justifyContent: 'center', paddingBottom: 12 },
  footerRow: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerTextWrap: { flex: 1, gap: 2, marginRight: 10 },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerTitleWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  poster: { height: '100%', width: '100%' },
  posterCard: {
    borderRadius: 14,
    borderWidth: 2,
    height: 202,
    overflow: 'hidden',
    width: CARD_WIDTH,
  },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  posterShade: {
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    bottom: 0,
    height: 64,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  posterTitle: {
    bottom: 10,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    left: 9,
    position: 'absolute',
    right: 9,
    textAlign: 'center',
  },
  typeBadge: {
    borderRadius: 6,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    top: 8,
  },
  typeText: { fontSize: 9, fontWeight: '800' },
  viewButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
