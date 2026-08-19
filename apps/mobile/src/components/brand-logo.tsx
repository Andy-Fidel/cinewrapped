import React from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '../providers/theme-provider';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark';
  style?: ViewStyle;
}

const logoFull = require('../../assets/logo.png');
const logoFullWhite = require('../../assets/logo-white.png');
const logoMark = require('../../assets/logo-mark.png');
const logoMarkWhite = require('../../assets/logo-mark-white.png');

const SIZES = {
  sm: { fullWidth: 110, fullHeight: 25, markSize: 24 },
  md: { fullWidth: 150, fullHeight: 34, markSize: 34 },
  lg: { fullWidth: 200, fullHeight: 46, markSize: 48 },
  xl: { fullWidth: 260, fullHeight: 60, markSize: 64 },
};

export function BrandLogo({
  size = 'md',
  variant = 'full',
  style,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const config = SIZES[size];

  if (variant === 'mark') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={isDark ? logoMark : logoMark}
          style={{ width: config.markSize, height: config.markSize }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={isDark ? logoFull : logoFull}
        style={{ width: config.fullWidth, height: config.fullHeight }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
