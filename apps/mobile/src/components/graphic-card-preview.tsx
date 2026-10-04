import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import type Svg from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import { renderGraphicCard, type GraphicCard } from '../lib/share-card-model';
import {
  downloadWebCard,
  loadCardPoster,
  prepareWebCard,
  shareNativeCard,
  shareWebCard,
  type PreparedWebCard,
} from '../lib/share-card-generator';
import { Button, useColors } from './ui';

export function GraphicCardPreview({
  card,
  posterUrl,
}: {
  card: GraphicCard;
  posterUrl?: string | null | undefined;
}) {
  const colors = useColors();
  const svgRef = useRef<Svg | null>(null);
  const sharing = useRef(false);
  const [poster, setPoster] = useState<{ url: string | null | undefined; data: string | null }>({
    url: undefined,
    data: null,
  });
  const [prepared, setPrepared] = useState<{ svg: string; card: PreparedWebCard } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const ready = !posterUrl || poster.url === posterUrl;
  const svg = renderGraphicCard({
    ...card,
    posterDataUrl: poster.url === posterUrl ? poster.data : null,
  });
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let active = true;
    void loadCardPoster(posterUrl, controller.signal)
      .catch(() => null)
      .then((data) => {
        if (active) setPoster({ url: posterUrl, data });
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [posterUrl, attempt]);
  useEffect(() => {
    setFailure(null);
    setMessage('');
    if (!ready || Platform.OS !== 'web') return;
    let active = true;
    void prepareWebCard(svg, card.title)
      .then((result) => {
        if (active) setPrepared({ svg, card: result });
      })
      .catch((error: unknown) => {
        if (active)
          setFailure(error instanceof Error ? error.message : 'Could not prepare the image.');
      });
    return () => {
      active = false;
    };
  }, [svg, card.title, ready, attempt]);
  const available = ready && !failure && (Platform.OS !== 'web' || prepared?.svg === svg);
  const share = async (download = false) => {
    if (sharing.current || !available) return;
    sharing.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (Platform.OS === 'web') {
        if (prepared?.svg !== svg) throw new Error('The card is still preparing.');
        // The file is already prepared, so navigator.share runs directly from this click.
        const outcome = download
          ? downloadWebCard(prepared.card)
          : await shareWebCard(prepared.card);
        setMessage(
          outcome === 'downloaded'
            ? 'PNG downloaded.'
            : outcome === 'cancelled'
              ? 'Sharing cancelled.'
              : 'Share sheet completed.',
        );
      } else {
        const base64 = await new Promise<string>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Image export timed out. Try again.')),
            15_000,
          );
          if (!svgRef.current) {
            clearTimeout(timer);
            reject(new Error('The card is still preparing.'));
            return;
          }
          try {
            svgRef.current.toDataURL(
              (value) => {
                clearTimeout(timer);
                resolve(value);
              },
              { width: 1080, height: 1920 },
            );
          } catch (error) {
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error('Image export failed.'));
          }
        });
        const outcome = await shareNativeCard(base64);
        setMessage(outcome === 'cancelled' ? 'Sharing cancelled.' : 'Share sheet completed.');
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not share the image. Please try again.',
      );
    } finally {
      sharing.current = false;
      setBusy(false);
    }
  };
  return (
    <View style={{ width: '100%', gap: 12, alignItems: 'center' }}>
      <View
        accessibilityLabel={`Share card preview for ${card.title}`}
        style={{ width: '100%', maxWidth: 320, aspectRatio: 9 / 16 }}
      >
        <SvgXml xml={svg} override={{ width: '100%', height: '100%', ref: svgRef }} />
      </View>
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
        1080 × 1920 PNG · Long text is shortened as shown in the preview.
      </Text>
      {!ready ? <Text style={{ color: colors.textSecondary }}>Preparing poster…</Text> : null}
      {ready && posterUrl && !poster.data ? (
        <Text style={{ color: colors.textSecondary }}>
          Poster unavailable. The card uses a CineWrapped placeholder.
        </Text>
      ) : null}
      {failure ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {failure}
        </Text>
      ) : null}
      {failure ? (
        <Button label="Retry image preparation" onPress={() => setAttempt((value) => value + 1)} />
      ) : null}
      <View style={{ width: '100%', gap: 8 }}>
        <Button
          label={available ? 'Share PNG image' : 'Preparing image…'}
          disabled={!available || busy}
          loading={busy}
          onPress={() => void share()}
        />
        {Platform.OS === 'web' ? (
          <Button
            label="Download PNG"
            variant="secondary"
            disabled={!available || busy}
            onPress={() => void share(true)}
          />
        ) : null}
      </View>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
