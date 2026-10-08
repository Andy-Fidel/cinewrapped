import type {
  StoryPresentation,
  StorySlideData,
  StoryThemePreset,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';

import { StoryExportModal } from './story-export-modal';
import { StorySlideRenderer } from './story-slide-renderer';
import { getStoryTheme } from './story-theme';
import { haptics } from '../../lib/haptics';

const SLIDE_DURATION_MS = 5000;

export function StoryViewer({
  presentation,
  onClose,
  initialSlideIndex = 0,
}: {
  presentation: StoryPresentation;
  onClose: () => void;
  initialSlideIndex?: number;
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlideIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [readingMode, setReadingMode] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<StoryThemePreset>(presentation.defaultTheme);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const currentSlideAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const totalSlides = presentation.slides.length;
  const activeSlide: StorySlideData = {
    ...presentation.slides[currentSlideIndex]!,
    theme: currentTheme,
  };

  const themeColors = getStoryTheme(currentTheme);

  // Animation controller for the active slide progress bar
  useEffect(() => {
    if (isPaused || readingMode || exportModalVisible) {
      if (currentSlideAnimRef.current) {
        currentSlideAnimRef.current.stop();
      }
      return;
    }

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: SLIDE_DURATION_MS,
      useNativeDriver: false,
    });

    currentSlideAnimRef.current = anim;

    anim.start(({ finished }) => {
      if (finished) {
        handleNextSlide();
      }
    });

    return () => {
      anim.stop();
    };
  }, [currentSlideIndex, isPaused, readingMode, exportModalVisible]);

  const handleNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      haptics.selection();
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      haptics.clapperSnap();
      onClose();
    }
  };

  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      haptics.selection();
      setCurrentSlideIndex((prev) => prev - 1);
    } else {
      progressAnim.setValue(0);
    }
  };

  const handleCycleTheme = () => {
    haptics.selection();
    const themes: StoryThemePreset[] = [
      'MIDNIGHT_GOLD',
      'NEON_CYBER',
      'CRIMSON_NOIR',
      'EMERALD_VAULT',
      'AMETHYST_DREAM',
    ];
    const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
    setCurrentTheme(themes[nextIdx]!);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bgGradient[0] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={readingMode ? 'Play story' : 'Pause story'}
        onPress={() => setReadingMode((paused) => !paused)}
        style={{ padding: 12 }}
      >
        <Text style={{ color: themeColors.textPrimary }}>
          {readingMode ? 'Play story' : 'Pause story'}
        </Text>
      </Pressable>
      {/* Top Segmented Story Progress Bar */}
      <View style={styles.progressBarContainer}>
        {presentation.slides.map((_, index) => {
          let barWidth: DimensionValue | Animated.AnimatedInterpolation<string | number> = '0%';
          if (index < currentSlideIndex) {
            barWidth = '100%';
          } else if (index === currentSlideIndex) {
            barWidth = progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
          }

          return (
            <View
              key={`prog-bar-${index}`}
              style={[styles.progressSegmentBg, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}
            >
              <Animated.View
                style={[
                  styles.progressSegmentFill,
                  {
                    width: barWidth,
                    backgroundColor: themeColors.accent,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <ScrollView
        style={styles.slideCanvas}
        contentContainerStyle={styles.slideContent}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        onTouchCancel={() => setIsPaused(false)}
      >
        <StorySlideRenderer slide={activeSlide} userHandle={presentation.author.username} />
      </ScrollView>

      {/* Floating Story Bottom Bar */}
      <View style={styles.bottomBar}>
        {/* Left: Close presentation */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close story"
          onPress={onClose}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous slide"
          onPress={handlePreviousSlide}
          style={styles.actionButton}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next slide"
          onPress={handleNextSlide}
          style={styles.actionButton}
        >
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>
        {/* Center: Slide indicator */}
        <View style={styles.slideCounterPill}>
          <Text style={styles.slideCounterText}>
            {currentSlideIndex + 1} / {totalSlides}
          </Text>
        </View>

        {/* Right: Theme Palette Switcher & Export Modal */}
        <View style={styles.rightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch story color theme"
            onPress={handleCycleTheme}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: themeColors.pillBg,
                borderColor: themeColors.accent,
                borderWidth: 1,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="color-palette-outline" size={18} color={themeColors.accent} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share presentation slide"
            onPress={() => setExportModalVisible(true)}
            style={({ pressed }) => [
              styles.exportButton,
              {
                backgroundColor: themeColors.accent,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="share-outline" size={18} color="#000000" />
            <Text style={styles.exportButtonText}>Share Slide</Text>
          </Pressable>
        </View>
      </View>

      {/* 9:16 Platform Story Export Modal */}
      <StoryExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        presentation={presentation}
        currentSlideIndex={currentSlideIndex}
        selectedTheme={currentTheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    maxWidth: 960,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 20,
  },
  progressSegmentBg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressSegmentFill: {
    height: '100%',
    borderRadius: 2,
  },
  slideContent: { flexGrow: 1 },
  slideCanvas: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  bottomBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 20,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideCounterPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  slideCounterText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  rightActions: {
    flexWrap: 'wrap',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 19,
  },
  exportButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
});
