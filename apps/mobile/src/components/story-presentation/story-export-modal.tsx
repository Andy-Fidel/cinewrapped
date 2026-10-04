import type { StoryPresentation } from '@cinewrapped/shared-types';
import { useState } from 'react';
import { Modal, Platform, ScrollView, Text, View } from 'react-native';
import { GraphicCardPreview } from '../graphic-card-preview';
import { Button, useColors } from '../ui';
import type { CardTheme } from '../../lib/share-card-model';

export function StoryExportModal({
  visible,
  onClose,
  presentation,
  currentSlideIndex,
}: {
  visible: boolean;
  onClose: () => void;
  presentation: StoryPresentation;
  currentSlideIndex: number;
}) {
  const colors = useColors();
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const slide = presentation.slides[currentSlideIndex];
  const exportJson = async () => {
    setExporting(true);
    setMessage('');
    try {
      const content = JSON.stringify(presentation, null, 2);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'cinewrapped-presentation.json';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        setMessage('Presentation JSON downloaded.');
      } else {
        const { File, Paths } = await import('expo-file-system');
        const { isAvailableAsync, shareAsync } = await import('expo-sharing');
        if (!(await isAvailableAsync()))
          throw new Error('File sharing is unavailable on this device.');
        const file = new File(Paths.cache, `cinewrapped-presentation-${Date.now()}.json`);
        try {
          file.create();
          file.write(content);
          await shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Save presentation JSON',
          });
          setMessage('File share sheet completed.');
        } finally {
          if (file.exists) file.delete();
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not export the presentation.');
    } finally {
      setExporting(false);
    }
  };
  const theme: CardTheme =
    slide?.theme === 'CRIMSON_NOIR'
      ? 'CRIMSON'
      : slide?.theme === 'NEON_CYBER' || slide?.theme === 'EMERALD_VAULT'
        ? 'CYAN'
        : slide?.theme === 'MIDNIGHT_GOLD'
          ? 'GOLD'
          : 'MIDNIGHT';
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
              Share & Export Slide
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
                  theme,
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
