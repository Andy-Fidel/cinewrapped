import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';

interface Stamp {
  countryCode: string;
  uniqueTitles: number;
}

const PIN_POSITIONS = [
  { left: '25%' as const, top: '30%' as const },
  { left: '62%' as const, top: '24%' as const },
  { left: '70%' as const, top: '57%' as const },
  { left: '35%' as const, top: '66%' as const },
  { left: '48%' as const, top: '42%' as const },
];

export function PassportGlobe3D({ stamps }: { stamps: Stamp[] }) {
  const colors = useColors();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        duration: 12000,
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
    outputRange: ['-12deg', '12deg', '-12deg'],
  });
  const visibleStamps = stamps.slice(0, PIN_POSITIONS.length);

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.badgeRow}>
        <Text style={[styles.badgeText, { color: colors.brand }]}>MOVIE PASSPORT</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{stamps.length} stamps</Text>
      </View>

      <View style={styles.scene}>
        <View style={[styles.orbit, { borderColor: colors.brand }]} />
        <Animated.View
          accessibilityLabel={`Movie passport globe with ${stamps.length} country stamps`}
          style={[
            styles.globe,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.brand,
              transform: [{ perspective: 700 }, { rotateY }],
            },
          ]}
        >
          <View style={[styles.latitude, styles.latitudeTop, { borderColor: colors.brand }]} />
          <View style={[styles.latitude, styles.latitudeMiddle, { borderColor: colors.brand }]} />
          <View style={[styles.latitude, styles.latitudeBottom, { borderColor: colors.brand }]} />
          <View style={[styles.longitude, { borderColor: colors.brand }]} />
          <View style={[styles.longitude, styles.longitudeWide, { borderColor: colors.brand }]} />
          {visibleStamps.map((stamp, index) => (
            <View
              key={`${stamp.countryCode}-${index}`}
              style={[
                styles.pin,
                PIN_POSITIONS[index],
                { backgroundColor: '#FFD166', borderColor: colors.surface },
              ]}
            >
              <Text style={styles.pinText}>{stamp.uniqueTitles}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      <View style={styles.stampRow}>
        {visibleStamps.length > 0 ? (
          visibleStamps.map((stamp, index) => (
            <View
              key={`${stamp.countryCode}-label-${index}`}
              style={[styles.stamp, { backgroundColor: colors.surfaceRaised }]}
            >
              <Text style={[styles.stampCode, { color: colors.textPrimary }]}>
                {stamp.countryCode.toUpperCase()}
              </Text>
              <Text style={[styles.stampCount, { color: colors.textSecondary }]}>
                {stamp.uniqueTitles}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Watch international titles to collect stamps.
          </Text>
        )}
      </View>
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
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 14,
    paddingTop: 12,
  },
  emptyText: { fontSize: 12, textAlign: 'center' },
  globe: {
    borderRadius: 84,
    borderWidth: 2,
    height: 168,
    overflow: 'hidden',
    position: 'relative',
    width: 168,
  },
  hint: { fontSize: 11, fontWeight: '600' },
  latitude: {
    borderRadius: 80,
    borderWidth: 1,
    height: 42,
    left: 10,
    opacity: 0.35,
    position: 'absolute',
    width: 144,
  },
  latitudeBottom: { bottom: 13 },
  latitudeMiddle: { height: 58, top: 54 },
  latitudeTop: { top: 13 },
  longitude: {
    borderRadius: 80,
    borderWidth: 1,
    bottom: 2,
    left: 56,
    opacity: 0.35,
    position: 'absolute',
    top: 2,
    width: 52,
  },
  longitudeWide: { left: 28, width: 108 },
  orbit: {
    borderRadius: 100,
    borderWidth: 1,
    height: 118,
    opacity: 0.2,
    position: 'absolute',
    transform: [{ rotate: '-12deg' }],
    width: 210,
  },
  pin: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    width: 20,
  },
  pinText: { color: '#332400', fontSize: 8, fontWeight: '900' },
  scene: { alignItems: 'center', height: 210, justifyContent: 'center' },
  stamp: {
    alignItems: 'center',
    borderRadius: 8,
    minWidth: 42,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stampCode: { fontSize: 10, fontWeight: '800' },
  stampCount: { fontSize: 9 },
  stampRow: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
});
