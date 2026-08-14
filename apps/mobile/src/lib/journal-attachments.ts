import type {
  JournalAttachmentSummary,
  JournalAttachmentType,
  JournalEntrySummary,
} from '@cinewrapped/shared-types';
import type { ImagePickerAsset } from 'expo-image-picker';

import { api } from './api';
import {
  createPrivateObjectPath,
  deletePrivateObject,
  uploadPrivateObject,
} from './private-storage';

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  return 'jpg';
}

export async function uploadJournalImage(input: {
  entryId: string;
  ownerId: string;
  asset: ImagePickerAsset;
  attachmentType: JournalAttachmentType;
}): Promise<JournalEntrySummary> {
  const response = await fetch(input.asset.uri);
  if (!response.ok) throw new Error('The selected image could not be read.');
  const bytes = await response.arrayBuffer();
  const mimeType = input.asset.mimeType ?? 'image/jpeg';
  const path = createPrivateObjectPath(input.ownerId, extensionFor(mimeType));
  await uploadPrivateObject({
    bucket: 'journal-attachments',
    path,
    contentType: mimeType,
    bytes,
  });
  try {
    return await api.request<JournalEntrySummary>(`journal/${input.entryId}/attachments`, {
      method: 'POST',
      body: {
        attachmentType: input.attachmentType,
        storagePath: path,
        fileName: input.asset.fileName ?? `journal-${Date.now()}.${extensionFor(mimeType)}`,
        mimeType,
        byteSize: bytes.byteLength,
      },
    });
  } catch (error) {
    await deletePrivateObject('journal-attachments', path).catch(() => undefined);
    throw error;
  }
}

export async function removeJournalAttachment(
  entryId: string,
  attachment: JournalAttachmentSummary,
): Promise<void> {
  await api.request(`journal/${entryId}/attachments/${attachment.id}`, { method: 'DELETE' });
  await deletePrivateObject('journal-attachments', attachment.storagePath).catch(() => undefined);
}
