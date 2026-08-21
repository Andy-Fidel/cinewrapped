import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: { storage: { from: vi.fn() } },
}));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'upload-id' }));

import {
  hasExpectedSignature,
  ownedPublicObjectPath,
  prepareLocalUpload,
  type UploadPolicy,
} from './media-upload';

const imagePolicy: UploadPolicy = {
  allowedMimeTypes: ['image/jpeg', 'image/png'],
  defaultMimeType: 'image/jpeg',
  fallbackFileName: 'image',
  maxBytes: 16,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('media upload validation', () => {
  it('recognizes supported file signatures', () => {
    expect(
      hasExpectedSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]).buffer, 'image/jpeg'),
    ).toBe(true);
    expect(
      hasExpectedSignature(
        Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer,
        'application/pdf',
      ),
    ).toBe(true);
    expect(
      hasExpectedSignature(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]).buffer, 'image/jpeg'),
    ).toBe(false);
  });

  it('prepares a valid upload with a safe file name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])))),
    );

    await expect(
      prepareLocalUpload(
        {
          uri: 'file:///avatar',
          fileName: '../My avatar!!.jpeg',
          mimeType: 'image/jpeg',
        },
        imagePolicy,
      ),
    ).resolves.toMatchObject({
      byteSize: 4,
      extension: 'jpg',
      fileName: 'My-avatar.jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('rejects oversized and spoofed files', async () => {
    await expect(
      prepareLocalUpload(
        { uri: 'file:///large', fileSize: 17, mimeType: 'image/jpeg' },
        imagePolicy,
      ),
    ).rejects.toThrow('smaller than');

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(Uint8Array.from([0x50, 0x4b, 0x03, 0x04])))),
    );
    await expect(
      prepareLocalUpload({ uri: 'file:///spoofed', mimeType: 'image/jpeg' }, imagePolicy),
    ).rejects.toThrow('does not match');
  });
});

describe('owned public object paths', () => {
  it('only returns paths owned by the current user', () => {
    expect(
      ownedPublicObjectPath(
        'https://example.supabase.co/storage/v1/object/public/avatars/user-1/avatar.jpg',
        'avatars',
        'user-1',
      ),
    ).toBe('user-1/avatar.jpg');
    expect(
      ownedPublicObjectPath(
        'https://example.supabase.co/storage/v1/object/public/avatars/user-2/avatar.jpg',
        'avatars',
        'user-1',
      ),
    ).toBeNull();
    expect(ownedPublicObjectPath('not a URL', 'avatars', 'user-1')).toBeNull();
  });
});
