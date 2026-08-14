import { describe, expect, it } from 'vitest';

import { assertTrustedSceneImageUrl } from '../src/scene-identification/scene-identification.service.js';

const subject = '4d54ff6c-3601-4fa5-8463-b2ad2e55da60';
const path = `${subject}/7c45bfcf-6d87-4afd-b51d-ae4196438e31.jpg`;

describe('scene image URL validation', () => {
  it('accepts an owner-scoped signed URL from the configured Supabase host', () => {
    expect(() =>
      assertTrustedSceneImageUrl(
        'https://project.supabase.co',
        subject,
        path,
        `https://project.supabase.co/storage/v1/object/sign/scene-identification/${path}?token=1234567890123456`,
      ),
    ).not.toThrow();
  });

  it('rejects foreign hosts and another user path', () => {
    expect(() =>
      assertTrustedSceneImageUrl(
        'https://project.supabase.co',
        subject,
        path,
        `https://attacker.example/storage/v1/object/sign/scene-identification/${path}?token=1234567890123456`,
      ),
    ).toThrow(/signed scene image URL/u);
    expect(() =>
      assertTrustedSceneImageUrl(
        'https://project.supabase.co',
        subject,
        `00000000-0000-0000-0000-000000000000/file.jpg`,
        `https://project.supabase.co/storage/v1/object/sign/scene-identification/${path}?token=1234567890123456`,
      ),
    ).toThrow(/path is invalid/u);
  });

  it('rejects malformed percent encoding without leaking a URI error', () => {
    expect(() =>
      assertTrustedSceneImageUrl(
        'https://project.supabase.co',
        subject,
        path,
        'https://project.supabase.co/storage/v1/object/sign/scene-identification/%E0%A4%A?token=1234567890123456',
      ),
    ).toThrow(/scene image URL is invalid/u);
  });
});
