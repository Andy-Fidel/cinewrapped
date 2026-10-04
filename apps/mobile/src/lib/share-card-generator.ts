import { decodeCardBytes, encodeCardBytes } from './card-base64';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';
export interface PreparedWebCard {
  file: File;
  title: string;
}

export function isShareCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

export async function prepareWebCard(svg: string, title: string): Promise<PreparedWebCard> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Card rendering timed out. Try again.')),
        15_000,
      );
      image.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Could not render the card image.'));
      };
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image export is unavailable in this browser.');
    context.drawImage(image, 0, 0, 1080, 1920);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('Could not create the PNG image.'))),
        'image/png',
      ),
    );
    return { file: new File([blob], 'cinewrapped-card.png', { type: 'image/png' }), title };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadWebCard(card: PreparedWebCard): ShareOutcome {
  const url = URL.createObjectURL(card.file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = card.file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

// Call from a click with a pre-rendered file to preserve browser user activation.
export async function shareWebCard(card: PreparedWebCard): Promise<ShareOutcome> {
  const data = { files: [card.file], title: card.title };
  const browserSharing = navigator as Partial<Pick<Navigator, 'canShare' | 'share'>>;
  if (!browserSharing.canShare?.({ files: data.files }) || !browserSharing.share)
    return downloadWebCard(card);
  try {
    await browserSharing.share(data);
    return 'shared';
  } catch (error) {
    if (isShareCancellation(error)) return 'cancelled';
    throw error;
  }
}

export async function shareNativeCard(base64: string): Promise<ShareOutcome> {
  const { File: NativeFile, Paths } = await import('expo-file-system');
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');
  if (!(await isAvailableAsync())) throw new Error('Image sharing is unavailable on this device.');
  const file = new NativeFile(
    Paths.cache,
    `cinewrapped-card-${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
  );
  try {
    file.create();
    file.write(decodeCardBytes(base64));
    await shareAsync(file.uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Share CineWrapped card',
    });
    return 'shared';
  } catch (error) {
    if (isShareCancellation(error)) return 'cancelled';
    throw error;
  } finally {
    if (file.exists) file.delete();
  }
}

export async function loadCardPoster(
  url: string | null | undefined,
  signal: AbortSignal,
): Promise<string | null> {
  if (!url) return null;
  // Only fetch public TMDB posters; never attach authentication headers.
  if (new URL(url).origin !== 'https://image.tmdb.org') return null;
  const response = await fetch(url, { signal, credentials: 'omit' });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !type || !['image/png', 'image/jpeg', 'image/webp'].includes(type))
    return null;
  if (Number(response.headers.get('content-length')) > 3_000_000) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 3_000_000) return null;
  return `data:${type};base64,${encodeCardBytes(bytes)}`;
}
