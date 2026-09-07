import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandLogo, Button, Screen, useColors } from './ui';

const chapters = [
  {
    eyebrow: 'A HOME FOR YOUR WATCH HISTORY',
    title: 'Every film.\nPart of your story.',
    body: 'Save the films you want to see. Log the ones you love. Keep your movie life beautifully in one place.',
    icon: 'film-outline',
    label: 'YOUR PERSONAL COLLECTION',
    cards: ['Want to watch', 'Watching', 'Watched'],
    note: 'One collection. Endless possibilities.',
  },
  {
    eyebrow: 'LESS SCROLLING, MORE WATCHING',
    title: 'Your next favorite\nis out there.',
    body: 'Discover recommendations shaped by your taste, from crowd favorites to the hidden gems you might have missed.',
    icon: 'sparkles-outline',
    label: 'MADE FOR YOUR TASTE',
    cards: ['Your genres', 'Your favorites', 'New discoveries'],
    note: 'Good recommendations start with you.',
  },
  {
    eyebrow: 'THE BIGGER PICTURE',
    title: 'See your year\nin cinema.',
    body: 'Explore your watching habits, relive your favorites in personal wraps, and connect with friends who love a good story.',
    icon: 'stats-chart-outline',
    label: 'YOUR CINEMA, RECAPTURED',
    cards: ['Watching stats', 'Personal wraps', 'Friends & clubs'],
    note: 'More than a watchlist. Your perspective.',
  },
] as const;

export function WelcomeTour({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();
  const [step, setStep] = useState(0);
  // Start with motion disabled until the device preference is known.
  const [reduceMotion, setReduceMotion] = useState(true);
  const entrance = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(1 / chapters.length)).current;
  const chapter = chapters[step]!;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    entrance.setValue(reduceMotion ? 1 : 0);
    const animation = Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: reduceMotion ? 0 : 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: (step + 1) / chapters.length,
        duration: reduceMotion ? 0 : 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [entrance, progress, reduceMotion, step]);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <BrandLogo size="sm" variant="mark" />
          <Text style={[styles.brand, { color: colors.textPrimary }]}>CINEWRAPPED</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip welcome tour"
            onPress={onFinish}
            style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Skip tour</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Animated.View
          style={{
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [reduceMotion ? 0 : 14, 0],
                }),
              },
            ],
          }}
        >
          <View
            style={[
              styles.preview,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
          >
            <View style={[styles.halo, { borderColor: colors.border }]} />
            <View style={[styles.icon, { backgroundColor: colors.brand }]}>
              <Ionicons name={chapter.icon} size={34} color={colors.onBrand} />
            </View>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
              {chapter.label}
            </Text>
            <View style={styles.cards}>
              {chapter.cards.map((label, index) => (
                <View
                  key={label}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      transform: [
                        { rotate: `${(index - 1) * 4}deg` },
                        { translateY: index === 1 ? -6 : 0 },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      index === 0
                        ? 'bookmark-outline'
                        : index === 1
                          ? 'heart-outline'
                          : 'checkmark-circle-outline'
                    }
                    color={colors.brand}
                    size={22}
                  />
                  <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{label}</Text>
                  <View style={[styles.cardLine, { backgroundColor: colors.border }]} />
                </View>
              ))}
            </View>
            <Text style={[styles.note, { color: colors.textSecondary }]}>{chapter.note}</Text>
          </View>
          <View style={styles.copy} accessibilityLiveRegion="polite">
            <Text style={[styles.eyebrow, { color: colors.brand }]}>{chapter.eyebrow}</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              {chapter.title}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{chapter.body}</Text>
          </View>
        </Animated.View>
        <View style={styles.footer}>
          <View style={styles.header}>
            <Text style={[styles.counter, { color: colors.textSecondary }]}>
              GET TO KNOW CINEWRAPPED
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {String(step + 1).padStart(2, '0')} / 03
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Welcome tour progress"
            accessibilityValue={{ min: 1, max: 3, now: step + 1 }}
            style={[styles.track, { backgroundColor: colors.border }]}
          >
            <Animated.View
              style={[
                styles.fill,
                {
                  backgroundColor: colors.brand,
                  width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </View>
          <View style={styles.actions}>
            {step > 0 ? (
              <Button
                label="Back"
                variant="secondary"
                onPress={() => setStep((value) => Math.max(0, value - 1))}
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                label={step === chapters.length - 1 ? 'Make it mine' : 'Continue'}
                onPress={() => {
                  if (step === chapters.length - 1) onFinish();
                  else setStep((value) => Math.min(chapters.length - 1, value + 1));
                }}
              />
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Next, a few details to make CineWrapped yours.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 28, paddingVertical: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  brand: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  skip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  preview: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 20,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    top: -130,
  },
  icon: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  cards: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  card: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, gap: 12, minHeight: 112 },
  cardLabel: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  cardLine: { width: '65%', height: 3, borderRadius: 2, marginTop: 'auto' },
  note: { fontSize: 11, textAlign: 'center', lineHeight: 17 },
  copy: { paddingTop: 28, gap: 14 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { fontSize: 36, fontWeight: '800', letterSpacing: -1.4, lineHeight: 42 },
  body: { fontSize: 16, lineHeight: 25 },
  footer: { gap: 16 },
  counter: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  hint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
