import type { SceneIdentificationSummary } from '@cinewrapped/shared-types';
import type { ImagePickerAsset } from 'expo-image-picker';

import { api } from './api';
import {
  createPrivateObjectPath,
  createPrivateObjectUrl,
  deletePrivateObject,
  uploadPrivateObject,
} from './private-storage';

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function identifySceneFromAsset(input: {
  asset: ImagePickerAsset;
  ownerId: string;
  language: string;
  countryCode: string;
}): Promise<SceneIdentificationSummary> {
  const response = await fetch(input.asset.uri);
  if (!response.ok) throw new Error('The selected frame could not be read.');
  const bytes = await response.arrayBuffer();
  const mimeType = input.asset.mimeType ?? 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType))
    throw new Error('Choose a JPEG, PNG, or WebP screenshot. HEIC images are not supported.');
  if (bytes.byteLength > 10 * 1024 * 1024)
    throw new Error('The screenshot must be smaller than 10 MB.');
  const path = createPrivateObjectPath(input.ownerId, extensionFor(mimeType));
  await uploadPrivateObject({
    bucket: 'scene-identification',
    path,
    contentType: mimeType,
    bytes,
  });
  try {
    const signedImageUrl = await createPrivateObjectUrl('scene-identification', path, 300);
    return await api.request<SceneIdentificationSummary>('scene-identifications', {
      method: 'POST',
      body: {
        storagePath: path,
        signedImageUrl,
        mimeType,
        byteSize: bytes.byteLength,
        language: input.language,
        countryCode: input.countryCode,
        privacyAcknowledged: true,
      },
    });
  } finally {
    await deletePrivateObject('scene-identification', path).catch(() => undefined);
  }
}
