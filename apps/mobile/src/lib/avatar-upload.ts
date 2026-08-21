import type { LocalUploadAsset, UploadPhase } from './media-upload';
import { ownedPublicObjectPath, uploadOwnedObject } from './media-upload';
import { supabase } from './supabase';

const avatarPolicy = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  defaultMimeType: 'image/jpeg',
  fallbackFileName: 'avatar.jpg',
  maxBytes: 5 * 1024 * 1024,
} as const;

export async function uploadAvatarAsset(input: {
  asset: LocalUploadAsset;
  ownerId: string;
  onPhase?: (phase: UploadPhase) => void;
}): Promise<{ path: string; publicUrl: string }> {
  const uploaded = await uploadOwnedObject({
    asset: input.asset,
    bucket: 'avatars',
    ownerId: input.ownerId,
    policy: avatarPolicy,
    ...(input.onPhase === undefined ? {} : { onPhase: input.onPhase }),
  });
  return {
    path: uploaded.path,
    publicUrl: supabase.storage.from('avatars').getPublicUrl(uploaded.path).data.publicUrl,
  };
}

export async function removeAvatarObject(path: string): Promise<void> {
  const { error } = await supabase.storage.from('avatars').remove([path]);
  if (error !== null) throw error;
}

export function previousAvatarPath(publicUrl: string | null, ownerId: string): string | null {
  return ownedPublicObjectPath(publicUrl, 'avatars', ownerId);
}
