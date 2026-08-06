import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';

interface MovieDnaTrait {
  key: string;
  label: string;
  value: string;
  evidenceCount: number;
}

const HELIX_ROWS = Array.from({ length: 11 }, (_, index) => index);

export function MovieDna3D({ traits, label }: { traits: MovieDnaTrait[]; label: string }) {
  const colors = useColors();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        duration: 9000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const rotateY = rotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-10deg', '10deg', '-10deg'],
  });
  const strongestTrait = traits.reduce<MovieDnaTrait | undefined>(
    (strongest, trait) =>
      !strongest || trait.evidenceCount > strongest.evidenceCount ? trait : strongest,
    undefined,
  );

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.badgeRow}>
        <Text style={[styles.badgeText, { color: colors.brand }]}>MOVIE DNA</Text>
        <Text numberOfLines={1} style={[styles.profileLabel, { color: colors.textPrimary }]}>
          {label}
        </Text>
      </View>

      <View style={styles.scene}>
        <View style={[styles.glow, { backgroundColor: colors.brand }]} />
        <Animated.View style={[styles.helix, { transform: [{ perspective: 700 }, { rotateY }] }]}>
          {HELIX_ROWS.map((row) => {
            const phase = row % 4;
            const left = 36 + (phase === 0 ? 0 : phase === 1 ? 20 : phase === 2 ? 42 : 20);
            const right = 36 + (phase === 0 ? 42 : phase === 1 ? 20 : phase === 2 ? 0 : 20);
            const faded = phase === 1 || phase === 3;
            return (
              <View key={row} style={styles.helixRow}>
                <View
                  style={[
                    styles.rung,
                    {
                      backgroundColor: colors.brand,
                      left: left + 7,
                      opacity: faded ? 0.3 : 0.6,
                      right: right + 7,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.node,
                    { backgroundColor: colors.brand, left, opacity: faded ? 0.65 : 1 },
                  ]}
                />
                <View
                  style={[
                    styles.node,
                    { backgroundColor: '#FFD166', opacity: faded ? 0.65 : 1, right },
                  ]}
                />
              </View>
            );
          })}
        </Animated.View>
      </View>

      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        {strongestTrait
          ? `${strongestTrait.label}: ${strongestTrait.value} · ${strongestTrait.evidenceCount} signals`
          : 'Complete more titles to reveal your strongest taste signal.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  badgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  caption: { fontSize: 12, paddingBottom: 14, paddingHorizontal: 16, textAlign: 'center' },
  cardContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', paddingTop: 12 },
  glow: { borderRadius: 90, height: 180, opacity: 0.08, position: 'absolute', width: 180 },
  helix: { gap: 2, height: 174, justifyContent: 'center', width: 150 },
  helixRow: { height: 14, justifyContent: 'center', position: 'relative' },
  node: { borderRadius: 6, height: 12, position: 'absolute', width: 12 },
  profileLabel: { flexShrink: 1, fontSize: 13, fontWeight: '700', marginLeft: 12 },
  rung: { height: 2, position: 'absolute' },
  scene: { alignItems: 'center', height: 190, justifyContent: 'center', overflow: 'hidden' },
});
