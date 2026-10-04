import { Platform } from 'react-native';
import { downloadWebCard, isShareCancellation, type ShareOutcome } from './share-card-generator';

export async function exportTextFile(
  content: string,
  filename: string,
  mimeType: string,
  title: string,
  UTI?: string,
): Promise<ShareOutcome> {
  if (Platform.OS === 'web')
    return downloadWebCard({ title, file: new File([content], filename, { type: mimeType }) });
  const { File: NativeFile, Paths } = await import('expo-file-system');
  const { isAvailableAsync, shareAsync } = await import('expo-sharing');
  if (!(await isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  const file = new NativeFile(
    Paths.cache,
    `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`,
  );
  try {
    file.create();
    file.write(content);
    await shareAsync(file.uri, { mimeType, dialogTitle: title, ...(UTI ? { UTI } : {}) });
    return 'shared';
  } catch (error) {
    if (isShareCancellation(error)) return 'cancelled';
    throw error;
  } finally {
    if (file.exists) file.delete();
  }
}
