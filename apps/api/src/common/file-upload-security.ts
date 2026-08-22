import { AppException } from './app.exception.js';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'application/pdf',
]);

export const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Megabytes

export interface FileUploadValidationResult {
  valid: boolean;
  detectedMimeType: string;
  sanitizedFilename: string;
  sizeBytes: number;
}

/**
 * Validates file buffer magic bytes against declared MIME type to prevent polyglot file attacks
 */
export function verifyImageMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // AVIF: ISO BMFF file type box with an avif/avis brand.
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70 &&
    ((buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x66) ||
      (buffer[8] === 0x61 && buffer[9] === 0x76 && buffer[10] === 0x69 && buffer[11] === 0x73))
  ) {
    return 'image/avif';
  }

  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';

  const brand = buffer.subarray(8, 12).toString('ascii');
  if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return 'image/heic';

  return null;
}

/**
 * Sanitizes a filename preventing path traversal, null bytes, and malicious characters
 */
export function sanitizeFilename(rawFilename: string): string {
  // Strip path traversal sequences, null bytes, and illegal chars
  const base = rawFilename
    .replace(/\0/g, '')
    .replace(/\.\.+[/\\]?/g, '')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/^_+/, '')
    .trim();
  const safeName = base.replace(/^\.+/, ''); // Prevent hidden files like .env or ..
  return safeName.length > 0 ? safeName.slice(0, 100) : `upload-${Date.now()}`;
}

/**
 * Comprehensive File Upload Security Validator
 */
export function validateUploadedFile(
  buffer: Buffer,
  declaredMimeType: string,
  rawFilename: string,
  maxSizeBytes = DEFAULT_MAX_UPLOAD_BYTES,
): FileUploadValidationResult {
  // 1. Max Size Check
  if (buffer.length > maxSizeBytes) {
    throw new AppException(
      400,
      'FILE_TOO_LARGE',
      `File size (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed limit of ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`,
    );
  }

  // 2. MIME Type Whitelist Check
  const normalizedMime = declaredMimeType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)) {
    throw new AppException(
      400,
      'INVALID_FILE_TYPE',
      `Unsupported file type '${declaredMimeType}'. Allowed types: JPEG, PNG, WEBP, AVIF, HEIC, PDF.`,
    );
  }

  // 3. Binary Magic Byte Verification
  const detectedMime = verifyImageMagicBytes(buffer);
  if (detectedMime === null) {
    throw new AppException(
      400,
      'UNKNOWN_FILE_SIGNATURE',
      'The uploaded file does not have a recognized image signature.',
    );
  }
  if (detectedMime !== normalizedMime) {
    throw new AppException(
      400,
      'MIME_SIGNATURE_MISMATCH',
      `File header contents do not match declared MIME type '${declaredMimeType}'.`,
    );
  }

  // 4. Filename Sanitization
  const sanitizedFilename = sanitizeFilename(rawFilename);

  return {
    valid: true,
    detectedMimeType: detectedMime,
    sanitizedFilename,
    sizeBytes: buffer.length,
  };
}

export function assertTrustedStorageUrl(input: {
  supabaseUrl: string;
  bucket: string;
  subject: string;
  storagePath: string;
  signedUrl: string;
}): void {
  if (!input.storagePath.startsWith(`${input.subject}/`)) {
    throw new AppException(400, 'STORAGE_PATH_INVALID', 'The storage path is invalid.');
  }
  let expectedHost: string;
  let url: URL;
  try {
    expectedHost = new URL(input.supabaseUrl).host;
    url = new URL(input.signedUrl);
  } catch {
    throw new AppException(400, 'STORAGE_URL_INVALID', 'The signed storage URL is invalid.');
  }
  const expectedSuffix = `/storage/v1/object/sign/${input.bucket}/${input.storagePath}`;
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new AppException(400, 'STORAGE_URL_INVALID', 'The signed storage URL is invalid.');
  }
  if (
    url.protocol !== 'https:' ||
    url.host !== expectedHost ||
    !decodedPath.endsWith(expectedSuffix) ||
    (url.searchParams.get('token') ?? '').length < 16
  ) {
    throw new AppException(400, 'STORAGE_URL_INVALID', 'The signed storage URL is invalid.');
  }
}

export async function validateRemoteFile(input: {
  signedUrl: string;
  mimeType: string;
  fileName: string;
  maxSizeBytes: number;
  expectedSizeBytes: number;
}): Promise<FileUploadValidationResult> {
  let response: Response;
  try {
    response = await fetch(input.signedUrl, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new AppException(
      502,
      'UPLOAD_VERIFICATION_FAILED',
      'The uploaded file could not be verified.',
    );
  }
  if (!response.ok) {
    throw new AppException(422, 'UPLOAD_NOT_FOUND', 'The uploaded file is unavailable.');
  }
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > input.maxSizeBytes) {
    throw new AppException(400, 'FILE_TOO_LARGE', 'The uploaded file exceeds the size limit.');
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const result = validateUploadedFile(buffer, input.mimeType, input.fileName, input.maxSizeBytes);
  if (result.sizeBytes !== input.expectedSizeBytes) {
    throw new AppException(
      422,
      'FILE_SIZE_MISMATCH',
      'The uploaded file metadata is inconsistent.',
    );
  }
  return result;
}
