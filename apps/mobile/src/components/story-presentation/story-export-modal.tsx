import type { StoryPresentation, StoryThemePreset } from '@cinewrapped/shared-types';
import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { GraphicCardPreview } from '../graphic-card-preview';
import { Button, useColors } from '../ui';
import { exportTextFile } from '../../lib/file-export';
import { getStoryTheme } from './story-theme';

export function StoryExportModal({
  visible,
  onClose,
  presentation,
  currentSlideIndex,
  selectedTheme,
}: {
  visible: boolean;
  onClose: () => void;
  presentation: StoryPresentation;
  currentSlideIndex: number;
  selectedTheme: StoryThemePreset;
}) {
  const colors = useColors();
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const slide = presentation.slides[currentSlideIndex];
  const exportJson = async () => {
    setExporting(true);
    setMessage('');
    try {
      const content = JSON.stringify(
        {
          ...presentation,
          defaultTheme: selectedTheme,
          slides: presentation.slides.map((item) => ({ ...item, theme: selectedTheme })),
        },
        null,
        2,
      );
      const outcome = await exportTextFile(
        content,
        'cinewrapped-presentation.json',
        'application/json',
        'Save presentation JSON',
      );
      setMessage(
        outcome === 'cancelled'
          ? 'Export cancelled.'
          : outcome === 'downloaded'
            ? 'Presentation JSON downloaded.'
            : 'File share sheet completed.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export the presentation.');
    } finally {
      setExporting(false);
    }
  };
  const storyColors = getStoryTheme(selectedTheme);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            maxHeight: '92%',
            padding: 16,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
              Share Slide Summary
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              A still summary card using your selected story palette.
            </Text>
            <Button label="Close export" variant="secondary" onPress={onClose} />
            {visible && slide ? (
              <GraphicCardPreview
                card={{
                  title: slide.headline,
                  subtitle: slide.eyebrow,
                  body: [
                    slide.description,
                    ...(slide.rankingItems ?? []).map(
                      (item) =>
                        `${item.rank}. ${item.title}${item.score != null ? ` · ${item.score}` : ''}`,
                    ),
                    ...(slide.secondaryMetrics ?? []).map(
                      (item) => `${item.value} · ${item.label}`,
                    ),
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  author: presentation.author.displayName,
                  handle: presentation.author.username,
                  theme: 'MIDNIGHT',
                  palette: { background: storyColors.bgGradient[0], accent: storyColors.accent },
                  ...(slide.metric
                    ? {
                        metric: {
                          value: `${slide.metric.prefix ?? ''}${slide.metric.value}${slide.metric.suffix ?? ''}`,
                          label: slide.metric.label,
                        },
                      }
                    : {}),
                }}
                posterUrl={slide.media?.posterUrl}
              />
            ) : (
              <Text style={{ color: colors.textSecondary }}>This slide is unavailable.</Text>
            )}
            <Button
              label="Export presentation JSON"
              variant="secondary"
              disabled={exporting}
              loading={exporting}
              onPress={() => void exportJson()}
            />
            {message ? (
              <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>
                {message}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
