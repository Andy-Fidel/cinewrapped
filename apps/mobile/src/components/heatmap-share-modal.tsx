import type { ActivityHeatmapSummary } from '@cinewrapped/shared-types';
import { Modal, ScrollView, Text, View } from 'react-native';
import { renderHeatmapShare, type HeatmapSharePalette } from '../lib/heatmap-share';
import { GraphicCardPreview } from './graphic-card-preview';
import { Button, useColors } from './ui';

export function HeatmapShareModal({
  visible,
  onClose,
  data,
  author,
  handle,
  palette,
}: {
  visible: boolean;
  onClose: () => void;
  data: ActivityHeatmapSummary;
  author: string;
  handle: string;
  palette: HeatmapSharePalette;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            padding: 16,
            maxHeight: '92%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
              Share Year in Pixels
            </Text>
            <Button label="Close preview" variant="secondary" onPress={onClose} />
            {visible ? (
              <GraphicCardPreview
                card={{
                  title: `${data.year} Year in Pixels`,
                  body: '',
                  author,
                  handle,
                  theme: 'MIDNIGHT',
                }}
                svgOverride={renderHeatmapShare(data, author, handle, palette)}
              />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
