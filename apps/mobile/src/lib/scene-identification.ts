import type { SceneIdentificationSummary } from '@cinewrapped/shared-types';

import { api } from './api';
import type { LocalUploadAsset, UploadPhase } from './media-upload';
import { uploadOwnedObject } from './media-upload';
import { createPrivateObjectUrl, deletePrivateObject } from './private-storage';

export async function identifySceneFromAsset(input: {
  asset: LocalUploadAsset;
  ownerId: string;
  language: string;
  countryCode: string;
  onPhase?: (phase: UploadPhase) => void;
}): Promise<SceneIdentificationSummary> {
  const uploaded = await uploadOwnedObject({
    asset: input.asset,
    bucket: 'scene-identification',
    ownerId: input.ownerId,
    policy: {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      defaultMimeType: 'image/jpeg',
      fallbackFileName: 'scene-screenshot',
      maxBytes: 6 * 1024 * 1024,
    },
    ...(input.onPhase === undefined ? {} : { onPhase: input.onPhase }),
  });
  try {
    const signedImageUrl = await createPrivateObjectUrl('scene-identification', uploaded.path, 300);
    return await api.request<SceneIdentificationSummary>('scene-identifications', {
      method: 'POST',
      body: {
        storagePath: uploaded.path,
        signedImageUrl,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
        language: input.language,
        countryCode: input.countryCode,
        privacyAcknowledged: true,
      },
    });
  } finally {
    await deletePrivateObject('scene-identification', uploaded.path).catch(() => undefined);
  }
}
