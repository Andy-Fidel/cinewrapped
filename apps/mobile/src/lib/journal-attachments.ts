import type {
  JournalAttachmentSummary,
  JournalAttachmentType,
  JournalEntrySummary,
} from '@cinewrapped/shared-types';

import { api } from './api';
import type { LocalUploadAsset, UploadPhase } from './media-upload';
import { uploadOwnedObject } from './media-upload';
import { deletePrivateObject } from './private-storage';

export async function uploadJournalImage(input: {
  entryId: string;
  ownerId: string;
  asset: LocalUploadAsset;
  attachmentType: JournalAttachmentType;
  onPhase?: (phase: UploadPhase) => void;
}): Promise<JournalEntrySummary> {
  const uploaded = await uploadOwnedObject({
    asset: input.asset,
    bucket: 'journal-attachments',
    ownerId: input.ownerId,
    policy: {
      allowedMimeTypes:
        input.attachmentType === 'TICKET'
          ? ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
          : ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      defaultMimeType: 'image/jpeg',
      fallbackFileName: input.attachmentType === 'TICKET' ? 'cinema-ticket' : 'journal-photo',
      maxBytes: 6 * 1024 * 1024,
    },
    ...(input.onPhase === undefined ? {} : { onPhase: input.onPhase }),
  });
  try {
    return await api.request<JournalEntrySummary>(`journal/${input.entryId}/attachments`, {
      method: 'POST',
      body: {
        attachmentType: input.attachmentType,
        storagePath: uploaded.path,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
      },
    });
  } catch (error) {
    await deletePrivateObject('journal-attachments', uploaded.path).catch(() => undefined);
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
