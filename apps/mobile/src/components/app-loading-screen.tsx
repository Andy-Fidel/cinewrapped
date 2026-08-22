import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../providers/theme-provider';

const minimumDisplayMs = 1_000;

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
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(0.82)).current;
  const markOffset = useRef(new Animated.Value(12)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const copyOffset = useRef(new Animated.Value(8)).current;
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.38)).current;
  const progressPosition = useRef(new Animated.Value(-96)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), minimumDisplayMs);
    let active = true;
    let orbit: Animated.CompositeAnimation | null = null;
    let pulse: Animated.CompositeAnimation | null = null;
    let progress: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active) return;
      reduceMotion.current = reduced;
      if (reduced) {
        entranceOpacity.setValue(1);
        markScale.setValue(1);
        markOffset.setValue(0);
        copyOpacity.setValue(1);
        copyOffset.setValue(0);
        progressPosition.setValue(0);
        return;
      }

      Animated.parallel([
        Animated.timing(entranceOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(markScale, {
          toValue: 1,
          damping: 14,
          mass: 0.72,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(markOffset, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(copyOpacity, {
              toValue: 1,
              duration: 360,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(copyOffset, {
              toValue: 0,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();

      orbit = Animated.loop(
        Animated.timing(orbitRotation, {
          toValue: 1,
          duration: 2_800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseScale, {
              toValue: 1.14,
              duration: 1_300,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1_300,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, {
            toValue: 0.38,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
      progress = Animated.loop(
        Animated.sequence([
          Animated.timing(progressPosition, {
            toValue: 96,
            duration: 1_250,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(progressPosition, {
            toValue: -96,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(180),
        ]),
      );
      orbit.start();
      pulse.start();
      progress.start();
    });

    return () => {
      active = false;
      clearTimeout(timer);
      orbit?.stop();
      pulse?.stop();
      progress?.stop();
    };
  }, [
    copyOffset,
    copyOpacity,
    entranceOpacity,
    markOffset,
    markScale,
    orbitRotation,
    progressPosition,
    pulseOpacity,
    pulseScale,
  ]);

  useEffect(() => {
    if (!ready || !minimumElapsed) return;
    const exit = Animated.timing(rootOpacity, {
      toValue: 0,
      duration: reduceMotion.current ? 80 : 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    exit.start(({ finished }) => {
      if (finished) onFinished();
    });
    return () => exit.stop();
  }, [minimumElapsed, onFinished, ready, rootOpacity]);

  const orbitSpin = orbitRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const dark = resolvedTheme === 'dark';

  return (
    <Animated.View
      accessibilityLabel="CineWrapped is loading"
      accessibilityRole="progressbar"
      style={[styles.screen, { backgroundColor: colors.background, opacity: rootOpacity }]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          styles.glowTop,
          { backgroundColor: colors.brand, opacity: dark ? 0.11 : 0.08 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          styles.glowBottom,
          { backgroundColor: colors.accent, opacity: dark ? 0.09 : 0.06 },
        ]}
      />

      <Animated.View
        style={[
          styles.hero,
          {
            opacity: entranceOpacity,
            transform: [{ translateY: markOffset }, { scale: markScale }],
          },
        ]}
      >
        <View style={styles.markStage}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: colors.brand,
                opacity: pulseOpacity,
                transform: [{ scale: pulseScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orbit,
              {
                borderColor: colors.border,
                borderTopColor: colors.brand,
                transform: [{ rotate: orbitSpin }],
              },
            ]}
          >
            <View style={[styles.orbitLight, { backgroundColor: colors.brand }]} />
          </Animated.View>
          <View
            style={[
              styles.mark,
              {
                backgroundColor: colors.surface,
                borderColor: dark ? colors.borderStrong : colors.border,
                shadowColor: colors.brand,
              },
            ]}
          >
            <Text style={[styles.monogram, { color: colors.brand }]}>C</Text>
            <View style={styles.perforationsLeft}>
              {[0, 1, 2].map((slot) => (
                <View key={slot} style={[styles.perforation, { backgroundColor: colors.brand }]} />
              ))}
            </View>
            <View style={styles.perforationsRight}>
              {[0, 1, 2].map((slot) => (
                <View key={slot} style={[styles.perforation, { backgroundColor: colors.brand }]} />
              ))}
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.copy, { opacity: copyOpacity, transform: [{ translateY: copyOffset }] }]}
      >
        <Text style={[styles.wordmark, { color: colors.textPrimary }]}>CINEWRAPPED</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>Your story in cinema</Text>
      </Animated.View>

      <Animated.View style={[styles.loaderArea, { opacity: copyOpacity }]}>
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
        <Text style={[styles.loadingLabel, { color: colors.textDisabled }]}>CURATING YOUR CUT</Text>
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
    height: 320,
    position: 'absolute',
    width: 320,
  },
  glowTop: { right: -180, top: -110 },
  glowBottom: { bottom: -150, left: -190 },
  hero: { alignItems: 'center' },
  markStage: {
    alignItems: 'center',
    height: 154,
    justifyContent: 'center',
    width: 154,
  },
  pulseRing: {
    borderRadius: 74,
    borderWidth: 1,
    height: 148,
    position: 'absolute',
    width: 148,
  },
  orbit: {
    borderRadius: 62,
    borderWidth: 1,
    height: 124,
    position: 'absolute',
    width: 124,
  },
  orbitLight: {
    borderRadius: 4,
    height: 7,
    position: 'absolute',
    right: 14,
    top: 8,
    width: 7,
  },
  mark: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    elevation: 10,
    height: 92,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    width: 92,
  },
  monogram: {
    fontSize: 50,
    fontWeight: '800',
    letterSpacing: -4,
    lineHeight: 58,
    marginLeft: -2,
  },
  perforationsLeft: { gap: 8, left: 8, position: 'absolute' },
  perforationsRight: { gap: 8, position: 'absolute', right: 8 },
  perforation: { borderRadius: 1, height: 4, opacity: 0.55, width: 3 },
  copy: { alignItems: 'center', marginTop: 22 },
  wordmark: { fontSize: 20, fontWeight: '800', letterSpacing: 4.4 },
  tagline: { fontSize: 13, letterSpacing: 0.5, marginTop: 8 },
  loaderArea: { alignItems: 'center', bottom: 68, position: 'absolute' },
  track: { borderRadius: 2, height: 2, overflow: 'hidden', width: 184 },
  progress: { borderRadius: 2, height: 2, width: 72 },
  loadingLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginTop: 14 },
});
