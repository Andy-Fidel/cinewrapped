import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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
  const recoil = useRef(new Animated.Value(0)).current;

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
    recoil.setValue(0);
    if (reduceMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(recoil, {
          toValue: 1,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(recoil, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [recoil, reduceMotion]);

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
      <View pointerEvents="none" style={styles.frame} />
      <View style={styles.content}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={styles.character}
        >
          <Animated.View
            style={{
              transform: [
                { translateX: recoil.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) },
                {
                  rotate: recoil.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '-3deg'],
                  }),
                },
              ],
            }}
          >
            <Svg width={180} height={160} viewBox="0 0 180 160" fill="none">
              {/* Original vector silhouette: a cinematic stunt pose, facing away from the viewer. */}
              <Circle cx="65" cy="29" r="13" fill="#EBD5AD" />
              <Path d="M51 27C49 8 78 8 79 28L69 23L53 27Z" fill="#FBF5E8" />
              <Path d="M56 45L75 44L90 78L80 104L47 102L49 65Z" fill="#FBF5E8" />
              <Path d="M72 49L92 63L116 57L119 66L91 76L67 64" fill="#EBD5AD" />
              <Path d="M55 58L76 79L110 66L106 58L79 65L64 50" fill="#FBF5E8" />
              <Path
                d="M48 98L65 100L59 127L45 149H29L45 121Z M65 99L80 99L84 125L103 143L96 152L72 132L61 115Z"
                fill="#FBF5E8"
              />
              <Path d="M110 53H141V60H121L118 72H110L113 60H108Z" fill="#D5AE6E" />
              <Path
                d="M29 153H48M94 154H109"
                stroke="#D5AE6E"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
          <Animated.View
            style={[
              styles.flash,
              {
                opacity: recoil.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, 0, 0.9] }),
                transform: [
                  { scale: recoil.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
              },
            ]}
          >
            <Svg width={35} height={35} viewBox="0 0 35 35">
              <Path d="M0 17L12 13L9 3L20 11L31 5L26 16L35 22L22 22L19 33L13 23Z" fill="#F1CA83" />
            </Svg>
          </Animated.View>
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
    justifyContent: 'center',
    overflow: 'hidden',
  },
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
  content: { alignItems: 'center', gap: 18, padding: 24 },
  character: { width: 180, height: 160, marginBottom: 12 },
  flash: { position: 'absolute', left: 141, top: 39 },
  wordmark: { width: 230, height: 60 },
  tagline: { color: '#EBD5AD', fontSize: 10, fontWeight: '600', letterSpacing: 3 },
  rule: { width: 36, height: 1, backgroundColor: '#D5AE6E', marginTop: 16 },
  loading: { color: '#C2C6C8', fontSize: 9, letterSpacing: 2.5, fontWeight: '500' },
});
