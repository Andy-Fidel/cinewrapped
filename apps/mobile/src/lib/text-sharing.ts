import { Platform, Share } from 'react-native';
import { publicAppUrl } from '@cinewrapped/shared-types';
import { downloadWebCard, isShareCancellation } from './share-card-generator';

export interface TextShareContent {
  title: string;
  message: string;
  url?: string;
}
export const appLink = (path = '/') => publicAppUrl(path, process.env.EXPO_PUBLIC_WEB_ORIGIN);

export async function shareTextContent(
  content: TextShareContent,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  try {
    if (Platform.OS === 'web') {
      const browser = navigator as Partial<Pick<Navigator, 'share' | 'canShare'>>;
      const data = {
        title: content.title,
        text: content.message,
        ...(content.url ? { url: content.url } : {}),
      };
      if (!browser.share || (browser.canShare && !browser.canShare(data))) return 'unsupported';
      await browser.share(data);
      return 'shared';
    }
    const result = await Share.share({
      title: content.title,
      message: [content.message, content.url].filter(Boolean).join('\n'),
    });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch (error) {
    if (isShareCancellation(error)) return 'cancelled';
    throw error;
  }
}

export function downloadShareText(content: TextShareContent): void {
  downloadWebCard({
    title: content.title,
    file: new File(
      [[content.message, content.url].filter(Boolean).join('\n')],
      'cinewrapped-share.txt',
      { type: 'text/plain;charset=utf-8' },
    ),
  });
}
