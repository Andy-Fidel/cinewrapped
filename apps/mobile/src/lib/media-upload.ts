import { randomUUID } from 'expo-crypto';

import { supabase } from './supabase';

export type UploadPhase = 'READING' | 'UPLOADING' | 'COMPLETE';

export interface LocalUploadAsset {
  uri: string;
  fileName?: string | null;
  name?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  size?: number | null;
}

export interface UploadPolicy {
  allowedMimeTypes: readonly string[];
  defaultMimeType: string;
  maxBytes: number;
  fallbackFileName: string;
}

export interface PreparedUpload {
  bytes: ArrayBuffer;
  byteSize: number;
  extension: string;
  fileName: string;
  mimeType: string;
}

export interface UploadedObject extends Omit<PreparedUpload, 'bytes'> {
  path: string;
}

const mimeExtensions: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/heic': 'heic',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function hasExpectedSignature(bytes: ArrayBuffer, mimeType: string): boolean {
  const view = new Uint8Array(bytes);
  if (mimeType === 'image/jpeg') return startsWith(view, [0xff, 0xd8, 0xff]);
  if (mimeType === 'image/png')
    return startsWith(view, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === 'image/webp')
    return (
      startsWith(view, [0x52, 0x49, 0x46, 0x46]) && startsWith(view, [0x57, 0x45, 0x42, 0x50], 8)
    );
  if (mimeType === 'application/pdf') return startsWith(view, [0x25, 0x50, 0x44, 0x46]);
  if (mimeType === 'image/heic') {
    const brand = new TextDecoder().decode(view.slice(8, 12));
    return (
      startsWith(view, [0x66, 0x74, 0x79, 0x70], 4) &&
      ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)
    );
  }
  return false;
}

function safeFileName(value: string, extension: string): string {
  const stem = value
    .replace(/\.[^.]+$/u, '')
    .normalize('NFKC')
    .replace(/[^a-z0-9_-]+/giu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 100);
  return `${stem || 'upload'}.${extension}`;
}

export async function prepareLocalUpload(
  asset: LocalUploadAsset,
  policy: UploadPolicy,
): Promise<PreparedUpload> {
  const mimeType = asset.mimeType ?? policy.defaultMimeType;
  if (!policy.allowedMimeTypes.includes(mimeType))
    throw new Error(`Choose one of these file types: ${policy.allowedMimeTypes.join(', ')}.`);
  const declaredSize = asset.fileSize ?? asset.size;
  if (declaredSize !== null && declaredSize !== undefined && declaredSize > policy.maxBytes)
    throw new Error(`The selected file must be smaller than ${formatMegabytes(policy.maxBytes)}.`);

  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('The selected file could not be read.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error('The selected file is empty.');
  if (bytes.byteLength > policy.maxBytes)
    throw new Error(`The selected file must be smaller than ${formatMegabytes(policy.maxBytes)}.`);
  if (!hasExpectedSignature(bytes, mimeType))
    throw new Error('The selected file content does not match its reported file type.');

  const extension = mimeExtensions[mimeType];
  if (extension === undefined) throw new Error('The selected file type is not supported.');
  return {
    bytes,
    byteSize: bytes.byteLength,
    extension,
    fileName: safeFileName(asset.fileName ?? asset.name ?? policy.fallbackFileName, extension),
    mimeType,
  };
}

export async function uploadOwnedObject(input: {
  asset: LocalUploadAsset;
  bucket: string;
  ownerId: string;
  policy: UploadPolicy;
  onPhase?: (phase: UploadPhase) => void;
}): Promise<UploadedObject> {
  input.onPhase?.('READING');
  const prepared = await prepareLocalUpload(input.asset, input.policy);
  const path = `${input.ownerId}/${randomUUID()}.${prepared.extension}`;
  input.onPhase?.('UPLOADING');
  const { error } = await supabase.storage.from(input.bucket).upload(path, prepared.bytes, {
    contentType: prepared.mimeType,
    upsert: false,
  });
  if (error !== null) throw error;
  input.onPhase?.('COMPLETE');
  return {
    path,
    byteSize: prepared.byteSize,
    extension: prepared.extension,
    fileName: prepared.fileName,
    mimeType: prepared.mimeType,
  };
}

export function ownedPublicObjectPath(
  publicUrl: string | null,
  bucket: string,
  ownerId: string,
): string | null {
  if (publicUrl === null) return null;
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const url = new URL(publicUrl);
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    return path.startsWith(`${ownerId}/`) ? path : null;
  } catch {
    return null;
  }
}

function formatMegabytes(bytes: number): string {
  return `${Math.floor(bytes / (1024 * 1024))} MB`;
}
