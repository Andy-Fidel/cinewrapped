import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

import gamingAnimation from '../../assets/gaming.json';
import jackSparrowPoster from '../../assets/jack-sparrow-poster.jpg';

import logoFullWhite from '../../assets/logo-white.png';
import { platformFontScaleLimit } from '../lib/text-scale';

const minimumDisplayMs = 1_400;

export function AppLoadingScreen({
  ready,
  onFinished,
}: {
  ready: boolean;
  onFinished: () => void;
}) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), minimumDisplayMs);
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduceMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !minimumElapsed) return;
    const exit = Animated.timing(opacity, {
      toValue: 0,
      duration: reduceMotion ? 0 : 320,
      useNativeDriver: true,
    });
    exit.start(({ finished }) => {
      if (finished) onFinished();
    });
    return () => exit.stop();
  }, [minimumElapsed, onFinished, opacity, ready, reduceMotion]);

  return (
    <Animated.View
      accessibilityLabel="CineWrapped is loading"
      accessibilityRole="progressbar"
      style={[styles.screen, { opacity }]}
    >
      <Image
        source={jackSparrowPoster}
        resizeMode="cover"
        style={styles.poster}
        accessible={false}
        accessibilityIgnoresInvertColors
      />
      <View pointerEvents="none" style={styles.posterShade} />
      <View pointerEvents="none" style={styles.frame} />
      <View style={styles.content}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={styles.character}
        >
          <LottieView
            key={reduceMotion ? 'still' : 'playing'}
            source={gamingAnimation}
            autoPlay={!reduceMotion}
            loop={!reduceMotion}
            resizeMode="contain"
            style={styles.animation}
            webStyle={{ width: '100%', height: '100%' }}
          />
        </View>
        <Image
          accessibilityIgnoresInvertColors
          source={logoFullWhite}
          style={styles.wordmark}
          resizeMode="contain"
        />
        <Text maxFontSizeMultiplier={platformFontScaleLimit(1.2)} style={styles.tagline}>
          YOUR STORY IN CINEMA
        </Text>
        <View style={styles.rule} />
        <Text style={styles.loading}>SETTING THE SCENE</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101B22',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  poster: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  posterShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 10, 16, 0.36)' },
  frame: {
    position: 'absolute',
    top: 55,
    bottom: 40,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D5AE6E40',
  },
  content: { alignItems: 'center', gap: 18, padding: 24, marginBottom: 32 },
  character: { width: 240, height: 180, marginBottom: 12, borderRadius: 20, overflow: 'hidden' },
  animation: { width: '100%', height: '100%' },
  wordmark: { width: 230, height: 60 },
  tagline: { color: '#EBD5AD', fontSize: 10, fontWeight: '600', letterSpacing: 3 },
  rule: { width: 36, height: 1, backgroundColor: '#D5AE6E', marginTop: 16 },
  loading: { color: '#C2C6C8', fontSize: 9, letterSpacing: 2.5, fontWeight: '500' },
});
