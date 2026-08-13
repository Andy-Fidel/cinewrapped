import type { PrivateStorageBucket } from '@cinewrapped/shared-types';
import { randomUUID } from 'expo-crypto';

import { supabase } from './supabase';

const safeExtension = /^[a-z0-9]{1,10}$/;

export function createPrivateObjectPath(userId: string, extension: string): string {
  const normalized = extension.toLowerCase().replace(/^\./, '');
  if (!safeExtension.test(normalized)) throw new Error('The file extension is invalid.');
  return `${userId}/${randomUUID()}.${normalized}`;
}

export async function uploadPrivateObject(input: {
  bucket: PrivateStorageBucket;
  path: string;
  contentType: string;
  bytes: ArrayBuffer;
}): Promise<void> {
  const { error } = await supabase.storage.from(input.bucket).upload(input.path, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error !== null) throw error;
}

export async function createPrivateObjectUrl(
  bucket: PrivateStorageBucket,
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error !== null) throw error;
  return data.signedUrl;
}

export async function deletePrivateObject(
  bucket: PrivateStorageBucket,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error !== null) throw error;
}
