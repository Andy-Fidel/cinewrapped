import { describe, expect, it } from 'vitest';
import { assertCanMutate, assertOwnership } from '../src/common/object-ownership.guard.js';
import {
  sanitizeFilename,
  validateUploadedFile,
  verifyImageMagicBytes,
} from '../src/common/file-upload-security.js';

describe('Enterprise Security Suite', () => {
  describe('Zero-Trust Object-Level Ownership', () => {
    it('allows owner to mutate their own resource', () => {
      expect(() => assertOwnership('user-123', 'user-123', 'review')).not.toThrow();
    });

    it('throws 403 when a non-owner tries to mutate a resource', () => {
      expect(() => assertOwnership('user-attacker', 'user-victim', 'review')).toThrowError(
        /permission to modify or delete/i,
      );
    });

    it('allows authorized admins and moderators to mutate resources', () => {
      expect(() =>
        assertCanMutate('mod-user', 'victim-user', ['MODERATOR'], 'comment'),
      ).not.toThrow();
      expect(() => assertCanMutate('admin-user', 'victim-user', ['ADMIN'], 'review')).not.toThrow();
    });

    it('denies mutation when non-owner has no admin/mod role', () => {
      expect(() =>
        assertCanMutate('regular-user', 'victim-user', ['MEMBER'], 'review'),
      ).toThrowError(/authorized moderator/i);
    });
  });

  describe('File Upload Security & Magic-Byte MIME Validation', () => {
    it('verifies valid PNG magic bytes', () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      expect(verifyImageMagicBytes(pngBuffer)).toBe('image/png');
    });

    it('verifies valid JPEG magic bytes', () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      expect(verifyImageMagicBytes(jpegBuffer)).toBe('image/jpeg');
    });

    it('sanitizes malicious filenames and prevents path traversal', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('etc_passwd');
      expect(sanitizeFilename('shell.php\0.jpg')).toBe('shell.php.jpg');
      expect(sanitizeFilename('normal-poster.png')).toBe('normal-poster.png');
    });

    it('rejects oversized file uploads exceeding size limits', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      expect(() =>
        validateUploadedFile(largeBuffer, 'image/jpeg', 'photo.jpg', 5 * 1024 * 1024),
      ).toThrowError(/exceeds the maximum allowed limit/i);
    });

    it('rejects unsupported MIME types', () => {
      const textBuffer = Buffer.from('malicious script');
      expect(() => validateUploadedFile(textBuffer, 'application/x-sh', 'script.sh')).toThrowError(
        /unsupported file type/i,
      );
    });

    it('rejects a whitelisted MIME type with an unknown binary signature', () => {
      expect(() => validateUploadedFile(Buffer.alloc(32), 'image/jpeg', 'fake.jpg')).toThrowError(
        /recognized image signature/i,
      );
    });
  });
});
