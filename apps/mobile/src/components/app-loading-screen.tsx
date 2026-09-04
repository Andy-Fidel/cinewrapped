import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import logoFull from '../../assets/logo.png';
import logoFullWhite from '../../assets/logo-white.png';
import logoMark from '../../assets/logo-mark.png';
import logoMarkWhite from '../../assets/logo-mark-white.png';

import { platformFontScaleLimit } from '../lib/text-scale';
import { useTheme } from '../providers/theme-provider';

const minimumDisplayMs = 1_400;
const loadingFontScaleLimit = platformFontScaleLimit(1.2);

export function AppLoadingScreen({
  ready,
  onFinished,
}: {
  ready: boolean;
  onFinished: () => void;
}) {
  const { colors, resolvedTheme } = useTheme();
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const rootOpacity = useRef(new Animated.Value(1)).current;
  const rootScale = useRef(new Animated.Value(1)).current;
  // Keep the branded content visible before the asynchronous accessibility
  // preference resolves. Some Android and web runtimes answer after the minimum
  // display window, which previously left users looking at an empty backdrop.
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const stageScale = useRef(new Animated.Value(0.72)).current;
  const stageOffset = useRef(new Animated.Value(18)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const haloScale = useRef(new Animated.Value(0.84)).current;
  const haloOpacity = useRef(new Animated.Value(0.12)).current;
  const shimmerPosition = useRef(new Animated.Value(-88)).current;
  const copyOpacity = useRef(new Animated.Value(1)).current;
  const copyOffset = useRef(new Animated.Value(10)).current;
  const loaderOpacity = useRef(new Animated.Value(1)).current;
  const progressPosition = useRef(new Animated.Value(-116)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), minimumDisplayMs);
    let active = true;
    let rings: Animated.CompositeAnimation | null = null;
    let breathing: Animated.CompositeAnimation | null = null;
    let halo: Animated.CompositeAnimation | null = null;
    let shimmer: Animated.CompositeAnimation | null = null;
    let progress: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      reduceMotion.current = reduced;
      if (reduced) {
        stageOpacity.setValue(1);
        stageScale.setValue(1);
        stageOffset.setValue(0);
        haloScale.setValue(1);
        haloOpacity.setValue(0.18);
        copyOpacity.setValue(1);
        copyOffset.setValue(0);
        loaderOpacity.setValue(1);
        progressPosition.setValue(0);
        return;
      }

      Animated.sequence([
        Animated.parallel([
          Animated.timing(stageOpacity, {
            toValue: 1,
            duration: 340,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(stageScale, {
            toValue: 1,
            damping: 15,
            mass: 0.8,
            stiffness: 145,
            useNativeDriver: true,
          }),
          Animated.timing(stageOffset, {
            toValue: 0,
            duration: 560,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(haloScale, {
              toValue: 1.08,
              duration: 680,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0.24,
              duration: 520,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(copyOpacity, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(copyOffset, {
            toValue: 0,
            duration: 440,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(loaderOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      rings = Animated.loop(
        Animated.timing(ringRotation, {
          toValue: 1,
          duration: 4_800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      breathing = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.035,
            duration: 1_500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1_500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      halo = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(haloScale, {
              toValue: 1.22,
              duration: 1_650,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(haloOpacity, {
              toValue: 0,
              duration: 1_650,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(haloScale, { toValue: 0.92, duration: 0, useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0.2, duration: 0, useNativeDriver: true }),
        ]),
      );
      shimmer = Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(shimmerPosition, {
            toValue: 88,
            duration: 900,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(shimmerPosition, {
            toValue: -88,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(1_500),
        ]),
      );
      progress = Animated.loop(
        Animated.sequence([
          Animated.timing(progressPosition, {
            toValue: 116,
            duration: 1_350,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(progressPosition, {
            toValue: -116,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(160),
        ]),
      );
      rings.start();
      breathing.start();
      halo.start();
      shimmer.start();
      progress.start();
    });

    return () => {
      active = false;
      clearTimeout(timer);
      rings?.stop();
      breathing?.stop();
      halo?.stop();
      shimmer?.stop();
      progress?.stop();
    };
  }, [
    copyOffset,
    copyOpacity,
    haloOpacity,
    haloScale,
    loaderOpacity,
    logoScale,
    progressPosition,
    ringRotation,
    shimmerPosition,
    stageOffset,
    stageOpacity,
    stageScale,
  ]);

  useEffect(() => {
    if (!ready || !minimumElapsed) return;
    const exit = Animated.parallel([
      Animated.timing(rootOpacity, {
        toValue: 0,
        duration: reduceMotion.current ? 80 : 320,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rootScale, {
        toValue: reduceMotion.current ? 1 : 1.035,
        duration: reduceMotion.current ? 80 : 360,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    exit.start(({ finished }) => {
      if (finished) onFinished();
    });
    return () => exit.stop();
  }, [minimumElapsed, onFinished, ready, rootOpacity, rootScale]);

  const ringSpin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const reverseRingSpin = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const dark = resolvedTheme === 'dark';
  const markSource = dark ? logoMarkWhite : logoMark;
  const wordmarkSource = dark ? logoFullWhite : logoFull;

  return (
    <Animated.View
      accessibilityLabel="CineWrapped is loading"
      accessibilityRole="progressbar"
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          opacity: rootOpacity,
          transform: [{ scale: rootScale }],
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          styles.glowTop,
          { backgroundColor: colors.brand, opacity: dark ? 0.14 : 0.09 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          styles.glowBottom,
          { backgroundColor: colors.accent, opacity: dark ? 0.1 : 0.065 },
        ]}
      />
      <View pointerEvents="none" style={[styles.frameLine, { backgroundColor: colors.border }]} />

      <Animated.View
        style={[
          styles.hero,
          {
            opacity: stageOpacity,
            transform: [{ translateY: stageOffset }, { scale: stageScale }],
          },
        ]}
      >
        <View style={styles.logoStage}>
          <Animated.View
            style={[
              styles.halo,
              {
                backgroundColor: colors.brand,
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.outerRing,
              {
                borderColor: dark ? colors.borderStrong : colors.border,
                transform: [{ rotate: ringSpin }],
              },
            ]}
          >
            <View style={[styles.ringSpark, styles.sparkTop, { backgroundColor: colors.brand }]} />
            <View
              style={[styles.ringSpark, styles.sparkBottom, { backgroundColor: colors.accent }]}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.innerRing,
              {
                borderColor: colors.border,
                borderRightColor: colors.brand,
                transform: [{ rotate: reverseRingSpin }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.logoPlate,
              {
                backgroundColor: colors.surface,
                borderColor: dark ? colors.borderStrong : colors.border,
                shadowColor: colors.brand,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image accessibilityIgnoresInvertColors source={markSource} style={styles.markImage} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shimmer,
                {
                  backgroundColor: dark ? '#FFFFFF' : colors.surface,
                  transform: [{ translateX: shimmerPosition }, { rotate: '18deg' }],
                },
              ]}
            />
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.copy, { opacity: copyOpacity, transform: [{ translateY: copyOffset }] }]}
      >
        <Image
          accessibilityIgnoresInvertColors
          source={wordmarkSource}
          style={styles.wordmarkImage}
        />
        <View style={styles.taglineRow}>
          <View style={[styles.taglineRule, { backgroundColor: colors.brand }]} />
          <Text
            maxFontSizeMultiplier={loadingFontScaleLimit}
            style={[styles.tagline, { color: colors.textSecondary }]}
          >
            YOUR STORY IN CINEMA
          </Text>
          <View style={[styles.taglineRule, { backgroundColor: colors.brand }]} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.loaderArea, { opacity: loaderOpacity }]}>
        <View style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
          <Animated.View
            style={[
              styles.progress,
              {
                backgroundColor: colors.brand,
                transform: [{ translateX: progressPosition }],
              },
            ]}
          />
        </View>
        <Text
          maxFontSizeMultiplier={loadingFontScaleLimit}
          style={[styles.loadingLabel, { color: colors.textDisabled }]}
        >
          CURATING YOUR CUT
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ambientGlow: {
    borderRadius: 999,
    height: 360,
    position: 'absolute',
    width: 360,
  },
  glowTop: { right: -210, top: -130 },
  glowBottom: { bottom: -180, left: -210 },
  frameLine: { height: 1, left: 28, opacity: 0.45, position: 'absolute', right: 28, top: 54 },
  hero: { alignItems: 'center' },
  logoStage: {
    alignItems: 'center',
    height: 196,
    justifyContent: 'center',
    width: 196,
  },
  halo: {
    borderRadius: 86,
    height: 172,
    position: 'absolute',
    width: 172,
  },
  outerRing: {
    borderRadius: 82,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 164,
    position: 'absolute',
    width: 164,
  },
  innerRing: {
    borderRadius: 68,
    borderWidth: 1,
    height: 136,
    opacity: 0.8,
    position: 'absolute',
    width: 136,
  },
  ringSpark: {
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    width: 8,
  },
  sparkTop: { right: 20, top: 14 },
  sparkBottom: { bottom: 15, left: 19 },
  logoPlate: {
    alignItems: 'center',
    borderRadius: 32,
    borderWidth: 1,
    elevation: 12,
    height: 108,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    width: 108,
  },
  markImage: { height: 84, resizeMode: 'contain', width: 80 },
  shimmer: {
    height: 150,
    opacity: 0.16,
    position: 'absolute',
    width: 24,
  },
  copy: { alignItems: 'center', marginTop: 18 },
  wordmarkImage: { height: 50, resizeMode: 'contain', width: 216 },
  taglineRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 7 },
  taglineRule: { borderRadius: 1, height: 1, opacity: 0.7, width: 22 },
  tagline: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
  loaderArea: { alignItems: 'center', bottom: 64, position: 'absolute' },
  track: { borderRadius: 2, height: 2, overflow: 'hidden', width: 216 },
  progress: { borderRadius: 2, height: 2, width: 86 },
  loadingLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginTop: 14 },
});
