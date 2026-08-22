import { Platform, Share } from 'react-native';

export interface CineWrappedSharePayload {
  mediaTitle: string;
  releaseYear?: string | null;
  ratingValue?: number | null;
  reviewBody: string;
  quote?: string | null;
  reviewerName?: string | null;
  reviewerHandle?: string | null;
  reviewerAvatarUrl?: string | null;
  posterUrl?: string | null;
  accentColor?: string | null;
  cardBgColor?: string | null;
}

export async function shareCineWrappedGraphicCard(payload: CineWrappedSharePayload): Promise<void> {
  const year = payload.releaseYear ? ` (${payload.releaseYear})` : '';
  const starCount = payload.ratingValue ?? 5;
  const starsString = '★'.repeat(starCount) + '☆'.repeat(Math.max(0, 5 - starCount));
  const reviewer = payload.reviewerHandle ? `@${payload.reviewerHandle}` : 'cinephile';

  const captionText = `🎬 "${payload.mediaTitle}"${year}\nRating: ${starsString} (${starCount}/5)\n\n${
    payload.quote ? `« ${payload.quote} »\n\n` : ''
  }${payload.reviewBody}\n\n— Review by ${reviewer} on CineWrapped ✨\nhttps://cinewrapped.app`;

  // Web sharing
  if (Platform.OS === 'web') {
    try {
      await navigator.share({
        title: `${payload.mediaTitle} - CineWrapped Review`,
        text: captionText,
        url: payload.posterUrl ?? 'https://cinewrapped.app',
      });
      return;
    } catch {
      // Fall back to clipboard when native web sharing is unavailable or cancelled.
    }
    await navigator.clipboard.writeText(captionText);
    return;
  }

  // Native mobile sharing (iOS / Android):
  // Dispatches rich preview with poster graphics and review caption
  await Share.share({
    message: captionText,
    url: payload.posterUrl ?? 'https://cinewrapped.app',
    title: `${payload.mediaTitle} Review - CineWrapped`,
  });
}
